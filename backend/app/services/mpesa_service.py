"""Safaricom Daraja — STK Push (Lipa na M-Pesa Online). Raw REST calls, no
SDK, same style as email_service's Brevo calls. Only the two endpoints
Phase 5 needs: initiate a push, and query one's status for reconciliation
(there's no job scheduler in this repo, so "handle a timed-out payment"
means an admin-triggered query, not a cron job).
"""
import base64
import logging
import time
from datetime import datetime

import requests
from flask import current_app

logger = logging.getLogger(__name__)

_BASE_URLS = {
    "sandbox": "https://sandbox.safaricom.co.ke",
    "production": "https://api.safaricom.co.ke",
}

# TransactionType for a Paybill shortcode — matches the sandbox shortcode
# currently configured. If CVC's real shortcode turns out to be a Till
# (Buy Goods) number, this becomes "CustomerBuyGoodsOnline" — a one-line
# change, not a redesign.
TRANSACTION_TYPE = "CustomerPayBillOnline"

# Module-level cache: {"token": ..., "expires_at": <epoch seconds>}. Each
# gunicorn worker holds its own copy — worst case is a few extra token
# fetches across workers, not a correctness issue.
_token_cache = {"token": None, "expires_at": 0}


class MpesaError(Exception):
    """Daraja rejected the request, or the HTTP call itself failed."""


def _base_url():
    return _BASE_URLS[current_app.config["MPESA_ENVIRONMENT"]]


def _get_access_token():
    if _token_cache["token"] and time.time() < _token_cache["expires_at"]:
        return _token_cache["token"]

    try:
        response = requests.get(
            f"{_base_url()}/oauth/v1/generate?grant_type=client_credentials",
            auth=(current_app.config["MPESA_CONSUMER_KEY"], current_app.config["MPESA_CONSUMER_SECRET"]),
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as exc:
        raise MpesaError(f"Could not reach Daraja for an access token: {exc}") from exc

    token = data.get("access_token")
    if not token:
        raise MpesaError(f"Daraja token response had no access_token: {data}")

    # Refresh a little early (60s of slack) rather than exactly on expiry.
    _token_cache["token"] = token
    _token_cache["expires_at"] = time.time() + int(data.get("expires_in", 3600)) - 60
    return token


def _normalize_phone(raw: str) -> str:
    """Daraja wants 2547XXXXXXXX / 2541XXXXXXXX — no leading 0, no +."""
    digits = "".join(c for c in raw if c.isdigit())
    if digits.startswith("254") and len(digits) == 12:
        return digits
    if digits.startswith("0") and len(digits) == 10:
        return "254" + digits[1:]
    if len(digits) == 9:
        return "254" + digits
    raise MpesaError(f"'{raw}' doesn't look like a Kenyan phone number")


def _password_and_timestamp():
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    shortcode = current_app.config["MPESA_SHORTCODE"]
    passkey = current_app.config["MPESA_PASSKEY"]
    raw = f"{shortcode}{passkey}{timestamp}"
    return base64.b64encode(raw.encode()).decode(), timestamp


def initiate_stk_push(phone_number: str, amount_cents: int, account_reference: str, transaction_desc: str):
    """Returns (checkout_request_id, merchant_request_id) on success.
    Raises MpesaError on anything else — the caller decides what to persist.
    """
    phone = _normalize_phone(phone_number)
    password, timestamp = _password_and_timestamp()
    shortcode = current_app.config["MPESA_SHORTCODE"]

    payload = {
        "BusinessShortCode": shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": TRANSACTION_TYPE,
        "Amount": amount_cents // 100,
        "PartyA": phone,
        "PartyB": shortcode,
        "PhoneNumber": phone,
        "CallBackURL": current_app.config["MPESA_CALLBACK_URL"],
        "AccountReference": account_reference[:20],
        "TransactionDesc": transaction_desc[:100],
    }

    try:
        response = requests.post(
            f"{_base_url()}/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers={"Authorization": f"Bearer {_get_access_token()}"},
            timeout=15,
        )
        data = response.json()
    except requests.RequestException as exc:
        raise MpesaError(f"STK push request failed: {exc}") from exc

    if data.get("ResponseCode") != "0":
        raise MpesaError(data.get("ResponseDescription") or data.get("errorMessage") or f"STK push rejected: {data}")

    return data["CheckoutRequestID"], data["MerchantRequestID"]


def query_stk_status(checkout_request_id: str) -> dict:
    """For admin-triggered reconciliation of a stuck 'pending' payment.
    Returns Daraja's raw response dict (has ResultCode/ResultDesc, same
    shape resolve_payment already expects from the callback).
    """
    password, timestamp = _password_and_timestamp()
    payload = {
        "BusinessShortCode": current_app.config["MPESA_SHORTCODE"],
        "Password": password,
        "Timestamp": timestamp,
        "CheckoutRequestID": checkout_request_id,
    }
    try:
        response = requests.post(
            f"{_base_url()}/mpesa/stkpushquery/v1/query",
            json=payload,
            headers={"Authorization": f"Bearer {_get_access_token()}"},
            timeout=15,
        )
        return response.json()
    except requests.RequestException as exc:
        raise MpesaError(f"STK status query failed: {exc}") from exc

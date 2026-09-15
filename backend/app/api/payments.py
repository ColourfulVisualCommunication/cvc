"""The Daraja STK Push callback. Deliberately its own tiny file, separate
from the JWT-guarded admin routes and the signed-token public routes in
invoices.py — this is the one genuinely open endpoint in the whole API
(Safaricom calls it directly; there's no Daraja signature-verification
mechanism), kept isolated so it's easy to audit on its own.

Idempotency (CLAUDE.md: "a retried M-Pesa callback must never produce a
second payment row or a second receipt email") lives in
invoice_service.resolve_payment, not here — this route just parses the
callback and hands it off.
"""
import json
import logging

from flask import jsonify, request

from ..models import Payment
from ..services import invoice_service
from . import api_v1

logger = logging.getLogger(__name__)

# Daraja expects this exact ack shape, with HTTP 200, regardless of what
# ResultCode it sent us — anything else makes it retry delivery.
_ACK = {"ResultCode": 0, "ResultDesc": "Accepted"}


@api_v1.post("/payments/mpesa/callback")
def mpesa_callback():
    body = request.get_json(silent=True) or {}
    callback = body.get("Body", {}).get("stkCallback", {})
    checkout_request_id = callback.get("CheckoutRequestID")
    result_code = callback.get("ResultCode")
    result_desc = callback.get("ResultDesc")
    metadata_items = (callback.get("CallbackMetadata") or {}).get("Item")

    if not checkout_request_id:
        logger.warning("M-Pesa callback with no CheckoutRequestID: %s", body)
        return jsonify(_ACK)

    payment = Payment.query.filter_by(checkout_request_id=checkout_request_id).first()
    if payment is None:
        # A stray/unrecognized callback can't be fixed by Safaricom retrying
        # it — ack anyway rather than 500ing into a retry storm.
        logger.warning("M-Pesa callback for unknown CheckoutRequestID %s: %s", checkout_request_id, body)
        return jsonify(_ACK)

    invoice_service.resolve_payment(
        payment,
        result_code=result_code,
        result_desc=result_desc,
        metadata_items=metadata_items,
        raw_callback=json.dumps(body),
    )
    return jsonify(_ACK)

"""Invoices. Admin views/manages them; the client reaches theirs through
the quote's own signed link — no separate invoice token, since an invoice
is 1:1 with its quote for this phase (see Invoice.quote_id's unique
constraint).
"""
from flask import jsonify, request, send_file
from flask_jwt_extended import jwt_required
import io

from ..extensions import db
from ..models import Invoice, Payment, Quote
from ..services import invoice_service, mpesa_service, pdf_service, token_service
from ..services.mpesa_service import MpesaError
from . import api_v1
from .quotes import TOKEN_MAX_AGE_DAYS

MANUAL_METHODS = ("bank_transfer", "cheque", "cash", "other")


def _load_quote_by_token(token):
    quote_id = token_service.verify(token, "quote", TOKEN_MAX_AGE_DAYS)
    if quote_id is None:
        return None
    return db.session.get(Quote, quote_id)


# ---- Admin ------------------------------------------------------------


@api_v1.get("/admin/invoices")
@jwt_required()
def admin_list_invoices():
    items = Invoice.query.order_by(Invoice.created_at.desc()).all()
    return jsonify(items=[i.to_dict() for i in items], count=len(items))


@api_v1.get("/admin/invoices/<int:invoice_id>")
@jwt_required()
def admin_get_invoice(invoice_id):
    invoice = db.session.get(Invoice, invoice_id)
    if invoice is None:
        return jsonify(error="not_found", message="No such invoice"), 404
    return jsonify(invoice.to_dict(include_payments=True))


@api_v1.post("/admin/invoices/<int:invoice_id>/payments")
@jwt_required()
def admin_record_payment(invoice_id):
    invoice = db.session.get(Invoice, invoice_id)
    if invoice is None:
        return jsonify(error="not_found", message="No such invoice"), 404

    data = request.get_json(silent=True) or {}
    method = data.get("method")
    amount_cents = data.get("amount_cents")
    if method not in MANUAL_METHODS:
        return jsonify(error="bad_request", message=f"method must be one of {MANUAL_METHODS}"), 400
    if not amount_cents or int(amount_cents) <= 0:
        return jsonify(error="bad_request", message="amount_cents is required and must be positive"), 400

    payment = invoice_service.record_manual_payment(
        invoice,
        method=method,
        amount_cents=int(amount_cents),
        manual_reference=data.get("reference"),
        note=data.get("note"),
    )
    return jsonify(payment.to_dict()), 201


@api_v1.post("/admin/invoices/<int:invoice_id>/check-status")
@jwt_required()
def admin_check_status(invoice_id):
    invoice = db.session.get(Invoice, invoice_id)
    if invoice is None:
        return jsonify(error="not_found", message="No such invoice"), 404

    pending = next((p for p in invoice.payments if p.method == "mpesa" and p.status == "pending"), None)
    if pending is None or not pending.checkout_request_id:
        return jsonify(error="bad_request", message="No pending M-Pesa payment to check"), 400

    try:
        result = mpesa_service.query_stk_status(pending.checkout_request_id)
    except MpesaError as exc:
        return jsonify(error="mpesa_error", message=str(exc)), 502

    # Daraja's query endpoint (unlike the real callback) has a third
    # outcome beyond success/failure: ResultCode 4999 means the STK push
    # is still awaiting the customer's PIN — not yet resolved on
    # Safaricom's side. Calling resolve_payment here would wrongly mark
    # it "failed" via the same branch a genuine terminal failure takes,
    # and since resolve_payment's idempotency guard only fires on
    # status="pending", that would then permanently block the real
    # callback from ever resolving it correctly later. Leave the payment
    # untouched and let the admin re-check once Daraja actually finishes.
    if str(result.get("ResultCode")) == "4999":
        return (
            jsonify(
                message="Still processing on Safaricom's side — check again in a moment.",
                invoice=invoice.to_dict(include_payments=True),
            ),
            202,
        )

    invoice_service.resolve_payment(
        pending,
        result_code=result.get("ResultCode"),
        result_desc=result.get("ResultDesc") or result.get("errorMessage") or "Checked via query",
    )
    db.session.refresh(invoice)
    return jsonify(invoice.to_dict(include_payments=True))


@api_v1.get("/admin/invoices/<int:invoice_id>/pdf")
@jwt_required()
def admin_invoice_pdf(invoice_id):
    invoice = db.session.get(Invoice, invoice_id)
    if invoice is None:
        return jsonify(error="not_found", message="No such invoice"), 404
    pdf_bytes = pdf_service.invoice_pdf_bytes(invoice)
    return send_file(io.BytesIO(pdf_bytes), mimetype="application/pdf", download_name=f"{invoice.number}.pdf")


# ---- Public (signed quote token, no login) -----------------------------


@api_v1.post("/quotes/<token>/pay")
def pay_quote_deposit(token):
    quote = _load_quote_by_token(token)
    if quote is None:
        return jsonify(error="not_found", message="This quote link isn't valid"), 404
    if quote.status != "accepted" or quote.deposit_invoice is None:
        return jsonify(error="bad_request", message="This quote doesn't have a deposit ready to pay"), 400
    if quote.deposit_invoice.status == "paid":
        return jsonify(error="bad_request", message="This deposit has already been paid"), 400

    data = request.get_json(silent=True) or {}
    phone_number = data.get("phone_number")
    if not phone_number:
        return jsonify(error="bad_request", message="phone_number is required"), 400

    payment, error = invoice_service.initiate_payment(quote.deposit_invoice, phone_number)
    if error:
        return jsonify(error="mpesa_error", message=error), 400
    return jsonify(payment.to_public_dict()), 202


@api_v1.get("/quotes/<token>/payment-status")
def quote_payment_status(token):
    quote = _load_quote_by_token(token)
    if quote is None:
        return jsonify(error="not_found", message="This quote link isn't valid"), 404
    if quote.deposit_invoice is None or not quote.deposit_invoice.payments:
        return jsonify(error="not_found", message="No payment attempt yet"), 404

    latest = quote.deposit_invoice.payments[0]  # ordered by created_at desc
    return jsonify(payment=latest.to_public_dict(), invoice=quote.deposit_invoice.to_public_dict())


@api_v1.get("/quotes/<token>/receipt.pdf")
def quote_receipt_pdf(token):
    quote = _load_quote_by_token(token)
    if quote is None:
        return jsonify(error="not_found", message="This quote link isn't valid"), 404
    if quote.deposit_invoice is None or quote.deposit_invoice.status != "paid":
        return jsonify(error="bad_request", message="No paid invoice to receipt yet"), 400

    payment = next((p for p in quote.deposit_invoice.payments if p.status == "success"), None)
    pdf_bytes = pdf_service.receipt_pdf_bytes(quote.deposit_invoice, payment)
    return send_file(
        io.BytesIO(pdf_bytes), mimetype="application/pdf", download_name=f"{quote.deposit_invoice.number}-receipt.pdf"
    )

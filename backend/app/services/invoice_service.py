"""Turns an accepted quote into a deposit invoice, and turns a Daraja
result (from the real callback, or an admin's manual reconciliation query)
into a resolved payment. The one place CLAUDE.md's idempotency rule is
enforced — see resolve_payment.
"""
import logging

from sqlalchemy import update

from ..extensions import db
from ..models.invoice import Invoice, Payment
from ..models.service import utcnow
from . import email_service, mpesa_service, token_service
from .mpesa_service import MpesaError

logger = logging.getLogger(__name__)

# A pending payment newer than this is treated as "already in flight" —
# stops a double-tapped "Pay" button from firing a second STK push.
_DEDUPE_WINDOW_SECONDS = 90


def create_for_quote(quote) -> Invoice:
    """Called the moment a quote is accepted — no action from Njoroge.
    amount_cents is a locked snapshot of quote.deposit_cents, rounded to
    the nearest whole shilling (M-Pesa can't take a fraction of one; an
    admin editing quote line items after acceptance must never retroactively
    change an invoice that's already gone out).
    """
    amount_cents = round(quote.deposit_cents / 100) * 100
    invoice = Invoice(quote_id=quote.id, kind="deposit", amount_cents=amount_cents)
    db.session.add(invoice)
    db.session.commit()
    return invoice


def create_balance_invoice(project):
    """Called the moment a client approves the final deliverables (Phase
    6). Whatever's left of quote.total_cents after the deposit (and any
    other payments) gets its own invoice, reusing the exact same
    STK-push/manual-payment/idempotency machinery as the deposit. If the
    deposit (or an over-payment) already covers the total, there's nothing
    left to invoice — skip creating one rather than asking M-Pesa to
    process a zero/negative amount.
    """
    remaining = project.quote.total_cents - project.paid_cents
    if remaining <= 0:
        return None
    amount_cents = round(remaining / 100) * 100
    if amount_cents <= 0:
        return None
    invoice = Invoice(quote_id=project.quote_id, kind="balance", amount_cents=amount_cents)
    db.session.add(invoice)
    db.session.commit()
    return invoice


def initiate_payment(invoice: Invoice, phone_number: str) -> tuple[Payment, str | None]:
    """Returns (payment, error_message). error_message is None on success.
    On failure, still returns a Payment row (status="failed") so the
    attempt is visible to the admin, since no callback will ever arrive
    for it.
    """
    recent_pending = next(
        (
            p
            for p in invoice.payments
            if p.status == "pending" and (utcnow() - p.created_at).total_seconds() < _DEDUPE_WINDOW_SECONDS
        ),
        None,
    )
    if recent_pending:
        return recent_pending, None

    try:
        desc_prefix = "Final balance for" if invoice.kind == "balance" else "Deposit for"
        checkout_request_id, merchant_request_id = mpesa_service.initiate_stk_push(
            phone_number=phone_number,
            amount_cents=invoice.amount_cents,
            account_reference=invoice.number,
            transaction_desc=f"{desc_prefix} {invoice.quote.title}",
        )
    except MpesaError as exc:
        payment = Payment(
            invoice_id=invoice.id,
            method="mpesa",
            status="failed",
            amount_cents=invoice.amount_cents,
            phone_number=phone_number,
            result_desc=str(exc),
        )
        db.session.add(payment)
        db.session.commit()
        return payment, str(exc)

    payment = Payment(
        invoice_id=invoice.id,
        method="mpesa",
        status="pending",
        amount_cents=invoice.amount_cents,
        phone_number=phone_number,
        checkout_request_id=checkout_request_id,
        merchant_request_id=merchant_request_id,
    )
    db.session.add(payment)
    db.session.commit()
    return payment, None


def _metadata_value(items, name):
    for item in items or []:
        if item.get("Name") == name:
            return item.get("Value")
    return None


def resolve_payment(payment: Payment, result_code, result_desc: str, metadata_items=None, raw_callback: str = None):
    """Applies a Daraja result to a Payment+Invoice. Called from both the
    real callback (metadata_items present on success) and the admin's
    "check status" reconciliation (metadata_items is None even on success —
    Daraja's query endpoint confirms success/failure but doesn't return the
    receipt number, only the callback does).

    Idempotency: the update is an atomic conditional (WHERE status='pending')
    rather than a read-then-write — this is what actually closes the race
    between two near-simultaneous resolutions (a retried callback, or a
    callback landing mid-reconciliation), not the unique constraint on
    provider_reference (that's a separate backstop against a different bug
    class: two rows ending up with the same receipt number).
    """
    success = str(result_code) == "0"
    new_status = "success" if success else ("cancelled" if str(result_code) in ("1032",) else "failed")

    values = {
        "status": new_status,
        "result_desc": result_desc,
        "completed_at": utcnow(),
    }
    if raw_callback is not None:
        values["raw_callback"] = raw_callback

    result = db.session.execute(
        update(Payment).where(Payment.id == payment.id, Payment.status == "pending").values(**values)
    )
    db.session.commit()
    if result.rowcount == 0:
        logger.info("Payment %s already resolved — skipping (retried callback or concurrent reconciliation)", payment.id)
        return

    if not success:
        return

    invoice = payment.invoice
    receipt_number = _metadata_value(metadata_items, "MpesaReceiptNumber")
    reported_amount = _metadata_value(metadata_items, "Amount")

    if metadata_items and reported_amount is not None and int(reported_amount) * 100 != payment.amount_cents:
        # Amount mismatch is one of the only integrity checks available on a
        # necessarily-unauthenticated callback endpoint. Record the payment
        # as successful (it did succeed on Daraja's side) but don't mark the
        # invoice paid or email a receipt — leave it for admin review.
        logger.warning(
            "Payment %s: amount mismatch — expected %s cents, Daraja reported %s cents",
            payment.id, payment.amount_cents, int(reported_amount) * 100,
        )
        db.session.execute(
            update(Payment).where(Payment.id == payment.id).values(
                result_desc=f"{result_desc} — AMOUNT MISMATCH, needs manual review"
            )
        )
        db.session.commit()
        return

    if receipt_number:
        db.session.execute(update(Payment).where(Payment.id == payment.id).values(provider_reference=receipt_number))
    elif not metadata_items:
        # Resolved via the query endpoint, not the real callback — Daraja
        # confirms success but this endpoint never returns a receipt number.
        # If the real callback shows up later, our idempotency guard above
        # will no-op it (status is no longer "pending"), so the receipt
        # number is permanently unavailable for this payment — documented
        # limitation of manual reconciliation, not a bug.
        db.session.execute(
            update(Payment).where(Payment.id == payment.id).values(
                result_desc=f"{result_desc} (confirmed via manual status check — no M-Pesa receipt number available)"
            )
        )
    db.session.commit()

    invoice.status = "paid"
    invoice.paid_at = utcnow()
    db.session.commit()

    _after_invoice_paid(invoice, payment)


def _after_invoice_paid(invoice, payment):
    """Shared by resolve_payment and record_manual_payment — the one place
    a newly-paid invoice triggers what comes next, regardless of how it
    was paid. Lazy import: project_service imports this module (for
    create_balance_invoice), so a top-level import here would be a cycle.
    """
    from . import project_service

    if invoice.kind == "deposit":
        project_service.create_from_deposit_payment(invoice)
    elif invoice.kind == "balance":
        token = token_service.issue("project", invoice.quote.project.id)
        email_service.send_files_ready(invoice.quote.project, token)

    email_service.send_payment_received(invoice, payment)


def record_manual_payment(invoice: Invoice, method: str, amount_cents: int, manual_reference: str, note: str) -> Payment:
    """Admin-only: bank transfer / cheque / cash. manual_reference is a
    plain non-unique column — never provider_reference, which is reserved
    exclusively for the M-Pesa idempotency guarantee (two manual payments
    both referenced "cash" must never collide against that constraint).
    """
    payment = Payment(
        invoice_id=invoice.id,
        method="manual",
        status="success",
        amount_cents=amount_cents,
        manual_reference=manual_reference,
        result_desc=note,
        completed_at=utcnow(),
    )
    db.session.add(payment)

    if amount_cents >= invoice.amount_cents:
        invoice.status = "paid"
        invoice.paid_at = utcnow()

    db.session.commit()

    if invoice.status == "paid":
        _after_invoice_paid(invoice, payment)

    return payment

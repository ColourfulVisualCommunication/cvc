"""Phase 5 (Money) — the pieces that don't need a live Daraja call: phone
normalization, the STK password/timestamp scheme, invoice-creation
rounding, PDF generation, and — the one this whole suite exists to guard —
the idempotency transition in invoice_service.resolve_payment. Daraja's
HTTP calls are never made here; the live sandbox pass (via ngrok) covers
the real network round-trip separately.
"""
import base64

import pytest

from app import create_app
from app.extensions import db
from app.models import Quote, QuoteItem
from app.models.invoice import Payment
from app.services import invoice_service, mpesa_service, pdf_service
from config import Config

TEST_CLIENT_EMAIL = "pytest-invoice-client@example.com"


class TestConfig(Config):
    TESTING = True


@pytest.fixture
def app_context():
    app = create_app(TestConfig)
    with app.app_context():
        yield


@pytest.fixture
def quote_and_invoice(app_context):
    quote = Quote(client_name="Pytest Client", client_email=TEST_CLIENT_EMAIL, title="Test Project", status="accepted")
    quote.items.append(QuoteItem(description="Design", quantity=1, unit_price_cents=100050))  # KES 1000.50
    db.session.add(quote)
    db.session.commit()

    invoice = invoice_service.create_for_quote(quote)

    yield quote, invoice

    db.session.delete(quote)  # cascades to items and the invoice
    db.session.commit()


# --- mpesa_service: pure logic, no network -------------------------------


def test_normalize_phone_accepts_common_formats():
    assert mpesa_service._normalize_phone("0712345678") == "254712345678"
    assert mpesa_service._normalize_phone("+254712345678") == "254712345678"
    assert mpesa_service._normalize_phone("254712345678") == "254712345678"
    assert mpesa_service._normalize_phone("712345678") == "254712345678"


def test_normalize_phone_rejects_garbage():
    with pytest.raises(mpesa_service.MpesaError):
        mpesa_service._normalize_phone("not a phone number")


def test_password_and_timestamp_shape(app_context):
    password, timestamp = mpesa_service._password_and_timestamp()
    assert len(timestamp) == 14 and timestamp.isdigit()
    decoded = base64.b64decode(password).decode()
    assert decoded.endswith(timestamp)


# --- invoice_service.create_for_quote: rounding ---------------------------


def test_invoice_amount_is_rounded_to_whole_shillings(quote_and_invoice):
    quote, invoice = quote_and_invoice
    assert quote.deposit_cents == 50025  # 50% of 100050 — not a whole shilling
    assert invoice.amount_cents % 100 == 0
    assert invoice.amount_cents == 50000  # rounded to KES 500


# --- invoice_service.resolve_payment: the idempotency guard ---------------


def _mpesa_metadata(amount_cents, receipt="TESTREC123"):
    return [
        {"Name": "Amount", "Value": amount_cents // 100},
        {"Name": "MpesaReceiptNumber", "Value": receipt},
        {"Name": "TransactionDate", "Value": 20260101120000},
        {"Name": "PhoneNumber", "Value": 254712345678},
    ]


def test_resolve_payment_success_marks_invoice_paid_and_sends_one_email(quote_and_invoice, monkeypatch):
    quote, invoice = quote_and_invoice
    payment = Payment(
        invoice_id=invoice.id, method="mpesa", status="pending",
        amount_cents=invoice.amount_cents, checkout_request_id="ws_CO_test_1",
    )
    db.session.add(payment)
    db.session.commit()

    sent = []
    monkeypatch.setattr(invoice_service.email_service, "send_payment_received", lambda inv, pay: sent.append(pay.id))

    invoice_service.resolve_payment(
        payment, result_code=0, result_desc="Success",
        metadata_items=_mpesa_metadata(invoice.amount_cents, receipt="TESTREC-SUCCESS"),
    )

    db.session.refresh(payment)
    db.session.refresh(invoice)
    assert payment.status == "success"
    assert payment.provider_reference == "TESTREC-SUCCESS"
    assert invoice.status == "paid"
    assert len(sent) == 1


def test_resolve_payment_is_idempotent_against_a_retried_callback(quote_and_invoice, monkeypatch):
    """The regression test for the TOCTOU fix: the exact same success
    result, applied to the same payment row twice, must only ever resolve
    once — one status transition, one email."""
    quote, invoice = quote_and_invoice
    payment = Payment(
        invoice_id=invoice.id, method="mpesa", status="pending",
        amount_cents=invoice.amount_cents, checkout_request_id="ws_CO_test_2",
    )
    db.session.add(payment)
    db.session.commit()

    sent = []
    monkeypatch.setattr(invoice_service.email_service, "send_payment_received", lambda inv, pay: sent.append(pay.id))

    metadata = _mpesa_metadata(invoice.amount_cents, receipt="TESTREC-RETRY")
    invoice_service.resolve_payment(payment, result_code=0, result_desc="Success", metadata_items=metadata)
    invoice_service.resolve_payment(payment, result_code=0, result_desc="Success", metadata_items=metadata)

    assert len(sent) == 1, "a retried callback must never send a second receipt email"


def test_resolve_payment_amount_mismatch_does_not_mark_invoice_paid(quote_and_invoice, monkeypatch):
    quote, invoice = quote_and_invoice
    payment = Payment(
        invoice_id=invoice.id, method="mpesa", status="pending",
        amount_cents=invoice.amount_cents, checkout_request_id="ws_CO_test_3",
    )
    db.session.add(payment)
    db.session.commit()

    sent = []
    monkeypatch.setattr(invoice_service.email_service, "send_payment_received", lambda inv, pay: sent.append(pay.id))

    # Daraja reports a different amount than what we asked for.
    mismatched_metadata = _mpesa_metadata(invoice.amount_cents + 10000)
    invoice_service.resolve_payment(payment, result_code=0, result_desc="Success", metadata_items=mismatched_metadata)

    db.session.refresh(payment)
    db.session.refresh(invoice)
    assert payment.status == "success"  # it did succeed on Daraja's side
    assert invoice.status == "pending"  # but not auto-marked paid
    assert "MISMATCH" in payment.result_desc
    assert len(sent) == 0


def test_resolve_payment_failure_does_not_mark_invoice_paid(quote_and_invoice):
    quote, invoice = quote_and_invoice
    payment = Payment(
        invoice_id=invoice.id, method="mpesa", status="pending",
        amount_cents=invoice.amount_cents, checkout_request_id="ws_CO_test_4",
    )
    db.session.add(payment)
    db.session.commit()

    invoice_service.resolve_payment(payment, result_code=1032, result_desc="Request cancelled by user")

    db.session.refresh(payment)
    db.session.refresh(invoice)
    assert payment.status == "cancelled"
    assert invoice.status == "pending"


# --- pdf_service: smoke tests ---------------------------------------------


def test_invoice_pdf_is_a_real_pdf(quote_and_invoice):
    pdf_bytes = pdf_service.invoice_pdf_bytes(quote_and_invoice[1])
    assert pdf_bytes.startswith(b"%PDF")
    assert len(pdf_bytes) > 100


def test_receipt_pdf_is_a_real_pdf(quote_and_invoice):
    quote, invoice = quote_and_invoice
    payment = Payment(invoice_id=invoice.id, method="manual", status="success", amount_cents=invoice.amount_cents, manual_reference="CHQ-001")
    db.session.add(payment)
    db.session.commit()

    pdf_bytes = pdf_service.receipt_pdf_bytes(invoice, payment)
    assert pdf_bytes.startswith(b"%PDF")
    assert len(pdf_bytes) > 100

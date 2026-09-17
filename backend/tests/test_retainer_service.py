"""Phase 7 (Retainers) — the deterministic logic: the month-advance date
math (and its drift regression), the due/skip-unpaid invoice-generation
rule, the locked monthly_amount_cents snapshot, and find-or-create-by-email
client lookup. No real Brevo/M-Pesa calls here.

Retainer/Client/retainer-kind Invoice rows are all brand new as of this
phase — nothing pre-existing in the shared dev/prod database can collide
with these tests the way an older, heavily-used table might, so real rows
are created and torn down directly, matching every other file in this suite.
"""
from datetime import date

import pytest

from app import create_app
from app.extensions import db
from app.models import Client, Service
from app.models.retainer import Retainer
from app.services import invoice_service, retainer_service
from config import Config

TEST_CLIENT_EMAIL = "pytest-retainer-client@example.com"


class TestConfig(Config):
    TESTING = True


@pytest.fixture
def app_context():
    app = create_app(TestConfig)
    with app.app_context():
        yield
        # See test_invoice_service.py's app_context fixture for why this
        # dispose() matters — undisposed engines across a full suite run
        # exhaust Supabase's session-mode connection cap.
        db.engine.dispose()


@pytest.fixture
def service(app_context):
    s = Service(slug="pytest-retainer-plan", name="Pytest Digital Care", price_type="fixed", price_cents=500000)
    db.session.add(s)
    db.session.commit()
    yield s
    db.session.delete(s)
    db.session.commit()


@pytest.fixture
def client_row(app_context):
    c = Client(name="Pytest Retainer Client", email=TEST_CLIENT_EMAIL)
    db.session.add(c)
    db.session.commit()
    yield c
    db.session.delete(c)
    db.session.commit()


@pytest.fixture
def retainer(service, client_row):
    r = Retainer(
        client_id=client_row.id,
        service_id=service.id,
        plan_name=service.name,
        monthly_amount_cents=450000,  # locked — deliberately different from service.price_cents
        billing_day=28,
        next_invoice_date=date(2026, 1, 28),
        started_at=date(2026, 1, 28),
    )
    db.session.add(r)
    db.session.commit()
    yield r
    for inv in list(r.invoices):
        db.session.delete(inv)
    db.session.delete(r)
    db.session.commit()


# --- _advance_one_month: the drift regression -------------------------------


def test_advance_one_month_no_drift_from_day_28():
    d = date(2026, 1, 28)
    d = retainer_service._advance_one_month(d)
    assert d == date(2026, 2, 28)
    d = retainer_service._advance_one_month(d)
    assert d == date(2026, 3, 28)
    d = retainer_service._advance_one_month(d)
    assert d == date(2026, 4, 28)


def test_advance_one_month_rolls_over_year():
    assert retainer_service._advance_one_month(date(2026, 12, 15)) == date(2027, 1, 15)


# --- generate_due_invoices ---------------------------------------------------


def test_generate_due_invoices_creates_and_advances_cycle(retainer):
    result = retainer_service.generate_due_invoices(today=date(2026, 1, 28))

    assert len(result["created"]) == 1
    invoice = result["created"][0]
    assert invoice.kind == "retainer"
    assert invoice.retainer_id == retainer.id
    assert invoice.quote_id is None
    assert invoice.amount_cents == 450000  # the locked snapshot, not service.price_cents

    db.session.refresh(retainer)
    assert retainer.next_invoice_date == date(2026, 2, 28)


def test_generate_due_invoices_ignores_not_yet_due(retainer):
    result = retainer_service.generate_due_invoices(today=date(2026, 1, 1))
    assert result["created"] == []


def test_generate_due_invoices_skips_a_retainer_with_an_unpaid_invoice(retainer):
    first = retainer_service.generate_due_invoices(today=date(2026, 1, 28))
    assert len(first["created"]) == 1
    db.session.refresh(retainer)
    assert retainer.next_invoice_date == date(2026, 2, 28)

    # Still due (or newly due) on the next cycle, but the first invoice is
    # still pending — must be skipped, not stacked with a second one.
    second = retainer_service.generate_due_invoices(today=date(2026, 2, 28))
    assert second["created"] == []
    assert len(second["skipped_unpaid"]) == 1
    db.session.refresh(retainer)
    assert retainer.next_invoice_date == date(2026, 2, 28)  # unchanged — not advanced while skipped


def test_generate_due_invoices_ignores_paused_retainer(retainer):
    retainer.status = "paused"
    db.session.commit()

    result = retainer_service.generate_due_invoices(today=date(2026, 1, 28))
    assert result["created"] == []


# --- generate_invoice_now ----------------------------------------------------


def test_generate_invoice_now_creates_an_invoice(retainer):
    invoice = retainer_service.generate_invoice_now(retainer)
    assert invoice is not None
    assert invoice.kind == "retainer"
    assert invoice.amount_cents == 450000


def test_generate_invoice_now_refuses_when_a_pending_invoice_exists(retainer):
    first = retainer_service.generate_invoice_now(retainer)
    assert first is not None

    second = retainer_service.generate_invoice_now(retainer)
    assert second is None


# --- _find_or_create_client ---------------------------------------------------


def test_find_or_create_client_reuses_existing_by_email(client_row):
    found = retainer_service._find_or_create_client("Different Name", TEST_CLIENT_EMAIL)
    assert found.id == client_row.id
    assert found.name == "Pytest Retainer Client"  # not overwritten


def test_find_or_create_client_creates_new_when_no_match(app_context):
    email = "pytest-retainer-newclient@example.com"
    created = retainer_service._find_or_create_client("Brand New Client", email)
    try:
        assert created.id is not None
        assert created.email == email
    finally:
        db.session.delete(created)
        db.session.commit()

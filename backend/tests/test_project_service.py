"""Phase 6 (Projects & delivery) — the deterministic logic: Project
auto-creation on a paid deposit (and NOT on a balance payment), the
balance-invoice amount/zero-guard, is_fully_paid/balance_due_cents
arithmetic across deposit+balance payments, the approval audit trail (two
rows, never one mutated), and the Deliverable.version computation rule.
No real Cloudinary calls here — file_service is exercised live separately
(signed upload signatures and view/download URLs were hand-verified
against the real API during development).
"""
from datetime import timedelta

import pytest

from app import create_app
from app.extensions import db
from app.models import Quote, QuoteItem
from app.models.invoice import Invoice, Payment
from app.models.project import Project
from app.models.service import utcnow
from app.services import invoice_service, project_service
from config import Config

TEST_CLIENT_EMAIL = "pytest-project-client@example.com"


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


@pytest.fixture(autouse=True)
def no_real_emails(app_context, monkeypatch):
    # Every project_service/email-triggering path in this file is
    # exercised without hitting Brevo — patch at the email_service module
    # boundary so a missing/invalid BREVO_API_KEY can never fail a test.
    from app.services import email_service

    for name in (
        "send_brief_needed",
        "send_ready_for_approval",
        "send_files_ready",
        "send_payment_received",
        "send_project_followup",
    ):
        monkeypatch.setattr(email_service, name, lambda *a, **k: True)


@pytest.fixture(autouse=True)
def cleanup_client_row(app_context):
    # send_due_followups() calls retainer_service._find_or_create_client,
    # which will create a real Client row for TEST_CLIENT_EMAIL the first
    # time a follow-up test runs and none exists yet. Clean it up after
    # every test so no test-created row lingers in the shared database.
    from app.models import Client

    yield
    Client.query.filter_by(email=TEST_CLIENT_EMAIL).delete()
    db.session.commit()


@pytest.fixture
def quote(app_context):
    q = Quote(client_name="Pytest Client", client_email=TEST_CLIENT_EMAIL, title="Test Project", status="accepted")
    q.items.append(QuoteItem(description="Design", quantity=1, unit_price_cents=200000))  # KES 2000 total
    db.session.add(q)
    db.session.commit()
    yield q
    db.session.delete(q)
    db.session.commit()


def _paid_deposit_invoice(quote, amount_cents=None):
    invoice = invoice_service.create_for_quote(quote)
    if amount_cents is not None:
        invoice.amount_cents = amount_cents
    payment = Payment(invoice_id=invoice.id, method="manual", status="success", amount_cents=invoice.amount_cents)
    db.session.add(payment)
    invoice.status = "paid"
    db.session.commit()
    return invoice


# --- Project auto-creation --------------------------------------------------


def test_create_from_deposit_payment_creates_project(quote):
    invoice = _paid_deposit_invoice(quote)
    project = project_service.create_from_deposit_payment(invoice)

    assert project is not None
    assert project.status == "brief"
    assert project.quote_id == quote.id


def test_create_from_deposit_payment_ignores_balance_kind(quote):
    invoice = Invoice(quote_id=quote.id, kind="balance", amount_cents=100000, status="paid")
    db.session.add(invoice)
    db.session.commit()

    assert project_service.create_from_deposit_payment(invoice) is None
    assert quote.project is None


def test_create_from_deposit_payment_is_idempotent(quote):
    invoice = _paid_deposit_invoice(quote)
    first = project_service.create_from_deposit_payment(invoice)
    second = project_service.create_from_deposit_payment(invoice)

    assert first.id == second.id
    assert Quote.query.get(quote.id).project.id == first.id


# --- Brief -------------------------------------------------------------


def test_submit_brief_transitions_to_in_progress(quote):
    project = project_service.create_from_deposit_payment(_paid_deposit_invoice(quote))
    project_service.submit_brief(project, "Here's what we want.")

    assert project.status == "in_progress"
    assert project.brief_text == "Here's what we want."
    assert project.brief_submitted_at is not None


def test_add_brief_asset_caps_at_max(quote):
    project = project_service.create_from_deposit_payment(_paid_deposit_invoice(quote))
    for i in range(20):
        project_service.add_brief_asset(project, f"cvc/projects/{project.id}/file{i}", "image", f"file{i}.jpg")

    with pytest.raises(ValueError):
        project_service.add_brief_asset(project, f"cvc/projects/{project.id}/one_too_many", "image", "x.jpg")


def test_add_brief_asset_blocked_after_brief_submitted(quote):
    project = project_service.create_from_deposit_payment(_paid_deposit_invoice(quote))
    project_service.submit_brief(project, "Notes.")

    with pytest.raises(ValueError):
        project_service.add_brief_asset(project, f"cvc/projects/{project.id}/late", "image", "late.jpg")


# --- Deliverable versioning ----------------------------------------------


def test_deliverable_version_reused_before_decision(quote):
    project = project_service.create_from_deposit_payment(_paid_deposit_invoice(quote))
    d1 = project_service.add_deliverable(project, f"cvc/projects/{project.id}/a", "image", "a.jpg", "jpg")
    d2 = project_service.add_deliverable(project, f"cvc/projects/{project.id}/b", "image", "b.jpg", "jpg")

    assert d1.version == 1
    assert d2.version == 1  # same undecided round


def test_deliverable_version_increments_after_a_decision(quote):
    project = project_service.create_from_deposit_payment(_paid_deposit_invoice(quote))
    project_service.add_deliverable(project, f"cvc/projects/{project.id}/a", "image", "a.jpg", "jpg")
    project_service.publish_for_approval(project)
    project_service.request_changes(project, "Needs a different colour.")

    d2 = project_service.add_deliverable(project, f"cvc/projects/{project.id}/b", "image", "b.jpg", "jpg")
    assert d2.version == 2  # round 1 was decided (changes requested), this starts round 2


# --- Approval audit trail --------------------------------------------------


def test_approval_audit_trail_is_two_rows_not_one_mutated(quote):
    project = project_service.create_from_deposit_payment(_paid_deposit_invoice(quote))
    project_service.add_deliverable(project, f"cvc/projects/{project.id}/a", "image", "a.jpg", "jpg")
    project_service.publish_for_approval(project)
    project_service.request_changes(project, "Needs work.")

    project_service.add_deliverable(project, f"cvc/projects/{project.id}/b", "image", "b.jpg", "jpg")
    project_service.publish_for_approval(project)
    project_service.approve(project)

    assert len(project.approvals) == 2
    assert [a.status for a in project.approvals] == ["changes_requested", "approved"] or {
        a.status for a in project.approvals
    } == {"changes_requested", "approved"}


def test_request_changes_requires_a_note(quote):
    project = project_service.create_from_deposit_payment(_paid_deposit_invoice(quote))
    project_service.add_deliverable(project, f"cvc/projects/{project.id}/a", "image", "a.jpg", "jpg")
    project_service.publish_for_approval(project)

    with pytest.raises(ValueError):
        project_service.request_changes(project, "")


# --- Balance invoice + payment arithmetic ----------------------------------


def test_approve_creates_balance_invoice_for_remaining_amount(quote):
    # quote.total_cents = 200000, 50% deposit = 100000 paid
    project = project_service.create_from_deposit_payment(_paid_deposit_invoice(quote))
    project_service.add_deliverable(project, f"cvc/projects/{project.id}/a", "image", "a.jpg", "jpg")
    project_service.publish_for_approval(project)
    project_service.approve(project)

    balance = quote.balance_invoice
    assert balance is not None
    assert balance.kind == "balance"
    assert balance.amount_cents == 100000
    assert project.status == "complete"
    assert project.is_fully_paid is False


def test_approve_skips_balance_invoice_when_deposit_covers_total(quote):
    # Pay the full total as the "deposit" (e.g. a generous manual payment).
    project = project_service.create_from_deposit_payment(_paid_deposit_invoice(quote, amount_cents=200000))
    project_service.add_deliverable(project, f"cvc/projects/{project.id}/a", "image", "a.jpg", "jpg")
    project_service.publish_for_approval(project)
    project_service.approve(project)

    assert quote.balance_invoice is None
    assert project.is_fully_paid is True


def test_is_fully_paid_flips_once_balance_is_paid(quote):
    project = project_service.create_from_deposit_payment(_paid_deposit_invoice(quote))
    project_service.add_deliverable(project, f"cvc/projects/{project.id}/a", "image", "a.jpg", "jpg")
    project_service.publish_for_approval(project)
    project_service.approve(project)

    assert project.is_fully_paid is False
    assert project.balance_due_cents == 100000

    balance = quote.balance_invoice
    invoice_service.record_manual_payment(balance, method="bank_transfer", amount_cents=100000, manual_reference="TXN1", note=None)

    assert project.is_fully_paid is True
    assert project.balance_due_cents == 0


def test_approve_sets_completed_at(quote):
    project = project_service.create_from_deposit_payment(_paid_deposit_invoice(quote))
    project_service.add_deliverable(project, f"cvc/projects/{project.id}/a", "image", "a.jpg", "jpg")
    project_service.publish_for_approval(project)

    assert project.completed_at is None
    project_service.approve(project)
    assert project.completed_at is not None


# --- Phase 7: post-project follow-up sweep ----------------------------------
#
# send_due_followups() does a global Project.query sweep across the whole
# (shared, production) table — unlike every other fixture-scoped test
# above. Before mutating anything, each test below confirms no *real*
# project already matches the sweep's filter; if one does, it skips rather
# than risk silently marking a real client's project as "already followed
# up" (permanently, since followup_sent_at is never unset) without ever
# actually emailing them.


def _skip_if_real_projects_already_due(cutoff):
    preexisting = Project.query.filter(
        Project.status == "complete",
        Project.completed_at.isnot(None),
        Project.completed_at <= cutoff,
        Project.followup_sent_at.is_(None),
    ).count()
    if preexisting:
        pytest.skip(
            f"{preexisting} real completed project(s) already match the follow-up sweep filter — "
            "skipping to avoid touching production data"
        )


def _completed_project(quote, completed_at, fully_paid=True):
    project = project_service.create_from_deposit_payment(
        _paid_deposit_invoice(quote, amount_cents=quote.total_cents if fully_paid else None)
    )
    project_service.add_deliverable(project, f"cvc/projects/{project.id}/a", "image", "a.jpg", "jpg")
    project_service.publish_for_approval(project)
    project_service.approve(project)
    project.completed_at = completed_at
    db.session.commit()
    return project


def test_send_due_followups_sends_and_marks_when_due(quote, monkeypatch):
    cutoff = utcnow() - timedelta(days=project_service.FOLLOWUP_DELAY_DAYS)
    _skip_if_real_projects_already_due(cutoff)

    project = _completed_project(quote, completed_at=cutoff - timedelta(days=1))

    sent = []
    from app.services import email_service

    monkeypatch.setattr(email_service, "send_project_followup", lambda proj, tok: sent.append(proj.id) or True)

    result = project_service.send_due_followups()

    assert project.id in [p.id for p in result["sent"]]
    assert sent == [project.id]
    assert project.followup_sent_at is not None


def test_send_due_followups_skips_not_yet_due(quote, monkeypatch):
    cutoff = utcnow() - timedelta(days=project_service.FOLLOWUP_DELAY_DAYS)
    _skip_if_real_projects_already_due(cutoff)

    project = _completed_project(quote, completed_at=utcnow())  # just completed, nowhere near due

    result = project_service.send_due_followups()

    assert project.id not in [p.id for p in result["sent"]]
    assert project.followup_sent_at is None


def test_send_due_followups_skips_unpaid_project_without_resetting_clock(quote, monkeypatch):
    cutoff = utcnow() - timedelta(days=project_service.FOLLOWUP_DELAY_DAYS)
    _skip_if_real_projects_already_due(cutoff)

    project = _completed_project(quote, completed_at=cutoff - timedelta(days=1), fully_paid=False)
    assert project.is_fully_paid is False

    result = project_service.send_due_followups()

    assert project.id not in [p.id for p in result["sent"]]
    assert project.followup_sent_at is None  # still unset — picked up later once paid


def test_send_due_followups_is_idempotent(quote, monkeypatch):
    cutoff = utcnow() - timedelta(days=project_service.FOLLOWUP_DELAY_DAYS)
    _skip_if_real_projects_already_due(cutoff)

    project = _completed_project(quote, completed_at=cutoff - timedelta(days=1))

    sent = []
    from app.services import email_service

    monkeypatch.setattr(email_service, "send_project_followup", lambda proj, tok: sent.append(proj.id) or True)

    project_service.send_due_followups()
    project_service.send_due_followups()

    assert len(sent) == 1, "a second sweep must never re-email an already-followed-up project"


def test_send_due_followups_opt_out_marks_without_emailing(quote, monkeypatch):
    cutoff = utcnow() - timedelta(days=project_service.FOLLOWUP_DELAY_DAYS)
    _skip_if_real_projects_already_due(cutoff)

    project = _completed_project(quote, completed_at=cutoff - timedelta(days=1))

    from app.models import Client
    from app.services import email_service

    client = Client(name="Opted Out", email=TEST_CLIENT_EMAIL, followup_opt_out=True)
    db.session.add(client)
    db.session.commit()

    sent = []
    monkeypatch.setattr(email_service, "send_project_followup", lambda proj, tok: sent.append(proj.id) or True)

    try:
        result = project_service.send_due_followups()
        assert sent == []
        assert project.id in [p.id for p in result["skipped_opted_out"]]
        assert project.followup_sent_at is not None  # marked handled, never retried
    finally:
        db.session.delete(client)
        db.session.commit()

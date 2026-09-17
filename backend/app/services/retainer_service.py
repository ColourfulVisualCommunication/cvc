"""Advances retainer billing cycles and creates the self-generating
monthly invoices — the core of Phase 7. See CLAUDE.md / the Phase 7 build
plan for full scope.
"""
from datetime import date

from ..extensions import db
from ..models.client import Client
from ..models.retainer import Retainer
from . import invoice_service


def _find_or_create_client(name: str, email: str = None, phone: str = None) -> Client:
    """Looked up by email when one is given — the only field that reliably
    identifies the same person across a Retainer or a Project follow-up.
    A blank email always creates a new row rather than risking two
    unrelated people silently merging under a shared blank match.
    """
    if email:
        existing = Client.query.filter_by(email=email).first()
        if existing:
            return existing
    client = Client(name=name, email=email, phone=phone)
    db.session.add(client)
    db.session.commit()
    return client


def _advance_one_month(d: date) -> date:
    """Recomputed fresh from (year, month, day) every cycle — never via
    repeated relative-month addition, which drifts permanently downward
    the first time it clamps a 31st to a 28th. Retainer.billing_day is
    capped 1-28 at creation, so this never needs end-of-month clamping
    at all.
    """
    year, month = d.year, d.month + 1
    if month > 12:
        year, month = year + 1, 1
    return date(year, month, d.day)


def generate_due_invoices(today=None) -> dict:
    """Called by the daily sweep (job_runner_service) — one invoice per
    active retainer whose next_invoice_date has arrived, then the cycle
    advances. A retainer with a still-unpaid invoice is skipped rather
    than stacked with a second one; it stays due and is picked up again
    on a later run once that invoice resolves (paid, or an admin writes
    it off some other way).
    """
    today = today or date.today()
    created, skipped_unpaid = [], []
    due = Retainer.query.filter(Retainer.status == "active", Retainer.next_invoice_date <= today).all()
    for retainer in due:
        if any(inv.status == "pending" for inv in retainer.invoices):
            skipped_unpaid.append(retainer)
            continue
        invoice = invoice_service.create_for_retainer(retainer)
        retainer.next_invoice_date = _advance_one_month(retainer.next_invoice_date)
        db.session.commit()
        created.append(invoice)
    return {"created": created, "skipped_unpaid": skipped_unpaid}


def generate_invoice_now(retainer):
    """Admin 'bill this retainer today' override — same unpaid-guard as
    the daily sweep. Does not touch next_invoice_date: this is a one-off
    manual bill, not a schedule change, so the regular cycle still fires
    on its own next_invoice_date regardless.
    """
    if any(inv.status == "pending" for inv in retainer.invoices):
        return None
    return invoice_service.create_for_retainer(retainer)

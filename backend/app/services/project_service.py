"""Turns a paid deposit into a project, and walks it through the delivery
state machine: brief -> in_progress -> awaiting_approval -> complete. See
CLAUDE.md / the Phase 6 plan for the full state-transition table.
"""
from datetime import timedelta

from ..extensions import db
from ..models.project import Project, Deliverable, Approval, MAX_BRIEF_ASSETS
from ..models.service import utcnow
from . import email_service, token_service

PROJECT_TOKEN_MAX_AGE_DAYS = 365

# Six weeks — the post-project follow-up (the sixth and final of CLAUDE.md's
# six canonical emails). Anchored to Project.completed_at, not to when the
# balance is paid; see send_due_followups for what that means if payment
# lands late.
FOLLOWUP_DELAY_DAYS = 42


def create_from_deposit_payment(invoice):
    """Called from invoice_service after a deposit invoice is marked paid.
    Idempotent against being called twice (e.g. resolve_payment and a
    later admin reconciliation both resolving the same payment can't
    happen — resolve_payment's own atomic guard prevents that — but this
    is cheap insurance and keeps the function safe to call defensively).
    """
    if invoice.kind != "deposit":
        return None
    if invoice.quote.project is not None:
        return invoice.quote.project

    project = Project(quote_id=invoice.quote_id)
    db.session.add(project)
    db.session.commit()

    token = token_service.issue("project", project.id)
    email_service.send_brief_needed(project, token)
    return project


def submit_brief(project, brief_text):
    project.brief_text = brief_text
    project.brief_submitted_at = utcnow()
    project.status = "in_progress"
    db.session.commit()
    return project


def add_brief_asset(project, public_id, resource_type, filename):
    if project.status != "brief":
        raise ValueError("The brief has already been submitted")
    assets = list(project.brief_assets or [])
    if len(assets) >= MAX_BRIEF_ASSETS:
        raise ValueError(f"Up to {MAX_BRIEF_ASSETS} reference files only")
    assets.append(
        {
            "public_id": public_id,
            "resource_type": resource_type,
            "filename": filename,
            "uploaded_at": utcnow().isoformat(),
        }
    )
    project.brief_assets = assets
    db.session.commit()
    return project


def add_deliverable(project, public_id, resource_type, filename, file_format):
    """version: reuses the current max version if it has no Approval yet
    (still an undecided draft round); increments past it once that round
    has been decided. Fully server-computed — never trusted from a
    request, so a client can't corrupt round numbering by supplying one.
    """
    current = project.current_version
    decided = current and any(a.version == current for a in project.approvals)
    version = current + 1 if (decided or current == 0) else current

    deliverable = Deliverable(
        project_id=project.id,
        version=version,
        public_id=public_id,
        resource_type=resource_type,
        original_filename=filename,
        format=file_format,
    )
    db.session.add(deliverable)
    db.session.commit()
    return deliverable


def publish_for_approval(project):
    if not any(d.version == project.current_version for d in project.deliverables):
        raise ValueError("Upload at least one deliverable before publishing")
    project.status = "awaiting_approval"
    db.session.commit()

    token = token_service.issue("project", project.id)
    email_service.send_ready_for_approval(project, token)
    return project


def approve(project):
    approval = Approval(project_id=project.id, version=project.current_version, status="approved")
    db.session.add(approval)
    project.status = "complete"
    project.completed_at = utcnow()
    db.session.commit()

    # Lazy import: invoice_service imports this module (for
    # create_from_deposit_payment), so a top-level import here would be a
    # cycle — same idiom as email_service's lazy pdf_service import.
    from . import invoice_service

    invoice_service.create_balance_invoice(project)
    return approval


def request_changes(project, note):
    if not note:
        raise ValueError("A note is required when requesting changes")
    approval = Approval(
        project_id=project.id, version=project.current_version, status="changes_requested", client_note=note
    )
    db.session.add(approval)
    project.status = "in_progress"
    db.session.commit()
    return approval


def send_due_followups(today=None) -> dict:
    """Called by the daily sweep (job_runner_service) — every completed,
    fully-paid project whose six-week clock has run and hasn't been
    emailed yet gets the post-project follow-up (CLAUDE.md's sixth and
    final canonical email). Idempotent the same way Quote.reminder_sent_at
    already is: followup_sent_at is set exactly once and never unset, so a
    second sweep the same day (or any later day) is a no-op for this
    project.
    """
    from . import retainer_service  # lazy: avoids a cycle, same idiom as invoice_service above

    today = today or utcnow()
    cutoff = today - timedelta(days=FOLLOWUP_DELAY_DAYS)
    candidates = Project.query.filter(
        Project.status == "complete",
        Project.completed_at.isnot(None),
        Project.completed_at <= cutoff,
        Project.followup_sent_at.is_(None),
    ).all()

    sent, skipped_opted_out = [], []
    for project in candidates:
        if not project.is_fully_paid:
            # Can't unlock files for someone who can't download them yet —
            # picked up again on a later sweep once paid. The six-week
            # clock is NOT reset while waiting; see FOLLOWUP_DELAY_DAYS.
            continue

        quote = project.quote
        client = None
        if quote and quote.client_email:
            client = retainer_service._find_or_create_client(quote.client_name, quote.client_email)

        if client and client.followup_opt_out:
            project.followup_sent_at = utcnow()  # opted-out counts as "handled", never retried
            skipped_opted_out.append(project)
        else:
            token = token_service.issue("project", project.id)
            email_service.send_project_followup(project, token)
            project.followup_sent_at = utcnow()
            sent.append(project)
        db.session.commit()

    return {"sent": sent, "skipped_opted_out": skipped_opted_out}

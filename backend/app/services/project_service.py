"""Turns a paid deposit into a project, and walks it through the delivery
state machine: brief -> in_progress -> awaiting_approval -> complete. See
CLAUDE.md / the Phase 6 plan for the full state-transition table.
"""
from ..extensions import db
from ..models.project import Project, Deliverable, Approval, MAX_BRIEF_ASSETS
from ..models.service import utcnow
from . import email_service, token_service

PROJECT_TOKEN_MAX_AGE_DAYS = 365


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

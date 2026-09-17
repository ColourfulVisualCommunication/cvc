from .service import utcnow
from ..extensions import db

# brief: created the moment the deposit is paid, waiting on the client's
# brief. in_progress: brief submitted, work underway. awaiting_approval:
# admin has published a round of deliverables for review. complete: the
# client approved the current round — describes WORK progress only, not
# payment state (see Project.is_fully_paid, a separate orthogonal gate).
PROJECT_STATUSES = ("brief", "in_progress", "awaiting_approval", "complete")

# No "pending" — a review still awaiting a decision is just
# project.status == "awaiting_approval" with no Approval row yet for that
# version. A row only ever gets created once a decision is actually made,
# which is what makes this an audit trail: changes-requested-then-later-
# approved is two rows, never one overwritten.
APPROVAL_STATUSES = ("approved", "changes_requested")

# A public project link lives far longer than a quote's (it spans the
# whole delivery lifecycle), so the brief-assets list is capped rather
# than left open-ended against that longer-lived token.
MAX_BRIEF_ASSETS = 20


class Project(db.Model):
    """A private, per-client delivery space — created automatically the
    moment the deposit invoice is paid (see project_service), reached by
    its own signed link exactly like a quote (token kind "project").
    """

    __tablename__ = "projects"

    id = db.Column(db.Integer, primary_key=True)
    quote_id = db.Column(db.Integer, db.ForeignKey("quotes.id"), unique=True, nullable=False)

    status = db.Column(db.String(20), default="brief", nullable=False)

    brief_text = db.Column(db.Text)
    # Client's own reference files (existing logo, brand guide, photos) —
    # a JSON list of {public_id, resource_type, filename, uploaded_at},
    # not a table of its own: unversioned one-time input, unlike Deliverable.
    brief_assets = db.Column(db.JSON, default=list)
    brief_submitted_at = db.Column(db.DateTime(timezone=True))

    # Set inside project_service.approve(), alongside status="complete" —
    # matches how every other lifecycle timestamp in this codebase is
    # stored directly (quote.accepted_at, invoice.paid_at) rather than
    # inferred from a child row. Phase 7's post-project follow-up sweep
    # anchors its six-week clock to this.
    completed_at = db.Column(db.DateTime(timezone=True))
    # Mirrors Quote.reminder_sent_at's exact idempotency-gate role — set
    # once the follow-up email actually goes out (or the client is
    # opted-out), never re-sent after.
    followup_sent_at = db.Column(db.DateTime(timezone=True))

    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    deliverables = db.relationship(
        "Deliverable", backref="project", order_by="Deliverable.uploaded_at", cascade="all, delete-orphan"
    )
    approvals = db.relationship(
        "Approval", backref="project", order_by="Approval.decided_at", cascade="all, delete-orphan"
    )

    @property
    def paid_cents(self):
        return sum(
            payment.amount_cents
            for invoice in self.quote.invoices
            for payment in invoice.payments
            if payment.status == "success"
        )

    @property
    def balance_due_cents(self):
        return max(self.quote.total_cents - self.paid_cents, 0)

    @property
    def is_fully_paid(self):
        return self.balance_due_cents <= 0

    @property
    def current_version(self):
        return max((d.version for d in self.deliverables), default=0)

    def to_dict(self, include_deliverables=False, include_approvals=False):
        data = {
            "id": self.id,
            "quote_id": self.quote_id,
            "quote_title": self.quote.title if self.quote else None,
            "client_name": self.quote.client_name if self.quote else None,
            "status": self.status,
            "brief_text": self.brief_text,
            "brief_assets": self.brief_assets or [],
            "brief_submitted_at": self.brief_submitted_at.isoformat() if self.brief_submitted_at else None,
            "total_cents": self.quote.total_cents if self.quote else None,
            "paid_cents": self.paid_cents,
            "balance_due_cents": self.balance_due_cents,
            "is_fully_paid": self.is_fully_paid,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "followup_sent_at": self.followup_sent_at.isoformat() if self.followup_sent_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_deliverables:
            data["deliverables"] = [d.to_dict() for d in self.deliverables]
        if include_approvals:
            data["approvals"] = [a.to_dict() for a in self.approvals]
        return data

    def __repr__(self):
        return f"<Project {self.id} ({self.status}) for quote {self.quote_id}>"


class Deliverable(db.Model):
    """One uploaded file, admin's output. version is fully server-computed
    (see project_service.add_deliverable) — never client/admin-supplied.
    """

    __tablename__ = "deliverables"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False)

    version = db.Column(db.Integer, nullable=False)
    public_id = db.Column(db.String(255), nullable=False)
    resource_type = db.Column(db.String(20), nullable=False)
    original_filename = db.Column(db.String(255))
    format = db.Column(db.String(20))

    uploaded_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)

    def to_dict(self):
        # No stored URL — signed view/download URLs are generated fresh
        # per request (see app/services/file_service.py), never persisted.
        return {
            "id": self.id,
            "project_id": self.project_id,
            "version": self.version,
            "original_filename": self.original_filename,
            "format": self.format,
            "resource_type": self.resource_type,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
        }

    def __repr__(self):
        return f"<Deliverable {self.original_filename!r} v{self.version} for project {self.project_id}>"


class Approval(db.Model):
    """One approval decision. version is server-derived at decision time
    (the project's current max Deliverable.version) — never taken from the
    request body, so a client can't submit a decision against the wrong
    round.
    """

    __tablename__ = "approvals"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False)

    version = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), nullable=False)
    client_note = db.Column(db.Text)

    decided_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "version": self.version,
            "status": self.status,
            "client_note": self.client_note,
            "decided_at": self.decided_at.isoformat() if self.decided_at else None,
        }

    def __repr__(self):
        return f"<Approval {self.status} v{self.version} for project {self.project_id}>"

from .service import utcnow
from ..extensions import db

# active: billed on schedule. paused: skipped by the daily sweep entirely
# (not the same as "unpaid" — that's tracked per-invoice, not here).
# cancelled: terminal, kept for history rather than deleted (see
# Retainer.invoices — no cascade delete, a real financial record).
RETAINER_STATUSES = ("active", "paused", "cancelled")


class Retainer(db.Model):
    """A standing monthly billing arrangement. monthly_amount_cents is
    admin-entered and locked at creation/edit — never derived live from
    Service.price_cents (Growth Partner is price_type="quoted", a band
    with no single figure, and this codebase's own convention — see
    invoice_service.create_for_quote — is that an invoice amount is a
    locked snapshot of what was agreed, not a live price).
    """

    __tablename__ = "retainers"

    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey("clients.id"), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey("services.id"), nullable=False)
    service = db.relationship("Service")

    # Snapshot of Service.name at creation — survives a future service rename.
    plan_name = db.Column(db.String(160), nullable=False)
    monthly_amount_cents = db.Column(db.Integer, nullable=False)

    status = db.Column(db.String(20), default="active", nullable=False)

    # 1-28 only, validated at the API layer — caps next-cycle date math so
    # it never needs end-of-month clamping (see retainer_service._advance_one_month).
    billing_day = db.Column(db.Integer, nullable=False)
    next_invoice_date = db.Column(db.Date, nullable=False)
    started_at = db.Column(db.Date, nullable=False)
    cancelled_at = db.Column(db.DateTime(timezone=True))

    notes = db.Column(db.Text)

    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # No cascade="delete-orphan" — a retainer accumulates a real financial
    # history (months of paid invoices) that must never be deletable by
    # accident. See api/retainers.py's DELETE route, which refuses to
    # delete a retainer with any invoices at all.
    invoices = db.relationship("Invoice", backref="retainer", order_by="Invoice.created_at.desc()")

    def to_dict(self, include_invoices=False):
        data = {
            "id": self.id,
            "client_id": self.client_id,
            "client_name": self.client.name if self.client else None,
            "service_id": self.service_id,
            "plan_name": self.plan_name,
            "monthly_amount_cents": self.monthly_amount_cents,
            "status": self.status,
            "billing_day": self.billing_day,
            "next_invoice_date": self.next_invoice_date.isoformat() if self.next_invoice_date else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "cancelled_at": self.cancelled_at.isoformat() if self.cancelled_at else None,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_invoices:
            data["invoices"] = [i.to_dict() for i in self.invoices]
        return data

    def __repr__(self):
        return f"<Retainer {self.plan_name!r} for client {self.client_id} ({self.status})>"

from .service import utcnow
from ..extensions import db

# draft: still being built in the admin, never seen by the client.
# sent -> viewed -> accepted/declined happen client-side via the signed
# link; expired is set once expires_at passes without a decision.
QUOTE_STATUSES = ("draft", "sent", "viewed", "accepted", "declined", "expired")


class Quote(db.Model):
    __tablename__ = "quotes"

    id = db.Column(db.Integer, primary_key=True)
    lead_id = db.Column(db.Integer, db.ForeignKey("leads.id"), nullable=True)

    # Denormalized rather than a hard FK to a client record (that table
    # doesn't exist yet) — a quote is a snapshot of who it was sent to at
    # the time, even if the same person's details change or a lead never
    # existed for it (an admin can start a quote from scratch).
    client_name = db.Column(db.String(160), nullable=False)
    client_email = db.Column(db.String(255))
    client_phone = db.Column(db.String(40))

    title = db.Column(db.String(200), nullable=False)
    notes = db.Column(db.Text)
    deposit_percentage = db.Column(db.Integer, default=50, nullable=False)

    status = db.Column(db.String(20), default="draft", nullable=False)
    expires_at = db.Column(db.Date)

    sent_at = db.Column(db.DateTime(timezone=True))
    viewed_at = db.Column(db.DateTime(timezone=True))
    reminder_sent_at = db.Column(db.DateTime(timezone=True))
    accepted_at = db.Column(db.DateTime(timezone=True))
    declined_at = db.Column(db.DateTime(timezone=True))

    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    items = db.relationship(
        "QuoteItem", backref="quote", order_by="QuoteItem.sort_order", cascade="all, delete-orphan"
    )
    # A quote can have up to two invoices now (deposit + balance, Phase 6)
    # — this list is what actually owns the cascade-delete (deleting a
    # quote must not leave an orphaned invoice violating quote_id's NOT
    # NULL FK) and what every existing service function's `invoice.quote`
    # backref relies on. `deposit_invoice`/`balance_invoice` below are
    # deterministic single-row read accessors for the common case — do NOT
    # reintroduce a single `uselist=False` "invoice" relationship, that
    # becomes ambiguous (SQLAlchemy picks one arbitrarily, silently) the
    # moment a quote has two rows.
    invoices = db.relationship("Invoice", backref="quote", cascade="all, delete-orphan")
    deposit_invoice = db.relationship(
        "Invoice",
        primaryjoin="and_(Invoice.quote_id==Quote.id, Invoice.kind=='deposit')",
        uselist=False,
        viewonly=True,
    )
    balance_invoice = db.relationship(
        "Invoice",
        primaryjoin="and_(Invoice.quote_id==Quote.id, Invoice.kind=='balance')",
        uselist=False,
        viewonly=True,
    )
    # 1:1 — see Project.quote_id's unique constraint.
    project = db.relationship("Project", uselist=False, backref="quote", cascade="all, delete-orphan")

    @property
    def total_cents(self):
        return sum(item.quantity * item.unit_price_cents for item in self.items)

    @property
    def deposit_cents(self):
        return round(self.total_cents * self.deposit_percentage / 100)

    def to_dict(self, include_items=True, include_invoice=False):
        data = {
            "id": self.id,
            "lead_id": self.lead_id,
            "client_name": self.client_name,
            "client_email": self.client_email,
            "client_phone": self.client_phone,
            "title": self.title,
            "notes": self.notes,
            "deposit_percentage": self.deposit_percentage,
            "status": self.status,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
            "viewed_at": self.viewed_at.isoformat() if self.viewed_at else None,
            "reminder_sent_at": self.reminder_sent_at.isoformat() if self.reminder_sent_at else None,
            "accepted_at": self.accepted_at.isoformat() if self.accepted_at else None,
            "declined_at": self.declined_at.isoformat() if self.declined_at else None,
            "total_cents": self.total_cents,
            "deposit_cents": self.deposit_cents,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_items:
            data["items"] = [i.to_dict() for i in self.items]
        if include_invoice:
            data["invoice"] = self.deposit_invoice.to_public_dict() if self.deposit_invoice else None
        return data

    def __repr__(self):
        return f"<Quote {self.title!r} for {self.client_name}>"


class QuoteItem(db.Model):
    __tablename__ = "quote_items"

    id = db.Column(db.Integer, primary_key=True)
    quote_id = db.Column(db.Integer, db.ForeignKey("quotes.id"), nullable=False)

    description = db.Column(db.String(300), nullable=False)
    quantity = db.Column(db.Integer, default=1, nullable=False)
    unit_price_cents = db.Column(db.Integer, nullable=False)
    sort_order = db.Column(db.Integer, default=0, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "description": self.description,
            "quantity": self.quantity,
            "unit_price_cents": self.unit_price_cents,
            "sort_order": self.sort_order,
        }

    def __repr__(self):
        return f"<QuoteItem {self.description!r}>"

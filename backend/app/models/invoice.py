from .service import utcnow
from ..extensions import db

# pending -> paid. No "void": nothing in Phase 5's scope ever produces one
# (an admin killing a stale invoice is a later-phase concern).
INVOICE_STATUSES = ("pending", "paid")

# deposit: created the moment a quote is accepted, gets the project started.
# balance: created the moment the client approves the final deliverables
# (Phase 6) — whatever's left of quote.total_cents after the deposit (and
# any other payments) is covered. A quote can have at most one of each.
# retainer: created each billing cycle by retainer_service (Phase 7) — has
# no quote at all, belongs to a Retainer instead. See the CHECK constraint
# in the Phase 7 migration: exactly one of quote_id/retainer_id is set,
# matching kind.
INVOICE_KINDS = ("deposit", "balance", "retainer")

# pending: STK push sent, waiting on the callback (or a manual payment not
# yet applicable). success/failed/cancelled: resolved, either by the Daraja
# callback or an admin's "check status" reconciliation. There's no separate
# "timeout" status — a pending row that's been sitting for a while is just a
# display concern for the admin UI, not a new state to track.
PAYMENT_STATUSES = ("pending", "success", "failed", "cancelled")
PAYMENT_METHODS = ("mpesa", "manual")


class Invoice(db.Model):
    """One billable amount — a quote's deposit, a project's final balance,
    or (Phase 7) a retainer's monthly charge. Always belongs to exactly
    one parent: quote_id for deposit/balance, retainer_id for retainer
    (enforced by a DB CHECK constraint, not just convention). Every kind
    is created automatically, with no action from Njoroge — see
    invoice_service.create_for_quote / create_balance_invoice / create_for_retainer.
    """

    __tablename__ = "invoices"

    id = db.Column(db.Integer, primary_key=True)
    # Nullable as of Phase 7 — a retainer invoice has no quote at all
    # (was NOT NULL through Phase 6, when every invoice belonged to one).
    quote_id = db.Column(db.Integer, db.ForeignKey("quotes.id"), nullable=True)
    retainer_id = db.Column(db.Integer, db.ForeignKey("retainers.id"), nullable=True)
    kind = db.Column(db.String(10), default="deposit", nullable=False)

    # A locked snapshot of quote.deposit_cents (or, for a balance invoice,
    # of the remaining amount) at creation time, rounded to
    # the nearest whole shilling (M-Pesa's Amount field can't take a
    # fraction of a shilling) — not a live computed property, because an
    # admin editing quote line items after acceptance must never silently
    # change an invoice that's already gone out.
    amount_cents = db.Column(db.Integer, nullable=False)

    status = db.Column(db.String(20), default="pending", nullable=False)
    paid_at = db.Column(db.DateTime(timezone=True))

    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    payments = db.relationship(
        "Payment", backref="invoice", order_by="Payment.created_at.desc()", cascade="all, delete-orphan"
    )

    @property
    def number(self):
        # Computed, not stored — avoids a race-prone manual counter.
        return f"INV-{self.created_at.year}-{self.id:04d}"

    def to_dict(self, include_payments=False):
        data = {
            "id": self.id,
            "number": self.number,
            "quote_id": self.quote_id,
            "retainer_id": self.retainer_id,
            "kind": self.kind,
            # Denormalized for the admin list view, read live via the
            # relationship (not stored) — avoids an N+1 quote lookup per row.
            "quote_title": self.quote.title if self.quote else None,
            "client_name": (
                self.quote.client_name if self.quote
                else (self.retainer.client.name if self.retainer and self.retainer.client else None)
            ),
            "amount_cents": self.amount_cents,
            "status": self.status,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_payments:
            data["payments"] = [p.to_dict() for p in self.payments]
        return data

    def to_public_dict(self):
        # Everything here is safe for the client's own quote page — no
        # payment internals (see Payment.to_public_dict for why those stay
        # server-side).
        return {
            "id": self.id,
            "number": self.number,
            "kind": self.kind,
            "amount_cents": self.amount_cents,
            "status": self.status,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
        }

    def __repr__(self):
        return f"<Invoice {self.number} ({self.kind})>"


class Payment(db.Model):
    """One payment attempt against an invoice — mpesa or manual. An invoice
    can have several (a failed attempt followed by a successful retry).
    """

    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey("invoices.id"), nullable=False)

    method = db.Column(db.String(10), nullable=False)
    status = db.Column(db.String(20), default="pending", nullable=False)
    amount_cents = db.Column(db.Integer, nullable=False)

    phone_number = db.Column(db.String(20))  # mpesa only

    # The M-Pesa receipt number — set only once Daraja confirms success.
    # unique=True (Postgres allows any number of NULLs alongside it) is the
    # idempotency guarantee CLAUDE.md requires: a retried callback can never
    # produce a second payment row with the same receipt. Reserved
    # exclusively for M-Pesa — manual payments use manual_reference instead,
    # so two cheques both labelled "cash" can never collide against this.
    provider_reference = db.Column(db.String(50), unique=True)
    manual_reference = db.Column(db.String(120))

    # The sole lookup key the Daraja callback uses to find this row —
    # unique=True so a bug can never insert two rows sharing one, which
    # would otherwise let the callback handler silently pick the wrong one.
    checkout_request_id = db.Column(db.String(60), unique=True)
    merchant_request_id = db.Column(db.String(60))

    # Daraja's ResultDesc, an admin's manual-payment note, or an
    # amount-mismatch flag — whichever applies.
    result_desc = db.Column(db.Text)
    raw_callback = db.Column(db.Text)  # full inbound callback JSON, for audit

    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    completed_at = db.Column(db.DateTime(timezone=True))

    def to_dict(self):
        return {
            "id": self.id,
            "invoice_id": self.invoice_id,
            "method": self.method,
            "status": self.status,
            "amount_cents": self.amount_cents,
            "phone_number": self.phone_number,
            "provider_reference": self.provider_reference,
            "manual_reference": self.manual_reference,
            "checkout_request_id": self.checkout_request_id,
            "result_desc": self.result_desc,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }

    def to_public_dict(self):
        # checkout_request_id is deliberately excluded: with the Daraja
        # callback endpoint necessarily unauthenticated, it's functionally
        # the bearer secret protecting it from a forged "payment succeeded"
        # POST. merchant_request_id/raw_callback are internal-only too.
        return {
            "id": self.id,
            "method": self.method,
            "status": self.status,
            "amount_cents": self.amount_cents,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }

    def __repr__(self):
        return f"<Payment {self.id} {self.status} for invoice {self.invoice_id}>"

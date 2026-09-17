from .service import utcnow
from ..extensions import db

# sent: Brevo accepted it. failed: Brevo call raised/errored. skipped:
# BREVO_API_KEY isn't configured (local dev, or a misconfigured deploy) —
# distinct from "failed" so the admin log doesn't read as "emails are
# broken" when it's really "no key set here".
EMAIL_LOG_STATUSES = ("sent", "failed", "skipped")


class EmailLog(db.Model):
    """Every email send attempt, across all six (now seven-counting-the-
    admin-only-ones) email functions — written from the single place they
    all funnel through, email_service._send, never per-caller. See
    email_service._log_email.
    """

    __tablename__ = "email_logs"

    id = db.Column(db.Integer, primary_key=True)
    to_email = db.Column(db.String(255), nullable=False)
    to_name = db.Column(db.String(160))
    subject = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(60))
    status = db.Column(db.String(20), nullable=False)
    # Only populated where the caller happens to know it — most existing
    # (pre-Phase-7) call sites don't, and that's fine, the log stays
    # useful filtered by to_email/category alone.
    client_id = db.Column(db.Integer, db.ForeignKey("clients.id"))

    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "to_email": self.to_email,
            "to_name": self.to_name,
            "subject": self.subject,
            "category": self.category,
            "status": self.status,
            "client_id": self.client_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<EmailLog {self.subject!r} to {self.to_email} ({self.status})>"

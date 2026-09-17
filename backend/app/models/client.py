from .service import utcnow
from ..extensions import db


class Client(db.Model):
    """A person with an ongoing relationship to CVC — a retainer, or a
    completed project. Populated lazily, not backfilled from history: a
    row only gets created (find-or-create by email) when a Retainer is set
    up, or when the post-project follow-up sweep is about to email someone
    for the first time. Quote/Project/Invoice are never retrofitted with a
    client_id FK — this table exists for what Phase 7 actually needs, not
    a full historical migration. See retainer_service._find_or_create_client.
    """

    __tablename__ = "clients"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    email = db.Column(db.String(255), index=True)
    phone = db.Column(db.String(40))
    notes = db.Column(db.Text)

    # The entire "email preferences" feature this phase needs — gates
    # exactly one email (the post-project follow-up). Not a general
    # subscription center.
    followup_opt_out = db.Column(db.Boolean, default=False, nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    retainers = db.relationship("Retainer", backref="client", order_by="Retainer.created_at.desc()")

    def to_dict(self, include_retainers=False):
        data = {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "notes": self.notes,
            "followup_opt_out": self.followup_opt_out,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_retainers:
            data["retainers"] = [r.to_dict() for r in self.retainers]
        return data

    def __repr__(self):
        return f"<Client {self.name!r}>"

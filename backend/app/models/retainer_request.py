from .service import utcnow
from ..extensions import db

# The "retainer request log" — shaped like Lead (public create + honeypot,
# admin list/update), not like Quote: this is an enquiry, not yet a
# contract. new -> contacted -> converted (a Retainer was created from it)
# or archived.
RETAINER_REQUEST_STATUSES = ("new", "contacted", "converted", "archived")


class RetainerRequest(db.Model):
    __tablename__ = "retainer_requests"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    email = db.Column(db.String(255))
    phone = db.Column(db.String(40))
    # Which plan they asked about, if known — nullable, since a WhatsApp
    # enquiry often doesn't specify one yet.
    service_id = db.Column(db.Integer, db.ForeignKey("services.id"))
    service = db.relationship("Service")
    message = db.Column(db.Text)

    status = db.Column(db.String(20), default="new", nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "service_id": self.service_id,
            "service_name": self.service.name if self.service else None,
            "message": self.message,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<RetainerRequest {self.name!r}>"

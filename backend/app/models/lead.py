from .service import utcnow
from ..extensions import db

# status: new -> contacted -> quoted -> closed (won or lost) -> archived.
# Plain string, not a SQLAlchemy Enum — matches Service.price_type/tier,
# the existing status-like-field convention in this codebase.
LEAD_STATUSES = ("new", "contacted", "quoted", "closed", "archived")


class Lead(db.Model):
    __tablename__ = "leads"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    email = db.Column(db.String(255))
    phone = db.Column(db.String(40))
    project_description = db.Column(db.Text, nullable=False)
    budget = db.Column(db.String(120))
    deadline = db.Column(db.String(120))

    status = db.Column(db.String(20), default="new", nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "project_description": self.project_description,
            "budget": self.budget,
            "deadline": self.deadline,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Lead {self.name}>"

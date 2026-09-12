from .service import utcnow
from ..extensions import db


class ClientLogo(db.Model):
    """A logo in the public 'clients we work with' strip. Named client_logo,
    not client, to stay distinct from the future client table (people who
    have projects/invoices — a later phase's concept, unrelated to this)."""

    __tablename__ = "client_logos"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    logo_url = db.Column(db.String(500), nullable=False)

    published = db.Column(db.Boolean, default=False, nullable=False)
    sort_order = db.Column(db.Integer, default=0, nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "logo_url": self.logo_url,
            "published": self.published,
            "sort_order": self.sort_order,
        }

    def __repr__(self):
        return f"<ClientLogo {self.name}>"

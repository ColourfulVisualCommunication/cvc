from .service import utcnow
from ..extensions import db


class Testimonial(db.Model):
    __tablename__ = "testimonials"

    id = db.Column(db.Integer, primary_key=True)
    client_name = db.Column(db.String(160), nullable=False)
    client_role = db.Column(db.String(160))
    quote = db.Column(db.Text, nullable=False)
    avatar_url = db.Column(db.String(500))

    published = db.Column(db.Boolean, default=False, nullable=False)
    sort_order = db.Column(db.Integer, default=0, nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "client_name": self.client_name,
            "client_role": self.client_role,
            "quote": self.quote,
            "avatar_url": self.avatar_url,
            "published": self.published,
        }

    def __repr__(self):
        return f"<Testimonial {self.client_name}>"

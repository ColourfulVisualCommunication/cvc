from .service import utcnow
from ..extensions import db


class Media(db.Model):
    """A record of every asset uploaded through the admin, regardless of
    which content type ends up referencing its URL. Keeps uploads auditable
    instead of scattering bare Cloudinary URLs with no history."""

    __tablename__ = "media"

    id = db.Column(db.Integer, primary_key=True)
    cloudinary_public_id = db.Column(db.String(300), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    width = db.Column(db.Integer)
    height = db.Column(db.Integer)
    format = db.Column(db.String(20))

    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "url": self.url,
            "width": self.width,
            "height": self.height,
            "format": self.format,
        }

    def __repr__(self):
        return f"<Media {self.cloudinary_public_id}>"

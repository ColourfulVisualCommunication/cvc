from datetime import datetime, timezone

from ..extensions import db


def utcnow():
    return datetime.now(timezone.utc)


class Service(db.Model):
    """One rung of the CVC service ladder.

    Money is stored in integer cents (KES). Never floats — 0.1 + 0.2 is not 0.3
    in binary floating point, and that error compounds across an invoice.
    """

    __tablename__ = "services"

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(120), unique=True, nullable=False, index=True)
    name = db.Column(db.String(160), nullable=False)

    # 0 = paid front door, 1 = brand, 2 = digital presence,
    # 3 = applications, 4 = flagship, 5 = retainers
    tier = db.Column(db.Integer, nullable=False, default=1)

    summary = db.Column(db.String(400))
    description = db.Column(db.Text)
    deliverables = db.Column(db.JSON, default=list)

    # "fixed" is buyable from the site; "quoted" leads to an enquiry.
    price_type = db.Column(db.String(16), nullable=False, default="quoted")
    price_cents = db.Column(db.BigInteger)       # fixed price, or the "from" figure
    price_max_cents = db.Column(db.BigInteger)   # top of a quoted band, optional
    duration = db.Column(db.String(80))

    is_retainer = db.Column(db.Boolean, default=False, nullable=False)
    published = db.Column(db.Boolean, default=False, nullable=False)
    sort_order = db.Column(db.Integer, default=0, nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "slug": self.slug,
            "name": self.name,
            "tier": self.tier,
            "summary": self.summary,
            "description": self.description,
            "deliverables": self.deliverables or [],
            "price_type": self.price_type,
            "price_cents": self.price_cents,
            "price_max_cents": self.price_max_cents,
            "duration": self.duration,
            "is_retainer": self.is_retainer,
        }

    def __repr__(self):
        return f"<Service {self.slug}>"

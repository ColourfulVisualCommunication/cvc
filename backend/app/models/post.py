from .service import utcnow
from ..extensions import db


class Post(db.Model):
    """A blog post. Ranking depends on a real posting cadence, not volume —
    see CLAUDE.md's SEO section."""

    __tablename__ = "posts"

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(200), unique=True, nullable=False, index=True)
    title = db.Column(db.String(220), nullable=False)
    excerpt = db.Column(db.String(400))
    body = db.Column(db.Text)
    cover_image_url = db.Column(db.String(500))

    published = db.Column(db.Boolean, default=False, nullable=False)
    published_at = db.Column(db.DateTime(timezone=True))

    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "slug": self.slug,
            "title": self.title,
            "excerpt": self.excerpt,
            "body": self.body,
            "cover_image_url": self.cover_image_url,
            "published": self.published,
            "published_at": self.published_at.isoformat() if self.published_at else None,
        }

    def __repr__(self):
        return f"<Post {self.slug}>"

from .service import utcnow
from ..extensions import db


class PortfolioProject(db.Model):
    """A real, shipped CVC project. Never seed placeholders here — an empty
    portfolio is more honest than a fabricated one (see CLAUDE.md)."""

    __tablename__ = "portfolio_projects"

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(160), unique=True, nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    client_name = db.Column(db.String(160))

    summary = db.Column(db.String(400))
    problem = db.Column(db.Text)
    solution = db.Column(db.Text)
    result = db.Column(db.Text)

    cover_image_url = db.Column(db.String(500))
    gallery = db.Column(db.JSON, default=list)
    tags = db.Column(db.JSON, default=list)

    published = db.Column(db.Boolean, default=False, nullable=False)
    sort_order = db.Column(db.Integer, default=0, nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "slug": self.slug,
            "title": self.title,
            "client_name": self.client_name,
            "summary": self.summary,
            "problem": self.problem,
            "solution": self.solution,
            "result": self.result,
            "cover_image_url": self.cover_image_url,
            "gallery": self.gallery or [],
            "tags": self.tags or [],
            "published": self.published,
        }

    def __repr__(self):
        return f"<PortfolioProject {self.slug}>"

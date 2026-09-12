from werkzeug.security import check_password_hash, generate_password_hash

from .service import utcnow
from ..extensions import db


class AdminUser(db.Model):
    """Rule 4 exception: admin is the one account in this system that logs in.

    One admin until there's a second person (see CLAUDE.md, deliberately cut).
    """

    __tablename__ = "admin_users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(160))

    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {"id": self.id, "email": self.email, "name": self.name}

    def __repr__(self):
        return f"<AdminUser {self.email}>"

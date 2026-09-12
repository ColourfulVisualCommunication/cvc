"""Models. Import every model here so Flask-Migrate can see it.

Full data model (16 tables) is in CLAUDE.md. They arrive phase by phase —
only what a phase needs gets built, so migrations stay readable.
"""
from .admin_user import AdminUser  # noqa: F401
from .service import Service  # noqa: F401

__all__ = ["AdminUser", "Service"]

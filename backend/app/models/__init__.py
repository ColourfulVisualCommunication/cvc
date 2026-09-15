"""Models. Import every model here so Flask-Migrate can see it.

Full data model (16 tables) is in CLAUDE.md, plus client_logo — added
during Phase 2 for the public "clients we work with" strip, beyond the
original 16. They arrive phase by phase — only what a phase needs gets
built, so migrations stay readable.
"""
from .admin_user import AdminUser  # noqa: F401
from .client_logo import ClientLogo  # noqa: F401
from .invoice import Invoice, Payment  # noqa: F401
from .lead import Lead  # noqa: F401
from .media import Media  # noqa: F401
from .portfolio_project import PortfolioProject  # noqa: F401
from .post import Post  # noqa: F401
from .project import Project, Deliverable, Approval  # noqa: F401
from .quote import Quote, QuoteItem  # noqa: F401
from .service import Service  # noqa: F401
from .testimonial import Testimonial  # noqa: F401

__all__ = [
    "AdminUser",
    "ClientLogo",
    "Invoice",
    "Payment",
    "Lead",
    "Media",
    "PortfolioProject",
    "Post",
    "Project",
    "Deliverable",
    "Approval",
    "Quote",
    "QuoteItem",
    "Service",
    "Testimonial",
]

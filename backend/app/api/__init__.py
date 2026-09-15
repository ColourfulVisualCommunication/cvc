"""API v1. One blueprint per resource, registered here.

Routes stay thin: validate input, call a service, shape the response.
Business logic belongs in app/services/.
"""
from flask import Blueprint

api_v1 = Blueprint("api_v1", __name__)

from . import (  # noqa: E402,F401
    auth,
    client_logos,
    health,
    invoices,
    leads,
    media,
    payments,
    portfolio,
    posts,
    quotes,
    services,
    testimonials,
)

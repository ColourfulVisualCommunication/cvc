from flask import jsonify
from sqlalchemy import text

from ..extensions import db
from . import api_v1


@api_v1.get("/health")
def health():
    """Proves the API is up and that it can actually reach the database."""
    try:
        db.session.execute(text("SELECT 1"))
        database = "connected"
    except Exception:
        database = "unavailable"

    return jsonify(status="ok", service="cvc-api", version="v1", database=database)

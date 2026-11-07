from flask import jsonify
from sqlalchemy import text

from ..extensions import db
from . import api_v1


@api_v1.get("/health")
def health():
    """Proves the API is up and that it can actually reach the database.

    Returns 503 when the database is unreachable, so uptime pingers that
    only look at the status code (cron-job.org, the GitHub Actions
    keep-awake workflow) catch a database outage, not just a dead server.
    """
    try:
        db.session.execute(text("SELECT 1"))
        database = "connected"
    except Exception:
        db.session.rollback()  # leave the session usable for the next request
        database = "unavailable"

    status = "ok" if database == "connected" else "degraded"
    body = jsonify(status=status, service="cvc-api", version="v1", database=database)
    return body, (200 if database == "connected" else 503)

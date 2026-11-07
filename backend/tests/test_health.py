import pytest
from sqlalchemy.exc import OperationalError

from app import create_app
from app.extensions import db
from config import Config


class TestConfig(Config):
    TESTING = True


@pytest.fixture
def app():
    app = create_app(TestConfig)
    with app.app_context():
        yield app
        db.engine.dispose()  # see test_auth.py — avoids exhausting Supabase connections


def test_health_ok_when_database_reachable(app):
    res = app.test_client().get("/api/v1/health")
    assert res.status_code == 200
    assert res.json["database"] == "connected"
    assert res.json["status"] == "ok"


def test_health_503_when_database_unreachable(app, monkeypatch):
    def boom(*args, **kwargs):
        raise OperationalError("SELECT 1", {}, Exception("connection refused"))

    monkeypatch.setattr(db.session, "execute", boom)
    res = app.test_client().get("/api/v1/health")
    assert res.status_code == 503
    assert res.json["database"] == "unavailable"
    assert res.json["status"] == "degraded"

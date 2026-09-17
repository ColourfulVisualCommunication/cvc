import time

import pytest

from app import create_app
from app.extensions import db
from app.services import token_service
from config import Config


class TestConfig(Config):
    TESTING = True


@pytest.fixture
def app_context():
    app = create_app(TestConfig)
    with app.app_context():
        yield
        # See test_invoice_service.py's app_context fixture for why this
        # dispose() matters — undisposed engines across a full suite run
        # exhaust Supabase's session-mode connection cap.
        db.engine.dispose()


def test_round_trip(app_context):
    token = token_service.issue("quote", 42)
    assert token_service.verify(token, "quote", max_age_days=30) == 42


def test_wrong_kind_is_rejected(app_context):
    token = token_service.issue("quote", 42)
    assert token_service.verify(token, "project", max_age_days=30) is None


def test_tampered_token_is_rejected(app_context):
    token = token_service.issue("quote", 42)
    assert token_service.verify(token + "x", "quote", max_age_days=30) is None


def test_expired_token_is_rejected(app_context):
    token = token_service.issue("quote", 42)
    time.sleep(1.1)  # itsdangerous timestamps have 1-second resolution
    assert token_service.verify(token, "quote", max_age_days=0) is None

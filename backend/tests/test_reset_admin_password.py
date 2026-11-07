import pytest

from app import create_app
from app.extensions import db
from app.models import AdminUser
from config import Config

TEST_EMAIL = "pytest-reset@example.com"
OLD_PASSWORD = "old-password-long-enough"
NEW_PASSWORD = "brand-new-password-123"


class TestConfig(Config):
    TESTING = True


@pytest.fixture
def app():
    app = create_app(TestConfig)
    with app.app_context():
        user = AdminUser(email=TEST_EMAIL, name="Pytest")
        user.set_password(OLD_PASSWORD)
        db.session.add(user)
        db.session.commit()

        yield app

        db.session.delete(AdminUser.query.filter_by(email=TEST_EMAIL).first())
        db.session.commit()
        db.engine.dispose()  # see test_auth.py


def _run(app, email, password):
    return app.test_cli_runner().invoke(
        args=["reset-admin-password", "--email", email, "--password", password]
    )


def test_reset_changes_password(app):
    result = _run(app, TEST_EMAIL, NEW_PASSWORD)
    assert result.exit_code == 0, result.output

    user = AdminUser.query.filter_by(email=TEST_EMAIL).first()
    db.session.refresh(user)
    assert user.check_password(NEW_PASSWORD)
    assert not user.check_password(OLD_PASSWORD)


def test_reset_rejects_unknown_email(app):
    result = _run(app, "nobody@example.com", NEW_PASSWORD)
    assert result.exit_code != 0
    assert "No admin" in result.output


def test_reset_rejects_short_password(app):
    result = _run(app, TEST_EMAIL, "short")
    assert result.exit_code != 0
    assert "at least 12" in result.output

    user = AdminUser.query.filter_by(email=TEST_EMAIL).first()
    assert user.check_password(OLD_PASSWORD)

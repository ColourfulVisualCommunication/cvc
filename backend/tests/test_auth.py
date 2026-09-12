import pytest

from app import create_app
from app.extensions import db
from app.models import AdminUser
from config import Config

TEST_EMAIL = "pytest-admin@example.com"
TEST_PASSWORD = "correct-horse-battery-staple"


class TestConfig(Config):
    TESTING = True


@pytest.fixture
def client():
    app = create_app(TestConfig)
    with app.app_context():
        user = AdminUser(email=TEST_EMAIL, name="Pytest")
        user.set_password(TEST_PASSWORD)
        db.session.add(user)
        db.session.commit()

        yield app.test_client()

        db.session.delete(AdminUser.query.filter_by(email=TEST_EMAIL).first())
        db.session.commit()


def test_me_requires_login(client):
    assert client.get("/api/v1/auth/me").status_code == 401


def test_login_sets_cookie_and_me_works(client):
    login = client.post(
        "/api/v1/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert login.status_code == 200
    assert login.json["email"] == TEST_EMAIL

    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json["email"] == TEST_EMAIL


def test_wrong_password_is_rejected(client):
    res = client.post(
        "/api/v1/auth/login", json={"email": TEST_EMAIL, "password": "wrong"}
    )
    assert res.status_code == 401


def test_logout_clears_the_session(client):
    client.post("/api/v1/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
    client.post("/api/v1/auth/logout")
    assert client.get("/api/v1/auth/me").status_code == 401

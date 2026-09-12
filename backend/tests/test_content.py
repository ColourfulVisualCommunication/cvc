import pytest

from app import create_app
from app.extensions import db
from app.models import AdminUser, PortfolioProject, Post, Testimonial
from config import Config

TEST_EMAIL = "pytest-content-admin@example.com"
TEST_PASSWORD = "correct-horse-battery-staple"


class TestConfig(Config):
    TESTING = True


class AuthedClient:
    """Wraps the test client so every request carries the bearer token from
    login — auth travels as an Authorization header, not a cookie (see
    app/api/auth.py for why)."""

    def __init__(self, test_client, token):
        self._client = test_client
        self._headers = {"Authorization": f"Bearer {token}"}

    def get(self, *args, **kwargs):
        return self._client.get(*args, headers=self._headers, **kwargs)

    def post(self, *args, **kwargs):
        return self._client.post(*args, headers=self._headers, **kwargs)

    def patch(self, *args, **kwargs):
        return self._client.patch(*args, headers=self._headers, **kwargs)

    def delete(self, *args, **kwargs):
        return self._client.delete(*args, headers=self._headers, **kwargs)


@pytest.fixture
def client():
    app = create_app(TestConfig)
    with app.app_context():
        user = AdminUser(email=TEST_EMAIL, name="Pytest")
        user.set_password(TEST_PASSWORD)
        db.session.add(user)
        db.session.commit()

        test_client = app.test_client()
        login = test_client.post(
            "/api/v1/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )

        yield AuthedClient(test_client, login.json["access_token"])

        PortfolioProject.query.filter_by(slug="test-project").delete()
        Post.query.filter_by(slug="test-post").delete()
        Testimonial.query.filter_by(client_name="Test Client").delete()
        db.session.delete(AdminUser.query.filter_by(email=TEST_EMAIL).first())
        db.session.commit()


def test_unpublished_portfolio_project_is_hidden_from_public(client):
    create = client.post(
        "/api/v1/admin/portfolio",
        json={"slug": "test-project", "title": "Test Project", "published": False},
    )
    assert create.status_code == 201

    assert client.get("/api/v1/portfolio/test-project").status_code == 404

    public_list = client.get("/api/v1/portfolio").json["items"]
    assert not any(p["slug"] == "test-project" for p in public_list)


def test_published_portfolio_project_is_public(client):
    client.post(
        "/api/v1/admin/portfolio",
        json={"slug": "test-project", "title": "Test Project", "published": True},
    )
    res = client.get("/api/v1/portfolio/test-project")
    assert res.status_code == 200
    assert res.json["title"] == "Test Project"


def test_portfolio_write_requires_auth():
    app = create_app(TestConfig)
    anon = app.test_client()
    res = anon.post("/api/v1/admin/portfolio", json={"slug": "x", "title": "x"})
    assert res.status_code == 401


def test_post_published_at_set_on_publish(client):
    create = client.post(
        "/api/v1/admin/posts",
        json={"slug": "test-post", "title": "Test Post", "published": False},
    )
    post_id = create.json["id"]
    assert create.json["published_at"] is None

    update = client.patch(f"/api/v1/admin/posts/{post_id}", json={"published": True})
    assert update.json["published_at"] is not None


def test_testimonial_crud_round_trip(client):
    create = client.post(
        "/api/v1/admin/testimonials",
        json={"client_name": "Test Client", "quote": "Great work.", "published": True},
    )
    assert create.status_code == 201
    tid = create.json["id"]

    assert any(t["client_name"] == "Test Client" for t in client.get("/api/v1/testimonials").json["items"])

    client.delete(f"/api/v1/admin/testimonials/{tid}")
    assert not any(
        t["client_name"] == "Test Client" for t in client.get("/api/v1/testimonials").json["items"]
    )

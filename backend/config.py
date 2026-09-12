"""Configuration. Values come from the environment — never hardcode secrets here."""
import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()


def _require(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(
            f"Missing required environment variable: {name}. "
            "Copy backend/.env.example to backend/.env and fill it in."
        )
    return value


class Config:
    SECRET_KEY = _require("SECRET_KEY")
    JWT_SECRET_KEY = _require("JWT_SECRET_KEY")

    # Postgres only — no SQLite fallback. Supabase in every environment,
    # including local dev, so there is only ever one database to reason about.
    SQLALCHEMY_DATABASE_URI = _require("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Authorization header, not a cookie — the frontend (Netlify) and API
    # (Render) are different registrable domains, so a cookie set by one is
    # invisible to JS on the other and cross-site cookie rules get in the
    # way regardless. See app/api/auth.py for the full reasoning.
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=12)

    # Comma-separated list of origins allowed to call the API.
    CORS_ORIGINS = [
        o.strip()
        for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")
        if o.strip()
    ]

    # Currency is KES throughout. Money is stored as integer cents.
    CURRENCY = "KES"

    # The frontend's public base URL. The API and the frontend are two separate
    # deployments (Render + Netlify) on two different domains, so the backend
    # needs this to build the signed client/project links it emails and sends
    # over WhatsApp — it can't infer them from the incoming request.
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

    # Cloudinary — portfolio images, blog media, client deliverable uploads.
    CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME")
    CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY")
    CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET")

    # Brevo — sends the six transactional emails (see CLAUDE.md).
    BREVO_API_KEY = os.environ.get("BREVO_API_KEY")
    EMAIL_FROM = os.environ.get("EMAIL_FROM", "njoroge@colourfulvisualcommunication.com")
    EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "CVC")

    # M-Pesa Daraja — wired from phase 5. Blank until then is fine.
    MPESA_ENVIRONMENT = os.environ.get("MPESA_ENVIRONMENT", "sandbox")
    MPESA_CONSUMER_KEY = os.environ.get("MPESA_CONSUMER_KEY")
    MPESA_CONSUMER_SECRET = os.environ.get("MPESA_CONSUMER_SECRET")
    MPESA_SHORTCODE = os.environ.get("MPESA_SHORTCODE")
    MPESA_PASSKEY = os.environ.get("MPESA_PASSKEY")
    MPESA_CALLBACK_URL = os.environ.get("MPESA_CALLBACK_URL")


class ProductionConfig(Config):
    DEBUG = False


class DevelopmentConfig(Config):
    DEBUG = True


config_by_name = {"development": DevelopmentConfig, "production": ProductionConfig}


def get_config():
    return config_by_name.get(os.environ.get("FLASK_ENV", "development"), DevelopmentConfig)

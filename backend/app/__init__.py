"""Application factory.

Flask is created inside a function rather than at import time so that tests can
build an app with different config, and so nothing runs on import.
"""
import click
import cloudinary
from flask import Flask, jsonify, request
from flask_jwt_extended import verify_jwt_in_request

from config import get_config

from .extensions import cors, db, jwt, migrate


def create_app(config_object=None):
    app = Flask(__name__)
    app.config.from_object(config_object or get_config())

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
    )
    cloudinary.config(
        cloud_name=app.config["CLOUDINARY_CLOUD_NAME"],
        api_key=app.config["CLOUDINARY_API_KEY"],
        api_secret=app.config["CLOUDINARY_API_SECRET"],
        secure=True,
    )

    # Models must be imported before migrations can see them.
    from . import models  # noqa: F401

    from .api import api_v1

    app.register_blueprint(api_v1, url_prefix="/api/v1")

    register_daily_jobs_hook(app)
    register_error_handlers(app)
    register_cli(app)
    return app


def register_daily_jobs_hook(app):
    """Phase 7's free-tier scheduled-job trigger (see job_runner_service
    for the full mechanism). Scoped to authenticated /admin/* requests
    only — Njoroge using the admin panel during normal business use is
    what fires this, not public traffic. Best-effort: a failure here must
    never break the admin request that happened to trigger it.
    """

    @app.before_request
    def _maybe_run_daily_jobs():
        if not request.path.startswith("/api/v1/admin/"):
            return
        try:
            verify_jwt_in_request()
        except Exception:
            return  # not an authenticated admin request — let the route's own @jwt_required() handle the 401

        from .services import job_runner_service

        try:
            job_runner_service.run_daily_jobs_if_due()
        except Exception:
            app.logger.exception("daily jobs trigger failed")


def register_cli(app):
    @app.cli.command("create-admin")
    @click.option("--email", prompt=True)
    @click.option("--name", prompt=True)
    @click.password_option()
    def create_admin(email, name, password):
        """Create the admin account. There is no sign-up route — this is it."""
        from .extensions import db
        from .models import AdminUser

        if AdminUser.query.filter_by(email=email.lower().strip()).first():
            click.echo(f"An admin with email {email} already exists.")
            return

        user = AdminUser(email=email.lower().strip(), name=name)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        click.echo(f"Admin created: {user.email}")

    @app.cli.command("run-daily-jobs")
    def run_daily_jobs():
        """Manual/local-testing entry point for the Phase 7 daily sweep
        (retainer invoicing + post-project follow-ups) — bypasses the
        once-a-day JobRun gate that the opportunistic before_request
        trigger uses in production. Also the exact command a future paid
        Render Cron Job would call on a schedule instead.
        """
        from .services.job_runner_service import _run_daily_jobs

        _run_daily_jobs()
        click.echo("Daily jobs run.")


def register_error_handlers(app):
    """Always return JSON — the frontend never wants Flask's HTML error pages."""

    @app.errorhandler(404)
    def not_found(_):
        return jsonify(error="not_found", message="Resource not found"), 404

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify(error="bad_request", message=str(e.description)), 400

    @app.errorhandler(500)
    def server_error(_):
        return jsonify(error="server_error", message="Something went wrong"), 500

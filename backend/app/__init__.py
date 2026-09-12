"""Application factory.

Flask is created inside a function rather than at import time so that tests can
build an app with different config, and so nothing runs on import.
"""
import click
import cloudinary
from flask import Flask, jsonify

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

    register_error_handlers(app)
    register_cli(app)
    return app


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

"""Admin auth. The one login in this system — see CLAUDE.md rule 4:
everyone else reaches the platform through signed links, never a password.
"""
from flask import jsonify, request
from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    jwt_required,
    set_access_cookies,
    unset_jwt_cookies,
)

from ..extensions import db
from ..models import AdminUser
from ..services import auth_service
from . import api_v1


@api_v1.post("/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "")
    password = data.get("password", "")
    if not email or not password:
        return jsonify(error="bad_request", message="Email and password are required"), 400

    user = auth_service.authenticate(email, password)
    if user is None:
        return jsonify(error="unauthorized", message="Invalid email or password"), 401

    response = jsonify(user.to_dict())
    set_access_cookies(response, create_access_token(identity=str(user.id)))
    return response


@api_v1.post("/auth/logout")
def logout():
    response = jsonify(message="Logged out")
    unset_jwt_cookies(response)
    return response


@api_v1.get("/auth/me")
@jwt_required()
def me():
    user = db.session.get(AdminUser, int(get_jwt_identity()))
    if user is None:
        return jsonify(error="not_found", message="No such admin"), 404
    return jsonify(user.to_dict())

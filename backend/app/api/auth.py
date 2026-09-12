"""Admin auth. The one login in this system — see CLAUDE.md rule 4:
everyone else reaches the platform through signed links, never a password.

Token travels as an Authorization: Bearer header, not a cookie. The
frontend (Netlify) and API (Render) are different registrable domains, so
a cookie set by one is invisible to JS running on the other — the CSRF
double-submit cookie pattern Flask-JWT-Extended defaults to simply cannot
work across that boundary. A bearer header sidesteps both problems: it
isn't restricted by cross-site cookie rules, and it isn't vulnerable to
CSRF in the first place, since browsers never attach custom headers to a
forged cross-site request the way they do cookies.
"""
from flask import jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

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

    token = create_access_token(identity=str(user.id))
    return jsonify(access_token=token, **user.to_dict())


@api_v1.get("/auth/me")
@jwt_required()
def me():
    user = db.session.get(AdminUser, int(get_jwt_identity()))
    if user is None:
        return jsonify(error="not_found", message="No such admin"), 404
    return jsonify(user.to_dict())

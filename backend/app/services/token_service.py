"""Signs and verifies the tokens behind every client-facing link (rule 4:
no client passwords, no sessions for clients). One implementation, reused
by quotes and projects alike — the `kind` is mixed into the signature
itself as a salt, so a quote token can never be replayed against a
project endpoint, or vice versa.
"""
from flask import current_app
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer


def _serializer():
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"])


def issue(kind: str, id: int) -> str:
    return _serializer().dumps(id, salt=kind)


def verify(token: str, kind: str, max_age_days: int) -> int | None:
    try:
        return _serializer().loads(token, salt=kind, max_age=max_age_days * 86400)
    except (BadSignature, SignatureExpired):
        return None

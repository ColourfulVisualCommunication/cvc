from ..extensions import db
from ..models import AdminUser


def authenticate(email: str, password: str) -> AdminUser | None:
    user = AdminUser.query.filter_by(email=email.lower().strip()).first()
    if user and user.check_password(password):
        return user
    return None


MIN_PASSWORD_LENGTH = 12


def reset_password(email: str, new_password: str) -> AdminUser:
    """Set a new password for an existing admin. Raises ValueError if the
    admin doesn't exist or the password is too short. Deliberately not
    exposed over HTTP — run via `flask reset-admin-password` only.
    """
    user = AdminUser.query.filter_by(email=email.lower().strip()).first()
    if user is None:
        raise ValueError(f"No admin with email {email}.")
    if len(new_password) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters.")

    user.set_password(new_password)
    db.session.commit()
    return user

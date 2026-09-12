from ..models import AdminUser


def authenticate(email: str, password: str) -> AdminUser | None:
    user = AdminUser.query.filter_by(email=email.lower().strip()).first()
    if user and user.check_password(password):
        return user
    return None

"""Shared FastAPI dependencies."""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.services.user import CREDENTIALS_ERROR, user_service

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the bearer token to the logged-in user."""
    if credentials is None:
        raise CREDENTIALS_ERROR
    return user_service.get_current_user(db, credentials.credentials)


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """Like :func:`get_current_user`, but anonymous requests get ``None``."""
    if credentials is None:
        return None
    try:
        return user_service.get_current_user(db, credentials.credentials)
    except HTTPException:
        return None


def require_self(user: User, user_id: str) -> None:
    """Reject actions on another user's private resources."""
    if user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only manage your own resources",
        )


def require_admin(user: User) -> None:
    from app.models.user import RoleEnum

    if user.role != RoleEnum.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

"""Authentication endpoints: register, login, logout and current user.

Register and login are rate-limited per client IP to slow credential stuffing
and account-enumeration attempts.  A successful response is still subject to
the global default limit installed by ``SlowAPIMiddleware``.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.limiter import limiter
from app.db.session import get_db
from app.models.user import RoleEnum, User
from app.schemas.api import LoginRequest, TokenResponse
from app.schemas.user import UserCreate, UserRead
from app.services.user import user_service

router = APIRouter()


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit(settings.rate_limit_auth)
def register(
    request: Request,
    payload: UserCreate,
    db: Session = Depends(get_db),
) -> TokenResponse:
    # Self-registration always creates a normal user; roles are granted by admins.
    payload = payload.model_copy(update={"role": RoleEnum.user})
    result = user_service.register(db, payload)
    return TokenResponse(**result)


@router.post("/login", response_model=TokenResponse)
@limiter.limit(settings.rate_limit_auth)
def login(
    request: Request,
    payload: LoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    result = user_service.authenticate(db, payload.email, payload.password)
    return TokenResponse(**result)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    user_service.logout(db, user)


@router.get("/me", response_model=UserRead)
def read_me(user: User = Depends(get_current_user)) -> User:
    return user

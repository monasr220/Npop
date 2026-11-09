"""Access-token persistence and blacklisting."""

from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.access_token import AccessToken
from app.schemas.access_token import AccessTokenCreate
from app.services.base import CRUDService


class AccessTokenService(CRUDService[AccessToken]):
    model = AccessToken
    not_found_detail = "Access token not found"
    order_by = AccessToken.created_at.desc()

    def get_by_token(self, db: Session, token: str) -> AccessToken | None:
        return db.query(AccessToken).filter(AccessToken.token == token).first()

    def create_for_user(
        self,
        db: Session,
        user_id: str,
        token: str,
        expiry_time: datetime,
    ) -> AccessToken:
        return self.create(
            db,
            AccessTokenCreate(
                user_id=user_id,
                token=token,
                expiry_time=expiry_time,
            ),
        )

    def blacklist(
        self,
        db: Session,
        *,
        token: str | None = None,
        user_id: str | None = None,
    ) -> AccessToken:
        """Mark one token (by value) or all of a user's tokens as blacklisted."""
        if token is not None:
            query = db.query(AccessToken).filter(AccessToken.token == token)
        elif user_id is not None:
            query = db.query(AccessToken).filter(AccessToken.user_id == user_id)
        else:
            raise ValueError("either token or user_id is required")

        access_tokens = query.all()
        if not access_tokens:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=self.not_found_detail,
            )

        for access_token in access_tokens:
            access_token.blacklisted = True
        db.commit()
        return access_tokens[-1]

    def is_blacklisted(self, db: Session, token: str) -> bool:
        access_token = self.get_by_token(db, token)
        return bool(access_token and access_token.blacklisted)


access_token_service = AccessTokenService()

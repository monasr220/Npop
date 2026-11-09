"""1-5 star ratings on posts (including song posts)."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.post import Post
from app.models.post_rating import PostRating
from app.services.base import CRUDService
from app.utils.crud import commit_and_refresh
from app.utils.pagination import DEFAULT_PAGE_SIZE, paginate


class PostRatingService(CRUDService[PostRating]):
    model = PostRating
    not_found_detail = "Rating not found"
    order_by = PostRating.created_at.desc()

    def _get_post(self, db: Session, post_id: str) -> Post:
        post = db.get(Post, post_id)
        if post is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found",
            )
        return post

    def rate(
        self,
        db: Session,
        user_id: str,
        post_id: str,
        rating: int,
    ) -> PostRating:
        if rating < 1 or rating > 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rating must be between 1 and 5",
            )

        self._get_post(db, post_id)

        existing = (
            db.query(PostRating)
            .filter(
                PostRating.user_id == user_id,
                PostRating.post_id == post_id,
            )
            .first()
        )

        if existing is not None:
            existing.rating = rating
            return commit_and_refresh(db, existing)

        entry = PostRating(user_id=user_id, post_id=post_id, rating=rating)
        db.add(entry)
        return commit_and_refresh(db, entry)

    def get_user_rating(
        self,
        db: Session,
        user_id: str,
        post_id: str,
    ) -> PostRating | None:
        return (
            db.query(PostRating)
            .filter(
                PostRating.user_id == user_id,
                PostRating.post_id == post_id,
            )
            .first()
        )

    def average(self, db: Session, post_id: str) -> float | None:
        value = (
            db.query(func.avg(PostRating.rating))
            .filter(PostRating.post_id == post_id)
            .scalar()
        )
        return round(float(value), 2) if value is not None else None

    def count(self, db: Session, post_id: str) -> int:
        return (
            db.query(PostRating)
            .filter(PostRating.post_id == post_id)
            .count()
        )

    def list_for_post(
        self,
        db: Session,
        post_id: str,
        skip: int = 0,
        limit: int = DEFAULT_PAGE_SIZE,
    ) -> list[PostRating]:
        self._get_post(db, post_id)
        statement = (
            db.query(PostRating)
            .options(joinedload(PostRating.user))
            .filter(PostRating.post_id == post_id)
            .order_by(PostRating.created_at.desc())
        )
        return paginate(statement, skip, limit)

    def delete_rating(
        self,
        db: Session,
        user_id: str,
        post_id: str,
    ) -> None:
        entry = self.get_user_rating(db, user_id, post_id)
        if entry is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=self.not_found_detail,
            )
        db.delete(entry)
        db.commit()


post_rating_service = PostRatingService()

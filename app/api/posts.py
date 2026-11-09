"""Social feed: posts, comments, likes, reposts and song ratings."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_optional_user
from app.db.session import get_db
from app.models.post import Like, Post
from app.models.post_comment import PostComment
from app.models.post_rating import PostRating
from app.models.user import User
from app.schemas.api import (
    CommentCreateRequest,
    PostCommentDetail,
    PostCreateRequest,
    PostDetail,
    PostLikeDetail,
    RatingRequest,
    RatingSummary,
    RepostRequest,
)
from app.schemas.post import (
    PostCreate,
    PostRatingRead,
    PostRead,
    PostUpdate,
)
from app.schemas.post_comment import (
    PostCommentCreate,
    PostCommentRead,
    PostCommentUpdate,
)
from app.services.post import post_service
from app.services.post_comment import post_comment_service

router = APIRouter()


# --------------------------------------------------------------------- feed
@router.get("", response_model=list[PostRead])
def list_posts(
    user_id: str | None = Query(default=None, description="Filter by author"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[Post]:
    return post_service.feed(db, skip, limit, user_id=user_id)


@router.post("", response_model=PostRead, status_code=status.HTTP_201_CREATED)
def create_post(
    payload: PostCreateRequest,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Post:
    return post_service.create_post(
        db,
        current,
        PostCreate(user_id=current.id, **payload.model_dump()),
    )


@router.get("/{post_id}", response_model=PostDetail)
def get_post(post_id: str, db: Session = Depends(get_db)) -> Post:
    return post_service.get_post(db, post_id)


@router.patch("/{post_id}", response_model=PostRead)
def update_post(
    post_id: str,
    payload: PostUpdate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Post:
    return post_service.update_post(db, current, post_id, payload)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: str,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    post_service.delete_post(db, current, post_id)


# -------------------------------------------------------------------- likes
@router.post("/{post_id}/like", response_model=PostLikeDetail)
def like_post(
    post_id: str,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Like:
    return post_service.like_post(db, current, post_id)


@router.delete("/{post_id}/like", status_code=status.HTTP_204_NO_CONTENT)
def unlike_post(
    post_id: str,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    post_service.unlike_post(db, current, post_id)


@router.get("/{post_id}/likes", response_model=list[PostLikeDetail])
def list_likes(
    post_id: str,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[Like]:
    return post_service.get_likes(db, post_id, skip, limit)


# ----------------------------------------------------------------- comments
@router.get("/{post_id}/comments", response_model=list[PostCommentDetail])
def list_comments(
    post_id: str,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[PostComment]:
    return post_comment_service.list_for_post(db, post_id, skip, limit)


@router.post(
    "/{post_id}/comments",
    response_model=PostCommentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    post_id: str,
    payload: CommentCreateRequest,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PostComment:
    return post_comment_service.create_comment(
        db,
        current,
        post_id,
        PostCommentCreate(
            user_id=current.id,
            post_id=post_id,
            comment=payload.comment,
        ),
    )


@router.patch(
    "/{post_id}/comments/{comment_id}",
    response_model=PostCommentRead,
)
def update_comment(
    post_id: str,
    comment_id: str,
    payload: CommentCreateRequest,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PostComment:
    return post_comment_service.update_comment(
        db,
        current,
        comment_id,
        PostCommentUpdate(comment=payload.comment),
    )


@router.delete(
    "/{post_id}/comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_comment(
    post_id: str,
    comment_id: str,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    post_comment_service.delete_comment(db, current, comment_id)


# ------------------------------------------------------------------ ratings
@router.get("/{post_id}/ratings", response_model=list[PostRatingRead])
def list_ratings(
    post_id: str,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[PostRating]:
    return post_service.list_ratings(db, post_id, skip, limit)


@router.get("/{post_id}/ratings/summary", response_model=RatingSummary)
def rating_summary(post_id: str, db: Session = Depends(get_db)) -> RatingSummary:
    post_service.get_or_404(db, post_id)
    return RatingSummary(
        average_rating=post_service.average_rating(db, post_id),
        rating_count=post_service.rating_count(db, post_id),
    )


@router.get("/{post_id}/rating", response_model=PostRatingRead | None)
def my_rating(
    post_id: str,
    current: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> PostRating | None:
    post_service.get_or_404(db, post_id)
    if current is None:
        return None
    return post_service.get_user_rating(db, current, post_id)


@router.post("/{post_id}/rating", response_model=PostRatingRead)
def rate_post(
    post_id: str,
    payload: RatingRequest,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PostRating:
    return post_service.rate_post(db, current, post_id, payload.rating)


@router.delete("/{post_id}/rating", status_code=status.HTTP_204_NO_CONTENT)
def remove_rating(
    post_id: str,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    post_service.remove_rating(db, current, post_id)


# ------------------------------------------------------------------ reposts
@router.post(
    "/{post_id}/repost",
    response_model=PostRead,
    status_code=status.HTTP_201_CREATED,
)
def repost(
    post_id: str,
    payload: RepostRequest,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Post:
    return post_service.repost(db, current, post_id, payload.content)

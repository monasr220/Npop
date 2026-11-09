"""Post comments."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.post import Post
from app.models.post_comment import PostComment
from app.models.user import User
from app.schemas.post_comment import PostCommentCreate, PostCommentUpdate
from app.services.base import CRUDService
from app.services.notification import notification_service
from app.utils.crud import commit_and_refresh, delete_and_commit
from app.utils.pagination import DEFAULT_PAGE_SIZE, paginate


class PostCommentService(CRUDService[PostComment]):
    model = PostComment
    not_found_detail = "Comment not found"
    order_by = PostComment.created_at.asc()

    def list_for_post(
        self,
        db: Session,
        post_id: str,
        skip: int = 0,
        limit: int = DEFAULT_PAGE_SIZE,
    ) -> list[PostComment]:
        self._get_post(db, post_id)
        statement = (
            db.query(PostComment)
            .options(joinedload(PostComment.user))
            .filter(PostComment.post_id == post_id)
            .order_by(PostComment.created_at.asc())
        )
        return paginate(statement, skip, limit)

    def create_comment(
        self,
        db: Session,
        user: User,
        post_id: str,
        payload: PostCommentCreate,
    ) -> PostComment:
        post = self._get_post(db, post_id)

        comment = PostComment(
            user_id=user.id,
            post_id=post.id,
            comment=payload.comment,
        )
        db.add(comment)
        comment = commit_and_refresh(db, comment)

        if post.user_id != user.id:
            notification_service.notify(
                db,
                post.user_id,
                f"{user.username} commented on your post",
            )
        return comment

    def update_comment(
        self,
        db: Session,
        user: User,
        comment_id: str,
        payload: PostCommentUpdate,
    ) -> PostComment:
        comment = self.get_or_404(db, comment_id)
        if comment.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to update this comment",
            )

        data = payload.model_dump(exclude_unset=True)
        if not data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update",
            )

        for field, value in data.items():
            setattr(comment, field, value)
        return commit_and_refresh(db, comment)

    def delete_comment(
        self,
        db: Session,
        user: User,
        comment_id: str,
    ) -> None:
        comment = self.get_or_404(db, comment_id)
        if comment.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this comment",
            )
        delete_and_commit(db, comment)

    def get_with_user(self, db: Session, comment_id: str) -> PostComment:
        comment = (
            db.query(PostComment)
            .options(joinedload(PostComment.user))
            .filter(PostComment.id == comment_id)
            .first()
        )
        if comment is None:
            return self.get_or_404(db, comment_id)
        return comment

    # ---------------------------------------------------------------- helpers
    def _get_post(self, db: Session, post_id: str) -> Post:
        post = db.get(Post, post_id)
        if post is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post does not exist",
            )
        return post


post_comment_service = PostCommentService()

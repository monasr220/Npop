"""Posts, likes and reposts."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.post import Like, Post
from app.models.post_comment import PostComment
from app.models.post_rating import PostRating
from app.models.track import Track
from app.models.user import User
from app.schemas.post import PostCreate, PostUpdate
from app.services.base import CRUDService
from app.services.notification import notification_service
from app.services.post_rating import post_rating_service
from app.utils.crud import apply_updates, commit_and_refresh, delete_and_commit
from app.utils.pagination import DEFAULT_PAGE_SIZE, paginate

# A post needs at least one of these, or it must be a repost.
CONTENT_FIELDS = ("content", "image", "video", "track_id")


class PostService(CRUDService[Post]):
    model = Post
    not_found_detail = "Post not found"
    order_by = Post.created_at.desc()

    # ------------------------------------------------------------------- read
    def get_post(self, db: Session, post_id: str) -> Post:
        post = (
            db.query(Post)
            .options(
                joinedload(Post.user),
                joinedload(Post.track),
                joinedload(Post.original_post),
                selectinload(Post.comments).joinedload(PostComment.user),
                selectinload(Post.likes).joinedload(Like.user),
                selectinload(Post.ratings).joinedload(PostRating.user),
            )
            .filter(Post.id == post_id)
            .first()
        )
        if post is None:
            return self.get_or_404(db, post_id)
        return post

    def feed(
        self,
        db: Session,
        skip: int = 0,
        limit: int = DEFAULT_PAGE_SIZE,
        *,
        user_id: str | None = None,
    ) -> list[Post]:
        statement = db.query(Post).options(
            joinedload(Post.user),
            joinedload(Post.track),
            selectinload(Post.comments),
            selectinload(Post.likes),
            selectinload(Post.ratings),
        )
        if user_id is not None:
            statement = statement.filter(Post.user_id == user_id)
        return paginate(statement.order_by(Post.created_at.desc()), skip, limit)

    # ------------------------------------------------------------------ write
    def create_post(
        self,
        db: Session,
        user: User,
        payload: PostCreate,
    ) -> Post:
        data = payload.model_dump(exclude={"user_id"})

        if all(data.get(field) is None for field in CONTENT_FIELDS) and not data.get(
            "original_post_id"
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please provide content, media, a song or a repost",
            )

        original_post_id = data.get("original_post_id")
        if original_post_id is not None:
            self.get_or_404(db, original_post_id, detail="Original post not found")

        self._validate_track(db, data.get("track_id"))

        post = Post(user_id=user.id, **data)
        db.add(post)
        return commit_and_refresh(db, post)

    def update_post(
        self,
        db: Session,
        user: User,
        post_id: str,
        payload: PostUpdate,
    ) -> Post:
        post = self.get_or_404(db, post_id)
        if post.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to update this post",
            )

        data = payload.model_dump(exclude_unset=True)
        if not data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update",
            )

        if "track_id" in data:
            self._validate_track(db, data["track_id"])

        apply_updates(post, data)
        return commit_and_refresh(db, post)

    def delete_post(self, db: Session, user: User, post_id: str) -> None:
        post = self.get_or_404(db, post_id)
        if post.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this post",
            )
        delete_and_commit(db, post)

    # --------------------------------------------------------------- helpers
    @staticmethod
    def _validate_track(db: Session, track_id: str | None) -> None:
        if track_id is None:
            return
        if db.get(Track, track_id) is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Track not found",
            )

    # ----------------------------------------------------------------- ratings
    def rate_post(
        self,
        db: Session,
        user: User,
        post_id: str,
        rating: int,
    ) -> PostRating:
        return post_rating_service.rate(db, user.id, post_id, rating)

    def get_user_rating(
        self,
        db: Session,
        user: User,
        post_id: str,
    ) -> PostRating | None:
        return post_rating_service.get_user_rating(db, user.id, post_id)

    def list_ratings(
        self,
        db: Session,
        post_id: str,
        skip: int = 0,
        limit: int = DEFAULT_PAGE_SIZE,
    ) -> list[PostRating]:
        return post_rating_service.list_for_post(db, post_id, skip, limit)

    def average_rating(self, db: Session, post_id: str) -> float | None:
        return post_rating_service.average(db, post_id)

    def rating_count(self, db: Session, post_id: str) -> int:
        return post_rating_service.count(db, post_id)

    def remove_rating(self, db: Session, user: User, post_id: str) -> None:
        post_rating_service.delete_rating(db, user.id, post_id)

    # ------------------------------------------------------------------ likes
    def like_post(self, db: Session, user: User, post_id: str) -> Like:
        post = self.get_or_404(db, post_id)
        like = (
            db.query(Like)
            .filter(Like.user_id == user.id, Like.post_id == post_id)
            .first()
        )

        if like is None:
            like = Like(user_id=user.id, post_id=post_id, liked=True)
            db.add(like)
        else:
            like.liked = True

        like = commit_and_refresh(db, like)

        if post.user_id != user.id:
            notification_service.notify(
                db,
                post.user_id,
                f"{user.username} liked your post",
            )
        return like

    def unlike_post(self, db: Session, user: User, post_id: str) -> Like | None:
        post = self.get_or_404(db, post_id)
        like = (
            db.query(Like)
            .filter(Like.user_id == user.id, Like.post_id == post_id)
            .first()
        )
        if like is None:
            return None

        like.liked = False
        like = commit_and_refresh(db, like)

        if post.user_id != user.id:
            notification_service.notify(
                db,
                post.user_id,
                f"{user.username} unliked your post",
            )
        return like

    def get_likes(
        self,
        db: Session,
        post_id: str,
        skip: int = 0,
        limit: int = DEFAULT_PAGE_SIZE,
    ) -> list[Like]:
        self.get_or_404(db, post_id)
        statement = (
            db.query(Like)
            .options(joinedload(Like.user))
            .filter(Like.post_id == post_id, Like.liked.is_(True))
            .order_by(Like.created_at.desc())
        )
        return paginate(statement, skip, limit)

    # ----------------------------------------------------------------- repost
    def repost(
        self,
        db: Session,
        user: User,
        post_id: str,
        content: str | None = None,
    ) -> Post:
        original = self.get_or_404(db, post_id)
        # Always point at the root post, even when reposting a repost.
        if original.original_post_id is not None:
            original = original.original_post or original

        new_post = Post(
            user_id=user.id,
            content=content,
            original_post_id=original.id,
        )
        db.add(new_post)
        new_post = commit_and_refresh(db, new_post)

        if original.user_id != user.id:
            notification_service.notify(
                db,
                original.user_id,
                f"{user.username} shared your post",
            )
        return new_post


post_service = PostService()

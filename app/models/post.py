from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.abstract_base import AbstractBaseModel

if TYPE_CHECKING:
    from app.models.post_comment import PostComment
    from app.models.user import User


class Post(AbstractBaseModel):
    __tablename__ = "post"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    content: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    image: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    video: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    original_post_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("post.id", ondelete="SET NULL"), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship("User", back_populates="posts")
    comments: Mapped[list["PostComment"]] = relationship(
        "PostComment", back_populates="post", cascade="all, delete-orphan"
    )
    likes: Mapped[list["Like"]] = relationship(
        "Like", back_populates="post", cascade="all, delete-orphan"
    )
    original_post: Mapped[Optional["Post"]] = relationship(
        "Post",
        remote_side="Post.id",
        back_populates="reposts",
    )
    reposts: Mapped[list["Post"]] = relationship(
        "Post", back_populates="original_post"
    )

    def __str__(self) -> str:
        return self.content or self.image or self.video or ""


class Like(AbstractBaseModel):
    __tablename__ = "like"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    post_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("post.id", ondelete="CASCADE"), nullable=False
    )
    liked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="likes")
    post: Mapped["Post"] = relationship("Post", back_populates="likes")

    def __repr__(self) -> str:
        return f"<Like user={self.user_id} post={self.post_id} liked={self.liked}>"

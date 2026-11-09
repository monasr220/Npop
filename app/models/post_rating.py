from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.abstract_base import AbstractBaseModel

if TYPE_CHECKING:
    from app.models.post import Post
    from app.models.user import User


class PostRating(AbstractBaseModel):
    """A 1-5 star rating a user gives to a post (usually a song post)."""

    __tablename__ = "post_rating"
    __table_args__ = (
        UniqueConstraint("user_id", "post_id", name="uq_post_rating"),
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_post_rating_range"),
    )

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    post_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("post.id", ondelete="CASCADE"), nullable=False
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="post_ratings")
    post: Mapped["Post"] = relationship("Post", back_populates="ratings")

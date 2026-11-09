from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.abstract_base import AbstractBaseModel

if TYPE_CHECKING:
    from app.models.track import Track
    from app.models.user import User


class ProfileTrack(AbstractBaseModel):
    """A track pinned to a user's public profile."""

    __tablename__ = "profile_track"
    __table_args__ = (
        UniqueConstraint("user_id", "track_id", name="uq_profile_track"),
    )

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    track_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tracks.id", ondelete="CASCADE"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="profile_tracks")
    track: Mapped["Track"] = relationship("Track", back_populates="profile_entries")

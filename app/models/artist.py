from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, false
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.abstract_base import AbstractBaseModel

if TYPE_CHECKING:
    from app.models.album import Album
    from app.models.track import Track
    from app.models.user import User


class Artist(AbstractBaseModel):
    __tablename__ = "artists"

    # ``user_id`` links an artist profile to the account that manages it.  It is
    # nullable so legacy/imported artists can exist without an account.
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("user.id", ondelete="CASCADE"),
        unique=True,
        nullable=True,
    )
    name: Mapped[str] = mapped_column(String(160), index=True, nullable=False)
    bio: Mapped[str] = mapped_column(Text, default="", nullable=False)
    image_url: Mapped[str] = mapped_column(String(512), default="", nullable=False)
    monthly_listeners: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    accent: Mapped[str] = mapped_column(String(32), default="#1ed760", nullable=False)
    # "checked sample": a verified badge for trusted artists.
    verified: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=false(), nullable=False
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    user: Mapped[Optional["User"]] = relationship(
        "User", back_populates="artist_profile"
    )
    albums: Mapped[list["Album"]] = relationship(
        "Album",
        back_populates="artist",
        cascade="all, delete-orphan",
        order_by="Album.release_year.desc()",
    )
    tracks: Mapped[list["Track"]] = relationship("Track", back_populates="artist")

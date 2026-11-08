from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.abstract_base import AbstractBaseModel

if TYPE_CHECKING:
    from app.models.playlist_track import PlaylistTrack
    from app.models.user import User


class Playlist(AbstractBaseModel):
    __tablename__ = "playlists"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    cover_url: Mapped[str] = mapped_column(String(512), default="", nullable=False)
    owner_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("user.id", ondelete="CASCADE"), nullable=True
    )
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    owner: Mapped["User | None"] = relationship("User", back_populates="playlists")
    entries: Mapped[list["PlaylistTrack"]] = relationship(
        "PlaylistTrack",
        back_populates="playlist",
        cascade="all, delete-orphan",
        order_by="PlaylistTrack.position",
    )

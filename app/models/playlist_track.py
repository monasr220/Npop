from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.abstract_base import AbstractBaseModel
from app.utils.time import utcnow

if TYPE_CHECKING:
    from app.models.playlist import Playlist
    from app.models.track import Track


class PlaylistTrack(AbstractBaseModel):
    __tablename__ = "playlist_tracks"
    __table_args__ = (
        UniqueConstraint("playlist_id", "track_id", name="uq_playlist_track"),
    )

    playlist_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("playlists.id", ondelete="CASCADE"), nullable=False
    )
    track_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tracks.id", ondelete="CASCADE"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    added_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    playlist: Mapped["Playlist"] = relationship("Playlist", back_populates="entries")
    track: Mapped["Track"] = relationship("Track", back_populates="playlist_entries")

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.abstract_base import AbstractBaseModel

if TYPE_CHECKING:
    from app.models.album import Album
    from app.models.artist import Artist
    from app.models.playlist_track import PlaylistTrack


class Track(AbstractBaseModel):
    __tablename__ = "tracks"

    title: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    album_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("albums.id", ondelete="CASCADE"), nullable=False
    )
    artist_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("artists.id", ondelete="CASCADE"), nullable=False
    )
    duration: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    audio_url: Mapped[str] = mapped_column(String(512), default="", nullable=False)
    track_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    explicit: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    plays: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    album: Mapped["Album"] = relationship("Album", back_populates="tracks")
    artist: Mapped["Artist"] = relationship("Artist", back_populates="tracks")
    playlist_entries: Mapped[list["PlaylistTrack"]] = relationship(
        "PlaylistTrack", back_populates="track"
    )

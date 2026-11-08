from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.abstract_base import AbstractBaseModel

if TYPE_CHECKING:
    from app.models.artist import Artist
    from app.models.track import Track


class Album(AbstractBaseModel):
    __tablename__ = "albums"

    title: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    artist_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("artists.id", ondelete="CASCADE"), nullable=False
    )
    cover_url: Mapped[str] = mapped_column(String(512), default="", nullable=False)
    release_year: Mapped[int] = mapped_column(Integer, default=2025, nullable=False)
    kind: Mapped[str] = mapped_column(String(32), default="album", nullable=False)

    artist: Mapped["Artist"] = relationship("Artist", back_populates="albums")
    tracks: Mapped[list["Track"]] = relationship(
        "Track",
        back_populates="album",
        cascade="all, delete-orphan",
        order_by="Track.track_number",
    )

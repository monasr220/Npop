from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.abstract_base import AbstractBaseModel

if TYPE_CHECKING:
    from app.models.album import Album
    from app.models.track import Track


class Artist(AbstractBaseModel):
    __tablename__ = "artists"

    name: Mapped[str] = mapped_column(String(160), index=True, nullable=False)
    bio: Mapped[str] = mapped_column(Text, default="", nullable=False)
    image_url: Mapped[str] = mapped_column(String(512), default="", nullable=False)
    monthly_listeners: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    accent: Mapped[str] = mapped_column(String(32), default="#1ed760", nullable=False)

    albums: Mapped[list["Album"]] = relationship(
        "Album",
        back_populates="artist",
        cascade="all, delete-orphan",
        order_by="Album.release_year.desc()",
    )
    tracks: Mapped[list["Track"]] = relationship("Track", back_populates="artist")

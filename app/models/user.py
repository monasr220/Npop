from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    Column,
    DateTime,
    Enum as SQLAlchemyEnum,
    ForeignKey,
    String,
    Table,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.abstract_base import AbstractBaseModel

if TYPE_CHECKING:
    from app.models.access_token import AccessToken
    from app.models.artist import Artist
    from app.models.cover_photo import CoverPhoto
    from app.models.favorite_track import FavoriteTrack
    from app.models.notification import Notification
    from app.models.playlist import Playlist
    from app.models.playlist_history import PlayHistory
    from app.models.post import Like, Post
    from app.models.post_comment import PostComment
    from app.models.post_rating import PostRating
    from app.models.profile_picture import ProfilePicture
    from app.models.profile_track import ProfileTrack
    from app.models.social_link import SocialLink


class RoleEnum(str, Enum):
    user = "user"
    artist = "artist"
    admin = "admin"


followers_table = Table(
    "user_interaction",
    Base.metadata,
    Column(
        "follower_id",
        String(36),
        ForeignKey("user.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "followed_id",
        String(36),
        ForeignKey("user.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class User(AbstractBaseModel):
    __tablename__ = "user"

    username: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password: Mapped[str] = mapped_column(String(1024), nullable=False)
    bio: Mapped[Optional[str]] = mapped_column(String(1024))
    contact_info: Mapped[Optional[str]] = mapped_column(String(15))
    role: Mapped[RoleEnum] = mapped_column(
        SQLAlchemyEnum(RoleEnum), default=RoleEnum.user, nullable=False
    )
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Two explicit sides of the self-referential follow graph.  Declaring both
    # sides (instead of an implicit ``backref``) keeps the direction obvious:
    # ``followers`` are people who follow me, ``followings`` are people I follow.
    followers: Mapped[list["User"]] = relationship(
        "User",
        secondary=followers_table,
        primaryjoin=lambda: User.id == followers_table.c.followed_id,
        secondaryjoin=lambda: User.id == followers_table.c.follower_id,
        back_populates="followings",
    )
    followings: Mapped[list["User"]] = relationship(
        "User",
        secondary=followers_table,
        primaryjoin=lambda: User.id == followers_table.c.follower_id,
        secondaryjoin=lambda: User.id == followers_table.c.followed_id,
        back_populates="followers",
    )

    # relationships
    artist_profile: Mapped[Optional["Artist"]] = relationship(
        "Artist",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    social_links: Mapped[list["SocialLink"]] = relationship(
        "SocialLink", back_populates="user", cascade="all, delete-orphan"
    )
    cover_photos: Mapped[list["CoverPhoto"]] = relationship(
        "CoverPhoto", back_populates="user", cascade="all, delete-orphan"
    )
    profile_pictures: Mapped[list["ProfilePicture"]] = relationship(
        "ProfilePicture", back_populates="user", cascade="all, delete-orphan"
    )
    posts: Mapped[list["Post"]] = relationship(
        "Post", back_populates="user", cascade="all, delete-orphan"
    )
    comments: Mapped[list["PostComment"]] = relationship(
        "PostComment", back_populates="user", cascade="all, delete-orphan"
    )
    likes: Mapped[list["Like"]] = relationship(
        "Like", back_populates="user", cascade="all, delete-orphan"
    )
    post_ratings: Mapped[list["PostRating"]] = relationship(
        "PostRating", back_populates="user", cascade="all, delete-orphan"
    )
    access_tokens: Mapped[list["AccessToken"]] = relationship(
        "AccessToken", back_populates="user", cascade="all, delete-orphan"
    )
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan"
    )
    playlists: Mapped[list["Playlist"]] = relationship(
        "Playlist", back_populates="owner", cascade="all, delete-orphan"
    )
    history: Mapped[list["PlayHistory"]] = relationship(
        "PlayHistory", back_populates="user", cascade="all, delete-orphan"
    )
    favorite_tracks: Mapped[list["FavoriteTrack"]] = relationship(
        "FavoriteTrack", back_populates="user", cascade="all, delete-orphan"
    )
    profile_tracks: Mapped[list["ProfileTrack"]] = relationship(
        "ProfileTrack",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="ProfileTrack.position",
    )

    def __str__(self) -> str:
        return self.username

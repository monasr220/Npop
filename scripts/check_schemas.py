"""Verify that the schemas match the models.

Run from the project root::

    uv run scripts/check_schemas.py

The script builds every model in an in-memory database, validates each ``*Read``
schema directly from the ORM object, and checks the ``*Create`` schemas and their
validation guards.
"""

from __future__ import annotations

import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from pydantic import ValidationError  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

import app.models  # noqa: E402,F401  (registers every table)
from app.db.base import Base  # noqa: E402
from app.models import (  # noqa: E402
    AccessToken,
    Album,
    Artist,
    CoverPhoto,
    Hashtag,
    Like,
    Notification,
    PlayHistory,
    Playlist,
    PlaylistTrack,
    Post,
    PostComment,
    ProfilePicture,
    RoleEnum,
    SocialLink,
    Track,
    User,
)
from app.schemas import (  # noqa: E402
    AccessTokenCreate,
    AccessTokenRead,
    AlbumCreate,
    AlbumRead,
    ArtistCreate,
    ArtistRead,
    CoverPhotoCreate,
    CoverPhotoRead,
    HashtagCreate,
    HashtagRead,
    LikeCreate,
    LikeRead,
    NotificationCreate,
    NotificationRead,
    PlayHistoryCreate,
    PlayHistoryRead,
    PlaylistCreate,
    PlaylistRead,
    PlaylistTrackCreate,
    PlaylistTrackRead,
    PostCommentCreate,
    PostCommentRead,
    PostCreate,
    PostRead,
    ProfilePictureCreate,
    ProfilePictureRead,
    SocialLinkCreate,
    SocialLinkRead,
    TrackCreate,
    TrackRead,
    UserCreate,
    UserRead,
    UserUpdate,
)


def build_database(session_factory):
    with session_factory() as db:
        alice = User(
            username="alice",
            email="alice@example.com",
            password="hashed-password",
            role=RoleEnum.artist,
        )
        bob = User(username="bob", email="bob@example.com", password="hashed-password")
        alice.followers.append(bob)
        db.add_all([alice, bob])
        db.flush()

        db.add_all(
            [
                SocialLink(link="https://a.example", user_id=alice.id),
                CoverPhoto(image="cover.jpg", user_id=alice.id),
                ProfilePicture(image="avatar.jpg", user_id=alice.id),
                AccessToken(
                    token="tok",
                    expiry_time=datetime.now(UTC) + timedelta(hours=1),
                    user_id=alice.id,
                ),
                Notification(message="hi", user_id=alice.id),
                Hashtag(tag="music"),
            ]
        )

        artist = Artist(name="The Band", bio="bio")
        album = Album(title="First", artist=artist, release_year=2024)
        track = Track(title="One", album=album, artist=artist, track_number=1)
        db.add(artist)

        playlist = Playlist(name="Favorites", owner=alice)
        playlist.entries.append(PlaylistTrack(track=track, position=1))
        db.add(playlist)

        post = Post(content="hello", user=alice)
        post.comments.append(PostComment(comment="nice", user=bob))
        post.likes.append(Like(user=bob, liked=True))
        db.add(post)
        db.add(PlayHistory(user=alice, track=track))
        db.commit()


def check_read_schemas(session_factory) -> None:
    with session_factory() as db:
        checks = [
            (UserRead, db.query(User).filter_by(username="alice").one()),
            (AccessTokenRead, db.query(AccessToken).one()),
            (NotificationRead, db.query(Notification).one()),
            (PostRead, db.query(Post).one()),
            (LikeRead, db.query(Like).one()),
            (PostCommentRead, db.query(PostComment).one()),
            (CoverPhotoRead, db.query(CoverPhoto).one()),
            (ProfilePictureRead, db.query(ProfilePicture).one()),
            (SocialLinkRead, db.query(SocialLink).one()),
            (HashtagRead, db.query(Hashtag).one()),
            (ArtistRead, db.query(Artist).one()),
            (AlbumRead, db.query(Album).one()),
            (TrackRead, db.query(Track).one()),
            (PlaylistRead, db.query(Playlist).one()),
            (PlaylistTrackRead, db.query(PlaylistTrack).one()),
            (PlayHistoryRead, db.query(PlayHistory).one()),
        ]

        for schema, obj in checks:
            validated = schema.model_validate(obj)
            dumped = validated.model_dump(mode="json")
            print(f"OK {schema.__name__:<22} {list(dumped)}")

    assert "password" not in UserRead.model_fields
    assert UserRead.model_config.get("from_attributes") is True


def check_create_schemas() -> None:
    now = datetime.now(UTC)
    samples = [
        UserCreate(username="charlie", email="charlie@example.com", password="password123"),
        UserUpdate(bio="updated"),
        AccessTokenCreate(user_id="u" * 36, token="tok", expiry_time=now),
        NotificationCreate(user_id="u" * 36, message="hi"),
        PostCreate(user_id="u" * 36, content="hello"),
        PostCommentCreate(user_id="u" * 36, post_id="p" * 36, comment="nice"),
        LikeCreate(user_id="u" * 36, post_id="p" * 36),
        CoverPhotoCreate(user_id="u" * 36, image="cover.jpg"),
        ProfilePictureCreate(user_id="u" * 36, image="avatar.jpg"),
        SocialLinkCreate(user_id="u" * 36, link="https://example.com"),
        HashtagCreate(tag="music"),
        ArtistCreate(name="The Band"),
        AlbumCreate(title="First", artist_id="a" * 36),
        TrackCreate(title="One", album_id="a" * 36, artist_id="a" * 36),
        PlaylistCreate(name="Favorites"),
        PlaylistTrackCreate(playlist_id="p" * 36, track_id="t" * 36),
        PlayHistoryCreate(user_id="u" * 36, track_id="t" * 36),
    ]

    for schema in samples:
        print(f"OK {type(schema).__name__:<22} {schema.model_dump(mode='json')}")

    assert samples[0].role == RoleEnum.user
    assert samples[3].status.value == "unread"
    assert samples[13].track_number == 1
    assert samples[14].is_system is False

    def rejects(schema, **data) -> bool:
        try:
            schema(**data)
        except ValidationError:
            return True
        return False

    assert rejects(UserCreate, username="ab", email="bad", password="short")
    assert rejects(HashtagCreate, tag="x" * 56)
    assert rejects(TrackCreate, title="t", album_id="a" * 36, artist_id="a" * 36, track_number=0)
    assert rejects(PostCreate, user_id="u" * 36, content="x" * 1025)
    print("OK validation guards reject invalid input")


def main() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)

    build_database(session_factory)
    print(f"OK built models for {len(Base.metadata.tables)} tables")
    check_read_schemas(session_factory)
    check_create_schemas()
    print("OK all schemas match the models")


if __name__ == "__main__":
    main()

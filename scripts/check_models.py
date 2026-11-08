"""Verify that every model in ``app.models`` fits together.

Run from the project root::

    python scripts/check_models.py

The script imports the whole models package, configures the ORM mappers, creates
the complete schema in an in-memory SQLite database and exercises the
relationships with a small round-trip.  It exits non-zero on the first problem.
"""

from __future__ import annotations

import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import create_engine, inspect  # noqa: E402
from sqlalchemy.orm import configure_mappers, sessionmaker  # noqa: E402

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


def main() -> None:
    configure_mappers()
    print("OK: ORM mappers configured")

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    tables = sorted(inspect(engine).get_table_names())
    print(f"OK: created {len(tables)} tables -> {', '.join(tables)}")

    session_factory = sessionmaker(bind=engine, expire_on_commit=False)
    with session_factory() as db:
        alice = User(
            username="alice",
            email="alice@example.com",
            password="x",
            role=RoleEnum.artist,
        )
        bob = User(username="bob", email="bob@example.com", password="y")
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
        track1 = Track(title="One", album=album, artist=artist, track_number=1)
        track2 = Track(title="Two", album=album, artist=artist, track_number=2)
        db.add(artist)

        playlist = Playlist(name="Favorites", owner=alice)
        playlist.entries.append(PlaylistTrack(track=track1, position=1))
        playlist.entries.append(PlaylistTrack(track=track2, position=2))
        db.add(playlist)

        post = Post(content="hello", user=alice)
        post.comments.append(PostComment(comment="nice", user=bob))
        post.likes.append(Like(user=bob, liked=True))
        db.add_all([post, Post(content="repost", user=bob, original_post=post)])
        db.add(PlayHistory(user=alice, track=track1))
        db.commit()

    with session_factory() as db:
        alice = db.query(User).filter_by(username="alice").one()
        assert [u.username for u in alice.followers] == ["bob"]
        assert [p.content for p in alice.posts] == ["hello"]
        assert [like.user.username for p in alice.posts for like in p.likes] == ["bob"]
        assert [c.comment for p in alice.posts for c in p.comments] == ["nice"]
        assert [p.content for p in alice.posts[0].reposts] == ["repost"]
        assert [n.message for n in alice.notifications] == ["hi"]
        assert [t.token for t in alice.access_tokens] == ["tok"]
        assert [p.name for p in alice.playlists] == ["Favorites"]
        assert [e.track.title for e in alice.playlists[0].entries] == ["One", "Two"]
        assert [h.track.title for h in alice.history] == ["One"]

        artist = db.query(Artist).one()
        assert [(a.title, [t.title for t in a.tracks]) for a in artist.albums] == [
            ("First", ["One", "Two"])
        ]
        assert [t.title for t in artist.tracks] == ["One", "Two"]

    print("OK: full ORM round-trip (users, posts, music, playlists, history)")


if __name__ == "__main__":
    main()

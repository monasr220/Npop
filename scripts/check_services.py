"""Exercise every service against an in-memory database.

Run from the project root::

    uv run scripts/check_services.py
"""

from __future__ import annotations

import asyncio
import sys
from datetime import timedelta
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import HTTPException  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import app.models  # noqa: E402,F401
from app.core.security import (  # noqa: E402
    TokenError,
    create_access_token,
    decode_access_token,
)
from app.db.base import Base  # noqa: E402
from app.models.user import RoleEnum  # noqa: E402
from app.schemas.album import AlbumCreate, AlbumUpdate  # noqa: E402
from app.schemas.artist import ArtistCreate  # noqa: E402
from app.schemas.playlist import PlaylistCreate  # noqa: E402
from app.schemas.post import PostCreate, PostUpdate  # noqa: E402
from app.schemas.post_comment import PostCommentCreate, PostCommentUpdate  # noqa: E402
from app.schemas.track import TrackCreate  # noqa: E402
from app.schemas.user import UserCreate, UserUpdate  # noqa: E402
from app.services import (  # noqa: E402
    access_token_service,
    album_service,
    artist_service,
    cover_photo_service,
    hashtag_service,
    notification_service,
    play_history_service,
    playlist_service,
    playlist_track_service,
    post_comment_service,
    post_service,
    profile_picture_service,
    social_link_service,
    track_service,
    user_service,
)


def expect_http(status_code: int, call, label: str) -> None:
    try:
        call()
    except HTTPException as exc:
        assert exc.status_code == status_code, (
            f"{label}: expected {status_code}, got {exc.status_code}"
        )
        print(f"OK guard {label:<40} -> {exc.status_code}")
        return
    raise AssertionError(f"{label}: expected HTTPException {status_code}")


def check_users(db) -> dict:
    alice = user_service.register(
        db,
        UserCreate(
            username="alice",
            email="alice@example.com",
            password="password123",
            bio="hello",
        ),
    )
    bob = user_service.register(
        db,
        UserCreate(username="bob", email="bob@example.com", password="password456"),
    )
    print("OK user_service.register            -> 2 users, tokens issued")
    assert alice["access_token"] and alice["expiry_time"]
    assert alice["user"].password != "password123"

    expect_http(
        400,
        lambda: user_service.register(
            db,
            UserCreate(
                username="alice2",
                email="alice@example.com",
                password="password123",
            ),
        ),
        "duplicate email",
    )

    login = user_service.authenticate(db, "alice@example.com", "password123")
    assert login["access_token"]
    print("OK user_service.authenticate        -> token + user")
    expect_http(
        401,
        lambda: user_service.authenticate(db, "alice@example.com", "wrong-password"),
        "wrong password",
    )

    current = user_service.get_current_user(db, login["access_token"])
    assert current.id == alice["user"].id
    assert access_token_service.get_by_token(db, login["access_token"]) is not None
    print("OK user_service.get_current_user    -> alice")

    expired, _ = create_access_token(
        current.id, expires_delta=timedelta(seconds=-1)
    )
    try:
        decode_access_token(expired)
    except TokenError:
        print("OK expired JWT rejected             -> TokenError")
    else:
        raise AssertionError("expired token was accepted")

    updated = user_service.update_profile(
        db,
        current,
        current.id,
        UserUpdate(bio="updated bio"),
    )
    assert updated.bio == "updated bio"
    print("OK user_service.update_profile      -> bio updated")

    user_service.follow(db, current, bob["user"].id)
    assert bob["user"] in current.followings
    assert current in bob["user"].followers
    assert bob["user"] in user_service.followings(db, current)
    assert current in user_service.followers(db, bob["user"])
    assert user_service.followers_count(db, bob["user"].id) == 1
    assert user_service.followings_count(db, current.id) == 1
    assert user_service.is_following(db, current.id, bob["user"].id)
    print("OK user_service.follow/unfollow     -> graph updated")
    user_service.unfollow(db, current, bob["user"].id)
    assert bob["user"] not in current.followings
    assert user_service.followers_count(db, bob["user"].id) == 0
    assert not user_service.is_following(db, current.id, bob["user"].id)
    print("OK user_service.unfollow            -> graph updated")

    profile_picture_service.create_for_user(db, current.id, "avatar.jpg")
    cover_photo_service.create_for_user(db, current.id, "cover.jpg")
    social_link_service.replace_for_user(
        db, current.id, ["https://a.example", "https://b.example"]
    )
    assert profile_picture_service.latest_for_user(db, current.id).image == "avatar.jpg"
    assert cover_photo_service.latest_for_user(db, current.id).image == "cover.jpg"
    assert len(social_link_service.list_for_user(db, current.id)) == 2

    detail = user_service.get_user_detail(db, current.id)
    assert detail.profile_pictures and detail.cover_photos and detail.social_links
    print("OK media/social services            -> profile, cover, links")
    print("OK user_service.get_user_detail     -> eager loaded relations")

    assert user_service.search(db, "ali")
    print("OK user_service.search              -> alice")

    user_service.logout(db, current)
    assert access_token_service.is_blacklisted(db, login["access_token"])
    expect_http(
        401,
        lambda: user_service.get_current_user(db, login["access_token"]),
        "blacklisted token",
    )
    print("OK user_service.logout              -> token blacklisted")

    return {"alice": alice["user"], "bob": bob["user"]}


def check_music(db) -> dict:
    artist = artist_service.create(
        db,
        ArtistCreate(name="The Band", bio="A band", monthly_listeners=1000),
    )
    album = album_service.create(
        db,
        AlbumCreate(title="First", artist_id=artist.id, release_year=2024),
    )
    track = track_service.create(
        db,
        TrackCreate(
            title="One",
            album_id=album.id,
            artist_id=artist.id,
            track_number=1,
            duration=180,
        ),
    )
    track2 = track_service.create(
        db,
        TrackCreate(
            title="Two",
            album_id=album.id,
            artist_id=artist.id,
            track_number=2,
            duration=200,
        ),
    )
    print("OK artist/album/track create        -> 1 artist, 1 album, 2 tracks")

    assert artist_service.search(db, "band")
    assert len(album_service.list_by_artist(db, artist.id)) == 1
    assert len(track_service.list_by_album(db, album.id)) == 2
    assert len(track_service.list_by_artist(db, artist.id)) == 2
    assert track_service.search(db, "one")
    assert album_service.get_with_tracks(db, album.id).tracks
    assert artist_service.get_with_albums(db, artist.id).albums
    print("OK music queries                    -> search + eager loading")

    assert track_service.increment_plays(db, track.id).plays == 1
    album_service.update(db, album.id, AlbumUpdate(kind="EP"))
    assert album_service.get_or_404(db, album.id).kind == "EP"
    print("OK track plays / album update       -> updated")

    return {"artist": artist, "album": album, "tracks": [track, track2]}


def check_artist_features(db, users: dict) -> dict:
    """Artist uploads, albums/covers, verification and listening."""
    carol = user_service.register(
        db,
        UserCreate(
            username="carol",
            email="carol@example.com",
            password="password789",
        ),
    )["user"]
    dave = user_service.register(
        db,
        UserCreate(
            username="dave",
            email="dave@example.com",
            password="password000",
        ),
    )["user"]

    carol_artist = artist_service.create_for_user(
        db, carol, ArtistCreate(name="Carol", bio="Solo artist")
    )
    dave_artist = artist_service.create_for_user(
        db, dave, ArtistCreate(name="Dave")
    )
    assert carol.role == RoleEnum.artist
    assert artist_service.get_by_user(db, carol.id).id == carol_artist.id
    print("OK artist_service.create_for_user   -> role + artist profile")
    expect_http(
        400,
        lambda: artist_service.create_for_user(
            db, carol, ArtistCreate(name="Carol Two")
        ),
        "duplicate artist profile",
    )

    album = album_service.create_for_artist(
        db,
        carol,
        AlbumCreate(
            title="Carol LP",
            artist_id=carol_artist.id,
            release_year=2026,
        ),
    )
    assert album.artist_id == carol_artist.id
    expect_http(
        403,
        lambda: album_service.create_for_artist(
            db,
            carol,
            AlbumCreate(title="Wrong", artist_id=dave_artist.id),
        ),
        "cross-artist album",
    )
    expect_http(
        403,
        lambda: album_service.create_for_artist(
            db,
            users["bob"],
            AlbumCreate(title="Nope", artist_id=carol_artist.id),
        ),
        "non-artist album",
    )
    print("OK album_service.create_for_artist  -> artist-only")

    album = album_service.upload_cover(
        db, carol, album.id, "https://cdn.example/carol.jpg"
    )
    assert album.cover_url == "https://cdn.example/carol.jpg"
    expect_http(
        403,
        lambda: album_service.upload_cover(
            db, dave, album.id, "https://cdn.example/hijack.jpg"
        ),
        "cross-artist cover",
    )
    print("OK album_service.upload_cover       -> owner only")

    track = track_service.upload_for_artist(
        db,
        carol,
        TrackCreate(
            title="Carol Song",
            album_id=album.id,
            artist_id=carol_artist.id,
            duration=200,
            audio_url="https://cdn.example/carol.mp3",
        ),
    )
    assert track.artist_id == carol_artist.id
    assert track.audio_url.endswith(".mp3")
    expect_http(
        403,
        lambda: track_service.upload_for_artist(
            db,
            dave,
            TrackCreate(
                title="Hijack",
                album_id=album.id,
                artist_id=dave_artist.id,
                audio_url="https://cdn.example/hijack.mp3",
            ),
        ),
        "cross-artist upload",
    )
    expect_http(
        403,
        lambda: track_service.upload_for_artist(
            db,
            users["bob"],
            TrackCreate(
                title="Nope",
                album_id=album.id,
                artist_id=carol_artist.id,
                audio_url="https://cdn.example/nope.mp3",
            ),
        ),
        "non-artist upload",
    )
    expect_http(
        400,
        lambda: track_service.upload_for_artist(
            db,
            carol,
            TrackCreate(
                title="Silent",
                album_id=album.id,
                artist_id=carol_artist.id,
            ),
        ),
        "missing audio",
    )
    print("OK track_service.upload_for_artist  -> artist-only + audio")

    dave_album = album_service.create_for_artist(
        db, dave, AlbumCreate(title="Dave LP", artist_id=dave_artist.id)
    )
    dave_track = track_service.upload_for_artist(
        db,
        dave,
        TrackCreate(
            title="Dave Song",
            album_id=dave_album.id,
            artist_id=dave_artist.id,
            audio_url="https://cdn.example/dave.mp3",
        ),
    )

    verified = artist_service.verify(db, carol_artist.id)
    assert verified.verified and verified.verified_at is not None
    revoked = artist_service.verify(db, carol_artist.id, False)
    assert not revoked.verified and revoked.verified_at is None
    artist_service.verify(db, carol_artist.id, True)
    print("OK artist_service.verify            -> checked badge")

    alice = users["alice"]
    for _ in range(3):
        track_service.play(db, track.id, alice.id)
    track_service.play(db, dave_track.id, alice.id)
    track_service.play(db, dave_track.id)  # anonymous listen
    assert track_service.get_or_404(db, track.id).plays == 3
    assert track_service.get_or_404(db, dave_track.id).plays == 2
    recent = user_service.recently_played(db, alice.id)
    assert {recent_track.id for recent_track in recent} == {
        track.id,
        dave_track.id,
    }
    assert user_service.most_played_for_user(db, alice.id)[0].id == track.id
    assert track_service.most_played(db)[0].id == track.id
    print("OK track_service.play/most_played   -> history + listen counts")

    return {
        "carol": carol,
        "dave": dave,
        "carol_artist": carol_artist,
        "dave_artist": dave_artist,
        "carol_album": album,
        "dave_album": dave_album,
        "carol_track": track,
        "dave_track": dave_track,
    }


def check_multi_artist_playlists(db, users: dict, artists: dict) -> None:
    alice = users["alice"]
    carol = artists["carol"]
    dave = artists["dave"]
    carol_track = artists["carol_track"]
    dave_track = artists["dave_track"]

    playlist = playlist_service.create_for_owner(
        db,
        alice,
        PlaylistCreate(name="Cross Artist", owner_id=dave.id),
    )
    assert playlist.owner_id == alice.id  # owner cannot be spoofed
    playlist_service.add_track(db, alice, playlist.id, carol_track.id)
    playlist_service.add_track(db, alice, playlist.id, dave_track.id)
    assert {artist.id for artist in playlist_service.artists(db, playlist.id)} == {
        artists["carol_artist"].id,
        artists["dave_artist"].id,
    }
    print("OK playlist multi-artist            -> 2 artists in one playlist")

    artist_playlist = playlist_service.create_for_owner(
        db, carol, PlaylistCreate(name="Carol picks")
    )
    assert artist_playlist.owner_id == carol.id
    playlist_service.add_track(db, carol, artist_playlist.id, dave_track.id)
    print("OK playlist artist owner            -> artist can build playlists")

    expect_http(
        403,
        lambda: playlist_service.add_track(
            db, users["bob"], playlist.id, carol_track.id
        ),
        "playlist add ownership",
    )
    expect_http(
        403,
        lambda: playlist_service.remove_track(
            db, users["bob"], playlist.id, carol_track.id
        ),
        "playlist remove ownership",
    )
    print("OK playlist ownership guard         -> 403")

    playlist_service.remove_track(db, alice, playlist.id, carol_track.id)
    assert len(playlist_track_service.list_for_playlist(db, playlist.id)) == 1
    print("OK playlist owner remove            -> 1 entry")


def check_profile_music(db, users: dict, artists: dict) -> None:
    alice = users["alice"]
    carol_track = artists["carol_track"]
    dave_track = artists["dave_track"]

    user_service.add_favorite(db, alice, carol_track.id)
    user_service.add_favorite(db, alice, carol_track.id)  # idempotent
    assert user_service.is_favorite(db, alice, carol_track.id)
    assert len(user_service.list_favorites(db, alice.id)) == 1
    assert user_service.list_favorite_tracks(db, alice.id)[0].id == carol_track.id
    print("OK user favourites                  -> add/idempotent/list")

    user_service.add_profile_track(db, alice, carol_track.id)
    user_service.add_profile_track(db, alice, dave_track.id)
    entries = user_service.list_profile_tracks(db, alice.id)
    assert [entry.track_id for entry in entries] == [
        carol_track.id,
        dave_track.id,
    ]
    reordered = user_service.reorder_profile_tracks(
        db, alice, [dave_track.id, carol_track.id]
    )
    assert [entry.track_id for entry in reordered] == [
        dave_track.id,
        carol_track.id,
    ]
    print("OK user profile tracks              -> pin + reorder")

    music = user_service.get_profile_music(db, alice.id)
    assert [entry.track_id for entry in music["profile_tracks"]] == [
        dave_track.id,
        carol_track.id,
    ]
    assert music["favorites"] and music["favorite_tracks"]
    assert music["recently_played"] and music["most_played"]
    print("OK user get_profile_music           -> profile music visible")

    expect_http(
        404,
        lambda: user_service.add_favorite(db, alice, "missing-track"),
        "favourite missing track",
    )
    user_service.remove_favorite(db, alice, carol_track.id)
    assert not user_service.is_favorite(db, alice, carol_track.id)
    user_service.remove_profile_track(db, alice, carol_track.id)
    assert len(user_service.list_profile_tracks(db, alice.id)) == 1
    print("OK user favourite/profile removal   -> cleaned up")


def check_song_posts(db, users: dict, artists: dict) -> None:
    alice = users["alice"]
    bob = users["bob"]
    carol_track = artists["carol_track"]
    dave_track = artists["dave_track"]

    post = post_service.create_post(
        db,
        alice,
        PostCreate(
            user_id=alice.id,
            content="listen to this",
            track_id=carol_track.id,
        ),
    )
    assert post.track_id == carol_track.id
    loaded = post_service.get_post(db, post.id)
    assert loaded.track.title == "Carol Song"
    print("OK post song attachment             -> track eager loaded")

    song_only = post_service.create_post(
        db,
        bob,
        PostCreate(user_id=bob.id, track_id=dave_track.id),
    )
    assert song_only.content is None
    assert song_only.track_id == dave_track.id
    print("OK post song-only                   -> allowed")

    expect_http(
        404,
        lambda: post_service.create_post(
            db,
            alice,
            PostCreate(user_id=alice.id, track_id="missing-track"),
        ),
        "post missing track",
    )
    print("OK post invalid track guard         -> 404")

    post_service.rate_post(db, bob, post.id, 5)
    post_service.rate_post(db, artists["carol"], post.id, 3)
    post_service.rate_post(db, bob, post.id, 4)  # update own rating
    assert post_service.rating_count(db, post.id) == 2
    assert post_service.average_rating(db, post.id) == 3.5
    assert post_service.get_user_rating(db, bob, post.id).rating == 4

    db.expire_all()
    loaded = post_service.get_post(db, post.id)
    assert loaded.average_rating == 3.5
    assert loaded.rating_count == 2
    print("OK post ratings                     -> average + count")

    expect_http(
        400,
        lambda: post_service.rate_post(db, alice, post.id, 6),
        "rating range",
    )
    print("OK post rating range guard          -> 400")

    post_service.remove_rating(db, bob, post.id)
    assert post_service.rating_count(db, post.id) == 1
    assert post_service.average_rating(db, post.id) == 3.0
    print("OK post rating removal              -> 1 rating left")


def check_playlists(db, users: dict, music: dict) -> None:
    alice = users["alice"]
    # Start from a clean history so the play-count assertions below are exact;
    # earlier artist tests also listened as alice.
    play_history_service.clear_for_user(db, alice.id)
    playlist = playlist_service.create(
        db,
        PlaylistCreate(name="Favorites", owner_id=alice.id),
    )
    first, second = music["tracks"]

    playlist_track_service.add_track(db, playlist.id, first.id)
    playlist_track_service.add_track(db, playlist.id, second.id)
    assert len(playlist_track_service.list_for_playlist(db, playlist.id)) == 2
    print("OK playlist_track.add_track         -> 2 entries")

    expect_http(
        409,
        lambda: playlist_track_service.add_track(db, playlist.id, first.id),
        "duplicate playlist track",
    )

    reordered = playlist_track_service.reorder(
        db, playlist.id, [second.id, first.id]
    )
    assert [entry.track_id for entry in reordered] == [second.id, first.id]
    print("OK playlist_track.reorder           -> order changed")

    assert playlist_service.get_with_tracks(db, playlist.id).entries
    assert playlist_service.list_by_owner(db, alice.id)
    print("OK playlist queries                 -> owner list + eager loading")

    playlist_track_service.remove_track(db, playlist.id, first.id)
    assert len(playlist_track_service.list_for_playlist(db, playlist.id)) == 1
    print("OK playlist_track.remove_track      -> 1 entry")

    play_history_service.record_play(db, alice.id, first.id)
    play_history_service.record_play(db, alice.id, second.id)
    play_history_service.record_play(db, alice.id, first.id)
    assert len(play_history_service.list_for_user(db, alice.id)) == 3
    recent = play_history_service.recently_played_tracks(db, alice.id)
    assert len(recent) == 2  # distinct tracks
    print("OK play_history                     -> 3 plays, 2 distinct tracks")
    assert play_history_service.clear_for_user(db, alice.id) == 3
    print("OK play_history.clear_for_user      -> cleared")


def check_posts(db, users: dict) -> None:
    alice = users["alice"]
    bob = users["bob"]

    post = post_service.create_post(
        db,
        alice,
        PostCreate(user_id=alice.id, content="hello world"),
    )
    expect_http(
        400,
        lambda: post_service.create_post(
            db, alice, PostCreate(user_id=alice.id)
        ),
        "empty post",
    )

    assert post_service.feed(db)
    assert post_service.get_post(db, post.id).user.username == "alice"
    print("OK post_service.create/feed/get     -> post visible")

    post_service.like_post(db, bob, post.id)
    likes = post_service.get_likes(db, post.id)
    assert len(likes) == 1 and likes[0].user.username == "bob"
    post_service.like_post(db, bob, post.id)  # idempotent
    assert len(post_service.get_likes(db, post.id)) == 1
    post_service.unlike_post(db, bob, post.id)
    assert post_service.get_likes(db, post.id) == []
    print("OK post_service.like/unlike         -> toggled + notification")

    comment = post_comment_service.create_comment(
        db,
        bob,
        post.id,
        PostCommentCreate(user_id=bob.id, post_id=post.id, comment="nice"),
    )
    assert post_comment_service.list_for_post(db, post.id)
    post_comment_service.update_comment(
        db,
        bob,
        comment.id,
        PostCommentUpdate(comment="very nice"),
    )
    assert post_comment_service.get_with_user(db, comment.id).comment == "very nice"
    expect_http(
        403,
        lambda: post_comment_service.update_comment(
            db, alice, comment.id, PostCommentUpdate(comment="hijack")
        ),
        "comment ownership",
    )
    post_comment_service.delete_comment(db, bob, comment.id)
    assert post_comment_service.list_for_post(db, post.id) == []
    print("OK post_comment_service             -> create/update/delete")

    expect_http(
        403,
        lambda: post_service.update_post(
            db, bob, post.id, PostUpdate(content="hijack")
        ),
        "post update ownership",
    )
    updated = post_service.update_post(
        db, alice, post.id, PostUpdate(content="updated")
    )
    assert updated.content == "updated"
    print("OK post_service.update              -> ownership enforced")

    repost = post_service.repost(db, bob, post.id, content="look at this")
    assert repost.original_post_id == post.id
    print("OK post_service.repost              -> linked to original")

    bob_notifications = notification_service.list_for_user(db, bob.id)
    alice_notifications = notification_service.list_for_user(db, alice.id)
    assert alice_notifications, "alice should have like/comment notifications"
    assert bob_notifications, "bob should have notifications"
    print(
        "OK notification_service             "
        f"-> alice={len(alice_notifications)} bob={len(bob_notifications)}"
    )

    unread = notification_service.unread_count(db, alice.id)
    assert unread == len(alice_notifications)
    notification_service.mark_read(db, alice_notifications[0].id, alice.id)
    assert notification_service.unread_count(db, alice.id) == unread - 1
    notification_service.mark_all_read(db, alice.id)
    assert notification_service.unread_count(db, alice.id) == 0
    print("OK notification read state          -> mark read/all read")

    async def read_one() -> str:
        # Simulate a client that has connected before the event is published.
        notification_service.queue_for(bob.id)
        generator = notification_service.event_generator(bob.id)
        notification_service.publish(bob.id, "streamed message")
        try:
            return await anext(generator)
        finally:
            await generator.aclose()

    event = asyncio.run(read_one())
    assert event == "data: streamed message\n\n", repr(event)
    print("OK notification SSE                 -> event received")

    post_service.delete_post(db, alice, post.id)
    assert post_service.get(db, post.id) is None
    print("OK post_service.delete              -> post removed")


def check_hashtags(db) -> None:
    tag = hashtag_service.get_or_create(db, "#Music")
    assert tag.tag == "music"
    assert hashtag_service.get_or_create(db, "music").id == tag.id
    hashtag_service.increment_usage(db, "music", 2)
    assert hashtag_service.trending(db)[0].usage == 3
    print("OK hashtag_service                  -> normalize/create/trending")


def main() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)
    db = session_factory()

    try:
        users = check_users(db)
        music = check_music(db)
        artists = check_artist_features(db, users)
        check_multi_artist_playlists(db, users, artists)
        check_profile_music(db, users, artists)
        check_playlists(db, users, music)
        check_song_posts(db, users, artists)
        check_posts(db, users)
        check_hashtags(db)
    finally:
        db.close()

    print(f"OK all services exercised on {len(Base.metadata.tables)} tables")


if __name__ == "__main__":
    main()

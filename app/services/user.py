"""User registration, authentication, profiles and follow graph."""

from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, selectinload

from app.core.security import (
    TokenError,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.models.playlist_history import PlayHistory
from app.models.track import Track
from app.models.user import User, followers_table
from app.schemas.user import UserCreate, UserUpdate
from app.services.access_token import access_token_service
from app.services.base import CRUDService
from app.services.cover_photo import cover_photo_service
from app.services.favorite_track import favorite_track_service
from app.services.notification import notification_service
from app.services.playlist import playlist_service
from app.services.playlist_history import play_history_service
from app.services.profile_picture import profile_picture_service
from app.services.profile_track import profile_track_service
from app.services.social_link import social_link_service
from app.services.track import track_service
from app.utils.crud import commit_and_refresh
from app.utils.pagination import DEFAULT_PAGE_SIZE, paginate
from app.utils.time import utcnow

CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


class UserService(CRUDService[User]):
    model = User
    not_found_detail = "User not found"
    order_by = User.username.asc()

    # ------------------------------------------------------------------- read
    def get_by_email(self, db: Session, email: str) -> User | None:
        return db.query(User).filter(User.email == email).first()

    def get_by_username(self, db: Session, username: str) -> User | None:
        return db.query(User).filter(User.username == username).first()

    def exists_by_email(self, db: Session, email: str) -> bool:
        return self.get_by_email(db, email) is not None

    def get_user_detail(self, db: Session, user_id: str) -> User:
        user = (
            db.query(User)
            .options(
                selectinload(User.profile_pictures),
                selectinload(User.cover_photos),
                selectinload(User.social_links),
                selectinload(User.followers),
                selectinload(User.followings),
            )
            .filter(User.id == user_id)
            .first()
        )
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=self.not_found_detail,
            )
        return user

    def search(
        self,
        db: Session,
        query: str,
        skip: int = 0,
        limit: int = DEFAULT_PAGE_SIZE,
    ) -> list[User]:
        statement = (
            db.query(User)
            .filter(
                or_(
                    User.username.ilike(f"%{query}%"),
                    User.email.ilike(f"%{query}%"),
                )
            )
            .order_by(User.username.asc())
        )
        return paginate(statement, skip, limit)

    # ------------------------------------------------------------- registration
    def register(self, db: Session, payload: UserCreate) -> dict:
        if self.exists_by_email(db, payload.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with email already exists",
            )

        data = payload.model_dump(exclude={"password"})
        user = User(password=hash_password(payload.password), **data)
        db.add(user)
        user = commit_and_refresh(db, user)

        notification_service.notify(db, user.id, "Account created successfully")
        token, expiry = self.issue_token(db, user)

        return {
            "access_token": token,
            "expiry_time": expiry,
            "user": user,
        }

    # ----------------------------------------------------------- authentication
    def issue_token(self, db: Session, user: User) -> tuple[str, datetime]:
        token, expiry = create_access_token(
            user.id,
            extra_claims={"email": user.email, "username": user.username},
        )
        access_token_service.create_for_user(db, user.id, token, expiry)
        return token, expiry

    def authenticate(self, db: Session, email: str, password: str) -> dict:
        user = self.get_by_email(db, email)
        if user is None or not verify_password(password, user.password):
            raise CREDENTIALS_ERROR

        user.last_login = utcnow()
        user = commit_and_refresh(db, user)

        notification_service.notify(db, user.id, "Account login successful")
        token, expiry = self.issue_token(db, user)

        return {
            "access_token": token,
            "expiry_time": expiry,
            "user": user,
        }

    def get_current_user(self, db: Session, token: str) -> User:
        try:
            payload = decode_access_token(token)
        except TokenError as exc:
            raise CREDENTIALS_ERROR from exc

        access_token = access_token_service.get_by_token(db, token)
        if access_token is None or access_token.blacklisted:
            raise CREDENTIALS_ERROR

        user = self.get(db, payload["sub"])
        if user is None:
            raise CREDENTIALS_ERROR
        return user

    def logout(self, db: Session, user: User) -> None:
        access_token_service.blacklist(db, user_id=user.id)
        notification_service.notify(db, user.id, "Account logout successful")

    # ---------------------------------------------------------------- profiles
    def update_profile(
        self,
        db: Session,
        user: User,
        user_id: str,
        payload: UserUpdate,
    ) -> User:
        if user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to update this user",
            )

        data = payload.model_dump(exclude_unset=True)

        new_email = data.get("email")
        if new_email and new_email != user.email:
            existing = self.get_by_email(db, new_email)
            if existing is not None and existing.id != user.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User with email already exists",
                )

        password = data.pop("password", None)
        if password:
            data["password"] = hash_password(password)

        for field, value in data.items():
            setattr(user, field, value)

        user = commit_and_refresh(db, user)
        notification_service.notify(db, user.id, "Account updated successfully")
        return user

    def delete_profile(self, db: Session, user: User, user_id: str) -> None:
        if user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this user",
            )
        db.delete(user)
        db.commit()

    def set_profile_picture(self, db: Session, user: User, image):
        """Accept an uploaded file or an already-hosted image URL."""
        if hasattr(image, "read"):
            return profile_picture_service.upload_for_user(db, user.id, image)
        return profile_picture_service.create_for_user(db, user.id, image)

    def set_cover_photo(self, db: Session, user: User, image):
        """Accept an uploaded file or an already-hosted image URL."""
        if hasattr(image, "read"):
            return cover_photo_service.upload_for_user(db, user.id, image)
        return cover_photo_service.create_for_user(db, user.id, image)

    def set_social_links(self, db: Session, user: User, links: list[str]):
        return social_link_service.replace_for_user(db, user.id, links)

    # ----------------------------------------------------------- follow graph
    #
    # These queries read the association table directly.  The previous
    # implementation returned the ORM collections, which could be stale when
    # the relationship had already been loaded in the session (the source of
    # the "followers are always empty" bug).  Querying the table keeps the
    # result correct regardless of relationship cache state.
    def followers(self, db: Session, user: User) -> list[User]:
        return (
            db.query(User)
            .join(followers_table, followers_table.c.follower_id == User.id)
            .filter(followers_table.c.followed_id == user.id)
            .order_by(User.username.asc())
            .all()
        )

    def followings(self, db: Session, user: User) -> list[User]:
        return (
            db.query(User)
            .join(followers_table, followers_table.c.followed_id == User.id)
            .filter(followers_table.c.follower_id == user.id)
            .order_by(User.username.asc())
            .all()
        )

    def followers_count(self, db: Session, user_id: str) -> int:
        return (
            db.query(followers_table)
            .filter(followers_table.c.followed_id == user_id)
            .count()
        )

    def followings_count(self, db: Session, user_id: str) -> int:
        return (
            db.query(followers_table)
            .filter(followers_table.c.follower_id == user_id)
            .count()
        )

    def is_following(
        self,
        db: Session,
        follower_id: str,
        followed_id: str,
    ) -> bool:
        return (
            db.query(followers_table)
            .filter(
                followers_table.c.follower_id == follower_id,
                followers_table.c.followed_id == followed_id,
            )
            .first()
            is not None
        )

    def follow(self, db: Session, user: User, target_id: str) -> User:
        target = self.get_or_404(db, target_id, detail="User not found")

        if target.id == user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot follow yourself",
            )

        if self.is_following(db, user.id, target.id):
            return target

        db.execute(
            followers_table.insert().values(
                follower_id=user.id,
                followed_id=target.id,
            )
        )
        db.commit()

        # Force the cached collections to reload so callers that inspect the
        # relationship see the new edge immediately.
        db.expire(user, ["followings"])
        db.expire(target, ["followers"])

        notification_service.notify(
            db,
            target.id,
            f"{user.username} followed you",
        )
        return target

    def unfollow(self, db: Session, user: User, target_id: str) -> User:
        target = self.get_or_404(db, target_id, detail="User not found")

        if not self.is_following(db, user.id, target.id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="You are not following this user",
            )

        db.execute(
            followers_table.delete().where(
                followers_table.c.follower_id == user.id,
                followers_table.c.followed_id == target.id,
            )
        )
        db.commit()

        db.expire(user, ["followings"])
        db.expire(target, ["followers"])

        notification_service.notify(
            db,
            target.id,
            f"{user.username} unfollowed you",
        )
        return target

    # -------------------------------------------------------------- favourites
    def add_favorite(self, db: Session, user: User, track_id: str):
        return favorite_track_service.add(db, user.id, track_id)

    def remove_favorite(self, db: Session, user: User, track_id: str) -> None:
        favorite_track_service.remove(db, user.id, track_id)

    def list_favorites(
        self,
        db: Session,
        user_id: str,
        skip: int = 0,
        limit: int = DEFAULT_PAGE_SIZE,
    ):
        return favorite_track_service.list_for_user(db, user_id, skip, limit)

    def list_favorite_tracks(
        self,
        db: Session,
        user_id: str,
        skip: int = 0,
        limit: int = DEFAULT_PAGE_SIZE,
    ) -> list[Track]:
        return [
            favorite.track
            for favorite in self.list_favorites(db, user_id, skip, limit)
        ]

    def is_favorite(self, db: Session, user: User, track_id: str) -> bool:
        return favorite_track_service.is_favorite(db, user.id, track_id)

    # ---------------------------------------------------------- profile tracks
    def add_profile_track(
        self,
        db: Session,
        user: User,
        track_id: str,
        position: int | None = None,
    ):
        return profile_track_service.add(
            db, user.id, track_id, position
        )

    def remove_profile_track(
        self,
        db: Session,
        user: User,
        track_id: str,
    ) -> None:
        profile_track_service.remove(db, user.id, track_id)

    def list_profile_tracks(
        self,
        db: Session,
        user_id: str,
        skip: int = 0,
        limit: int = DEFAULT_PAGE_SIZE,
    ):
        return profile_track_service.list_for_user(db, user_id, skip, limit)

    def reorder_profile_tracks(
        self,
        db: Session,
        user: User,
        ordered_track_ids: list[str],
    ):
        return profile_track_service.reorder(db, user.id, ordered_track_ids)

    # -------------------------------------------------------------- listening
    def recently_played(
        self,
        db: Session,
        user_id: str,
        limit: int = 20,
    ) -> list[Track]:
        return play_history_service.recently_played_tracks(db, user_id, limit)

    def most_played_for_user(
        self,
        db: Session,
        user_id: str,
        limit: int = 10,
    ) -> list[Track]:
        rows = (
            db.query(Track)
            .join(PlayHistory, PlayHistory.track_id == Track.id)
            .filter(PlayHistory.user_id == user_id)
            .group_by(Track.id)
            .order_by(func.count(PlayHistory.id).desc(), Track.title.asc())
            .limit(limit)
            .all()
        )
        return rows

    def most_played(self, db: Session, limit: int = 10) -> list[Track]:
        return track_service.most_played(db, limit)

    def get_profile_music(self, db: Session, user_id: str) -> dict:
        """Everything another user can see and listen to on a profile."""
        user = self.get_or_404(db, user_id)
        return {
            "user": user,
            "profile_tracks": self.list_profile_tracks(db, user_id),
            "favorites": self.list_favorites(db, user_id),
            "favorite_tracks": self.list_favorite_tracks(db, user_id),
            "recently_played": self.recently_played(db, user_id),
            "most_played": self.most_played_for_user(db, user_id),
            "playlists": playlist_service.list_by_owner(db, user_id),
        }


user_service = UserService()

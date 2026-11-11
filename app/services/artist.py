"""Artist queries, CRUD, ownership and the verified badge."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.artist import Artist
from app.models.user import RoleEnum, User
from app.schemas.artist import ArtistCreate, ArtistUpdate
from app.services.base import CRUDService
from app.utils.crud import apply_updates, commit_and_refresh
from app.utils.pagination import DEFAULT_PAGE_SIZE, paginate
from app.utils.storage import ensure_http_url
from app.utils.time import utcnow


class ArtistService(CRUDService[Artist]):
    model = Artist
    not_found_detail = "Artist not found"
    order_by = Artist.name.asc()

    # ------------------------------------------------------------------- read
    def search(
        self,
        db: Session,
        query: str,
        skip: int = 0,
        limit: int = DEFAULT_PAGE_SIZE,
    ) -> list[Artist]:
        statement = (
            db.query(Artist)
            .filter(Artist.name.ilike(f"%{query}%"))
            .order_by(Artist.name.asc())
        )
        return paginate(statement, skip, limit)

    def get_with_albums(self, db: Session, artist_id: str) -> Artist:
        artist = (
            db.query(Artist)
            .options(joinedload(Artist.albums))
            .filter(Artist.id == artist_id)
            .first()
        )
        if artist is None:
            return self.get_or_404(db, artist_id)
        return artist

    def get_by_user(self, db: Session, user_id: str) -> Artist | None:
        """Return the artist profile owned by ``user_id``, if any."""
        return db.query(Artist).filter(Artist.user_id == user_id).first()

    def require_artist_profile(self, db: Session, user: User) -> Artist:
        """Return the caller's artist profile or reject the action.

        Uploading music, creating albums and uploading album covers are
        artist-only actions, so they all go through this guard.
        """
        artist = self.get_by_user(db, user.id)
        if artist is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only artists can perform this action",
            )
        return artist

    # ------------------------------------------------------------------ write
    def create_for_user(
        self,
        db: Session,
        user: User,
        payload: ArtistCreate,
    ) -> Artist:
        """Turn a user account into an artist and create its artist profile."""
        if self.get_by_user(db, user.id) is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already has an artist profile",
            )

        data = payload.model_dump()
        if data.get("image_url"):
            data["image_url"] = ensure_http_url(
                data["image_url"], field="image_url"
            )
        artist = Artist(user_id=user.id, **data)
        db.add(artist)

        if user.role != RoleEnum.artist:
            user.role = RoleEnum.artist

        db.commit()
        db.refresh(artist)
        return artist

    def update_for_user(
        self,
        db: Session,
        user: User,
        payload: ArtistUpdate,
    ) -> Artist:
        artist = self.require_artist_profile(db, user)
        data = payload.model_dump(exclude_unset=True)
        if data.get("image_url"):
            data["image_url"] = ensure_http_url(
                data["image_url"], field="image_url"
            )
        apply_updates(artist, data)
        return commit_and_refresh(db, artist)

    def verify(
        self,
        db: Session,
        artist_id: str,
        verified: bool = True,
    ) -> Artist:
        """Grant or revoke the artist's verified ("checked") badge."""
        artist = self.get_or_404(db, artist_id)
        artist.verified = verified
        artist.verified_at = utcnow() if verified else None
        return commit_and_refresh(db, artist)


artist_service = ArtistService()

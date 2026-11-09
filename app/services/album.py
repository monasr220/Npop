"""Album queries and CRUD, restricted to the owning artist."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.album import Album
from app.models.user import User
from app.schemas.album import AlbumCreate, AlbumUpdate
from app.services.artist import artist_service
from app.services.base import CRUDService
from app.utils.crud import apply_updates, commit_and_refresh
from app.utils.pagination import DEFAULT_PAGE_SIZE, paginate
from app.utils.storage import upload


class AlbumService(CRUDService[Album]):
    model = Album
    not_found_detail = "Album not found"
    order_by = Album.title.asc()

    # ------------------------------------------------------------------- read
    def list_by_artist(
        self,
        db: Session,
        artist_id: str,
        skip: int = 0,
        limit: int = DEFAULT_PAGE_SIZE,
    ) -> list[Album]:
        statement = (
            db.query(Album)
            .filter(Album.artist_id == artist_id)
            .order_by(Album.release_year.desc(), Album.title.asc())
        )
        return paginate(statement, skip, limit)

    def get_with_tracks(self, db: Session, album_id: str) -> Album:
        album = (
            db.query(Album)
            .options(joinedload(Album.tracks), joinedload(Album.artist))
            .filter(Album.id == album_id)
            .first()
        )
        if album is None:
            return self.get_or_404(db, album_id)
        return album

    # ------------------------------------------------------------------ write
    def create_for_artist(
        self,
        db: Session,
        user: User,
        payload: AlbumCreate,
    ) -> Album:
        """Create an album for the caller's own artist profile.

        Only users that own an artist profile can create albums.  They may not
        create albums on behalf of a different artist.
        """
        artist = artist_service.require_artist_profile(db, user)

        if payload.artist_id and payload.artist_id != artist.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create albums for your own artist profile",
            )

        data = payload.model_dump()
        data["artist_id"] = artist.id
        return self.create(db, data)

    def _require_owned_album(
        self,
        db: Session,
        user: User,
        album_id: str,
    ) -> Album:
        artist = artist_service.require_artist_profile(db, user)
        album = self.get_or_404(db, album_id)
        if album.artist_id != artist.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only manage your own albums",
            )
        return album

    def upload_cover(
        self,
        db: Session,
        user: User,
        album_id: str,
        image,
    ) -> Album:
        """Attach an uploaded file or an already-hosted URL as the cover."""
        album = self._require_owned_album(db, user, album_id)

        if hasattr(image, "read"):
            cover_url = upload(image)
            if not cover_url:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Album cover upload failed",
                )
        else:
            cover_url = str(image)

        album.cover_url = cover_url
        return commit_and_refresh(db, album)

    def update_for_artist(
        self,
        db: Session,
        user: User,
        album_id: str,
        payload: AlbumUpdate,
    ) -> Album:
        album = self._require_owned_album(db, user, album_id)
        data = payload.model_dump(
            exclude_unset=True,
            exclude={"artist_id"},
        )
        apply_updates(album, data)
        return commit_and_refresh(db, album)

    def delete_for_artist(
        self,
        db: Session,
        user: User,
        album_id: str,
    ) -> None:
        album = self._require_owned_album(db, user, album_id)
        db.delete(album)
        db.commit()


album_service = AlbumService()

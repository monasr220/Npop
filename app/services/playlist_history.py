"""Play-history recording and queries."""

from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from app.models.playlist_history import PlayHistory
from app.models.track import Track
from app.schemas.playlist_history import PlayHistoryCreate
from app.services.base import CRUDService
from app.utils.pagination import DEFAULT_PAGE_SIZE, paginate


class PlayHistoryService(CRUDService[PlayHistory]):
    model = PlayHistory
    not_found_detail = "Play history entry not found"
    order_by = PlayHistory.played_at.desc()

    def record_play(
        self,
        db: Session,
        user_id: str,
        track_id: str,
    ) -> PlayHistory:
        return self.create(
            db,
            PlayHistoryCreate(user_id=user_id, track_id=track_id),
        )

    def list_for_user(
        self,
        db: Session,
        user_id: str,
        skip: int = 0,
        limit: int = DEFAULT_PAGE_SIZE,
    ) -> list[PlayHistory]:
        statement = (
            db.query(PlayHistory)
            .options(joinedload(PlayHistory.track))
            .filter(PlayHistory.user_id == user_id)
            .order_by(PlayHistory.played_at.desc())
        )
        return paginate(statement, skip, limit)

    def recently_played_tracks(
        self,
        db: Session,
        user_id: str,
        limit: int = 20,
    ) -> list[Track]:
        """Return distinct tracks in most-recent-play order."""
        rows = (
            db.query(PlayHistory)
            .options(joinedload(PlayHistory.track))
            .filter(PlayHistory.user_id == user_id)
            .order_by(PlayHistory.played_at.desc())
            .all()
        )

        seen: set[str] = set()
        tracks: list[Track] = []
        for row in rows:
            if row.track_id in seen:
                continue
            seen.add(row.track_id)
            tracks.append(row.track)
            if len(tracks) >= limit:
                break
        return tracks

    def clear_for_user(self, db: Session, user_id: str) -> int:
        deleted = (
            db.query(PlayHistory)
            .filter(PlayHistory.user_id == user_id)
            .delete(synchronize_session=False)
        )
        db.commit()
        return deleted


play_history_service = PlayHistoryService()

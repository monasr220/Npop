"""Hashtag lookup, usage counting and trending."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.hashtag import Hashtag
from app.schemas.hashtag import HashtagCreate
from app.services.base import CRUDService
from app.utils.crud import commit_and_refresh


class HashtagService(CRUDService[Hashtag]):
    model = Hashtag
    not_found_detail = "Hashtag not found"
    order_by = Hashtag.usage.desc()

    @staticmethod
    def normalize(tag: str) -> str:
        return tag.strip().lstrip("#").lower()

    def get_by_tag(self, db: Session, tag: str) -> Hashtag | None:
        return (
            db.query(Hashtag)
            .filter(Hashtag.tag == self.normalize(tag))
            .first()
        )

    def get_or_create(self, db: Session, tag: str) -> Hashtag:
        normalized = self.normalize(tag)
        existing = self.get_by_tag(db, normalized)
        if existing is not None:
            return existing
        return self.create(db, HashtagCreate(tag=normalized))

    def increment_usage(self, db: Session, tag: str, amount: int = 1) -> Hashtag:
        hashtag = self.get_or_create(db, tag)
        hashtag.usage += amount
        return commit_and_refresh(db, hashtag)

    def trending(self, db: Session, limit: int = 10) -> list[Hashtag]:
        return (
            db.query(Hashtag)
            .order_by(Hashtag.usage.desc(), Hashtag.tag.asc())
            .limit(max(1, limit))
            .all()
        )


hashtag_service = HashtagService()

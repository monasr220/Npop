"""Generic CRUD service shared by the per-model services.

Subclasses set :attr:`model`, and may override :attr:`not_found_detail` and
:attr:`order_by`.  Business rules that go beyond plain CRUD live in the
subclass.
"""

from __future__ import annotations

from typing import Any, Generic, TypeVar

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.base import Base
from app.utils.crud import (
    apply_updates,
    commit_and_refresh,
    delete_and_commit,
    get_or_none,
)
from app.utils.pagination import DEFAULT_PAGE_SIZE, paginate

ModelT = TypeVar("ModelT", bound=Base)


class CRUDService(Generic[ModelT]):
    """Reusable create/read/update/delete implementation."""

    model: type[ModelT]
    not_found_detail: str = "Resource not found"
    order_by: Any = None

    # ------------------------------------------------------------------ read
    def get(self, db: Session, entity_id: str) -> ModelT | None:
        return get_or_none(db, self.model, entity_id)

    def get_or_404(
        self,
        db: Session,
        entity_id: str,
        detail: str | None = None,
    ) -> ModelT:
        instance = self.get(db, entity_id)
        if instance is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=detail or self.not_found_detail,
            )
        return instance

    def list(
        self,
        db: Session,
        skip: int = 0,
        limit: int = DEFAULT_PAGE_SIZE,
        **filters: Any,
    ) -> list[ModelT]:
        query = db.query(self.model)
        clean_filters = {key: value for key, value in filters.items() if value is not None}
        if clean_filters:
            query = query.filter_by(**clean_filters)
        if self.order_by is not None:
            query = query.order_by(self.order_by)
        return paginate(query, skip, limit)

    # ----------------------------------------------------------------- write
    def create(self, db: Session, payload: BaseModel | dict[str, Any]) -> ModelT:
        data = self._payload_to_dict(payload)
        instance = self.model(**data)
        db.add(instance)
        return commit_and_refresh(db, instance)

    def update(
        self,
        db: Session,
        entity_id: str,
        payload: BaseModel | dict[str, Any],
    ) -> ModelT:
        instance = self.get_or_404(db, entity_id)
        data = self._payload_to_dict(payload, exclude_unset=True)
        apply_updates(instance, data)
        return commit_and_refresh(db, instance)

    def delete(self, db: Session, entity_id: str) -> None:
        instance = self.get_or_404(db, entity_id)
        delete_and_commit(db, instance)

    # ---------------------------------------------------------------- helpers
    @staticmethod
    def _payload_to_dict(
        payload: BaseModel | dict[str, Any],
        *,
        exclude_unset: bool = False,
    ) -> dict[str, Any]:
        if isinstance(payload, BaseModel):
            return payload.model_dump(exclude_unset=exclude_unset)
        return dict(payload)

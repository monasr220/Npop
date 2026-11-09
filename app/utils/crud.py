"""Small, database-agnostic helpers shared by the service layer.

Keeping these here avoids repeating the same five lines in every service and
keeps the services focused on business rules.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from sqlalchemy.orm import Session

from app.db.base import Base

ModelT = TypeVar("ModelT", bound=Base)


def get_or_none(db: Session, model: type[ModelT], entity_id: str) -> ModelT | None:
    """Return an entity by primary key, or ``None`` when it does not exist."""
    return db.get(model, entity_id)


def apply_updates(instance: ModelT, data: Mapping[str, Any]) -> ModelT:
    """Copy every key/value from ``data`` onto ``instance``."""
    for field, value in data.items():
        setattr(instance, field, value)
    return instance


def commit_and_refresh(db: Session, instance: ModelT) -> ModelT:
    """Commit the current transaction and refresh ``instance`` from the DB."""
    db.commit()
    db.refresh(instance)
    return instance


def delete_and_commit(db: Session, instance: ModelT) -> None:
    """Delete ``instance`` and commit."""
    db.delete(instance)
    db.commit()

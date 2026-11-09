"""Pagination helpers used by list-style service methods."""

from __future__ import annotations

from typing import TypeVar

from sqlalchemy.orm import Query

DEFAULT_PAGE_SIZE = 100
MAX_PAGE_SIZE = 500

T = TypeVar("T")


def normalize_pagination(
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
) -> tuple[int, int]:
    """Clamp user-supplied pagination values to a safe range."""
    skip = max(0, int(skip or 0))
    limit = int(limit or DEFAULT_PAGE_SIZE)
    limit = min(max(1, limit), MAX_PAGE_SIZE)
    return skip, limit


def paginate(
    query: Query[T],
    skip: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
) -> list[T]:
    """Apply ``OFFSET``/``LIMIT`` and return the resulting rows."""
    skip, limit = normalize_pagination(skip, limit)
    return query.offset(skip).limit(limit).all()

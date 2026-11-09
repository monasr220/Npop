"""Shared Pydantic schema configuration."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class BaseSchema(BaseModel):
    """Base for request schemas; unknown fields are rejected."""

    model_config = ConfigDict(extra="forbid")


class BaseReadSchema(BaseSchema):
    """Base for response schemas; can be built from ORM objects."""

    model_config = ConfigDict(from_attributes=True, extra="ignore")

    id: str
    created_at: datetime

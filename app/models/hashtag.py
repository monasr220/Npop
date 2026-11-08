from __future__ import annotations

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.abstract_base import AbstractBaseModel


class Hashtag(AbstractBaseModel):
    __tablename__ = "hashtag"

    tag: Mapped[str] = mapped_column(String(55), nullable=False, unique=True)
    usage: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    def __str__(self) -> str:
        return self.tag

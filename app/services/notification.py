"""Notification CRUD plus a small in-process SSE fan-out.

Each user gets an :class:`asyncio.Queue`.  ``publish`` is non-blocking, so
services can emit a notification without caring whether a browser is currently
listening.  The queue is created on demand and removed when the SSE stream
closes.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from typing import Any

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.notification import Notification, NotificationStatus
from app.schemas.notification import (
    NotificationCreate,
    NotificationUpdate,
)
from app.services.base import CRUDService
from app.utils.pagination import DEFAULT_PAGE_SIZE, paginate


class NotificationService(CRUDService[Notification]):
    model = Notification
    not_found_detail = "Notification not found"
    order_by = Notification.created_at.desc()

    def __init__(self) -> None:
        self.user_event_queues: dict[str, asyncio.Queue[str]] = {}

    # ------------------------------------------------------------- SSE queues
    def queue_for(self, user_id: str) -> asyncio.Queue[str]:
        return self.user_event_queues.setdefault(user_id, asyncio.Queue())

    def publish(self, user_id: str, message: str) -> None:
        """Push a message to a user's live stream (never blocks).

        Users without an active stream are skipped: the notification is still
        persisted, so clients fetch missed items through the REST endpoints.
        This prevents unbounded queues for offline users.
        """
        queue = self.user_event_queues.get(user_id)
        if queue is not None:
            queue.put_nowait(message)

    async def event_generator(self, user_id: str) -> AsyncIterator[str]:
        """Yield Server-Sent Events for ``user_id``."""
        queue = self.queue_for(user_id)
        try:
            while True:
                message = await queue.get()
                yield f"data: {message}\n\n"
        finally:
            # Drop the queue only when the consumer has drained it.
            if queue.empty():
                self.user_event_queues.pop(user_id, None)

    # ------------------------------------------------------------------ write
    def create(
        self,
        db: Session,
        payload: BaseModel | dict[str, Any],
    ) -> Notification:
        notification = super().create(db, payload)
        self.publish(notification.user_id, notification.message)
        return notification

    def notify(self, db: Session, user_id: str, message: str) -> Notification:
        """Convenience helper used by the other services."""
        return self.create(
            db,
            NotificationCreate(user_id=user_id, message=message),
        )

    def mark_read(
        self,
        db: Session,
        notification_id: str,
        user_id: str | None = None,
    ) -> Notification:
        notification = self.get_or_404(db, notification_id)
        if user_id is not None and notification.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to modify this notification",
            )
        return super().update(
            db,
            notification_id,
            NotificationUpdate(status=NotificationStatus.read),
        )

    def mark_all_read(self, db: Session, user_id: str) -> int:
        updated = (
            db.query(Notification)
            .filter(
                Notification.user_id == user_id,
                Notification.status == NotificationStatus.unread,
            )
            .update({Notification.status: NotificationStatus.read})
        )
        db.commit()
        return updated

    # ------------------------------------------------------------------- read
    def list_for_user(
        self,
        db: Session,
        user_id: str,
        skip: int = 0,
        limit: int = DEFAULT_PAGE_SIZE,
        *,
        unread_only: bool = False,
    ) -> list[Notification]:
        query = db.query(Notification).filter(Notification.user_id == user_id)
        if unread_only:
            query = query.filter(Notification.status == NotificationStatus.unread)
        return paginate(query.order_by(Notification.created_at.desc()), skip, limit)

    def unread_count(self, db: Session, user_id: str) -> int:
        return (
            db.query(Notification)
            .filter(
                Notification.user_id == user_id,
                Notification.status == NotificationStatus.unread,
            )
            .count()
        )


notification_service = NotificationService()

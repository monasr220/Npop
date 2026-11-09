"""Per-user notifications and the live Server-Sent Events stream."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin, require_self
from app.db.session import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.api import UnreadCount, UpdatedResponse
from app.schemas.notification import (
    NotificationCreate,
    NotificationRead,
    NotificationUpdate,
)
from app.services.notification import notification_service

router = APIRouter()


@router.get("", response_model=list[NotificationRead])
def list_notifications(
    unread_only: bool = Query(default=False),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Notification]:
    return notification_service.list_for_user(
        db, current.id, skip, limit, unread_only=unread_only
    )


@router.get("/unread-count", response_model=UnreadCount)
def unread_count(
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UnreadCount:
    return UnreadCount(count=notification_service.unread_count(db, current.id))


@router.post("/read-all", response_model=UpdatedResponse)
def read_all(
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UpdatedResponse:
    return UpdatedResponse(updated=notification_service.mark_all_read(db, current.id))


@router.get("/stream")
def stream(
    current: User = Depends(get_current_user),
) -> StreamingResponse:
    """Server-Sent Events for the caller's live notifications."""
    return StreamingResponse(
        notification_service.event_generator(current.id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("", response_model=NotificationRead, status_code=status.HTTP_201_CREATED)
def create_notification(
    payload: NotificationCreate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Notification:
    """Send a notification to a user (admin only)."""
    require_admin(current)
    return notification_service.create(db, payload)


@router.post("/{notification_id}/read", response_model=NotificationRead)
def mark_read(
    notification_id: str,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Notification:
    return notification_service.mark_read(db, notification_id, current.id)


@router.patch("/{notification_id}", response_model=NotificationRead)
def update_notification(
    notification_id: str,
    payload: NotificationUpdate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Notification:
    notification = notification_service.get_or_404(db, notification_id)
    require_self(current, notification.user_id)
    return notification_service.update(db, notification_id, payload)


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: str,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    notification = notification_service.get_or_404(db, notification_id)
    require_self(current, notification.user_id)
    notification_service.delete(db, notification_id)

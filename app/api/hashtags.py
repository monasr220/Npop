"""Hashtag lookup, trending tags and admin management."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.hashtag import Hashtag
from app.models.user import User
from app.schemas.hashtag import HashtagCreate, HashtagRead, HashtagUpdate
from app.services.hashtag import hashtag_service

router = APIRouter()


@router.get("", response_model=list[HashtagRead])
def list_hashtags(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[Hashtag]:
    return hashtag_service.list(db, skip, limit)


@router.get("/trending", response_model=list[HashtagRead])
def trending_hashtags(
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[Hashtag]:
    return hashtag_service.trending(db, limit)


@router.get("/{tag}", response_model=HashtagRead)
def get_hashtag(tag: str, db: Session = Depends(get_db)) -> Hashtag:
    hashtag = hashtag_service.get_by_tag(db, tag)
    if hashtag is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=hashtag_service.not_found_detail,
        )
    return hashtag


@router.post("", response_model=HashtagRead, status_code=status.HTTP_201_CREATED)
def create_hashtag(
    payload: HashtagCreate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Hashtag:
    require_admin(current)
    existing = hashtag_service.get_by_tag(db, payload.tag)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Hashtag already exists",
        )
    return hashtag_service.create(
        db,
        HashtagCreate(tag=hashtag_service.normalize(payload.tag), usage=payload.usage),
    )


@router.patch("/{tag}", response_model=HashtagRead)
def update_hashtag(
    tag: str,
    payload: HashtagUpdate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Hashtag:
    require_admin(current)
    hashtag = hashtag_service.get_by_tag(db, tag)
    if hashtag is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=hashtag_service.not_found_detail,
        )
    data = payload.model_dump(exclude_unset=True)
    if "tag" in data and data["tag"] is not None:
        data["tag"] = hashtag_service.normalize(data["tag"])
    return hashtag_service.update(db, hashtag.id, data)


@router.delete("/{tag}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hashtag(
    tag: str,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    require_admin(current)
    hashtag = hashtag_service.get_by_tag(db, tag)
    if hashtag is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=hashtag_service.not_found_detail,
        )
    hashtag_service.delete(db, hashtag.id)

"""Social-link records."""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy.orm import Session

from app.models.social_link import SocialLink
from app.schemas.social_link import SocialLinkCreate
from app.services.base import CRUDService
from app.utils.pagination import DEFAULT_PAGE_SIZE, paginate
from app.utils.storage import ensure_http_url


class SocialLinkService(CRUDService[SocialLink]):
    model = SocialLink
    not_found_detail = "Social link not found"
    order_by = SocialLink.created_at.asc()

    def list_for_user(
        self,
        db: Session,
        user_id: str,
        skip: int = 0,
        limit: int = DEFAULT_PAGE_SIZE,
    ) -> list[SocialLink]:
        statement = (
            db.query(SocialLink)
            .filter(SocialLink.user_id == user_id)
            .order_by(SocialLink.created_at.asc())
        )
        return paginate(statement, skip, limit)

    def replace_for_user(
        self,
        db: Session,
        user_id: str,
        links: Sequence[str],
    ) -> list[SocialLink]:
        """Replace all of a user's links with ``links``."""
        cleaned = [
            ensure_http_url(link, field="Social link")
            for link in links
            if link and link.strip()
        ]

        db.query(SocialLink).filter(SocialLink.user_id == user_id).delete(
            synchronize_session=False
        )

        new_links = [
            SocialLink(user_id=user_id, link=link)
            for link in dict.fromkeys(cleaned)  # de-duplicate while preserving order
        ]
        db.add_all(new_links)
        db.commit()
        for link in new_links:
            db.refresh(link)
        return new_links

    def create_for_user(
        self,
        db: Session,
        user_id: str,
        link: str,
    ) -> SocialLink:
        return self.create(
            db,
            SocialLinkCreate(
                user_id=user_id,
                link=ensure_http_url(link, field="Social link"),
            ),
        )


social_link_service = SocialLinkService()

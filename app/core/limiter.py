"""Central SlowAPI limiter.

Rate limits are configured in :mod:`app.core.config` so they can be tuned per
environment without code changes.  Routes that need a stricter budget (auth,
uploads) opt in with ``@limiter.limit(...)``; everything else is covered by the
default limit installed by ``SlowAPIMiddleware`` in :mod:`app.main`.
"""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[settings.rate_limit_default],
    storage_uri=settings.rate_limit_storage_uri,
    enabled=settings.rate_limit_enabled,
    # Endpoints return Pydantic models rather than Starlette ``Response``
    # objects, so header injection is disabled; the 429 body still carries a
    # human-readable ``detail`` message.
    headers_enabled=False,
    # Include a stable prefix so multiple apps sharing a Redis instance do not
    # collide.  ``memory://`` storage ignores this but it is future-proof.
    key_prefix="npop",
)

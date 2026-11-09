"""Security primitives: password hashing and JWT access tokens.

Password hashes use ``scrypt`` (Python standard library) with the encoded format
``scrypt$N$r$p$salt$hash``.  This keeps the project free of the native
``bcrypt`` dependency and works on every platform.

Access tokens are signed with PyJWT using the algorithm configured in
:mod:`app.core.config`.  Both helpers live here (rather than in ``utils``)
because they are security-critical building blocks used by the service layer.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt

from app.core.config import settings

SCRYPT_N = 16384
SCRYPT_R = 8
SCRYPT_P = 1
SCRYPT_DKLEN = 32
SALT_BYTES = 16


class TokenError(Exception):
    """Raised when an access token is missing, malformed, or expired."""


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def hash_password(password: str) -> str:
    """Hash a plain-text password using scrypt."""
    if not password:
        raise ValueError("password must not be empty")

    salt = secrets.token_bytes(SALT_BYTES)
    derived = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
        dklen=SCRYPT_DKLEN,
    )
    return (
        f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}"
        f"${_b64encode(salt)}${_b64encode(derived)}"
    )


def verify_password(password: str, encoded: str) -> bool:
    """Check a plain-text password against an encoded scrypt hash."""
    try:
        scheme, n, r, p, salt_b64, hash_b64 = encoded.split("$")
        if scheme != "scrypt":
            return False
        expected = _b64decode(hash_b64)
        derived = hashlib.scrypt(
            password.encode("utf-8"),
            salt=_b64decode(salt_b64),
            n=int(n),
            r=int(r),
            p=int(p),
            dklen=len(expected),
        )
    except (AttributeError, TypeError, ValueError):
        return False

    return hmac.compare_digest(derived, expected)


def create_access_token(
    subject: str,
    *,
    expires_delta: timedelta | None = None,
    extra_claims: dict[str, Any] | None = None,
) -> tuple[str, datetime]:
    """Create a signed JWT and return ``(token, expiry_time)``."""
    now = datetime.now(UTC)
    expiry = now + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.access_token_expire_minutes)
    )

    payload: dict[str, Any] = {
        "sub": subject,
        "iat": now,
        "exp": expiry,
    }
    if extra_claims:
        payload.update(extra_claims)

    token = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
    return token, expiry


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT, raising :class:`TokenError` on failure."""
    if not token:
        raise TokenError("missing token")

    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
    except jwt.PyJWTError as exc:
        raise TokenError("invalid or expired token") from exc

    if not payload.get("sub"):
        raise TokenError("token has no subject")
    return payload

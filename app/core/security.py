"""Security primitives: password hashing and JWT access tokens.

Passwords are hashed with **Argon2id** (``argon2-cffi``).  Hashes written by
older versions of the project use the standard-library ``scrypt`` format
``scrypt$N$r$p$salt$hash``; :func:`verify_password` still accepts those so
existing accounts keep working, and :func:`password_needs_rehash` lets the
login flow transparently upgrade them to Argon2id.

Access tokens are signed with PyJWT using the algorithm configured in
:mod:`app.core.config`.  Both helpers live here (rather than in ``utils``)
because they are security-critical building blocks used by the service layer.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2 import exceptions as argon2_errors
from argon2.low_level import Type

from app.core.config import settings

# --------------------------------------------------------------- legacy scrypt
SCRYPT_N = 16384
SCRYPT_R = 8
SCRYPT_P = 1
SCRYPT_DKLEN = 32
SALT_BYTES = 16

# ---------------------------------------------------------------- Argon2id
# OWASP-recommended baseline: 19 MiB / t=2 is the minimum; we use 64 MiB with
# t=3 for a comfortable margin on interactive logins.
_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=64 * 1024,
    parallelism=4,
    hash_len=32,
    salt_len=16,
    type=Type.ID,
)


class TokenError(Exception):
    """Raised when an access token is missing, malformed, or expired."""


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def hash_password(password: str) -> str:
    """Hash a plain-text password with Argon2id."""
    if not password:
        raise ValueError("password must not be empty")
    return _hasher.hash(password)


def _verify_scrypt(password: str, encoded: str) -> bool:
    """Verify a legacy ``scrypt$...`` hash."""
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


def verify_password(password: str, encoded: str) -> bool:
    """Check a plain-text password against an Argon2id or legacy scrypt hash."""
    if not password or not encoded:
        return False

    if encoded.startswith("$argon2"):
        try:
            return _hasher.verify(encoded, password)
        except (argon2_errors.VerificationError, argon2_errors.InvalidHashError):
            return False
        except (TypeError, ValueError):
            return False

    if encoded.startswith("scrypt$"):
        return _verify_scrypt(password, encoded)

    return False


def password_needs_rehash(encoded: str) -> bool:
    """True when a stored hash should be upgraded (legacy or outdated params)."""
    if not encoded:
        return True
    if encoded.startswith("scrypt$"):
        return True
    if not encoded.startswith("$argon2"):
        return True
    try:
        return _hasher.check_needs_rehash(encoded)
    except (argon2_errors.InvalidHashError, TypeError, ValueError):
        return True


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

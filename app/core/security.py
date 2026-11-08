"""Password hashing and verification helpers.

The encoded format is ``scrypt$N$r$p$salt$hash`` with URL-safe base64 values,
which is compatible with the hashes already stored in the project database.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets

SCRYPT_N = 16384
SCRYPT_R = 8
SCRYPT_P = 1
SCRYPT_DKLEN = 32
SALT_BYTES = 16


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

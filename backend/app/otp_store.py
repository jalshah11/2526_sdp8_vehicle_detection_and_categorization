"""In-memory OTP store with TTL expiry.
Stores OTPs keyed by (email, purpose) with a 10-minute expiry.
No external dependency needed — simple dict with datetime checks.
"""
from __future__ import annotations

import random
import string
from datetime import datetime, timedelta
from typing import Dict, Tuple

OTP_TTL_MINUTES = 10

# Key: (email, purpose)  →  Value: (otp_code, expires_at)
_store: Dict[Tuple[str, str], Tuple[str, datetime]] = {}


def generate_otp() -> str:
    """Create a random 6-digit OTP."""
    return "".join(random.choices(string.digits, k=6))


def store_otp(email: str, purpose: str) -> str:
    """Generate, store and return a new OTP for (email, purpose)."""
    otp = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=OTP_TTL_MINUTES)
    _store[(email.lower(), purpose)] = (otp, expires_at)
    return otp


def verify_otp(email: str, purpose: str, otp: str) -> bool:
    """Return True if the OTP matches and has not expired."""
    key = (email.lower(), purpose)
    entry = _store.get(key)
    if not entry:
        return False
    stored_otp, expires_at = entry
    if datetime.utcnow() > expires_at:
        _store.pop(key, None)
        return False
    return stored_otp == otp.strip()


def clear_otp(email: str, purpose: str) -> None:
    """Remove OTP after successful use."""
    _store.pop((email.lower(), purpose), None)

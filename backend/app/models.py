"""Pydantic models for auth and analytics history."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field


# ─── User Models ────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserPublic(BaseModel):
    """Returned to the client — never includes the hashed password."""
    id: str
    username: str
    email: str
    created_at: datetime
    is_verified: bool = False


class UserInDB(BaseModel):
    """Internal representation (stored in MongoDB)."""
    id: Optional[str] = None
    username: str
    email: str
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_verified: bool = False


# ─── Auth / Token Models ────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class TokenData(BaseModel):
    user_id: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ─── OTP / Email Models ─────────────────────────────────────────────────────

class SendOTPRequest(BaseModel):
    email: EmailStr

class VerifyEmailRequest(BaseModel):
    email: EmailStr
    otp: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str = Field(..., min_length=6)


# ─── Analytics History Models ───────────────────────────────────────────────

class AnalyticsRecord(BaseModel):
    """One entry saved when a video is processed by an authenticated user."""
    id: Optional[str] = None
    user_id: str
    video_path: str
    model: str
    processed_at: datetime = Field(default_factory=datetime.utcnow)
    total_vehicles: int
    counts: dict[str, Any]       # full counts object
    video_info: dict[str, Any]   # line_y, conf, etc.


class AnalyticsRecordPublic(BaseModel):
    id: str
    video_path: str
    model: str
    processed_at: datetime
    total_vehicles: int
    counts: dict[str, Any]
    video_info: dict[str, Any]

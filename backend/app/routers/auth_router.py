"""Auth routes: register, login, me, email verification, forgot/reset password."""
from __future__ import annotations

from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from ..auth import (
    create_access_token,
    get_current_user_id,
    hash_password,
    verify_password,
)
from ..database import get_database
from ..email_service import send_otp_email
from ..models import (
    LoginRequest, ResetPasswordRequest, SendOTPRequest,
    Token, UserCreate, UserPublic, VerifyEmailRequest,
)
from ..otp_store import clear_otp, store_otp, verify_otp

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ─── Helpers ────────────────────────────────────────────────────────────────

def _doc_to_public(doc: dict) -> UserPublic:
    return UserPublic(
        id=str(doc.get("_id", str(doc.get("id", "")))),
        username=doc.get("username", ""),
        email=doc.get("email", ""),
        created_at=doc.get("created_at", datetime.utcnow()),
        is_verified=doc.get("is_verified", False),
        avatar=doc.get("avatar")
    )


# ─── Register ────────────────────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate):
    db = get_database()
    users = db["users"]

    existing = await users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="An account with this email already exists.")

    existing_username = await users.find_one({"username": data.username})
    if existing_username:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Username is already taken.")

    user_doc = {
        "username": data.username,
        "email": data.email.lower(),
        "hashed_password": hash_password(data.password),
        "created_at": datetime.utcnow(),
        "is_verified": False,
    }
    result = await users.insert_one(user_doc)

    # Send verification OTP
    otp = store_otp(data.email, "verify")
    await send_otp_email(data.email, otp, "verify")

    return {"message": "Account created. Check your email for the verification OTP."}


# ─── Send / Resend verification OTP ─────────────────────────────────────────

@router.post("/send-verification-otp")
async def send_verification_otp(data: SendOTPRequest):
    db = get_database()
    users = db["users"]

    user_doc = await users.find_one({"email": data.email.lower()})
    if not user_doc:
        raise HTTPException(status_code=404, detail="No account found with this email.")

    if user_doc.get("is_verified"):
        raise HTTPException(status_code=400, detail="Email is already verified.")

    otp = store_otp(data.email, "verify")
    await send_otp_email(data.email, otp, "verify")
    return {"message": "Verification OTP sent. Check your email."}


# ─── Verify Email ────────────────────────────────────────────────────────────

@router.post("/verify-email")
async def verify_email(data: VerifyEmailRequest):
    if not verify_otp(data.email, "verify", data.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")

    db = get_database()
    users = db["users"]
    result = await users.update_one(
        {"email": data.email.lower()},
        {"$set": {"is_verified": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Account not found.")

    clear_otp(data.email, "verify")
    return {"message": "Email verified successfully. You can now log in."}


# ─── Login ───────────────────────────────────────────────────────────────────

@router.post("/login", response_model=Token)
async def login(data: LoginRequest):
    db = get_database()
    users = db["users"]

    user_doc = await users.find_one({"email": data.email.lower()})
    if not user_doc or not verify_password(data.password, user_doc["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid email or password.")

    if not user_doc.get("is_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in.",
        )

    user_public = _doc_to_public(user_doc)
    token = create_access_token(str(user_doc["_id"]))
    return Token(access_token=token, user=user_public)


# ─── Me ──────────────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserPublic)
async def get_me(user_id: str = Depends(get_current_user_id)):
    db = get_database()
    users = db["users"]

    user_doc = await users.find_one({"_id": ObjectId(user_id)})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found.")
    return _doc_to_public(user_doc)


# ─── Forgot Password ─────────────────────────────────────────────────────────

@router.post("/forgot-password")
async def forgot_password(data: SendOTPRequest):
    db = get_database()
    users = db["users"]

    user_doc = await users.find_one({"email": data.email.lower()})
    if not user_doc:
        raise HTTPException(status_code=404, detail="No account found with this email address.")

    otp = store_otp(data.email, "reset")
    await send_otp_email(data.email, otp, "reset")
    return {"message": "If that email exists, an OTP has been sent."}


# ─── Reset Password ───────────────────────────────────────────────────────────

@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    if not verify_otp(data.email, "reset", data.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")

    db = get_database()
    users = db["users"]

    new_hashed = hash_password(data.new_password)
    result = await users.update_one(
        {"email": data.email.lower()},
        {"$set": {"hashed_password": new_hashed}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Account not found.")

    clear_otp(data.email, "reset")
    return {"message": "Password reset successfully. You can now log in."}

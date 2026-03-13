"""Profile routes: update info, change password, upload avatar, delete account."""
from __future__ import annotations

import base64
import os
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel, EmailStr, Field

from ..auth import get_current_user_id, hash_password, verify_password
from ..database import get_database

router = APIRouter(prefix="/api/profile", tags=["profile"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_AVATAR_SIZE = 2 * 1024 * 1024  # 2 MB


# ─── Pydantic models ─────────────────────────────────────────────────────────

class UpdateProfileRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


# ─── GET profile ─────────────────────────────────────────────────────────────

@router.get("/me")
async def get_profile(user_id: str = Depends(get_current_user_id)):
    db = get_database()
    doc = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found.")
    return {
        "id": str(doc["_id"]),
        "username": doc["username"],
        "email": doc["email"],
        "created_at": doc.get("created_at", datetime.utcnow()),
        "is_verified": doc.get("is_verified", False),
        "avatar": doc.get("avatar"),          # base64 data-url or None
        "bio": doc.get("bio", ""),
    }


# ─── Update username / bio ───────────────────────────────────────────────────

@router.put("/update")
async def update_profile(
    data: UpdateProfileRequest,
    user_id: str = Depends(get_current_user_id),
):
    db = get_database()
    users = db["users"]

    # Check username uniqueness (exclude self)
    existing = await users.find_one({"username": data.username, "_id": {"$ne": ObjectId(user_id)}})
    if existing:
        raise HTTPException(status_code=409, detail="Username is already taken.")

    await users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"username": data.username}},
    )
    return {"message": "Profile updated successfully."}


# ─── Upload avatar ───────────────────────────────────────────────────────────

@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP or GIF images are allowed.")

    data = await file.read()
    if len(data) > MAX_AVATAR_SIZE:
        raise HTTPException(status_code=400, detail="Image must be smaller than 2 MB.")

    # Store as base64 data-URL (no file system needed)
    b64 = base64.b64encode(data).decode("utf-8")
    data_url = f"data:{file.content_type};base64,{b64}"

    db = get_database()
    await db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"avatar": data_url}},
    )
    return {"avatar": data_url, "message": "Avatar updated successfully."}


# ─── Remove avatar ────────────────────────────────────────────────────────────

@router.delete("/avatar")
async def remove_avatar(user_id: str = Depends(get_current_user_id)):
    db = get_database()
    await db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$unset": {"avatar": ""}},
    )
    return {"message": "Avatar removed."}


# ─── Change password ──────────────────────────────────────────────────────────

@router.put("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    user_id: str = Depends(get_current_user_id),
):
    db = get_database()
    users = db["users"]

    doc = await users.find_one({"_id": ObjectId(user_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found.")

    if not verify_password(data.current_password, doc["hashed_password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    await users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"hashed_password": hash_password(data.new_password)}},
    )
    return {"message": "Password changed successfully."}


# ─── Delete account ───────────────────────────────────────────────────────────

@router.delete("/delete-account")
async def delete_account(user_id: str = Depends(get_current_user_id)):
    db = get_database()
    await db["users"].delete_one({"_id": ObjectId(user_id)})
    await db["analytics"].delete_many({"user_id": user_id})
    return {"message": "Account deleted successfully."}

"""History routes: GET /api/history, DELETE /api/history/{id}"""
from __future__ import annotations

from typing import List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from ..auth import get_current_user_id
from ..database import get_database
from ..models import AnalyticsRecordPublic

router = APIRouter(prefix="/api/history", tags=["history"])


def _doc_to_public(doc: dict) -> AnalyticsRecordPublic:
    return AnalyticsRecordPublic(
        id=str(doc["_id"]),
        video_path=doc.get("video_path", ""),
        model=doc.get("model", ""),
        processed_at=doc["processed_at"],
        total_vehicles=doc.get("total_vehicles", 0),
        counts=doc.get("counts", {}),
        video_info=doc.get("video_info", {}),
    )


@router.get("", response_model=List[AnalyticsRecordPublic])
async def get_history(user_id: str = Depends(get_current_user_id)):
    """Return all analytics records for the authenticated user, newest first."""
    db = get_database()
    collection = db["analytics_history"]

    cursor = collection.find(
        {"user_id": user_id},
        sort=[("processed_at", -1)],
    )
    records = []
    async for doc in cursor:
        records.append(_doc_to_public(doc))
    return records


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_record(record_id: str, user_id: str = Depends(get_current_user_id)):
    """Delete a specific history record — only the owner can delete."""
    db = get_database()
    collection = db["analytics_history"]

    try:
        oid = ObjectId(record_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid record ID.")

    result = await collection.delete_one({"_id": oid, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found.")

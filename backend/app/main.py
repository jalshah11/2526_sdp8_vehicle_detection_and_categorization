from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

# Load .env before anything else so env vars are available for sub-modules
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .auth import get_optional_user_id
from .database import get_database
from .routers.auth_router import router as auth_router
from .routers.history_router import router as history_router
from .routers.profile_router import router as profile_router

app = FastAPI(title="Vehicle Analytics API")

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Static output dir ───────────────────────────────────────────────────────
output_dir = Path("backend") / "output"
output_dir.mkdir(parents=True, exist_ok=True)
app.mount("/output", StaticFiles(directory=str(output_dir)), name="output")

# ─── Include routers ─────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(history_router)
app.include_router(profile_router)


# ─── Health ──────────────────────────────────────────────────────────────────
@app.get("/health")
def health() -> dict:
    return {"ok": True}


# ─── Request model ───────────────────────────────────────────────────────────
class VideoProcessRequest(BaseModel):
    video_path: str
    model: Optional[str] = "yolov8n.pt"
    line_y: Optional[float] = 0.5
    invert_directions: Optional[bool] = False
    conf: Optional[float] = 0.25
    anchor: Optional[str] = "bottom"
    frame_stride: Optional[int] = 1
    scale: Optional[float] = 0.75
    roi_band: Optional[float] = 0.0
    skip_video: Optional[bool] = False


# ─── Check video path ────────────────────────────────────────────────────────
@app.post("/api/check-video-path")
def check_video_path(request: VideoProcessRequest) -> dict:
    """Check if a video file exists at the given path (for debugging)."""
    video_path_str = request.video_path.strip()
    if video_path_str.startswith('"') and video_path_str.endswith('"'):
        video_path_str = video_path_str[1:-1]
    if video_path_str.startswith("'") and video_path_str.endswith("'"):
        video_path_str = video_path_str[1:-1]

    video_path = Path(video_path_str)
    try:
        video_path = video_path.resolve()
    except (OSError, ValueError) as e:
        return {"exists": False, "error": str(e), "resolved_path": None, "original_path": request.video_path}

    exists = video_path.exists()
    is_file = video_path.is_file() if exists else False
    return {
        "exists": exists,
        "is_file": is_file,
        "resolved_path": str(video_path.absolute()),
        "original_path": request.video_path,
    }


# ─── Process video (with optional auth to save history) ─────────────────────
@app.post("/api/process-video")
async def process_video(
    request: VideoProcessRequest,
    user_id: Optional[str] = Depends(get_optional_user_id),
) -> dict:
    """Process a video file and generate analytics.
    If user is authenticated, the result is automatically saved to their history.
    """
    video_path_str = request.video_path.strip()
    if video_path_str.startswith('"') and video_path_str.endswith('"'):
        video_path_str = video_path_str[1:-1]
    if video_path_str.startswith("'") and video_path_str.endswith("'"):
        video_path_str = video_path_str[1:-1]

    video_path = Path(video_path_str)
    try:
        video_path = video_path.resolve()
    except (OSError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid video path: {video_path_str}. Error: {str(e)}")

    if not video_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Video file not found at: {str(video_path.absolute())}. Please check if the file exists.",
        )
    if not video_path.is_file():
        raise HTTPException(status_code=400, detail=f"Path is not a file: {video_path}")

    current_file = Path(__file__).resolve()
    project_root = current_file.parent.parent.parent
    script_path = project_root / "backend" / "scripts" / "count_video.py"

    if not script_path.exists():
        raise HTTPException(status_code=500, detail=f"count_video.py script not found at {script_path}")

    cmd = [
        sys.executable, str(script_path),
        "--video", str(video_path.resolve()),
        "--model", request.model,
        "--line-y", str(request.line_y),
        "--conf", str(request.conf),
        "--anchor", str(request.anchor or "bottom"),
        "--frame-stride", str(int(request.frame_stride or 1)),
        "--scale", str(float(request.scale or 1.0)),
        "--roi-band", str(float(request.roi_band or 0.0)),
    ]
    if request.skip_video:
        cmd.append("--skip-video")
    if request.invert_directions:
        cmd.append("--invert-directions")

    try:
        env = os.environ.copy()
        env["PYTHONPATH"] = str(project_root)

        result = subprocess.run(
            cmd, capture_output=True, text=True,
            cwd=str(project_root), env=env, timeout=3600,
        )
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"Video processing failed: {result.stderr}")

        analytics_path = project_root / "backend" / "output" / "counts.json"
        if not analytics_path.exists():
            raise HTTPException(status_code=500, detail="Analytics file was not generated")

        analytics_data = json.loads(analytics_path.read_text(encoding="utf-8"))

        # ── Save to history if authenticated ──────────────────────────────
        if user_id:
            try:
                counts = analytics_data.get("counts", {})
                total_vehicles = counts.get("total", 0)
                db = get_database()
                history_col = db["analytics_history"]
                record = {
                    "user_id": user_id,
                    "video_path": str(video_path),
                    "model": request.model,
                    "processed_at": datetime.utcnow(),
                    "total_vehicles": total_vehicles,
                    "counts": counts,
                    "video_info": {
                        "line_y": request.line_y,
                        "conf": request.conf,
                        "anchor": request.anchor,
                        "invert_directions": request.invert_directions,
                    },
                }
                await history_col.insert_one(record)
            except Exception:
                # Don't fail the request if history save fails
                pass

        return analytics_data

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Video processing timed out")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing video: {str(e)}")


# ─── Latest analytics ────────────────────────────────────────────────────────
@app.get("/api/analytics")
def get_analytics() -> dict:
    """Returns the latest analytics JSON generated by count_video script."""
    current_file = Path(__file__).resolve()
    project_root = current_file.parent.parent.parent
    path = project_root / "backend" / "output" / "counts.json"

    if not path.exists():
        raise HTTPException(status_code=404, detail="counts.json not found. Run the counting script first.")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Invalid JSON in counts.json: {e}")

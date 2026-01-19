from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Vehicle Analytics API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles

# Mount the output directory to serve the annotated video
# The path should be absolute or relative to where uvicorn is run
# We assume uvicorn is run from project root, so "backend/output" works.
output_dir = Path("backend") / "output"
output_dir.mkdir(parents=True, exist_ok=True)
app.mount("/output", StaticFiles(directory=str(output_dir)), name="output")


@app.get("/health")
def health() -> dict:
    return {"ok": True}


class VideoProcessRequest(BaseModel):
    video_path: str
    model: Optional[str] = "yolov8n.pt"
    line_y: Optional[float] = 0.5
    invert_directions: Optional[bool] = False
    conf: Optional[float] = 0.25

    anchor: Optional[str] = "bottom"  # bottom | center

    # Performance knobs:
    # Keep defaults conservative to avoid missing crossings (counts going to 0).
    # You can increase frame_stride / enable roi_band later for speed.
    frame_stride: Optional[int] = 1
    scale: Optional[float] = 0.75
    roi_band: Optional[float] = 0.0
    skip_video: Optional[bool] = False


@app.post("/api/check-video-path")
def check_video_path(request: VideoProcessRequest) -> dict:
    """Check if a video file exists at the given path (for debugging)."""
    video_path_str = request.video_path.strip()
    # Remove quotes if present
    if video_path_str.startswith('"') and video_path_str.endswith('"'):
        video_path_str = video_path_str[1:-1]
    if video_path_str.startswith("'") and video_path_str.endswith("'"):
        video_path_str = video_path_str[1:-1]
    
    video_path = Path(video_path_str)
    
    try:
        video_path = video_path.resolve()
    except (OSError, ValueError) as e:
        return {
            "exists": False,
            "error": str(e),
            "resolved_path": None,
            "original_path": request.video_path,
        }
    
    exists = video_path.exists()
    is_file = video_path.is_file() if exists else False
    
    return {
        "exists": exists,
        "is_file": is_file,
        "resolved_path": str(video_path.absolute()),
        "original_path": request.video_path,
    }


@app.post("/api/process-video")
def process_video(request: VideoProcessRequest) -> dict:
    """Process a video file and generate analytics."""
    # Handle Windows paths and normalize the path
    video_path_str = request.video_path.strip()
    # Remove quotes if present
    if video_path_str.startswith('"') and video_path_str.endswith('"'):
        video_path_str = video_path_str[1:-1]
    if video_path_str.startswith("'") and video_path_str.endswith("'"):
        video_path_str = video_path_str[1:-1]
    
    video_path = Path(video_path_str)
    
    # Try to resolve the path
    try:
        video_path = video_path.resolve()
    except (OSError, ValueError) as e:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid video path: {video_path_str}. Error: {str(e)}"
        )
    
    if not video_path.exists():
        # Provide more helpful error message
        abs_path = str(video_path.absolute())
        raise HTTPException(
            status_code=404, 
            detail=f"Video file not found at: {abs_path}. Please check if the file exists and the path is correct."
        )
    
    if not video_path.is_file():
        raise HTTPException(status_code=400, detail=f"Path is not a file: {video_path}")
    
    # Determine project root (assuming we're in backend/app/main.py)
    current_file = Path(__file__).resolve()
    project_root = current_file.parent.parent.parent
    script_path = project_root / "backend" / "scripts" / "count_video.py"
    
    if not script_path.exists():
        raise HTTPException(status_code=500, detail=f"count_video.py script not found at {script_path}")
    
    cmd = [
        sys.executable,
        str(script_path),
        "--video",
        str(video_path.resolve()),
        "--model",
        request.model,
        "--line-y",
        str(request.line_y),
        "--conf",
        str(request.conf),

        "--anchor",
        str(request.anchor or "bottom"),
        "--frame-stride",
        str(int(request.frame_stride or 1)),
        "--scale",
        str(float(request.scale or 1.0)),
        "--roi-band",
        str(float(request.roi_band or 0.0)),
    ]

    if request.skip_video:
        cmd.append("--skip-video")
    
    if request.invert_directions:
        cmd.append("--invert-directions")
    
    try:
        # Run the video processing script from project root
        # Set PYTHONPATH to include project root for imports
        env = os.environ.copy()
        env['PYTHONPATH'] = str(project_root)
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=str(project_root),
            env=env,
            timeout=3600,  # 1 hour timeout
        )
        
        if result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail=f"Video processing failed: {result.stderr}"
            )
        
        # Read the generated analytics
        analytics_path = project_root / "backend" / "output" / "counts.json"
        if not analytics_path.exists():
            raise HTTPException(
                status_code=500,
                detail="Analytics file was not generated"
            )
        
        return json.loads(analytics_path.read_text(encoding="utf-8"))
        
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Video processing timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing video: {str(e)}")


@app.get("/api/analytics")
def get_analytics() -> dict:
    """Returns the latest analytics JSON generated by backend.scripts.count_video.

    By default it reads: backend/output/counts.json
    """
    # Determine project root (assuming we're in backend/app/main.py)
    current_file = Path(__file__).resolve()
    project_root = current_file.parent.parent.parent
    path = project_root / "backend" / "output" / "counts.json"
    
    if not path.exists():
        raise HTTPException(status_code=404, detail="counts.json not found. Run the counting script first.")

    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Invalid JSON in counts.json: {e}")

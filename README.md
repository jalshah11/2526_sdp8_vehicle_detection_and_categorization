# Vehicle Detection and Categorization (Unique Count + Analytics)

Last updated: 2025-12-15

## What is implemented (as of 2025-12-15)
This repository currently implements a minimal backend that counts vehicles **uniquely** (per tracked object) from a **video file** and produces category-wise analytics.

Implemented features:
- YOLOv8 **detection + tracking** on a video file
- **Unique counting** using a **horizontal virtual line** (a vehicle is counted once when its centroid crosses the line, either direction)
- Category-wise counts:
  - `car`
  - `bike` (includes `bicycle` + `motorcycle` YOLO classes)
  - `bus`
  - `truck`
- Writes analytics JSON to `backend/output/counts.json`
- Minimal API server:
  - `GET /health`
  - `GET /api/analytics` (serves the latest `backend/output/counts.json`)

## Quickstart (PowerShell)
Create venv + install deps:
- `py -m venv .venv`
- `.\.venv\Scripts\Activate.ps1`
- `py -m pip install -r backend\requirements.txt`
- `py -m pip install -r backend\requirements-dev.txt`

Run vehicle counting on a video (prints JSON and writes `backend/output/counts.json`):
- `py -m backend.scripts.count_video --video path\to\video.mp4 --line-y 0.5`

Run with preview (press `q` to quit):
- `py -m backend.scripts.count_video --video path\to\video.mp4 --line-y 0.5 --show`

Start the API server:
- `py -m uvicorn backend.app.main:app --reload --port 8000`

Run tests:
- `py -m pytest`

## Code layout (high level)
- `backend/scripts/count_video.py`: entrypoint that runs YOLO tracking and produces analytics JSON
- `backend/vehicle_counting/line_counter.py`: pure-Python virtual-line crossing counter (unique per track)
- `backend/app/main.py`: FastAPI app serving the latest analytics JSON
- `backend/tests/test_line_counter.py`: unit tests for line crossing + unique counting

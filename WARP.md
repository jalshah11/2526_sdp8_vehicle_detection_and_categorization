# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## What this repo currently implements
A minimal vehicle-analytics backend that:
- runs YOLOv8 detection + tracking on a video file
- counts vehicles **uniquely** when they cross a **horizontal virtual line**
- aggregates counts by type: **car, bike (bicycle+motorcycle), bus, truck**
- writes results to `backend/output/counts.json`
- serves the latest JSON via a small FastAPI app

The older system design doc is still in `Learning_and_Planning/Lab1.md`, but the active implementation is under `backend/`.

## Common commands (PowerShell)
Create venv + install deps:
- `py -m venv .venv`
- `.\.venv\Scripts\Activate.ps1`
- `py -m pip install -r backend\requirements.txt`
- `py -m pip install -r backend\requirements-dev.txt`

Run vehicle counting on a video (writes JSON and prints it):
- `py -m backend.scripts.count_video --video path\to\video.mp4 --line-y 0.5`

Run with a preview window (press `q` to quit):
- `py -m backend.scripts.count_video --video path\to\video.mp4 --line-y 0.5 --show`

Start the API server:
- `py -m uvicorn backend.app.main:app --reload --port 8000`

Run tests:
- `py -m pytest`

Run a single test (examples):
- `py -m pytest backend\tests\test_line_counter.py`
- `py -m pytest -k test_counts_only_on_crossing_once`

## Architecture (big picture)
Counting pipeline
- `backend/scripts/count_video.py` is the executable entrypoint.
- Uses Ultralytics `YOLO(...).track(...)` to get per-frame detections with **track IDs**.
- For each tracked object, the script computes the bbox centroid and sends `(track_id, center, class)` observations into the counter.
- Output: `backend/output/counts.json` (includes totals + category breakdown + metadata like model and line position).

Unique counting logic
- `backend/vehicle_counting/line_counter.py` contains pure-Python counting logic.
- A track is counted **once** when its centroid crosses the virtual line (either direction).
- Only YOLO classes mapped to the desired categories are counted:
  - car → car
  - bus → bus
  - truck → truck
  - bicycle/motorcycle → bike

API
- `backend/app/main.py` exposes:
  - `GET /health`
  - `GET /api/analytics` (reads and returns `backend/output/counts.json`)

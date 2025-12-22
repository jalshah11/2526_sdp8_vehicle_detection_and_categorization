# Vehicle Detection and Categorization (Unique Count + Analytics)

Last updated: 2025-12-22

## Lab-2 (15-12-2025)
Summary of what was built in Lab-2:
- Minimal backend pipeline to process a video file and produce analytics
- YOLOv8-based vehicle detection/tracking
- Virtual horizontal line crossing for unique vehicle counting
- Category-wise counts: `car`, `bike` (`bicycle` + `motorcycle`), `bus`, `truck`
- Analytics JSON written to `backend/output/counts.json`
- Minimal API server:
  - `GET /health`
  - `GET /api/analytics` (serves the latest `backend/output/counts.json`)

## Lab-3 (22-12-2025)
Summary of what was added/changed in Lab-3:
- Annotated output video generation (`backend/output/annotated.mp4`) with bounding boxes + labels
- Directional counting for line crossings:
  - `in` = top -> bottom across the line
  - `out` = bottom -> top across the line
  - `--invert-directions` to swap in/out if the camera orientation is opposite
- Replaced Ultralytics built-in tracking in the script with a basic nearest-neighbor tracker to avoid optional native deps (e.g. `lap`)

## Code layout (high level)
- `backend/scripts/count_video.py`: video inference entrypoint (detects vehicles, writes annotated video, writes counts JSON)
- `backend/vehicle_counting/simple_tracker.py`: basic nearest-neighbor tracker (assigns stable-ish IDs)
- `backend/vehicle_counting/line_counter.py`: virtual-line crossing counter (unique per track + in/out)
- `backend/app/main.py`: FastAPI app serving the latest analytics JSON
- `backend/tests/test_line_counter.py`: unit tests for line crossing + unique counting

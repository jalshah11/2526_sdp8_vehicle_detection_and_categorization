# Vehicle Detection and Categorization

Last updated: 2025-12-22

## Lab-1 (08-12-2025)
In Lab-1, I explored and learned about YOLO object detection models.
Notes/highlights are available in the `Learning_and_Planning/` folder.

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

## Lab-4 (05-01-2026)
Summary of what was added/changed in Lab-4:
- Added a React + Vite frontend (`frontend/`) to interact with the backend
- UI to submit a video path + processing options (model, line position, confidence, invert directions)
- Dashboard to visualize analytics (category counts and in/out split) using charts
- Frontend talks to the FastAPI backend using an Axios API client and shows backend health status

## Code layout (high level)
- `backend/scripts/count_video.py`: video inference entrypoint (detects vehicles, writes annotated video, writes counts JSON)
- `backend/vehicle_counting/simple_tracker.py`: basic nearest-neighbor tracker (assigns stable-ish IDs)
- `backend/vehicle_counting/line_counter.py`: virtual-line crossing counter (unique per track + in/out)
- `backend/app/main.py`: FastAPI app (health + analytics + video processing endpoint)
- `backend/tests/test_line_counter.py`: unit tests for line crossing + unique counting
- `frontend/`: Vite + React frontend application
- `frontend/src/components/VideoUpload.jsx`: video path + processing options form
- `frontend/src/components/Analytics.jsx`: charts and analytics rendering
- `frontend/src/services/api.js`: Axios client for backend API calls
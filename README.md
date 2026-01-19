# Vehicle Detection and Categorization

Last updated: 19-01-2026

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

## Lab-5/6 (12-01-2026 / 19-01-2026)
Summary of what was added/changed:
- Significantly improved performance and accuracy by implementing **ByteTrack** to replace the simple tracker.
- Addressed unique counting issues by leveraging robust tracking state, ensuring vehicles are not double-counted or missed.
- Optimized the counting logic with hysteresis to correctly handle slow-moving vehicles and occlusions.
- Cleaned up deepsort dependencies and enabled annotated video playback in the dashboard.

## Code layout (high level)
- `backend/scripts/count_video.py`: Core logic for video processing. Uses YOLOv8 + ByteTrack for detection and tracking.
- `backend/vehicle_counting/line_counter.py`: Logic for counting unique vehicles crossing the line (handling hysteresis).
- `backend/app/main.py`: FastAPI app serving the API and static outputs.
- `backend/tests/test_line_counter.py`: Unit tests for the counting logic.
- `frontend/`: Vite + React frontend application.
- `frontend/src/components/VideoUpload.jsx`: Component for video path input and settings.
- `frontend/src/components/Analytics.jsx`: Component for visualizing traffic stats (Charts/Tables).
- `frontend/src/services/api.js`: API client for backend communication.
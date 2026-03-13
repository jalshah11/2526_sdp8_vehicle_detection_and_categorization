# Vehicle Detection and Categorization

Last updated: 13-03-2026

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

## Lab-7/8/9/10
Summary of what was accomplished:
- Focused on evaluating the tracker's accuracy and the system's performance.
- Consolidated system metrics, methodology, and detection accuracy into a comprehensive Project Report.
- Drafted a research paper analyzing vehicle detection performance, focusing on hysteresis logic and ByteTrack improvements.

## Lab-11/12 (13-03-2026)
Summary of what was added/changed:
- Built a complete User Authentication system (Register, Login, JWT auth) using MongoDB.
- Implemented OTP-based Email Verification on signup, and Forgot/Reset Password flows using Gmail SMTP.
- Created a comprehensive User Profile page allowing users to update their username, upload a profile picture (saved as a base64 Data URI), change their password, and securely delete their account.
- Added an Analytics History feature so authenticated users can save and view their past video processing results.

## Code layout (high level)
- `backend/scripts/count_video.py`: Core logic for video processing. Uses YOLOv8 + ByteTrack for detection and tracking.
- `backend/vehicle_counting/line_counter.py`: Logic for counting unique vehicles crossing the line (handling hysteresis).
- `backend/app/main.py`: FastAPI app serving the API and static outputs.
- `backend/app/routers/`: API routers for `auth_router.py`, `profile_router.py`, and `history_router.py`.
- `backend/app/models.py`: Pydantic models for authentication and MongoDB schemas.
- `backend/tests/test_line_counter.py`: Unit tests for the counting logic.
- `frontend/`: Vite + React frontend application.
- `frontend/src/components/auth/`: Components for `LoginPage`, `RegisterPage`, `VerifyEmailPage`, `ResetPasswordPage`, and `ProfilePage`.
- `frontend/src/components/VideoUpload.jsx`: Component for video path input and settings.
- `frontend/src/components/Dashboard.jsx`: Main dashboard with navigation and processing.
- `frontend/src/components/Analytics.jsx`: Component for visualizing traffic stats (Charts/Tables).
- `frontend/src/services/api.js` & `authApi.js`: API clients for backend communication.
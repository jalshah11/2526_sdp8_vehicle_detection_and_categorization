# Vehicle Detection & Categorization

A traffic analytics system that processes recorded video footage to detect, track, and count vehicles crossing a configurable virtual line — with direction awareness (in/out), category breakdown (car, bike, bus, truck), and a full-featured web dashboard. Built as part of a 6th semester Software Design Project.

> **Development history & lab-wise progress:** see [`Learning_and_Planning/Development_History.md`](./Learning_and_Planning/Development_History.md)

---

## What it does

You point it at a video file, configure where you want the counting line, and it runs YOLOv8 + ByteTrack over every frame to figure out which vehicles cross the line and which direction they were going. The results land in a JSON file and an annotated video, both of which the web dashboard picks up and visualizes.

On the authentication side, users can register, log in, and build up a personal history of every analysis they've run — along with the ability to export any of those records as a PDF or CSV report.

The counting logic has a hysteresis margin around the line so slow-moving or briefly-occluded vehicles don't get counted twice. Each vehicle is counted exactly once, identified by its ByteTrack ID, and the category is decided by a majority vote across all the frames it appeared in (so a misclassified frame here and there doesn't matter).

---

## Features

- **Vehicle detection & tracking** — YOLOv8 (nano / small / x-large) with ByteTrack multi-object tracking
- **Virtual line crossing** — configurable horizontal line position; counts each unique vehicle once
- **Directional counting** — separates traffic into IN (top→bottom) and OUT (bottom→top); invertable
- **4 vehicle categories** — car, bike (bicycle + motorcycle combined), bus, truck
- **Annotated output video** — bounding boxes, class labels, track IDs, and a live count overlay burned in
- **Analytics dashboard** — bar charts, pie charts, in/out split breakdown, debug frame stats
- **User accounts** — register, email OTP verification, login with JWT, forgot/reset password
- **Analytics history** — every run is saved to your account automatically when logged in
- **Report export** — download any result as a formatted PDF or CSV
- **User profile** — update username, upload avatar, change password, delete account

---

## Tech Stack

| Layer | Technology |
|---|---|
| Detection | YOLOv8 (Ultralytics ≥ 8.1) |
| Tracking | ByteTrack (via Ultralytics) |
| Video processing | OpenCV, NumPy, PyTorch |
| Backend API | FastAPI + Uvicorn |
| Database | MongoDB (Motor async driver) |
| Auth | JWT (python-jose) + bcrypt |
| Email | Gmail SMTP via aiosmtplib |
| Frontend | React 18 + Vite |
| Charts | Recharts |
| Routing | React Router DOM v7 |
| HTTP client | Axios |
| PDF export | jsPDF + jspdf-autotable |
| Styling | TailwindCSS |

---

## Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- MongoDB running locally (or a MongoDB Atlas URI)
- A Gmail account with an [App Password](https://support.google.com/accounts/answer/185833) set up (for email verification)

---

## Installation

### 1. Clone the repo

```bash
git clone https://github.com/jalshah11/2526_sdp8_vehicle_detection_and_categorization.git
cd 2526_sdp8_vehicle_detection_and_categorization
```

### 2. Python environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r backend/requirements.txt
```

### 3. Environment variables

Create a file at `backend/.env` and fill in the values:

```env
MONGO_URI=mongodb://localhost:27017/vehicle_analytics
MONGO_DB_NAME=vehicle_analytics

JWT_SECRET_KEY=replace_this_with_a_long_random_string
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_16_char_app_password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

### 4. Frontend dependencies

```bash
cd frontend
npm install
cd ..
```

---

## Running the project

You need two terminals — one for the backend, one for the frontend.

**Backend** (from the project root):
```bash
py -m uvicorn backend.app.main:app --reload --port 8000
```

**Frontend** (from the `frontend/` directory):
```bash
npm run dev
```

The app will be available at `http://localhost:5173`. The frontend checks backend health on load and will show an error screen if the server isn't running.

---

## Usage

1. Register an account and verify your email with the OTP sent to your inbox.
2. Log in — you'll land on the main dashboard.
3. Enter the **absolute path** to a video file on your machine (the backend processes files from the local filesystem).
4. Adjust the settings:
   - **Model** — choose between `yolov8n` (fast), `yolov8s` (balanced), or `yolov8x` (most accurate)
   - **Line Y** — vertical position of the counting line as a fraction of frame height (0.0 = top, 1.0 = bottom)
   - **Confidence** — detection confidence threshold
   - **Invert Directions** — flip what counts as IN vs OUT (useful if the camera is mounted facing the other way)
   - **Frame Stride** — process every Nth frame; set higher to speed things up on long videos (may miss fast-moving vehicles)
   - **Scale** — downscale frames before inference; 0.75 gives a good speed/accuracy trade-off
5. Hit **Process Video**. The backend runs the analysis as a subprocess — this can take a while depending on the video length and model.
6. Once done, the dashboard shows charts and the annotated video. The result is automatically saved to your History.
7. Go to **History** to see all your past runs. You can view full details, delete records, or export to PDF/CSV.

---

## Project Structure

```
├── backend/
│   ├── .env                        # Environment config (not committed)
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py                 # FastAPI app entry point
│   │   ├── auth.py                 # JWT + bcrypt helpers
│   │   ├── database.py             # MongoDB connection
│   │   ├── email_service.py        # SMTP OTP email sender
│   │   ├── models.py               # Pydantic schemas
│   │   ├── otp_store.py            # In-memory OTP store (10-min TTL)
│   │   └── routers/
│   │       ├── auth_router.py      # /api/auth/* — register, login, verify, reset
│   │       ├── history_router.py   # /api/history/* — list, delete records
│   │       └── profile_router.py   # /api/profile/* — update, avatar, password, delete
│   ├── scripts/
│   │   └── count_video.py          # Core video processing script
│   ├── vehicle_counting/
│   │   └── line_counter.py         # LineCrossingCounter with hysteresis logic
│   ├── tests/
│   │   └── test_line_counter.py    # Unit tests for counting logic
│   └── output/                     # Generated files (gitignored)
│       ├── counts.json
│       └── annotated.mp4
│
├── frontend/
│   ├── package.json
│   └── src/
│       ├── App.jsx                 # Root component + routing
│       ├── context/AuthContext.jsx # Auth state (sessionStorage)
│       ├── services/
│       │   ├── api.js              # Core API client
│       │   └── authApi.js          # Auth/profile/history API client
│       └── components/
│           ├── Dashboard.jsx
│           ├── VideoUpload.jsx
│           ├── Analytics.jsx
│           ├── HistoryPage.jsx
│           └── auth/               # Login, Register, Verify, ForgotPassword, Reset, Profile
│
├── Learning_and_Planning/
│   ├── Lab1.md                     # Initial research notes (YOLO, ANPR, system design)
│   └── Development_History.md      # Lab-by-lab development log
│
├── yolov8n.pt                      # YOLO Nano weights
├── yolov8s.pt                      # YOLO Small weights
└── yolov8x.pt                      # YOLO X-Large weights
```

---

## API Overview

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Server health check |
| POST | `/api/process-video` | Optional | Run vehicle counting on a video |
| GET | `/api/analytics` | No | Fetch latest counts.json |
| POST | `/api/check-video-path` | No | Validate video file path |
| POST | `/api/auth/register` | No | Create new account |
| POST | `/api/auth/login` | No | Log in, get JWT |
| GET | `/api/auth/me` | Yes | Get current user |
| POST | `/api/auth/verify-email` | No | Submit email OTP |
| POST | `/api/auth/forgot-password` | No | Send reset OTP |
| POST | `/api/auth/reset-password` | No | Reset password with OTP |
| GET | `/api/history` | Yes | List all past analytics |
| DELETE | `/api/history/{id}` | Yes | Delete a history record |
| GET | `/api/profile/me` | Yes | Get full profile |
| PUT | `/api/profile/update` | Yes | Update username |
| POST | `/api/profile/avatar` | Yes | Upload profile picture |
| PUT | `/api/profile/change-password` | Yes | Change password |
| DELETE | `/api/profile/delete-account` | Yes | Delete account |

---

## Notes

- The backend processes video files from the **local filesystem** — you need to provide the absolute path to a file that the backend machine can read. There's no cloud upload.
- OTPs are stored **in memory**, so restarting the backend invalidates any pending OTPs. Users would need to request a new one.
- Avatar images are stored as **base64 data URIs** directly in MongoDB — max 2 MB per image.
- The 1-hour processing timeout is a hard cap. For very long videos, consider using `--frame-stride 2` or `--scale 0.5` to speed things up.
- GPU is used automatically if CUDA is available. CPU inference works but is significantly slower.

---

## Running Tests

```bash
py -m pytest backend/tests/
```

---

## License

This project was built for academic purposes as part of a semester-long Software Design Project (SDP).
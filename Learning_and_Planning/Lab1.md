# Vehicle Detection, Categorization & Number Plate Tracking System
### Using YOLO + ANPR + OCR + FastAPI + Dashboard

## 📌 Overview
This project performs real-time vehicle detection, categorization, number plate recognition, unique vehicle counting, and parking entry/exit tracking using computer vision and a full backend–dashboard system.

The system detects vehicles using YOLO, extracts number plates using ANPR, reads plate text via OCR, applies parking logic, stores data in a database, and visualizes everything on a dashboard.

---

## 🚀 Features
- Vehicle detection & type classification (Car/Bike/Truck/Bus)
- Number plate detection using ANPR
- OCR-based plate text reading
- Unique vehicle identification using plate numbers
- Parking entry & exit tracking
- Real-time dashboard with charts & analytics
- WebSocket-based live feed updates
- REST APIs for sessions, history, stats
- Database integration (PostgreSQL or MongoDB)

---

## 🧠 Tech Stack
### Computer Vision
- YOLOv8/v9 (Ultralytics)
- YOLO/ANPR model
- EasyOCR / Tesseract / PaddleOCR

### Backend
- FastAPI
- SQLAlchemy ORM
- WebSockets
- Background camera task

### Database
- PostgreSQL (recommended)
- MongoDB (optional)

### Dashboard
- React.js
- Chart.js / Recharts
- WebSocket client

---



## ⚡ How It Works (Short Summary)
1. FastAPI reads video stream in background.
2. YOLO detects vehicles.
3. ANPR detects number plate.
4. OCR extracts text.
5. Logic determines entry/exit.
6. Session created/closed in database.
7. Dashboard reads data via REST API.
8. Live events streamed via WebSocket.

---

## 📊 Dashboard Features
- Total vehicles today
- Unique vehicles today
- Currently parked list
- Vehicles per hour graph
- Vehicle type distribution chart
- Live entry/exit events
- History & search by plate/date

---

## 📄 Future Enhancements
- Multi-camera support
- Speed estimation
- Automated parking billing
- Fake plate detection
- Cloud deployment

---

## 👨‍💻 Author
Your Name  
Final Year — System Design Project

# System Design Document
## Vehicle Detection, Categorization & Number Plate Tracking System

---

## 1. Introduction
This system is designed to detect vehicles, classify them, extract number plates, identify unique vehicles, and track parking entry/exit times. The system provides a real-time dashboard for monitoring and analysis.

---

## 2. System Architecture Overview
The system consists of:

1. **Camera Stream (RTSP/USB Video)**
2. **FastAPI Backend**
   - YOLO vehicle detection
   - ANPR plate detection
   - OCR text reading
   - Entry/Exit logic
   - Database operations
   - WebSocket for live updates
3. **Database**
4. **React Dashboard**

### High-Level Architecture:
Camera → FastAPI → Parking Logic → DB → API → Dashboard

---

## 3. Functional Requirements
### Core Features
- Detect vehicles in real-time
- Classify vehicle type
- Detect number plates
- Extract text from plates
- Unique vehicle identification
- Track entry/exit time
- Visual dashboard
- REST APIs & WebSockets

### Non-functional Requirements
- Real-time response
- Scalable architecture
- High detection accuracy
- Fault tolerance for missed detections

---

## 4. Module-wise System Design

### 4.1 Vehicle Detection Module (YOLO)
- Input: Video frame  
- Output: Vehicle type, bounding box  
- Steps:
  - Run YOLO inference  
  - Filter vehicle classes  
  - Extract bbox & confidence  

---

### 4.2 Gate Line Crossing
- Virtual line drawn across frame  
- When bbox center crosses line:
  - Create event
  - Assign direction (entry/exit)

---

### 4.3 Number Plate Detection (ANPR)
- YOLO/ANPR detects license plate  
- Crop plate area  
- Forward to OCR module  

---

### 4.4 OCR Module
- Extracts text from cropped plate  
- Regex cleaning  
- Format normalization  
- Result used as **unique ID**  

---

### 4.5 Parking Session Logic
#### Entry:
- If vehicle not in DB → create  
- If no open session → open session  

#### Exit:
- Close open session with exit time

---

### 4.6 API Layer (FastAPI)
REST APIs for:
- Stats  
- Current parked  
- Sessions  
- History  
- Events  

WebSocket:
- Live events feed

---

### 4.7 Dashboard Layer (React)
- Fetch stats & sessions through APIs  
- Display charts  
- Live table updates via WebSocket

---

## 5. Database Design

### vehicles table
- id  
- plate_number (unique)  
- vehicle_type  
- created_at  

### parking_sessions table
- id  
- vehicle_id  
- entry_time  
- exit_time  
- entry_image_url  
- exit_image_url  
- entry_camera_id  
- exit_camera_id  

### events table (optional)
- id  
- vehicle_id  
- plate_number_raw  
- plate_number_clean  
- timestamp  
- direction  
- image_url  

---

## 6. Deployment Design
- Backend runs as FastAPI service  
- Dashboard hosted separately or served by FastAPI  
- Database runs locally or cloud-hosted  
- Camera feed processed in backend  

---

## 7. Future Scope
- Facial recognition for driver  
- Multi-camera synchronization  
- Speed tracking  
- Cloud-based distributed design  

---

## 8. Conclusion
This system provides a complete real-time vehicle tracking and parking management solution using modern AI and backend technologies. It is scalable, reliable, and fully suitable for final-year system design projects.

# Flow Diagrams for Vehicle Detection & Number Plate Tracking System

---

# 1. Overall System Flow

Camera → Frame Capture → YOLO Vehicle Detection → ANPR Plate Detection → OCR → Parking Logic → DB → API → Dashboard

---

# 2. Vehicle Detection Flow

1. Read frame  
2. Apply YOLO model  
3. Detect:
   - Car  
   - Bike  
   - Truck  
   - Bus  
4. Assign bounding box  
5. Pass detection to gate line module

---

# 3. Gate Line Logic Flow

1. Get bbox center  
2. If center crosses gate line:  
   - If moving inward → ENTRY  
   - If moving outward → EXIT  
3. Generate event frame for ANPR  

---

# 4. ANPR Flow

1. Crop vehicle ROI  
2. Apply ANPR YOLO  
3. Detect number plate bbox  
4. Crop plate image  
5. Pass to OCR  

---

# 5. OCR & Plate Extraction Flow

1. OCR reads plate text  
2. Clean text:
   - Remove spaces  
   - Uppercase  
   - Regex validation  
3. Output final plate string  
4. Pass to parking logic  

---

# 6. Parking Logic Flow

## ENTRY Flow:
- If plate not in `vehicles` table → insert  
- Check if open session exists  
- If not → create new entry session  

## EXIT Flow:
- Look up open session  
- Close session by setting exit_time  

---

# 7. Backend API Flow

1. FastAPI receives request  
2. Fetches data from DB  
3. Formats response  
4. Returns JSON to dashboard  

---

# 8. WebSocket Live Feed Flow

1. Detection → Event created  
2. FastAPI pushes event to WebSocket  
3. Dashboard receives event  
4. Dashboard updates live table instantly  

---

# 9. Dashboard Flow

**Home Page:**
1. Call `/api/stats/today`  
2. Call `/api/events/recent`  
3. Connect to `/ws/live`  
4. Update UI in real-time  

**History Page:**
1. User selects date/plate  
2. Call `/api/sessions?date=...`  
3. Display results  

---

# 10. Complete End-to-End Sequence

Camera → YOLO → Gate Line → ANPR → OCR → Entry/Exit Logic → Database → REST API → Dashboard UI + WebSocket live feed  


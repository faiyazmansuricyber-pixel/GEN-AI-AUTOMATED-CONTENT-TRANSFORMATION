# Content Transformation Platform (SIH Prototype)

A full-stack multi-modal AI platform built for Smart India Hackathon submission. Converts raw text, documents (PDF/DOCX), images, and video files into high-value multi-format deliverables powered by **Google Gemini API (`gemini-3.6-flash`)** with structured JSON output, parallel task execution, and full source chunk traceability.

---

## ⚡ Quick Start (Recommended Launcher)

Double-click `start_all.bat` in the root project directory to start the complete platform:

1. **Double-click `start_all.bat`** (or run `start_all.bat` from Command Prompt/PowerShell).
2. It automatically:
   - Starts the **Backend Server** on `http://127.0.0.1:8000` in a labeled window (`Backend Server - DO NOT CLOSE`).
   - Starts the **Frontend Dev Server** on `http://localhost:3000` in a labeled window (`Frontend Server - DO NOT CLOSE`).
   - Waits 5 seconds for initialization, then automatically opens **`http://localhost:3000`** in your default web browser.

> [!IMPORTANT]
> **Keep both terminal windows (`Backend Server` and `Frontend Server`) OPEN** while using the application. Closing either terminal window will stop that server.

---

## 🌟 Tech Stack & Key Features

- **Frontend**: Next.js (App Router, React 19, TypeScript), Tailwind CSS, Lucide Icons, Glassmorphic UI theme.
- **Backend**: FastAPI (Python), Uvicorn async server.
- **AI Engine**: Google Gemini API (`gemini-3.6-flash`) with structured JSON schema responses.
- **Database**: SQLite (`backend/sih_platform.db`) for lightweight local persistence of raw content, chunks, intelligence analysis, and outputs.
- **Multi-Modal Ingest**: Supports `.txt`, `.pdf`, `.docx`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.mp4`, `.mov`, `.avi`.
- **Structured Deliverables**:
  1. **LinkedIn Post** (Hook, short paragraphs, CTA)
  2. **Twitter/X Thread** (3-6 tweets under 280 chars each)
  3. **Formal Advisory Document** (Summary, Impact, Recommended Actions list, References)
  4. **Executive Summary** (150-250 word bottom-line report)
  5. **Presentation Deck** (5-8 slides with title, bullets & speaker notes)
  6. **Infographic Layout** (Headline, key message cards & layout recommendations)
  7. **Video Package** (Script, scene-by-scene storyboard timeline & subtitles)
- **Source Chunk Traceability**: Every output tags used source chunks (`c1`, `c2`, ...). Clicking/hovering on any chunk ID highlights the exact original source chunk in real time.
- **Robust Error Handling**: Structured `{ "error": "...", "message": "..." }` responses with proper HTTP status codes.

---

## 🔧 Manual Setup & Individual Commands

### 1. Prerequisite: Add Gemini API Key
Make sure `backend/.env` exists and contains your valid Gemini API key:
```ini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.6-flash
```

---

### 2. Backend Setup & Startup (FastAPI)

1. Open terminal in the `backend/` folder:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   python -m pip install -r requirements.txt
   ```

3. Start the FastAPI backend server:
   ```bash
   python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```
   *Backend running on*: `http://127.0.0.1:8000`  
   *API Health Check*: `http://127.0.0.1:8000/api/health`

---

### 3. Frontend Setup & Startup (Next.js)

1. Open a new terminal in the `frontend/` folder:
   ```bash
   cd frontend
   ```

2. Install Node dependencies (if not already installed):
   ```bash
   npm install
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   *Frontend running on*: `http://localhost:3000`

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST /api/ingest` | Accepts raw text or file (PDF/DOCX/Image/Video), extracts content, chunks into ~150-200 words (`c1`, `c2`...), returns submission ID and chunks. |
| `POST /api/analyze` | Calls Gemini with structured output mode to extract summary, domain, tone, audience, entities, and key claims with source chunk mapping. |
| `POST /api/generate` | Concurrently generates selected deliverable types via `asyncio.gather` parallel calls with custom parameters. |
| `GET /api/submissions` | Retrieves historical list of past transformation submissions. |
| `GET /api/submissions/{id}` | Fetches full submission data including chunks, analysis, and outputs by ID. |

---

## 🧪 Verified Test Script

You can test the entire backend pipeline independently by running:
```bash
python backend/test_api.py
```
This executes ingest, Gemini structured analysis, parallel deliverable generation, and SQLite retrieval end-to-end.

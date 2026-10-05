<div align="center">

# 🧠 Content Transformation Platform

### Secure Multimodal Content Transformation — Powered by Gemini AI

**Smart India Hackathon 2026** · Problem Statement **26154** · Theme: **Blockchain & Cybersecurity**
Organization: **National Technical Research Organisation (NTRO) / NCIIPC**

[![Team](https://img.shields.io/badge/Team-Cyphers-6D28D9?style=flat-square)](#team)
[![Status](https://img.shields.io/badge/Status-Working%20Prototype-15803D?style=flat-square)](#)
[![Stack](https://img.shields.io/badge/Stack-Next.js%20%7C%20FastAPI%20%7C%20Gemini-1D4E89?style=flat-square)](#tech-stack)
[![License](https://img.shields.io/badge/License-MIT-gray?style=flat-square)](#license)

</div>

---

## 📌 Overview

Organisations constantly need to turn one piece of source content — a report, an advisory, a threat intelligence brief, a policy document — into *many* different communication formats for different audiences. Doing that by hand is slow, inconsistent, and expensive.

**Content Transformation Platform** is an AI-powered engine that takes a **single source** — text, a PDF/DOCX document, an image, or a video — and transforms it into **up to seven ready-to-use deliverables in parallel**, all generated from one shared understanding of the source, and all **traceable back to the exact source text** that backs every claim.

> *"Transform once. Communicate many ways. Keep every generated claim traceable to the source."*

---

## ✨ Key Features

| | |
|---|---|
| 🗂️ **Multi-modal input** | Accepts raw text, PDF, DOCX, images, and video as a single source submission |
| 🧩 **7 parallel output formats** | LinkedIn Post · Twitter/X Thread · Advisory Doc · Executive Summary · Presentation Slides · Infographic Layout · Video Package |
| 🎛️ **Full generation control** | Tone, Audience, Language, Detail Level, Objective, and Content Style — all operator-configurable |
| 🌐 **22 Indian languages** | Every scheduled language of the Constitution of India, plus English |
| 🔍 **Source-chunk traceability** | Every generated claim cites the exact source chunk it came from — click to inspect and verify |
| 🚫 **Anti-fabrication grounding** | Prompts explicitly forbid inventing names, numbers, or facts not present in the source |
| 📊 **Structured intelligence analysis** | Auto-extracted summary, key claims, entities, domain, tone, and audience — with a grounding/trust score per output |
| 📦 **Export & download** | Download any output as `.docx`/`.pptx`, or grab everything at once as a `.zip` |
| 🛡️ **Resilient by design** | Multi-model fallback chain + jittered retries absorb rate limits and transient provider errors without failing the whole request |
| 🕘 **Submission history** | Every run is persisted and can be reloaded from Past Submissions |

---

## 🏗️ Architecture — 5-Stage Pipeline

**Source Input** → Text · PDF/DOCX · Image · Video, submitted as one package.

| Stage | What Happens |
|---|---|
| **1 · Ingestion & Chunking** | Parses the source and splits it into chunks (`c1`, `c2`, …), preserving the original text of each chunk for later traceability. |
| **2 · Intent & Context Analysis** | One Gemini call reads all chunks and extracts a summary, key claims, entities, domain, and suggested tone/audience. |
| **3 · Parallel Per-Format Generation** | One concurrent Gemini call per selected output type — the shared analysis plus the operator's chosen parameters feed every format at once. |
| **4 · Grounding & Verification** | Anti-fabrication checks and `claims_used` citation integrity — every claim can be clicked to trace back to its exact source chunk. |
| **5 · Persistence & Delivery** | Stored in SQLite, rendered natively per output type, and downloadable as `.docx` / `.pptx` / `.zip`. |

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js, Tailwind CSS |
| **Backend** | FastAPI (Python) |
| **AI Engine** | Google Gemini API (multi-model fallback chain) |
| **Document Parsing** | `pypdf`, `python-docx` |
| **Image / Video Processing** | `Pillow`, `OpenCV` |
| **Export** | `python-docx`, `python-pptx` |
| **Database** | SQLite (production-ready to migrate to PostgreSQL) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- A Google Gemini API key ([Google AI Studio](https://aistudio.google.com/))

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/content-transformation-platform.git
cd content-transformation-platform
```

### 2. Backend setup
```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file inside `backend/` (see `.env.example`):
```env
GEMINI_API_KEY=your_api_key_here
```

### 3. Frontend setup
```bash
cd ../frontend
npm install
```

### 4. Run the app

**Easiest way** — from the project root, double-click `start_all.bat` (Windows) to launch both servers automatically.

**Or manually, in two terminals:**
```bash
# Terminal 1 — backend
cd backend
python -m uvicorn main:app --reload

# Terminal 2 — frontend
cd frontend
npm run dev
```

Then open **http://localhost:3000** in your browser.

---

## 🖥️ Usage

1. **Add your source** — paste raw text, or upload a PDF, DOCX, image, or video.
2. **Select output formats** — choose any combination of the 7 deliverable types.
3. **Set parameters** — tone, audience, language, detail level, objective, and style.
4. **Generate** — all selected formats are produced in parallel from one shared analysis.
5. **Review & verify** — click any source-chunk tag under a generated output to see the exact text it's grounded in.
6. **Export** — download individual outputs or grab everything as a `.zip`.

---

## 📁 Project Structure

.
├── backend/
│ ├── main.py # FastAPI routes (ingest, analyze, generate, export)
│ ├── gemini_service.py # Gemini prompts, model fallback, grounding logic
│ ├── parsers.py # PDF/DOCX/image/video parsing
│ ├── exporters.py # .docx / .pptx / .zip export
│ ├── database.py # SQLite models & queries
│ └── requirements.txt
├── frontend/
│ ├── app/ # Next.js app router pages
│ ├── components/ # UI components (dashboard, output view, traceability)
│ └── package.json
├── start_all.bat # One-click local startup script
└── README.md


---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ingest` | Upload/parse source content and chunk it |
| `POST` | `/api/analyze` | Run structured intelligence analysis on chunks |
| `POST` | `/api/generate` | Generate selected output formats in parallel |
| `GET` | `/api/submissions` | List past submissions |
| `GET` | `/api/submissions/{id}` | Retrieve a specific submission |
| `POST` | `/api/export/{submission_id}/{output_type}` | Download a single output as a file |
| `GET` | `/api/export/{submission_id}/all` | Download all outputs as a `.zip` |

---

## 🛡️ Reliability & Error Handling

- Every output type generates **independently** — one failed format never blocks the others
- **Multi-model fallback chain** with jittered retry backoff absorbs rate limits and transient provider errors
- All API errors return a consistent `{ error, message }` shape with proper HTTP status codes
- Clear, user-facing error states for unsupported files, empty input, or malformed extraction — no silent crashes

---

## 👥 Team — Cyphers

| Name | Role / Background |
|---|---|
| Faiyaz Razak Mansuri | CSE (Cybersecurity & IoT) |
| Kushwaha Soni Rajesh | CSE (AI/ML) |
| Shaikh Musib Riyaz | Chemical Engineering (Green Technology & Sustainable Engineering) |
| Momin Anishussain Kasimali | CSE (AI/ML) |
| Shaikh Tehjib Rais | CSE (AI/ML) |
| Vora Adil Shakil | CSE (AI/ML) |

---

## 📄 License

This project is built for Smart India Hackathon 2026 under Problem Statement 26154. See [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ by Team Cyphers for Smart India Hackathon 2026**

</div>

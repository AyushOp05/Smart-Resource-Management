# Smart Resource Management System
### GDG Solution Challenge 2026 — Build with AI

An AI-powered system that analyzes any situation and returns ranked resource recommendations based on detected conditions and constraints.

---

## Architecture

```
smart-resource-system/
├── backend/
│   ├── main.py              # FastAPI app + Google Gemini API integration
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Root component + state management
│   │   ├── api.js           # Backend API calls
│   │   └── components/
│   │       ├── QueryPanel   # Input + example queries
│   │       ├── ResultsPanel # Ranked cards + stats
│   │       └── ActionPlanModal # Full plan overlay
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── docker-compose.yml
```

---

## Quick Start

### Option 1 — Docker (recommended)

```bash
# 1. Clone / download this project
cd smart-resource-system

# 2. Set your Google Gemini API key
echo "GOOGLE_API_KEY=your_key_here" > .env

# 3. Start everything
docker-compose up
```

Open http://localhost:3000

---

### Option 2 — Manual

**Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env → add your GOOGLE_API_KEY

uvicorn main:app --reload --port 8000
```

**Frontend** (new terminal)
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| POST | /analyze | Analyze query → ranked resources |
| POST | /action-plan | Generate detailed implementation plan |

### POST /analyze

**Request**
```json
{
  "query": "Flood in rural village, 200 displaced, no electricity, 6-hour window",
  "context": "Optional extra context"
}
```

**Response**
```json
{
  "summary": "...",
  "domain": "Disaster Relief",
  "urgency": "critical",
  "recommendations": [
    {
      "rank": 1,
      "resource": "Emergency Response Teams",
      "type": "Personnel",
      "matchScore": 95,
      "reason": "...",
      "conditions_met": ["200 displaced", "6-hour urgency"],
      "availability": "Immediately available",
      "impact": "..."
    }
  ],
  "conditions_identified": ["rural location", "200 displaced", "no electricity", "6-hour urgency"],
  "next_steps": ["Contact NDRF immediately", "..."]
}
```

---

## How It Satisfies Solution Challenge 2026 Criteria

| Criterion | Weight | Implementation |
|-----------|--------|---------------|
| Technical Merit | 40% | FastAPI + Google Gemini API (gemini-2.5-pro) with structured JSON output |
| Alignment with Cause | 25% | Directly solves "scattered data → ranked volunteer/resource matching" |
| Innovation | 25% | General multi-domain AI condition extraction + scoring |
| User Experience | 10% | Clean dashboard, expandable cards, urgency indicators |

---

## Extend with Google Technologies (for submission)

To strengthen your Solution Challenge submission, integrate:

- **Firebase Firestore** — Store community needs, resource inventory, query history
- **Google Cloud Run** — Deploy the FastAPI backend (replace Docker)
- **Firebase Auth** — User authentication for NGO coordinators
- **Google Maps API** — Show resource locations on a map
- **Firebase Analytics** — Track which resources are most requested

```bash
# Deploy backend to Cloud Run
gcloud run deploy smart-resource-api \
  --source ./backend \
  --set-env-vars GOOGLE_API_KEY=your_key \
  --region asia-south1 \
  --allow-unauthenticated
```

---

## Tech Stack

- **Backend**: Python 3.12, FastAPI, Google Generative AI Python SDK
- **Frontend**: React 18, Vite, CSS Modules
- **AI**: Gemini 2.5 Pro (gemini-2.5-pro-preview-05-06) via Google Gemini API
- **Containerization**: Docker + Docker Compose

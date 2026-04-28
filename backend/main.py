from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from google import genai
from google.genai import types
import json
import os
import time
import logging
from dotenv import load_dotenv

load_dotenv()

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Gemini Client (new google-genai SDK) ──────────────────────────────────────
client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))

# Model fallback chain: try each in order if the previous one is unavailable
MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
]
MAX_RETRIES = 3        # retries per model
INITIAL_BACKOFF = 1.0  # seconds

app = FastAPI(title="Smart Resource Management API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """You are an intelligent Smart Resource Management AI. Your job is to analyze conditions/scenarios described by the user and recommend the BEST resources (volunteers, tools, materials, people, services, funds, etc.) in ranked order.

You MUST respond ONLY with a valid JSON object. No markdown, no explanation outside JSON.

JSON format:
{
  "summary": "2-3 sentence summary of the situation and your approach",
  "domain": "detected domain (e.g. NGO, Disaster Relief, Healthcare, Education, Infrastructure, Environment, Community)",
  "urgency": "low | medium | high | critical",
  "recommendations": [
    {
      "rank": 1,
      "resource": "Resource name",
      "type": "category (Volunteer, Equipment, Funding, Service, Personnel, Material, Technology)",
      "matchScore": 92,
      "reason": "Why this resource is the best fit for the conditions",
      "conditions_met": ["condition1", "condition2"],
      "availability": "Immediately available | Short-term | Long-term planning needed",
      "impact": "Expected impact description"
    }
  ],
  "conditions_identified": ["list of key conditions extracted from the query"],
  "next_steps": ["actionable step 1", "actionable step 2", "actionable step 3"]
}

Rules:
- Always return 3-6 ranked recommendations
- matchScore is 0-100 based on how well the resource fits ALL conditions
- Be specific and practical
- conditions_met lists which of the identified conditions this resource satisfies
- Consider constraints like budget, urgency, geography, skills needed
- Respond ONLY with the JSON object, nothing else"""


# ── Resilient Gemini helper ────────────────────────────────────────────────────

def _is_retryable(error: Exception) -> bool:
    """Check if the error is a transient one worth retrying (503, 429, etc.)."""
    err_str = str(error).lower()
    return any(code in err_str for code in ["503", "unavailable", "429", "resource_exhausted", "overloaded", "deadline"])


def call_gemini(contents: str, *, config: types.GenerateContentConfig) -> str:
    """
    Call Gemini with automatic retry + model fallback.

    Tries each model in MODELS list, with MAX_RETRIES per model using
    exponential backoff. Returns the raw response text on success.
    Raises the last exception if all attempts fail.
    """
    last_error = None

    for model_name in MODELS:
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                logger.info(f"Calling model={model_name} (attempt {attempt}/{MAX_RETRIES})")
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=config,
                )
                logger.info(f"Success with model={model_name} on attempt {attempt}")
                return response.text
            except Exception as e:
                last_error = e
                logger.warning(f"model={model_name} attempt {attempt} failed: {e}")

                if _is_retryable(e) and attempt < MAX_RETRIES:
                    wait = INITIAL_BACKOFF * (2 ** (attempt - 1))
                    logger.info(f"Retrying in {wait:.1f}s...")
                    time.sleep(wait)
                elif _is_retryable(e):
                    # exhausted retries for this model, try next model
                    logger.info(f"Exhausted retries for {model_name}, trying next model...")
                    break
                else:
                    # non-retryable error — don't bother trying more
                    raise

    # All models and retries exhausted
    raise last_error  # type: ignore[misc]


# ── Request / Response Models ──────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    query: str
    context: Optional[str] = None   # optional extra context from frontend

class ResourceRecommendation(BaseModel):
    rank: int
    resource: str
    type: str
    matchScore: int
    reason: str
    conditions_met: list[str]
    availability: str
    impact: str

class AnalyzeResponse(BaseModel):
    summary: str
    domain: str
    urgency: str
    recommendations: list[ResourceRecommendation]
    conditions_identified: list[str]
    next_steps: list[str]

class ActionPlanRequest(BaseModel):
    query: str
    analysis: AnalyzeResponse  # typed so Swagger renders the full nested schema


class ActionPlanResponse(BaseModel):
    plan: str

class HealthResponse(BaseModel):
    status: str
    version: str


# ── Routes ──────────────────────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
def root():
    """Redirect root to interactive API docs."""
    return RedirectResponse(url="/docs")


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    """Suppress favicon 404 logs."""
    return Response(status_code=204)


@app.get("/health", response_model=HealthResponse)
def health():
    return {"status": "ok", "version": "1.0.0"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    user_content = req.query
    if req.context:
        user_content += f"\n\nAdditional context: {req.context}"

    try:
        raw = call_gemini(
            user_content,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                max_output_tokens=4096,
                response_mime_type="application/json",
            ),
        )
        raw = raw.strip()
        # Strip markdown fences if present
        clean = raw
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[-1]
        if clean.endswith("```"):
            clean = clean[:-3]
        clean = clean.strip()
        data = json.loads(clean)
        return data

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"AI returned invalid JSON: {e}")
    except Exception as e:
        err_str = str(e)
        if "503" in err_str or "unavailable" in err_str.lower():
            raise HTTPException(
                status_code=503,
                detail="All AI models are currently experiencing high demand. Please try again in a minute.",
            )
        raise HTTPException(status_code=502, detail=f"Gemini API error: {e}")


@app.post("/action-plan", response_model=ActionPlanResponse, summary="Action Plan", tags=["Resources"])
def action_plan(req: ActionPlanRequest):
    prompt = f"""Based on this Smart Resource Management analysis:

Original query: {req.query}

Analysis result:
- Domain: {req.analysis.domain}
- Urgency: {req.analysis.urgency}
- Summary: {req.analysis.summary}
- Top resource: {req.analysis.recommendations[0].resource if req.analysis.recommendations else 'N/A'}

Generate a detailed implementation plan with:
1. A day-by-day timeline for the first 7 days
2. Who is responsible for each task
3. Key success metrics to track
4. Risk mitigation strategies
5. Budget allocation guidelines

Be specific and actionable."""

    try:
        text = call_gemini(
            prompt,
            config=types.GenerateContentConfig(max_output_tokens=4096),
        )
        return {"plan": text}

    except Exception as e:
        err_str = str(e)
        if "503" in err_str or "unavailable" in err_str.lower():
            raise HTTPException(
                status_code=503,
                detail="All AI models are currently experiencing high demand. Please try again in a minute.",
            )
        raise HTTPException(status_code=502, detail=f"Gemini API error: {e}")

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function analyzeResources(query, context = "") {
  const res = await fetch(`${BASE_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, context }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Analysis failed");
  }
  return res.json();
}

export async function getActionPlan(query, analysis) {
  const res = await fetch(`${BASE_URL}/action-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, analysis }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Action plan generation failed");
  }
  return res.json();
}

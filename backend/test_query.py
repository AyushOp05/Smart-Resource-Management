"""Quick test: fire a custom query at the /analyze endpoint."""
import requests
import json

r = requests.post(
    "http://localhost:8000/analyze",
    json={"query": "there are 1000 employees in office, select the one with highest package without seeing their work"},
    timeout=120,
)

print(f"Status: {r.status_code}")
data = r.json()

if r.status_code == 200:
    print(f"Domain: {data.get('domain')}")
    print(f"Urgency: {data.get('urgency')}")
    print(f"Recommendations ({len(data.get('recommendations', []))}):")
    for rec in data.get("recommendations", []):
        print(f"  {rec['rank']}. {rec['resource']} (score: {rec['matchScore']})")
    print(f"\nNext steps: {data.get('next_steps')}")
else:
    print(f"Error: {data}")

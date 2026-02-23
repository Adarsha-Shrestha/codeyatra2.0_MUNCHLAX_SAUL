import requests
import json
import os

API_URL = "http://localhost:8000/api"

def test_health():
    print("--- Testing /api/health ---")
    response = requests.get(f"{API_URL}/health")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}\n")

def test_query():
    print("--- Testing /api/query ---")
    payload = {
        "query": "What are the fundamental rights of a citizen?",
        "databases": ["law_reference_db"]
    }
    response = requests.post(f"{API_URL}/query", json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}\n")

if __name__ == "__main__":
    print("Starting API tests...\n")
    test_health()
    test_query()
    print("Testing complete.")

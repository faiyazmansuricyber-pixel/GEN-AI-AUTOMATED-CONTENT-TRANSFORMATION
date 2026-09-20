import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_water_report():
    print("--- Testing Water Wastage Report Pipeline ---")
    water_report = """
    URGENT REPORT ON URBAN WATER WASTAGE AND CRISIS MANAGEMENT (2026)
    
    Chunk 1 (c1): Urban centers across India are currently facing a severe water crisis, with over 40% of piped water lost to leakage, aging infrastructure, and unauthorized tapping before reaching end consumers. Cities such as Bengaluru, Chennai, and Delhi report acute groundwater depletion, leading to severe seasonal shortages.
    
    Chunk 2 (c2): Agricultural sector inefficiencies compound the problem, where flood irrigation methods account for 80% of total freshwater withdrawal, consuming disproportionate water resources compared to micro-irrigation solutions like drip and sprinkler systems.
    
    Chunk 3 (c3): Recommended interventions include mandatory rainwater harvesting installation in residential complexes, deployment of IoT-based acoustic leak detectors across municipal distribution pipelines, and pricing reforms to incentivize industrial recycling.
    """
    
    print("\n1. Ingesting Water Report...")
    resp_ingest = requests.post(f"{BASE_URL}/api/ingest", data={"text": water_report})
    assert resp_ingest.status_code == 200
    ingest_data = resp_ingest.json()
    submission_id = ingest_data["submission_id"]
    chunks = ingest_data["chunks"]
    print(f"Submission ID: {submission_id}, Chunks count: {len(chunks)}")
    for c in chunks:
        print(f"  {c['id']}: {c['text'][:80]}...")
        
    print("\n2. Analyzing Content...")
    resp_analyze = requests.post(f"{BASE_URL}/api/analyze", json={"submission_id": submission_id, "chunks": chunks})
    print("Analyze Status:", resp_analyze.status_code)
    if resp_analyze.status_code != 200:
        print("Analyze Error Response:", resp_analyze.text)
    assert resp_analyze.status_code == 200
    analysis_data = resp_analyze.json()
    print("Detected Domain:", analysis_data.get("detected_domain"))
    print("Summary:", analysis_data.get("summary"))
    
    print("\n3. Generating Deliverables (linkedin_post, twitter_thread, advisory)...")
    gen_payload = {
        "submission_id": submission_id,
        "selected_output_types": ["linkedin_post", "twitter_thread", "advisory"],
        "parameters": {
            "tone": "urgent",
            "audience": "policy_makers",
            "language": "English",
            "detail_level": "detailed",
            "objective": "warn",
            "style": "professional"
        }
    }
    resp_gen = requests.post(f"{BASE_URL}/api/generate", json=gen_payload)
    assert resp_gen.status_code == 200
    gen_data = resp_gen.json()
    
    outputs = gen_data.get("outputs", {})
    
    print("\n--- LINKEDIN POST OUTPUT ---")
    linkedin_res = outputs.get("linkedin_post", {})
    print("Content:\n", linkedin_res.get("content"))
    print("Claims Used:", linkedin_res.get("claims_used"))
    
    print("\n--- TWITTER THREAD OUTPUT ---")
    twitter_res = outputs.get("twitter_thread", {})
    print("Content:\n", json.dumps(twitter_res.get("content"), indent=2))
    print("Claims Used:", twitter_res.get("claims_used"))
    
    # Assertions
    linkedin_text = str(linkedin_res.get("content", ""))
    assert "water" in linkedin_text.lower() or "leakage" in linkedin_text.lower(), "LinkedIn post should talk about water wastage!"
    assert "smart india" not in linkedin_text.lower(), "LinkedIn post should NOT hallucinate Smart India Hackathon!"
    
    print("\n✅ WATER WASTAGE REPORT TEST PASSED PERFECTLY!")

if __name__ == "__main__":
    test_water_report()

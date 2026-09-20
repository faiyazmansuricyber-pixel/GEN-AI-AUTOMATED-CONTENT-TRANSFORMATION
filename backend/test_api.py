import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_pipeline():
    print("--- 1. Testing POST /api/ingest ---")
    sample_text = """
    Smart India Hackathon 2026 is a nationwide initiative by Ministry of Education's Innovation Cell to provide students with a platform to solve some of the pressing problems we face in our daily lives, and thus inculcate a culture of product innovation and a mindset of problem-solving.
    
    The Content Transformation Platform project aims to convert raw unstructured text, documents, images, and videos into high-value multi-format deliverables such as LinkedIn posts, Twitter threads, executive advisories, presentation slides, infographics, and video packages.
    
    Using Google Gemini API's multi-modal capabilities and structured JSON outputs, the platform guarantees full source chunk traceability (c1, c2, c3) so end users can audit every AI claim against original source material.
    """
    
    resp_ingest = requests.post(f"{BASE_URL}/api/ingest", data={"text": sample_text})
    print("Ingest Status:", resp_ingest.status_code)
    ingest_data = resp_ingest.json()
    print("Ingest Output:", json.dumps(ingest_data, indent=2))
    assert resp_ingest.status_code == 200
    submission_id = ingest_data["submission_id"]
    chunks = ingest_data["chunks"]
    
    print("\n--- 2. Testing POST /api/analyze with Gemini 3 Flash Preview ---")
    resp_analyze = requests.post(f"{BASE_URL}/api/analyze", json={"submission_id": submission_id, "chunks": chunks})
    print("Analyze Status:", resp_analyze.status_code)
    analyze_data = resp_analyze.json()
    print("Analyze Output:", json.dumps(analyze_data, indent=2))
    assert resp_analyze.status_code == 200
    
    print("\n--- 3. Testing POST /api/generate (Parallel execution for LinkedIn, Twitter, Advisory, Presentation) ---")
    gen_payload = {
        "submission_id": submission_id,
        "selected_output_types": ["linkedin_post", "twitter_thread", "advisory", "presentation"],
        "parameters": {
            "tone": "formal",
            "audience": "executive",
            "language": "English",
            "detail_level": "medium",
            "objective": "inform",
            "style": "professional"
        }
    }
    resp_gen = requests.post(f"{BASE_URL}/api/generate", json=gen_payload)
    print("Generate Status:", resp_gen.status_code)
    gen_data = resp_gen.json()
    print("Generate Output:", json.dumps(gen_data, indent=2))
    assert resp_gen.status_code == 200
    
    print("\n--- 4. Testing GET /api/submissions/{id} ---")
    resp_get = requests.get(f"{BASE_URL}/api/submissions/{submission_id}")
    print("Get Submission Status:", resp_get.status_code)
    sub_data = resp_get.json()
    print("Saved Outputs keys:", list(sub_data.get("outputs", {}).keys()))
    assert resp_get.status_code == 200

    print("\n✅ All API pipeline tests PASSED successfully!")

if __name__ == "__main__":
    test_pipeline()

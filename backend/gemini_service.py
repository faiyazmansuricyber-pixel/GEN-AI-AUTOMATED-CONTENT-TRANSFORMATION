import os
import json
import time
import random
import asyncio
from typing import Dict, Any, List, Tuple
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

PRIMARY_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
FALLBACK_MODELS = [PRIMARY_MODEL, "gemma-4-26b-a4b-it", "gemini-3-flash-preview", "gemini-3.5-flash"]

def get_gemini_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key_here":
        raise ValueError("GEMINI_API_KEY environment variable is missing or invalid in backend/.env")
    return genai.Client(api_key=api_key)

PROMPT_TEMPLATES = {
    "linkedin_post": (
        "Write a professional LinkedIn post summarizing the core findings, statistics, and impact of the provided input document. "
        "Hook in the first line, 3-5 short paragraphs, end with a relevant call to action. "
        'Return valid JSON matching schema: {"content": "string", "claims_used": ["c1", "c2"]}'
    ),
    "twitter_thread": (
        "Write a Twitter/X thread (3-6 tweets) breaking down the input document\'s key insights, facts, and conclusions. "
        "Each tweet must be under 280 characters. "
        'Return valid JSON matching schema: {"content": ["tweet 1 text", "tweet 2 text", ...], "claims_used": ["c1", "c2"]}'
    ),
    "advisory": (
        "Write a formal structured advisory document based strictly on the input document with sections: Summary, Impact, Recommended Actions (as a list), References. "
        'Return valid JSON matching schema: {"content": {"summary": "string", "impact": "string", "recommended_actions": ["action 1"], "references": ["ref 1"]}, "claims_used": ["c1", "c2"]}'
    ),
    "executive_summary": (
        "Write a concise executive summary (150-250 words) of the input document, leading with the bottom line findings. "
        'Return valid JSON matching schema: {"content": "string", "claims_used": ["c1", "c2"]}'
    ),
    "presentation": (
        "Create presentation slides (5-8 slides) covering the key sections, data points, and takeaways of the input document. "
        'Return valid JSON matching schema: {"content": {"slides": [{"title": "Slide Title", "bullets": ["bullet 1"], "speaker_notes": "notes"}]}, "claims_used": ["c1", "c2"]}'
    ),
    "infographic": (
        "Generate infographic content highlighting key metrics, facts, and takeaways from the input document: a short headline, 4-6 key messages, and a layout recommendation description. "
        'Return valid JSON matching schema: {"content": {"headline": "Headline Text", "key_messages": ["msg 1"], "layout_recommendation": "description"}, "claims_used": ["c1", "c2"]}'
    ),
    "video_package": (
        "Generate a complete video content package explaining the input document: a script, a storyboard (array of scenes each with visual_description and narration), subtitle text, and visual recommendations. "
        'Return valid JSON matching schema: {"content": {"script": "full video script", "storyboard": [{"scene": "Scene 1", "visual_description": "visual desc", "narration": "voiceover text"}], "subtitles": "subtitle text", "visual_recommendations": ["rec 1"]}, "claims_used": ["c1", "c2"]}'
    )
}

def _extract_json(text: str) -> str:
    """
    Robustly extracts the first complete JSON object from a Gemini response.
    """
    text = text.strip()
    for fence in ("```json", "```"):
        if text.startswith(fence):
            text = text[len(fence):]
            break
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    start = text.find("{")
    if start == -1:
        return text

    depth = 0
    in_string = False
    escape_next = False
    for i, ch in enumerate(text[start:], start=start):
        if escape_next:
            escape_next = False
            continue
        if ch == "\\" and in_string:
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start:i + 1]

    return text[start:]

def generate_content_with_fallback(client: genai.Client, contents: Any, config: types.GenerateContentConfig) -> str:
    """
    Instantly tries FALLBACK_MODELS with zero artificial sleep delays between attempts.
    """
    last_exception = None

    for model_name in FALLBACK_MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=config
            )
            if response and response.text:
                return response.text
        except Exception as e:
            last_exception = e
            continue

    if last_exception:
        err_str = str(last_exception)
        if any(kw in err_str for kw in ["503", "429", "UNAVAILABLE", "RESOURCE_EXHAUSTED", "Quota", "high demand", "overloaded"]):
            raise ValueError("AI service is temporarily busy, please try again in a moment.")
        raise ValueError(f"Gemini API error: {err_str}")

    raise ValueError("AI service is temporarily busy, please try again in a moment.")

async def analyze_content_service(chunks: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Analyzes extracted text chunks using Gemini structured output.
    Returns: { summary, key_claims: [{claim, source_chunk_ids}], entities, detected_domain, suggested_tone, suggested_audience }
    """
    client = get_gemini_client()
    
    formatted_chunks = "\n\n".join([f"Chunk ID: {c['id']}\nText: {c['text']}" for c in chunks])
    
    prompt = f"""You are an expert content analysis system. Analyze the following text chunks and extract structured intelligence.

CHUNKS:
{formatted_chunks}

TASK:
Extract:
1. summary: Comprehensive overview of the content (100-180 words).
2. key_claims: Array of key assertions/claims/facts made, each tagged with ALL chunk id(s) it came from (e.g. ["c1", "c2"]).
3. entities: Array of important entities (people, places, technologies, organizations, concepts, metrics) mentioned.
4. detected_domain: The industry or domain of this content (e.g., Environment, Water Management, Cybersecurity, Finance, Healthcare, Policy, Technology).
5. suggested_tone: Recommended communication tone (e.g., Formal, Urgent, Technical, Inspirational, Informative).
6. suggested_audience: Target audience profile (e.g., C-Suite Executives, Policy Makers, General Public, Engineers).

Return ONLY valid JSON with no extra commentary in this exact format:
{{
  "summary": "string",
  "key_claims": [
    {{"claim": "string", "source_chunk_ids": ["c1"]}}
  ],
  "entities": ["string"],
  "detected_domain": "string",
  "suggested_tone": "string",
  "suggested_audience": "string"
}}
"""

    def _sync_call():
        return generate_content_with_fallback(
            client=client,
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )

    loop = asyncio.get_running_loop()
    raw_response = await loop.run_in_executor(None, _sync_call)
    
    try:
        data = json.loads(_extract_json(raw_response))
        return data
    except Exception as e:
        if "temporarily busy" in str(e):
            raise e
        raise ValueError(f"Failed to parse Gemini analysis output as JSON: {str(e)}\nRaw: {raw_response[:200]}")

async def generate_single_output_service(
    output_type: str,
    analysis: Dict[str, Any],
    parameters: Dict[str, Any],
    chunks: List[Dict[str, str]]
) -> Dict[str, Any]:
    """
    Generates content for a single output type using Gemini.
    """
    client = get_gemini_client()
    
    if output_type not in PROMPT_TEMPLATES:
        raise ValueError(f"Unknown output type: '{output_type}'")
        
    template = PROMPT_TEMPLATES[output_type]
    
    tone = parameters.get("tone", "formal")
    audience = parameters.get("audience", "general")
    language = parameters.get("language", "English")
    detail_level = parameters.get("detail_level", "medium")
    objective = parameters.get("objective", "inform")
    style = parameters.get("style", "professional")
    
    chunks_summary = "\n\n".join([f"Chunk ID [{c['id']}]:\n{c['text']}" for c in chunks])
    
    prompt = f"""You are a document-grounded AI content generator.

CRITICAL MANDATE — READ BEFORE GENERATING:
- Your output MUST be strictly and exclusively derived from the SOURCE DOCUMENT provided below (Summary, Key Claims, and Source Chunks).
- FABRICATION PROHIBITION: You MUST NOT invent, infer, or assume ANY of the following if they are not explicitly stated in the source text:
    * People's names (founders, executives, authors, spokespersons, etc.)
    * Place names, cities, states, countries, or addresses
    * Dates, years, or time periods
    * Numbers, statistics, percentages, or financial figures
    * Organisation names, product names, brand names, or technologies
    * Any causal relationship or conclusion not directly supported by the source
- If a specific detail (e.g. a founder's name, a city, a founding year) is NOT present in the provided chunks or summary, you MUST either omit it entirely OR use a generic placeholder such as "the founders", "the team", "the company", "the location" — never substitute a fabricated value.
- CHUNK CITATION INTEGRITY: Every chunk ID you list in "claims_used" MUST genuinely correspond to a chunk that contains the specific fact you are using. Do NOT cite a chunk ID for a fact that is not in that chunk. Do NOT cite chunk IDs that do not exist in the provided source.

SPECIFIC DELIVERABLE FORMAT INSTRUCTIONS:
{template}

SOURCE DOCUMENT SUMMARY:
{analysis.get('summary', '')}

DETECTED DOMAIN:
{analysis.get('detected_domain', '')}

KEY CLAIMS EXTRACTED FROM SOURCE:
{json.dumps(analysis.get('key_claims', []), ensure_ascii=False, indent=2)}

FULL SOURCE CHUNKS REFERENCE:
{chunks_summary}

CUSTOM GENERATION PARAMETERS:
- Tone: {tone}
- Target Audience: {audience}
- Output Language: Write ALL human-readable content values in the requested language: {language}. Keep all JSON keys, field names and chunk IDs (c1, c2...) exactly in English. Keep numbers, acronyms, product names and proper nouns exactly as they appear in the source. The anti-fabrication and citation-integrity rules still apply in every language: only use facts present in the source chunks.
- Detail Level: {detail_level}
- Objective: {objective}
- Content Style: {style}

OUTPUT REQUIREMENTS:
Return ONLY valid JSON matching the schema for {output_type}.

GROUNDING VERIFICATION (apply before finalising your output):
1. Scan every proper noun (name, place, date, number) in your generated content.
2. For each one, confirm it appears verbatim in one of the Source Chunks or Key Claims above.
3. If it does NOT appear in the source, remove it and replace with generic language (e.g. "the founders", "the platform", "the region").
4. In "claims_used", list ONLY the chunk IDs whose text directly supports a fact in your output. Do NOT list a chunk ID unless you can point to the exact sentence in that chunk that supports the claim.
"""

    def _sync_call():
        return generate_content_with_fallback(
            client=client,
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )

    loop = asyncio.get_running_loop()
    raw_response = await loop.run_in_executor(None, _sync_call)

    try:
        parsed = json.loads(_extract_json(raw_response))
    except Exception as e:
        raise ValueError(
            f"Failed to parse '{output_type}' Gemini response as JSON: {str(e)}\n"
            f"Raw (first 300 chars): {raw_response[:300]}"
        )
    return parsed

async def generate_all_outputs_parallel(
    selected_output_types: List[str],
    analysis: Dict[str, Any],
    parameters: Dict[str, Any],
    chunks: List[Dict[str, str]]
) -> Tuple[Dict[str, Any], Dict[str, str]]:
    """
    Runs Gemini generation calls concurrently using asyncio.gather.
    Each task is launched with a small staggered delay (300 ms × index) to avoid
    firing all Gemini requests in the exact same millisecond, which reduces
    transient 503 "high demand" errors. All tasks still run fully concurrently.
    Returns: (outputs_dict, errors_dict)
    """
    async def _staggered(index: int, o_type: str):
        if index > 0:
            await asyncio.sleep(index * 0.1)   # 100 ms micro-stagger for ultra-fast parallel execution
        return await generate_single_output_service(o_type, analysis, parameters, chunks)

    tasks = [
        _staggered(i, o_type)
        for i, o_type in enumerate(selected_output_types)
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    outputs = {}
    errors = {}
    
    for o_type, res in zip(selected_output_types, results):
        if isinstance(res, Exception):
            err_msg = str(res)
            if "temporarily busy" in err_msg or "503" in err_msg or "UNAVAILABLE" in err_msg:
                errors[o_type] = "AI service is temporarily busy, please try again in a moment."
            else:
                errors[o_type] = err_msg
        else:
            outputs[o_type] = res
            
    return outputs, errors

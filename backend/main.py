import os
import uuid
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel

from database import init_db, save_submission, get_submission, list_submissions
from parsers import chunk_text, extract_text_from_file
from gemini_service import get_gemini_client, analyze_content_service, generate_all_outputs_parallel

app = FastAPI(
    title="Content Transformation Platform API",
    description="Backend API for multi-modal ingest, Gemini structured analysis, and parallel deliverable generation.",
    version="1.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Error Handlers to guarantee { "error": ..., "message": ... } response shape
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    error_title = "AI Service Busy" if exc.status_code == status.HTTP_503_SERVICE_UNAVAILABLE else (
        exc.detail if isinstance(exc.detail, str) and len(exc.detail) < 30 else "HTTP Exception"
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": error_title, "message": str(exc.detail)}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    msg = f"Validation Error in fields: {', '.join([str(e.get('loc', [])) for e in errors])}"
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"error": "Validation Error", "message": msg}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    err_str = str(exc)
    if any(kw in err_str for kw in ["503", "UNAVAILABLE", "temporarily busy", "high demand", "429", "RESOURCE_EXHAUSTED"]):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "error": "AI Service Busy",
                "message": "AI service is temporarily busy, please try again in a moment."
            }
        )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal Server Error", "message": err_str}
    )

@app.on_event("startup")
def startup_event():
    init_db()

# Request Models
class AnalyzeRequest(BaseModel):
    submission_id: str
    chunks: Optional[List[Dict[str, str]]] = None

class ParametersModel(BaseModel):
    tone: str = "formal"
    audience: str = "general"
    language: str = "English"
    detail_level: str = "medium"
    objective: str = "inform"
    style: str = "professional"

class GenerateRequest(BaseModel):
    submission_id: str
    selected_output_types: List[str]
    parameters: ParametersModel

@app.get("/api/health")
def health_check():
    return {"status": "ok", "gemini_model": os.getenv("GEMINI_MODEL", "gemini-3.5-flash")}

@app.post("/api/ingest")
async def ingest_content(
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    try:
        gemini_client = get_gemini_client()
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
        
    extracted_text = ""
    
    if file and file.filename:
        file_bytes = await file.read()
        try:
            extracted_text = await extract_text_from_file(file_bytes, file.filename, gemini_client)
        except ValueError as ve:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
        except Exception as e:
            err_str = str(e)
            if any(kw in err_str for kw in ["503", "UNAVAILABLE", "temporarily busy", "high demand", "429"]):
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="AI service is temporarily busy, please try again in a moment."
                )
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"File parsing error: {err_str}")
    elif text and text.strip():
        extracted_text = text.strip()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide either text content or upload a valid document/file."
        )

    chunks = chunk_text(extracted_text)
    submission_id = str(uuid.uuid4())
    
    save_submission(submission_id, raw_text=extracted_text, chunks=chunks)
    
    return {
        "submission_id": submission_id,
        "chunks": chunks,
        "raw_text": extracted_text
    }

@app.post("/api/analyze")
async def analyze_endpoint(req: AnalyzeRequest):
    submission = get_submission(req.submission_id)
    chunks = req.chunks
    
    if not chunks:
        if submission and submission.get("chunks"):
            chunks = submission["chunks"]
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No text chunks found for submission_id '{req.submission_id}'."
            )
            
    try:
        analysis_res = await analyze_content_service(chunks)
    except Exception as e:
        err_str = str(e)
        if any(kw in err_str for kw in ["503", "UNAVAILABLE", "temporarily busy", "high demand", "429"]):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI service is temporarily busy, please try again in a moment."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gemini analysis failed: {err_str}"
        )
        
    if submission:
        save_submission(
            submission_id=req.submission_id,
            raw_text=submission["raw_text"],
            chunks=chunks,
            analysis=analysis_res
        )
        
    return analysis_res

@app.post("/api/generate")
async def generate_endpoint(req: GenerateRequest):
    if not req.selected_output_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select at least one output type to generate."
        )
        
    submission = get_submission(req.submission_id)
    if not submission or not submission.get("chunks") or not submission.get("analysis"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submission not found or analysis step has not been completed yet."
        )
        
    chunks = submission["chunks"]
    analysis = submission["analysis"]
    params_dict = req.parameters.dict()
    
    try:
        outputs, errors = await generate_all_outputs_parallel(
            selected_output_types=req.selected_output_types,
            analysis=analysis,
            parameters=params_dict,
            chunks=chunks
        )
    except Exception as e:
        err_str = str(e)
        if any(kw in err_str for kw in ["503", "UNAVAILABLE", "temporarily busy", "high demand", "429"]):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI service is temporarily busy, please try again in a moment."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Generation pipeline failed: {err_str}"
        )
        
    # Combine with existing outputs if any
    existing_outputs = submission.get("outputs") or {}
    existing_outputs.update(outputs)
    
    save_submission(
        submission_id=req.submission_id,
        raw_text=submission["raw_text"],
        chunks=chunks,
        analysis=analysis,
        outputs=existing_outputs,
        parameters=params_dict
    )
    
    return {
        "submission_id": req.submission_id,
        "outputs": outputs,
        "errors": errors
    }

@app.get("/api/submissions")
def get_submissions_list():
    return list_submissions()

@app.get("/api/submissions/{submission_id}")
def get_submission_by_id(submission_id: str):
    sub = get_submission(submission_id)
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Submission with ID '{submission_id}' not found."
        )
    return sub

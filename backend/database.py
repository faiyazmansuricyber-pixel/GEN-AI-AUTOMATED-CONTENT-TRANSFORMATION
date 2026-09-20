import sqlite3
import json
import os
from datetime import datetime
from typing import Dict, Any, List, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "sih_platform.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS submissions (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                raw_text TEXT,
                chunks TEXT,
                analysis TEXT,
                outputs TEXT,
                parameters TEXT
            )
        """)
        conn.commit()

def save_submission(
    submission_id: str,
    raw_text: str,
    chunks: List[Dict[str, Any]],
    analysis: Optional[Dict[str, Any]] = None,
    outputs: Optional[Dict[str, Any]] = None,
    parameters: Optional[Dict[str, Any]] = None
):
    init_db()
    with get_db() as conn:
        conn.execute("""
            INSERT INTO submissions (id, created_at, raw_text, chunks, analysis, outputs, parameters)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                raw_text=excluded.raw_text,
                chunks=excluded.chunks,
                analysis=COALESCE(excluded.analysis, submissions.analysis),
                outputs=COALESCE(excluded.outputs, submissions.outputs),
                parameters=COALESCE(excluded.parameters, submissions.parameters)
        """, (
            submission_id,
            datetime.utcnow().isoformat(),
            raw_text,
            json.dumps(chunks, ensure_ascii=False),
            json.dumps(analysis, ensure_ascii=False) if analysis else None,
            json.dumps(outputs, ensure_ascii=False) if outputs else None,
            json.dumps(parameters, ensure_ascii=False) if parameters else None
        ))
        conn.commit()

def get_submission(submission_id: str) -> Optional[Dict[str, Any]]:
    init_db()
    with get_db() as conn:
        cursor = conn.execute("SELECT * FROM submissions WHERE id = ?", (submission_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "created_at": row["created_at"],
            "raw_text": row["raw_text"],
            "chunks": json.loads(row["chunks"]) if row["chunks"] else [],
            "analysis": json.loads(row["analysis"]) if row["analysis"] else None,
            "outputs": json.loads(row["outputs"]) if row["outputs"] else None,
            "parameters": json.loads(row["parameters"]) if row["parameters"] else None
        }

def list_submissions() -> List[Dict[str, Any]]:
    init_db()
    with get_db() as conn:
        cursor = conn.execute("SELECT id, created_at, raw_text, analysis, outputs, parameters FROM submissions ORDER BY created_at DESC LIMIT 50")
        rows = cursor.fetchall()
        result = []
        for r in rows:
            analysis = json.loads(r["analysis"]) if r["analysis"] else {}
            outputs = json.loads(r["outputs"]) if r["outputs"] else {}
            result.append({
                "id": r["id"],
                "created_at": r["created_at"],
                "preview": r["raw_text"][:120] + "..." if r["raw_text"] and len(r["raw_text"]) > 120 else r["raw_text"],
                "detected_domain": analysis.get("detected_domain", "General") if analysis else "General",
                "output_types": list(outputs.keys()) if outputs else []
            })
        return result

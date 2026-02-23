"""
api/routes.py
─────────────
FastAPI route definitions.

New endpoints added (PostgreSQL-backed):
  POST /api/upload              – Accept file upload from frontend, store + ingest
  GET  /api/files               – List ingested files (with filters)
  GET  /api/files/{file_id}     – Detail for a single ingested file
  GET  /api/cases/pg            – List case records from PostgreSQL
  GET  /api/query-logs          – Recent query logs
"""

import os
import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from orchestrator import RAGOrchestrator
from config.database import db_client
from config.settings import settings
from config.postgres import (
    get_db,
    IngestedFile,
    CaseRecord,
    QueryLog,
    IngestionStatus,
    TargetDB,
)
from ingest_cli import ingest_file, DB_MAPPING, SUPPORTED_EXTENSIONS

router = APIRouter()


# ──────────────────────────────────────────────────────────────────────────────
# Pydantic schemas
# ──────────────────────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    query: str
    databases: Optional[List[str]] = [settings.LAW_DB_NAME, settings.CASES_DB_NAME]


class FileOut(BaseModel):
    id: int
    original_filename: str
    stored_path: str
    file_size_bytes: Optional[int]
    target_db: str
    status: str
    chunk_count: Optional[int]
    error_message: Optional[str]
    uploaded_at: datetime.datetime
    ingested_at: Optional[datetime.datetime]
    case_id: Optional[str]

    class Config:
        from_attributes = True


class CaseOut(BaseModel):
    id: int
    case_id: str
    description: Optional[str]
    created_at: datetime.datetime
    file_count: int

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────────────────────────────────────
# Existing endpoints (unchanged behaviour, query log added)
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/query")
async def query_rag(request: QueryRequest, db: Session = Depends(get_db)):
    try:
        result = RAGOrchestrator.process_query(request.query, request.databases)

        # Persist query log
        eval_data = result.get("evaluation_metrics", {})
        log = QueryLog(
            query_text=request.query,
            databases_queried=",".join(request.databases or []),
            answer_text=result.get("answer", ""),
            confidence=result.get("confidence"),
            eval_score=eval_data.get("score") if eval_data else None,
            is_helpful=eval_data.get("is_helpful") if eval_data else None,
            num_sources=len(result.get("sources", [])),
        )
        db.add(log)
        db.commit()

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cases")
async def list_cases_chroma():
    """Legacy endpoint — lists case IDs from ChromaDB metadata."""
    try:
        client_db = db_client.get_client_db()
        results = client_db.get(include=["metadatas"])
        unique_cases = set()
        for meta in results.get("metadatas", []):
            if meta and "client_case_id" in meta:
                unique_cases.add(meta["client_case_id"])
        return {"cases": list(unique_cases)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────────────────────────────────────
# File upload endpoint
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/upload", summary="Upload a file from the frontend and ingest it")
async def upload_and_ingest(
    file: UploadFile = File(...),
    db_target: str = Form(..., description="One of: law, cases, client"),
    case_id: Optional[str] = Form(None, description="Required when db_target='client'"),
    overwrite: bool = Form(False, description="Re-ingest if already processed"),
    db: Session = Depends(get_db),
):
    """
    Accepts a file upload from the frontend and runs it through the unified
    ingest_file() pipeline which:
      1. Duplicate-checks against PostgreSQL
      2. Saves the file to FILE_STORAGE_DIR/<db>/<case_id>/
      3. Stores the raw bytes in PostgreSQL BYTEA
      4. Parses, chunks, embeds → ChromaDB
    """
    # ── Validate inputs ───────────────────────────────────────────────────────
    if db_target not in DB_MAPPING:
        raise HTTPException(status_code=400, detail=f"db_target must be one of {list(DB_MAPPING)}")

    if db_target == "client" and not case_id:
        raise HTTPException(status_code=400, detail="case_id is required when db_target='client'")

    filename = file.filename or "upload"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{ext}'. Allowed: {SUPPORTED_EXTENSIONS}",
        )

    # ── Read upload bytes once ────────────────────────────────────────────────
    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read upload: {e}")

    # ── Hand off to unified pipeline ──────────────────────────────────────────
    #    ingest_file() handles everything:
    #      duplicate check → disk save → PostgreSQL BYTEA → parse → embed
    result = ingest_file(
        original_filename=filename,
        target_db_key=db_target,
        file_bytes=file_bytes,      # bytes from HTTP upload stored in BYTEA
        case_id=case_id,
        overwrite=overwrite,
    )

    if result["skipped"]:
        return {
            "status": "skipped",
            "detail": f"'{filename}' was already ingested. Use overwrite=true to force.",
        }

    if result["success"]:
        return {
            "status": "success",
            "file_id": result["file_id"],
            "filename": filename,
            "chunks": result["chunks"],
        }

    raise HTTPException(status_code=500, detail=f"Ingestion failed: {result['error']}")


# ──────────────────────────────────────────────────────────────────────────────
# File listing / detail
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/files", response_model=List[FileOut], summary="List ingested files")
def list_files(
    status: Optional[str] = Query(None, description="Filter by status: pending/processing/success/failed"),
    db_target: Optional[str] = Query(None, description="Filter by target DB: law/cases/client"),
    case_id: Optional[str] = Query(None, description="Filter by client case ID"),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: Session = Depends(get_db),
):
    q = db.query(IngestedFile)
    if status:
        q = q.filter(IngestedFile.status == status)
    if db_target:
        q = q.filter(IngestedFile.target_db == db_target)
    if case_id:
        q = q.join(CaseRecord).filter(CaseRecord.case_id == case_id)

    rows = q.order_by(IngestedFile.uploaded_at.desc()).offset(offset).limit(limit).all()

    out = []
    for r in rows:
        out.append(FileOut(
            id=r.id,
            original_filename=r.original_filename,
            stored_path=r.stored_path,
            file_size_bytes=r.file_size_bytes,
            target_db=r.target_db.value if hasattr(r.target_db, "value") else str(r.target_db),
            status=r.status.value if hasattr(r.status, "value") else str(r.status),
            chunk_count=r.chunk_count,
            error_message=r.error_message,
            uploaded_at=r.uploaded_at,
            ingested_at=r.ingested_at,
            case_id=r.case.case_id if r.case else None,
        ))
    return out


@router.get("/files/{file_id}", response_model=FileOut, summary="Get a single file record")
def get_file(file_id: int, db: Session = Depends(get_db)):
    r = db.query(IngestedFile).filter(IngestedFile.id == file_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="File not found.")
    return FileOut(
        id=r.id,
        original_filename=r.original_filename,
        stored_path=r.stored_path,
        file_size_bytes=r.file_size_bytes,
        target_db=r.target_db.value if hasattr(r.target_db, "value") else str(r.target_db),
        status=r.status.value if hasattr(r.status, "value") else str(r.status),
        chunk_count=r.chunk_count,
        error_message=r.error_message,
        uploaded_at=r.uploaded_at,
        ingested_at=r.ingested_at,
        case_id=r.case.case_id if r.case else None,
    )


# ──────────────────────────────────────────────────────────────────────────────
# Case records (PostgreSQL-backed)
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/cases/pg", response_model=List[CaseOut], summary="List case records from PostgreSQL")
def list_cases_pg(db: Session = Depends(get_db)):
    cases = db.query(CaseRecord).order_by(CaseRecord.created_at.desc()).all()
    return [
        CaseOut(
            id=c.id,
            case_id=c.case_id,
            description=c.description,
            created_at=c.created_at,
            file_count=len(c.files),
        )
        for c in cases
    ]


# ──────────────────────────────────────────────────────────────────────────────
# Query logs
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/query-logs", summary="Recent RAG query logs")
def get_query_logs(
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
):
    logs = db.query(QueryLog).order_by(QueryLog.queried_at.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "query": l.query_text,
            "databases": l.databases_queried,
            "confidence": l.confidence,
            "eval_score": l.eval_score,
            "is_helpful": l.is_helpful,
            "num_sources": l.num_sources,
            "queried_at": l.queried_at,
        }
        for l in logs
    ]


# ──────────────────────────────────────────────────────────────────────────────
# File download — serve the raw bytes stored in PostgreSQL BYTEA
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/files/{file_id}/download", summary="Download original file from PostgreSQL")
def download_file(file_id: int, db: Session = Depends(get_db)):
    """
    Streams the original file bytes stored in the BYTEA column back to the client.
    The Content-Disposition header causes most browsers to prompt a Save dialog.
    """
    row = db.query(IngestedFile).filter(IngestedFile.id == file_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="File not found.")

    if not row.file_data:
        raise HTTPException(status_code=404, detail="No binary data stored for this file.")

    mime = row.mime_type or "application/octet-stream"
    filename = row.original_filename or f"file_{file_id}"

    return Response(
        content=row.file_data,
        media_type=mime,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(row.file_data)),
        },
    )
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
import json
import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from orchestrator import RAGOrchestrator
from analytics_orchestrator import AnalyticsOrchestrator
from config.database import db_client
from config.settings import settings
from config.postgres import (
    get_db,
    IngestedFile,
    CaseRecord,
    QueryLog,
    IngestionStatus,
    TargetDB,
    FileType,
    Client,
    Case,
    CaseFile,
    PastCase,
    Law,
    ChatSessionRecord,
    ChatMessageRecord,
    AnalyticsCache,
)
from ingest_cli import ingest_file, ingest_case_file, DB_MAPPING, SUPPORTED_EXTENSIONS, MIME_MAP

router = APIRouter()


# ──────────────────────────────────────────────────────────────────────────────
# Pydantic schemas
# ──────────────────────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    query: str
    databases: Optional[List[str]] = [settings.LAW_DB_NAME, settings.CASES_DB_NAME]
    case_id: Optional[int] = None


class AnalyticsRequest(BaseModel):
    client_case_id: str
    analytic_type: str


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
# NEW Pydantic schemas for new tables
# ──────────────────────────────────────────────────────────────────────────────

class ClientOut(BaseModel):
    client_id: int
    client_name: str
    phone: Optional[str]
    address: Optional[str]
    created_at: datetime.datetime
    case_count: int

    class Config:
        from_attributes = True


class ClientCreate(BaseModel):
    client_name: str
    phone: Optional[str] = None
    address: Optional[str] = None


class CaseNewOut(BaseModel):
    case_id: int
    client_id: int
    description: Optional[str]
    created_at: datetime.datetime
    updated_at: datetime.datetime
    file_count: int

    class Config:
        from_attributes = True


class CaseCreate(BaseModel):
    client_id: int
    description: Optional[str] = None


class CaseFileOut(BaseModel):
    file_id: int
    case_id: int
    filename: str
    extension: Optional[str]
    mime_type: Optional[str]
    file_size_bytes: Optional[int]
    status: str
    chunk_count: Optional[int]
    error_message: Optional[str]
    uploaded_at: datetime.datetime
    ingested_at: Optional[datetime.datetime]

    class Config:
        from_attributes = True


class PastCaseOut(BaseModel):
    past_case_id: int
    case_name: str
    filename: Optional[str]
    extension: Optional[str]
    file_size_bytes: Optional[int]
    uploaded_at: datetime.datetime

    class Config:
        from_attributes = True


class LawOut(BaseModel):
    id: int
    law_of_country: str
    filename: Optional[str]
    extension: Optional[str]
    file_size_bytes: Optional[int]
    uploaded_at: datetime.datetime

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────────────────────────────────────
# Existing endpoints (unchanged behaviour, query log added)
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/query")
async def query_rag(request: QueryRequest, db: Session = Depends(get_db)):
    try:
        result = RAGOrchestrator.process_query(request.query, request.databases, request.case_id)

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


# ══════════════════════════════════════════════════════════════════════════════
# NEW ENDPOINTS - Client, Case, File Management
# ══════════════════════════════════════════════════════════════════════════════

# ──────────────────────────────────────────────────────────────────────────────
# Client endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/clients", response_model=List[ClientOut], summary="List all clients")
def list_clients(db: Session = Depends(get_db)):
    """Returns all client IDs for the frontend dropdown/selection."""
    clients = db.query(Client).order_by(Client.created_at.desc()).all()
    return [
        ClientOut(
            client_id=c.client_id,
            client_name=c.client_name,
            phone=c.phone,
            address=c.address,
            created_at=c.created_at,
            case_count=len(c.cases),
        )
        for c in clients
    ]


@router.post("/clients", response_model=ClientOut, summary="Create a new client")
def create_client(client_data: ClientCreate, db: Session = Depends(get_db)):
    """Create a new client record."""
    client = Client(
        client_name=client_data.client_name,
        phone=client_data.phone,
        address=client_data.address,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return ClientOut(
        client_id=client.client_id,
        client_name=client.client_name,
        phone=client.phone,
        address=client.address,
        created_at=client.created_at,
        case_count=0,
    )


@router.get("/clients/{client_id}", response_model=ClientOut, summary="Get a single client")
def get_client(client_id: int, db: Session = Depends(get_db)):
    """Get details of a specific client."""
    client = db.query(Client).filter(Client.client_id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found.")
    return ClientOut(
        client_id=client.client_id,
        client_name=client.client_name,
        phone=client.phone,
        address=client.address,
        created_at=client.created_at,
        case_count=len(client.cases),
    )


# ──────────────────────────────────────────────────────────────────────────────
# Case endpoints (linked to clients)
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/clients/{client_id}/cases", response_model=List[CaseNewOut], summary="List cases for a client")
def list_cases_for_client(client_id: int, db: Session = Depends(get_db)):
    """Returns all cases for a specific client."""
    client = db.query(Client).filter(Client.client_id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found.")
    
    return [
        CaseNewOut(
            case_id=case.case_id,
            client_id=case.client_id,
            description=case.description,
            created_at=case.created_at,
            updated_at=case.updated_at,
            file_count=len(case.files),
        )
        for case in client.cases
    ]


@router.post("/clients/{client_id}/cases", response_model=CaseNewOut, summary="Create a case for a client")
def create_case_for_client(client_id: int, case_data: CaseCreate, db: Session = Depends(get_db)):
    """Create a new case for the specified client."""
    client = db.query(Client).filter(Client.client_id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found.")
    
    case = Case(
        client_id=client_id,
        description=case_data.description,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return CaseNewOut(
        case_id=case.case_id,
        client_id=case.client_id,
        description=case.description,
        created_at=case.created_at,
        updated_at=case.updated_at,
        file_count=0,
    )


@router.get("/cases-new/{case_id}", response_model=CaseNewOut, summary="Get a specific case")
def get_case(case_id: int, db: Session = Depends(get_db)):
    """Get details of a specific case."""
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")
    return CaseNewOut(
        case_id=case.case_id,
        client_id=case.client_id,
        description=case.description,
        created_at=case.created_at,
        updated_at=case.updated_at,
        file_count=len(case.files),
    )


# ──────────────────────────────────────────────────────────────────────────────
# Case Files endpoints (files for a specific case)
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/cases-new/{case_id}/files", response_model=List[CaseFileOut], summary="List files for a case")
def list_files_for_case(case_id: int, db: Session = Depends(get_db)):
    """Returns all files associated with a specific case."""
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")
    
    return [
        CaseFileOut(
            file_id=f.file_id,
            case_id=f.case_id,
            filename=f.filename,
            extension=f.extension,
            mime_type=f.mime_type,
            file_size_bytes=f.file_size_bytes,
            status=f.status.value if hasattr(f.status, "value") else str(f.status),
            chunk_count=f.chunk_count,
            error_message=f.error_message,
            uploaded_at=f.uploaded_at,
            ingested_at=f.ingested_at,
        )
        for f in case.files
    ]


@router.get("/case-files/{file_id}/download", summary="Download a case file")
def download_case_file(file_id: int, db: Session = Depends(get_db)):
    """Download the original file from case_file_table."""
    row = db.query(CaseFile).filter(CaseFile.file_id == file_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="File not found.")
    if not row.file:
        raise HTTPException(status_code=404, detail="No binary data stored for this file.")
    
    mime = row.mime_type or "application/octet-stream"
    return Response(
        content=row.file,
        media_type=mime,
        headers={
            "Content-Disposition": f'attachment; filename="{row.filename}"',
            "Content-Length": str(len(row.file)),
        },
    )


# ──────────────────────────────────────────────────────────────────────────────
# Past Cases endpoints (historical reference - no ingestion)
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/past-cases", response_model=List[PastCaseOut], summary="List all past cases")
def list_past_cases(db: Session = Depends(get_db)):
    """Returns all historical/reference case documents."""
    past_cases = db.query(PastCase).order_by(PastCase.uploaded_at.desc()).all()
    return [
        PastCaseOut(
            past_case_id=pc.past_case_id,
            case_name=pc.case_name,
            filename=pc.filename,
            extension=pc.extension,
            file_size_bytes=pc.file_size_bytes,
            uploaded_at=pc.uploaded_at,
        )
        for pc in past_cases
    ]


@router.get("/past-cases/{past_case_id}/download", summary="Download a past case file")
def download_past_case(past_case_id: int, db: Session = Depends(get_db)):
    """Download the original file from past_case_table."""
    row = db.query(PastCase).filter(PastCase.past_case_id == past_case_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Past case not found.")
    if not row.case_file:
        raise HTTPException(status_code=404, detail="No binary data stored for this past case.")
    
    mime = row.mime_type or "application/octet-stream"
    filename = row.filename or f"past_case_{past_case_id}"
    return Response(
        content=row.case_file,
        media_type=mime,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(row.case_file)),
        },
    )


# ──────────────────────────────────────────────────────────────────────────────
# Law endpoints (constitution/law reference - no ingestion)
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/laws", response_model=List[LawOut], summary="List all law documents")
def list_laws(db: Session = Depends(get_db)):
    """Returns all law/constitution reference documents."""
    laws = db.query(Law).order_by(Law.uploaded_at.desc()).all()
    return [
        LawOut(
            id=law.id,
            law_of_country=law.law_of_country,
            filename=law.filename,
            extension=law.extension,
            file_size_bytes=law.file_size_bytes,
            uploaded_at=law.uploaded_at,
        )
        for law in laws
    ]


@router.get("/laws/{law_id}/download", summary="Download a law document")
def download_law(law_id: int, db: Session = Depends(get_db)):
    """Download the original file from law_table."""
    row = db.query(Law).filter(Law.id == law_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Law document not found.")
    if not row.constitution_file:
        raise HTTPException(status_code=404, detail="No binary data stored for this law document.")
    
    mime = row.mime_type or "application/octet-stream"
    filename = row.filename or f"law_{law_id}"
    return Response(
        content=row.constitution_file,
        media_type=mime,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(row.constitution_file)),
        },
    )


# ──────────────────────────────────────────────────────────────────────────────
# UNIFIED UPLOAD ENDPOINT - handles all file types based on 'file_type' param
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/upload-file", summary="Upload file with type-specific handling")
async def upload_file_by_type(
    file: UploadFile = File(...),
    file_type: str = Form(..., description="One of: case_file, past_case, law"),
    case_id: Optional[int] = Form(None, description="Required when file_type='case_file'"),
    case_name: Optional[str] = Form(None, description="Required when file_type='past_case'"),
    law_of_country: Optional[str] = Form(None, description="Required when file_type='law'"),
    db: Session = Depends(get_db),
):
    """
    Unified file upload endpoint that handles three file types differently:
    
    - case_file: Stored in case_file_table + runs ingestion pipeline (ChromaDB)
    - past_case: Stored in past_case_table only (NO ingestion)
    - law: Stored in law_table only (NO ingestion)
    """
    # Validate file_type
    valid_types = ["case_file", "past_case", "law"]
    if file_type not in valid_types:
        raise HTTPException(
            status_code=400, 
            detail=f"file_type must be one of {valid_types}"
        )
    
    # Validate required fields based on type
    if file_type == "case_file" and not case_id:
        raise HTTPException(status_code=400, detail="case_id is required when file_type='case_file'")
    if file_type == "past_case" and not case_name:
        raise HTTPException(status_code=400, detail="case_name is required when file_type='past_case'")
    if file_type == "law" and not law_of_country:
        raise HTTPException(status_code=400, detail="law_of_country is required when file_type='law'")
    
    # Get file info
    filename = file.filename or "upload"
    ext = os.path.splitext(filename)[1].lower()
    
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{ext}'. Allowed: {SUPPORTED_EXTENSIONS}",
        )
    
    # Read file bytes
    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read upload: {e}")
    
    mime_type = MIME_MAP.get(ext, "application/octet-stream")
    file_size = len(file_bytes)
    
    # ══════════════════════════════════════════════════════════════════════════
    # CASE_FILE: Store + Ingest (ChromaDB)
    # ══════════════════════════════════════════════════════════════════════════
    if file_type == "case_file":
        # Verify case exists
        case = db.query(Case).filter(Case.case_id == case_id).first()
        if not case:
            raise HTTPException(status_code=404, detail=f"Case with case_id={case_id} not found.")
        
        # Create CaseFile record
        case_file = CaseFile(
            case_id=case_id,
            filename=filename,
            extension=ext,
            file=file_bytes,
            mime_type=mime_type,
            file_size_bytes=file_size,
            status=IngestionStatus.pending,
        )
        db.add(case_file)
        db.commit()
        db.refresh(case_file)
        
        # Run ingestion pipeline
        result = ingest_case_file(
            file_id=case_file.file_id,
            filename=filename,
            file_bytes=file_bytes,
            case_id=case_id,
            db_session=db,
        )
        
        if result["success"]:
            return {
                "status": "success",
                "file_type": "case_file",
                "file_id": case_file.file_id,
                "filename": filename,
                "chunks": result.get("chunks", 0),
                "message": "File stored and ingested into ChromaDB",
            }
        else:
            return {
                "status": "partial",
                "file_type": "case_file",
                "file_id": case_file.file_id,
                "filename": filename,
                "message": f"File stored but ingestion failed: {result.get('error')}",
            }
    
    # ══════════════════════════════════════════════════════════════════════════
    # PAST_CASE: Store only (NO ingestion)
    # ══════════════════════════════════════════════════════════════════════════
    elif file_type == "past_case":
        past_case = PastCase(
            case_name=case_name,
            case_file=file_bytes,
            filename=filename,
            extension=ext,
            mime_type=mime_type,
            file_size_bytes=file_size,
        )
        db.add(past_case)
        db.commit()
        db.refresh(past_case)
        
        return {
            "status": "success",
            "file_type": "past_case",
            "past_case_id": past_case.past_case_id,
            "filename": filename,
            "message": "Past case file stored (no ingestion performed)",
        }
    
    # ══════════════════════════════════════════════════════════════════════════
    # LAW: Store only (NO ingestion)
    # ══════════════════════════════════════════════════════════════════════════
    elif file_type == "law":
        law = Law(
            law_of_country=law_of_country,
            constitution_file=file_bytes,
            filename=filename,
            extension=ext,
            mime_type=mime_type,
            file_size_bytes=file_size,
        )
        db.add(law)
        db.commit()
        db.refresh(law)
        
        return {
            "status": "success",
            "file_type": "law",
            "law_id": law.id,
            "filename": filename,
            "message": "Law document stored (no ingestion performed)",
        }


# ──────────────────────────────────────────────────────────────────────────────
# Analytics
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/analytics")
def run_analytics(request: AnalyticsRequest, db: Session = Depends(get_db)):
    """Generate analytics with caching in PostgreSQL."""
    # Check cache first
    cached = (
        db.query(AnalyticsCache)
        .filter_by(case_id=int(request.client_case_id) if request.client_case_id.isdigit() else 0, analytic_type=request.analytic_type)
        .order_by(AnalyticsCache.created_at.desc())
        .first()
    )
    if cached:
        sources = []
        if cached.sources_json:
            try:
                sources = json.loads(cached.sources_json)
            except Exception:
                pass
        return {
            "analytic_type": cached.analytic_type,
            "client_case_id": request.client_case_id,
            "report": cached.report,
            "sources": sources,
            "cached": True,
        }

    result = AnalyticsOrchestrator.generate_analytics(
        client_case_id=request.client_case_id,
        analytic_type=request.analytic_type,
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    # Cache the result
    try:
        cache_entry = AnalyticsCache(
            case_id=int(request.client_case_id) if request.client_case_id.isdigit() else 0,
            analytic_type=request.analytic_type,
            report=result.get("report", ""),
            sources_json=json.dumps(result.get("sources", [])),
        )
        db.add(cache_entry)
        db.commit()
    except Exception as e:
        print(f"Failed to cache analytics: {e}")
        db.rollback()

    return result


# ══════════════════════════════════════════════════════════════════════════════
# CHAT SESSION ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

class ChatMessageIn(BaseModel):
    role: str
    content: str
    ai_response_json: Optional[str] = None


class ChatSessionCreate(BaseModel):
    case_id: Optional[int] = None
    title: Optional[str] = None
    messages: List[ChatMessageIn] = []


class ChatSessionUpdate(BaseModel):
    title: Optional[str] = None
    messages: List[ChatMessageIn] = []


@router.get("/chat-sessions", summary="List chat sessions")
def list_chat_sessions(
    case_id: Optional[int] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(ChatSessionRecord).order_by(ChatSessionRecord.updated_at.desc())
    if case_id is not None:
        q = q.filter(ChatSessionRecord.case_id == case_id)
    sessions = q.limit(limit).all()
    return [
        {
            "id": s.id,
            "case_id": s.case_id,
            "title": s.title or "Untitled Chat",
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
            "message_count": len(s.messages_rel),
        }
        for s in sessions
    ]


@router.get("/chat-sessions/{session_id}", summary="Get a chat session with messages")
def get_chat_session(session_id: int, db: Session = Depends(get_db)):
    s = db.query(ChatSessionRecord).filter(ChatSessionRecord.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Chat session not found.")
    return {
        "id": s.id,
        "case_id": s.case_id,
        "title": s.title,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "ai_response_json": m.ai_response_json,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in s.messages_rel
        ],
    }


@router.post("/chat-sessions", summary="Create or update a chat session")
def upsert_chat_session(data: ChatSessionCreate, db: Session = Depends(get_db)):
    session = ChatSessionRecord(
        case_id=data.case_id,
        title=data.title or "Untitled Chat",
    )
    db.add(session)
    db.flush()

    for msg in data.messages:
        db.add(ChatMessageRecord(
            session_id=session.id,
            role=msg.role,
            content=msg.content,
            ai_response_json=msg.ai_response_json,
        ))
    db.commit()
    db.refresh(session)
    return {
        "id": session.id,
        "case_id": session.case_id,
        "title": session.title,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "updated_at": session.updated_at.isoformat() if session.updated_at else None,
        "message_count": len(session.messages_rel),
    }


@router.put("/chat-sessions/{session_id}", summary="Update a chat session")
def update_chat_session(session_id: int, data: ChatSessionUpdate, db: Session = Depends(get_db)):
    session = db.query(ChatSessionRecord).filter(ChatSessionRecord.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found.")

    if data.title is not None:
        session.title = data.title
    session.updated_at = datetime.datetime.utcnow()

    # Replace all messages
    for old_msg in session.messages_rel:
        db.delete(old_msg)
    db.flush()

    for msg in data.messages:
        db.add(ChatMessageRecord(
            session_id=session.id,
            role=msg.role,
            content=msg.content,
            ai_response_json=msg.ai_response_json,
        ))
    db.commit()
    db.refresh(session)
    return {
        "id": session.id,
        "case_id": session.case_id,
        "title": session.title,
        "updated_at": session.updated_at.isoformat() if session.updated_at else None,
        "message_count": len(session.messages_rel),
    }


@router.delete("/chat-sessions/{session_id}", summary="Delete a chat session")
def delete_chat_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(ChatSessionRecord).filter(ChatSessionRecord.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found.")
    db.delete(session)
    db.commit()
    return {"status": "deleted", "id": session_id}


# ══════════════════════════════════════════════════════════════════════════════
# ALL CASES (convenience endpoint for frontend dropdown)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/all-cases", summary="All cases with client info for dropdown")
def list_all_cases_with_clients(db: Session = Depends(get_db)):
    cases = db.query(Case).order_by(Case.created_at.desc()).all()
    return [
        {
            "case_id": c.case_id,
            "client_id": c.client_id,
            "client_name": c.client.client_name if c.client else "Unknown",
            "description": c.description,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            "file_count": len(c.files),
        }
        for c in cases
    ]


# ══════════════════════════════════════════════════════════════════════════════
# ANALYTICS CACHE MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════════

@router.delete("/analytics-cache/{case_id}", summary="Clear analytics cache for a case")
def clear_analytics_cache(case_id: int, db: Session = Depends(get_db)):
    db.query(AnalyticsCache).filter(AnalyticsCache.case_id == case_id).delete()
    db.commit()
    return {"status": "cleared", "case_id": case_id}
"""
config/postgres.py
──────────────────
PostgreSQL integration via SQLAlchemy (sync).

Tables
──────
• ingested_files  – one row per file; stores the actual binary via BYTEA
• case_records    – one row per unique client case
• query_logs      – every RAG query + evaluation score
"""

from __future__ import annotations

import datetime
import enum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Integer,
    LargeBinary,   # ← maps to BYTEA in PostgreSQL
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker

from config.settings import settings


# ──────────────────────────────────────────────────────────────────────────────
# Engine & Session
# ──────────────────────────────────────────────────────────────────────────────
engine = create_engine(
    settings.POSTGRES_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    echo=settings.DEBUG,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


# ──────────────────────────────────────────────────────────────────────────────
# Enums
# ──────────────────────────────────────────────────────────────────────────────
class TargetDB(str, enum.Enum):
    law = "law"
    cases = "cases"
    client = "client"


class IngestionStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    success = "success"
    failed = "failed"


# ──────────────────────────────────────────────────────────────────────────────
# ORM Models
# ──────────────────────────────────────────────────────────────────────────────
class CaseRecord(Base):
    """One row per unique client case."""

    __tablename__ = "case_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String(128), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )

    files = relationship(
        "IngestedFile", back_populates="case", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<CaseRecord case_id={self.case_id}>"


class IngestedFile(Base):
    """
    One row per ingested document.

    The raw file bytes are stored in `file_data` (PostgreSQL BYTEA).
    The document is fully self-contained inside the database — no dependency
    on the filesystem after ingestion.

    Column notes
    ────────────
    file_data         – raw binary content of the original file (BYTEA)
    mime_type         – e.g. "application/pdf", "application/vnd.openxmlformats…"
    original_filename – original name as uploaded / provided
    file_size_bytes   – byte length (for quick queries without loading the blob)
    stored_path       – optional on-disk path if also saved locally; NULL if DB-only
    """

    __tablename__ = "ingested_files"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # ── File identity ─────────────────────────────────────────────────────────
    original_filename = Column(String(512), nullable=False)
    mime_type = Column(String(128), nullable=True)
    file_size_bytes = Column(Integer, nullable=True)

    # ── THE ACTUAL FILE (BYTEA) ───────────────────────────────────────────────
    file_data = Column(LargeBinary, nullable=False)

    # ── Optional on-disk path (NULL when file is only in DB) ─────────────────
    stored_path = Column(String(1024), nullable=True)

    # ── Ingestion tracking ────────────────────────────────────────────────────
    target_db = Column(SAEnum(TargetDB, name="target_db_enum"), nullable=False)
    status = Column(
        SAEnum(IngestionStatus, name="ingestion_status_enum"),
        nullable=False,
        default=IngestionStatus.pending,
    )
    chunk_count = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    ingested_at = Column(DateTime, nullable=True)

    # ── Client case link (optional) ───────────────────────────────────────────
    case_record_id = Column(Integer, ForeignKey("case_records.id"), nullable=True)
    case = relationship("CaseRecord", back_populates="files")

    def __repr__(self) -> str:
        return f"<IngestedFile {self.original_filename} status={self.status}>"


class QueryLog(Base):
    """Every RAG query logged for analytics and audit."""

    __tablename__ = "query_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    query_text = Column(Text, nullable=False)
    databases_queried = Column(String(256), nullable=True)
    answer_text = Column(Text, nullable=True)
    confidence = Column(String(16), nullable=True)
    eval_score = Column(Float, nullable=True)
    is_helpful = Column(Boolean, nullable=True)
    num_sources = Column(Integer, nullable=True)
    queried_at = Column(DateTime, default=datetime.datetime.utcnow)

    def __repr__(self) -> str:
        return f"<QueryLog id={self.id} score={self.eval_score}>"


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────
def init_db() -> None:
    """Create all tables if they don't exist (idempotent)."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """
    FastAPI dependency — yields a Session and closes it on exit.

        @router.get("/x")
        def endpoint(db: Session = Depends(get_db)): ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
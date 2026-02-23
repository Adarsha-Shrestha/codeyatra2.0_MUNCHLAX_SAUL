"""
config/postgres.py
──────────────────
PostgreSQL integration via SQLAlchemy (sync).

Tables
──────
• client_table     – client information (client_id, name, phone, address, photo)
• case_table       – cases linked to clients
• case_file_table  – files for active cases (with ingestion)
• past_case_table  – historical case references (no ingestion)
• law_table        – law/constitution files (no ingestion)
• ingested_files   – one row per file; stores the actual binary via BYTEA
• case_records     – one row per unique client case (legacy)
• query_logs       – every RAG query + evaluation score
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


class FileType(str, enum.Enum):
    """Type of file being uploaded - determines processing pipeline."""
    case_file = "case_file"      # Active case files → ingestion + ChromaDB
    past_case = "past_case"      # Historical cases → storage only
    law = "law"                  # Law/constitution → storage only


# ──────────────────────────────────────────────────────────────────────────────
# NEW ORM Models (client_table, case_table, case_file_table, past_case_table, law_table)
# ──────────────────────────────────────────────────────────────────────────────

class Client(Base):
    """Client information table."""

    __tablename__ = "client_table"

    client_id = Column(Integer, primary_key=True, autoincrement=True)
    client_name = Column(String(256), nullable=False)
    phone = Column(String(32), nullable=True)
    address = Column(Text, nullable=True)
    photo = Column(LargeBinary, nullable=True)  # Client photo stored as BYTEA
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )

    # Relationship: one client has many cases
    cases = relationship("Case", back_populates="client", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Client client_id={self.client_id} name={self.client_name}>"


class Case(Base):
    """Active case linked to a client."""

    __tablename__ = "case_table"

    case_id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, ForeignKey("client_table.client_id"), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )

    # Relationships
    client = relationship("Client", back_populates="cases")
    files = relationship("CaseFile", back_populates="case", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Case case_id={self.case_id} client_id={self.client_id}>"


class CaseFile(Base):
    """Files associated with an active case - these get ingested into ChromaDB."""

    __tablename__ = "case_file_table"

    file_id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(Integer, ForeignKey("case_table.case_id"), nullable=False)
    filename = Column(String(512), nullable=False)
    extension = Column(String(16), nullable=True)
    file = Column(LargeBinary, nullable=False)  # File content as BYTEA
    mime_type = Column(String(128), nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    status = Column(
        SAEnum(IngestionStatus, name="case_file_ingestion_status_enum"),
        nullable=False,
        default=IngestionStatus.pending,
    )
    chunk_count = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    ingested_at = Column(DateTime, nullable=True)

    # Relationship
    case = relationship("Case", back_populates="files")

    def __repr__(self) -> str:
        return f"<CaseFile file_id={self.file_id} filename={self.filename}>"


class PastCase(Base):
    """Historical/reference case documents - stored only, no ingestion."""

    __tablename__ = "past_case_table"

    past_case_id = Column(Integer, primary_key=True, autoincrement=True)
    case_name = Column(String(512), nullable=False)
    case_file = Column(LargeBinary, nullable=False)  # PDF/TXT stored as BYTEA
    filename = Column(String(512), nullable=True)
    extension = Column(String(16), nullable=True)
    mime_type = Column(String(128), nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    def __repr__(self) -> str:
        return f"<PastCase past_case_id={self.past_case_id} name={self.case_name}>"


class Law(Base):
    """Law and constitution reference documents - stored only, no ingestion."""

    __tablename__ = "law_table"

    id = Column(Integer, primary_key=True, autoincrement=True)
    law_of_country = Column(String(256), nullable=False)
    constitution_file = Column(LargeBinary, nullable=False)  # PDF/TXT stored as BYTEA
    filename = Column(String(512), nullable=True)
    extension = Column(String(16), nullable=True)
    mime_type = Column(String(128), nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    def __repr__(self) -> str:
        return f"<Law id={self.id} country={self.law_of_country}>"


# ──────────────────────────────────────────────────────────────────────────────
# Legacy ORM Models (kept for backward compatibility)
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
# Chat Session / Message tables
# ──────────────────────────────────────────────────────────────────────────────
class ChatSessionRecord(Base):
    """Persisted chat sessions (one per conversation)."""

    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(Integer, nullable=True)
    title = Column(String(256), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )

    messages_rel = relationship(
        "ChatMessageRecord",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="ChatMessageRecord.created_at",
    )

    def __repr__(self) -> str:
        return f"<ChatSession id={self.id} title={self.title}>"


class ChatMessageRecord(Base):
    """Individual messages within a chat session."""

    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String(16), nullable=False)
    content = Column(Text, nullable=False)
    ai_response_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("ChatSessionRecord", back_populates="messages_rel")

    def __repr__(self) -> str:
        return f"<ChatMessage id={self.id} role={self.role}>"


# ──────────────────────────────────────────────────────────────────────────────
# Analytics cache
# ──────────────────────────────────────────────────────────────────────────────
class AnalyticsCache(Base):
    """Cached analytics results to avoid recomputing."""

    __tablename__ = "analytics_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(Integer, nullable=False)
    analytic_type = Column(String(64), nullable=False)
    report = Column(Text, nullable=False)
    sources_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    def __repr__(self) -> str:
        return f"<AnalyticsCache id={self.id} case_id={self.case_id} type={self.analytic_type}>"


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
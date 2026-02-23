"""
ingest_cli.py
─────────────
The single, unified ingestion pipeline for the Legal RAG system.

Every entry point — HTTP upload, CLI ingest, CLI file_sender — funnels
through the one public function here: ingest_file().

What ingest_file() does, in order
───────────────────────────────────
  1.  Resolve / create a CaseRecord in PostgreSQL (client DB only)
  2.  Duplicate check  — skip if same filename+target_db already succeeded
                         (override with overwrite=True)
  3.  Organise storage — copy/write file to FILE_STORAGE_DIR/<db>/<case_id>/
  4.  Register row     — write PENDING row to PostgreSQL with BYTEA file content
  5.  Parse            — extract raw text from PDF / DOCX / TXT
  6.  Metadata         — call LLM to extract structured metadata
  7.  Chunk            — split text into sections
  8.  Embed & store    — generate embeddings → ChromaDB
  9.  Mark result      — update PostgreSQL row to SUCCESS or FAILED

CLI usage
──────────
  python ingest_cli.py --db law   --file   /path/to/statute.pdf
  python ingest_cli.py --db cases --folder /path/to/case_docs/
  python ingest_cli.py --db client --file brief.docx --case-id CASE-2024-001
  python ingest_cli.py --db law   --file statute.pdf --overwrite
"""

from __future__ import annotations

import argparse
import datetime
import os

from ingestion.parser import DocumentParser
from ingestion.chunker import SectionAwareChunker
from ingestion.metadata import MetadataExtractor
from ingestion.embedder import DocumentEmbedder
from config.settings import settings
from config.postgres import (
    SessionLocal,
    IngestedFile,
    CaseRecord,
    IngestionStatus,
    TargetDB,
)


# ──────────────────────────────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────────────────────────────

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt"}

MIME_MAP = {
    ".pdf":  "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc":  "application/msword",
    ".txt":  "text/plain",
}

DB_MAPPING: dict[str, tuple[str, TargetDB]] = {
    "law":    (settings.LAW_DB_NAME,    TargetDB.law),
    "cases":  (settings.CASES_DB_NAME,  TargetDB.cases),
    "client": (settings.CLIENT_DB_NAME, TargetDB.client),
}


# ──────────────────────────────────────────────────────────────────────────────
# Private helpers
# ──────────────────────────────────────────────────────────────────────────────

def _get_or_create_case(db_session, case_id: str) -> CaseRecord:
    """Return existing CaseRecord or create a new one."""
    record = db_session.query(CaseRecord).filter_by(case_id=case_id).first()
    if not record:
        record = CaseRecord(case_id=case_id)
        db_session.add(record)
        db_session.flush()
    return record


def _is_already_ingested(db_session, filename: str, target_db: TargetDB) -> bool:
    """
    True if a file with this exact original_filename in this target_db
    was already successfully ingested.
    Matches on filename + collection so HTTP uploads (no fixed path) are caught too.
    """
    return (
        db_session.query(IngestedFile)
        .filter_by(
            original_filename=filename,
            target_db=target_db,
            status=IngestionStatus.success,
        )
        .first()
    ) is not None


def _resolve_storage_path(filename: str, target_db_key: str, case_id: str | None) -> str:
    """
    Return the full destination path inside FILE_STORAGE_DIR:
        FILE_STORAGE_DIR/law/statute.pdf
        FILE_STORAGE_DIR/client/CASE-007/brief.pdf
    Appends a timestamp suffix if the path already exists.
    """
    dest_dir = os.path.join(settings.FILE_STORAGE_DIR, target_db_key)
    if case_id:
        dest_dir = os.path.join(dest_dir, case_id)
    os.makedirs(dest_dir, exist_ok=True)

    dest_path = os.path.join(dest_dir, filename)
    if os.path.exists(dest_path):
        ts = datetime.datetime.utcnow().strftime("%Y%m%d%H%M%S")
        name, ext = os.path.splitext(filename)
        dest_path = os.path.join(dest_dir, f"{name}_{ts}{ext}")

    return dest_path


def _register_pg_row(
    db_session,
    original_filename: str,
    dest_path: str,
    file_bytes: bytes,
    target_db: TargetDB,
    case_record: CaseRecord | None,
) -> IngestedFile:
    """
    Insert an IngestedFile row (status=PENDING) with the raw file bytes
    stored in the PostgreSQL BYTEA column.  Flushes but does not commit.
    """
    ext = os.path.splitext(original_filename)[1].lower()
    row = IngestedFile(
        original_filename=original_filename,
        stored_path=dest_path,
        mime_type=MIME_MAP.get(ext, "application/octet-stream"),
        file_size_bytes=len(file_bytes),
        file_data=file_bytes,           # ← raw file stored in PostgreSQL BYTEA
        target_db=target_db,
        status=IngestionStatus.pending,
        case_record_id=case_record.id if case_record else None,
    )
    db_session.add(row)
    db_session.flush()
    return row


# ──────────────────────────────────────────────────────────────────────────────
# PUBLIC — unified pipeline called by every entry point
# ──────────────────────────────────────────────────────────────────────────────

def ingest_file(
    original_filename: str,
    target_db_key: str,
    file_bytes: bytes | None = None,
    src_path: str | None = None,
    case_id: str | None = None,
    overwrite: bool = False,
) -> dict:
    """
    The single ingestion function used by ALL callers:

        POST /api/upload  →  passes file_bytes (bytes already in memory)
        ingest_cli CLI    →  passes src_path   (reads bytes from disk)
        file_sender CLI   →  passes src_path   (reads bytes from disk)

    Pipeline
    ────────
      1. Read bytes (from memory or disk)
      2. Duplicate check against PostgreSQL  — skip if already succeeded
      3. Write file to FILE_STORAGE_DIR/<db>/<case_id>/
      4. Insert PENDING row + raw bytes (BYTEA) into PostgreSQL
      5. Parse text from file
      6. LLM metadata extraction
      7. Chunk text
      8. Embed chunks → ChromaDB
      9. Mark row SUCCESS or FAILED in PostgreSQL

    Returns
    ───────
        {
            "success": bool,
            "chunks":  int,
            "error":   str | None,
            "file_id": int | None,   # PostgreSQL row id
            "skipped": bool,         # True when duplicate was detected
        }
    """
    # ── 1. Resolve bytes ──────────────────────────────────────────────────────
    if file_bytes is None:
        if src_path is None:
            return {
                "success": False, "chunks": 0,
                "error": "Must supply file_bytes or src_path.",
                "file_id": None, "skipped": False,
            }
        with open(src_path, "rb") as fh:
            file_bytes = fh.read()

    if target_db_key not in DB_MAPPING:
        return {
            "success": False, "chunks": 0,
            "error": f"Unknown target_db_key '{target_db_key}'. Choose from {list(DB_MAPPING)}.",
            "file_id": None, "skipped": False,
        }

    target_db_name, target_db_enum = DB_MAPPING[target_db_key]
    db_session = SessionLocal()

    try:
        # ── 2. Case record (client DB only) ───────────────────────────────────
        case_record = None
        if case_id:
            case_record = _get_or_create_case(db_session, case_id)

        # ── 3. Duplicate check ────────────────────────────────────────────────
        if not overwrite and _is_already_ingested(db_session, original_filename, target_db_enum):
            print(f"  ⚠  '{original_filename}' already ingested in '{target_db_key}' — skipping.")
            return {"success": True, "chunks": 0, "error": None, "file_id": None, "skipped": True}

        # ── 4. Organise on-disk storage ───────────────────────────────────────
        dest_path = _resolve_storage_path(original_filename, target_db_key, case_id)
        with open(dest_path, "wb") as fh:
            fh.write(file_bytes)
        print(f"  Saved to disk → {dest_path}")

        # ── 5. Register PENDING row in PostgreSQL + store BYTEA ───────────────
        file_row = _register_pg_row(
            db_session, original_filename, dest_path,
            file_bytes, target_db_enum, case_record,
        )
        file_row.status = IngestionStatus.processing
        db_session.commit()
        print(f"  Registered in PostgreSQL (file_id={file_row.id}, {len(file_bytes):,} bytes)")

        # ── 6. Parse text ─────────────────────────────────────────────────────
        text = DocumentParser.parse_file(dest_path)
        if not text.strip():
            raise ValueError("Extracted text is empty after parsing.")

        # ── 7. LLM metadata extraction ────────────────────────────────────────
        extracted_meta = MetadataExtractor.extract_with_llm(text, settings.JUDGE_MODEL)
        manual_meta: dict = {"source_file": original_filename}
        if case_id:
            manual_meta["client_case_id"] = case_id
        final_meta = MetadataExtractor.merge_metadata(extracted_meta, manual_meta)

        # ── 8. Chunk ──────────────────────────────────────────────────────────
        chunks = SectionAwareChunker.chunk_document(text, doc_type=target_db_name)
        print(f"  Created {len(chunks)} chunks")

        # ── 9. Embed & store → ChromaDB ───────────────────────────────────────
        DocumentEmbedder.embed_and_store(chunks, target_db_name, final_meta)

        # ── 10. Mark SUCCESS in PostgreSQL ────────────────────────────────────
        file_row.status = IngestionStatus.success
        file_row.chunk_count = len(chunks)
        file_row.ingested_at = datetime.datetime.utcnow()
        db_session.commit()

        return {
            "success": True,
            "chunks": len(chunks),
            "error": None,
            "file_id": file_row.id,
            "skipped": False,
        }

    except Exception as exc:
        db_session.rollback()
        try:
            if "file_row" in locals():
                file_row.status = IngestionStatus.failed
                file_row.error_message = str(exc)[:1024]
                db_session.commit()
        except Exception:
            db_session.rollback()
        return {"success": False, "chunks": 0, "error": str(exc), "file_id": None, "skipped": False}

    finally:
        db_session.close()


# ──────────────────────────────────────────────────────────────────────────────
# PUBLIC — ingestion for CaseFile (new case_file_table)
# ──────────────────────────────────────────────────────────────────────────────

def ingest_case_file(
    file_id: int,
    filename: str,
    file_bytes: bytes,
    case_id: int,
    db_session,
) -> dict:
    """
    Ingest a case file from the new case_file_table into ChromaDB.
    
    This is called by the /upload-file endpoint when file_type='case_file'.
    The file is already stored in the database, this function only handles
    the parsing, chunking, and embedding into ChromaDB.
    
    Parameters
    ──────────
        file_id    : ID of the CaseFile record
        filename   : Original filename
        file_bytes : Raw file content
        case_id    : ID of the parent Case
        db_session : Active SQLAlchemy session
    
    Returns
    ───────
        {
            "success": bool,
            "chunks":  int,
            "error":   str | None,
        }
    """
    from config.postgres import CaseFile, IngestionStatus
    
    try:
        # Get the CaseFile record
        case_file = db_session.query(CaseFile).filter(CaseFile.file_id == file_id).first()
        if not case_file:
            return {"success": False, "chunks": 0, "error": f"CaseFile {file_id} not found"}
        
        # Update status to processing
        case_file.status = IngestionStatus.processing
        db_session.commit()
        
        # Save to temporary file for parsing
        ext = os.path.splitext(filename)[1].lower()
        temp_path = os.path.join(settings.FILE_STORAGE_DIR, f"temp_{file_id}{ext}")
        os.makedirs(os.path.dirname(temp_path), exist_ok=True)
        
        with open(temp_path, "wb") as f:
            f.write(file_bytes)
        
        try:
            # ── Parse text ────────────────────────────────────────────────────
            text = DocumentParser.parse_file(temp_path)
            if not text.strip():
                raise ValueError("Extracted text is empty after parsing.")
            
            # ── LLM metadata extraction ───────────────────────────────────────
            extracted_meta = MetadataExtractor.extract_with_llm(text, settings.JUDGE_MODEL)
            manual_meta: dict = {
                "source_file": filename,
                "case_file_id": file_id,
                "case_id": case_id,
            }
            final_meta = MetadataExtractor.merge_metadata(extracted_meta, manual_meta)
            
            # ── Chunk ─────────────────────────────────────────────────────────
            target_db_name = settings.CLIENT_DB_NAME
            chunks = SectionAwareChunker.chunk_document(text, doc_type=target_db_name)
            print(f"  Created {len(chunks)} chunks for case_file_id={file_id}")
            
            # ── Embed & store → ChromaDB ──────────────────────────────────────
            DocumentEmbedder.embed_and_store(chunks, target_db_name, final_meta)
            
            # ── Mark SUCCESS ──────────────────────────────────────────────────
            case_file.status = IngestionStatus.success
            case_file.chunk_count = len(chunks)
            case_file.ingested_at = datetime.datetime.utcnow()
            db_session.commit()
            
            return {
                "success": True,
                "chunks": len(chunks),
                "error": None,
            }
        
        finally:
            # Cleanup temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)
    
    except Exception as exc:
        db_session.rollback()
        try:
            if "case_file" in locals() and case_file:
                case_file.status = IngestionStatus.failed
                case_file.error_message = str(exc)[:1024]
                db_session.commit()
        except Exception:
            db_session.rollback()
        return {"success": False, "chunks": 0, "error": str(exc)}


# ──────────────────────────────────────────────────────────────────────────────
# CLI entry point
# ──────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description=(
            "Ingest legal documents into ChromaDB + PostgreSQL.\n"
            "Stores the raw file in BYTEA, vectors in ChromaDB."
        )
    )
    parser.add_argument("--db", required=True, choices=["law", "cases", "client"],
                        help="Target collection.")
    parser.add_argument("--file",   type=str, help="Path to a single file.")
    parser.add_argument("--folder", type=str, help="Path to a folder of files (recursive).")
    parser.add_argument("--case-id", type=str, default=None,
                        help="Client case ID (required when --db=client).")
    parser.add_argument("--overwrite", action="store_true",
                        help="Re-ingest even if already successfully processed.")
    args = parser.parse_args()

    if args.db == "client" and not args.case_id:
        print("Error: --case-id is required when --db is 'client'.")
        return

    files_to_process: list[str] = []
    if args.file:
        files_to_process.append(args.file)
    elif args.folder:
        for root, _, files in os.walk(args.folder):
            for fname in files:
                if os.path.splitext(fname)[1].lower() in SUPPORTED_EXTENSIONS:
                    files_to_process.append(os.path.join(root, fname))
    else:
        print("Error: Must specify --file or --folder.")
        return

    if not files_to_process:
        print("No supported files found.")
        return

    success_count = skipped_count = fail_count = 0

    for fp in files_to_process:
        print(f"\n▶  {fp}")
        result = ingest_file(
            original_filename=os.path.basename(fp),
            target_db_key=args.db,
            src_path=fp,
            case_id=args.case_id,
            overwrite=args.overwrite,
        )
        if result["skipped"]:
            skipped_count += 1
        elif result["success"]:
            print(f"  ✔ Success — {result['chunks']} chunks | file_id={result['file_id']}")
            success_count += 1
        else:
            print(f"  ✘ Failed  — {result['error']}")
            fail_count += 1

    total = len(files_to_process)
    print(f"\n{'─'*52}")
    print(f"  Done. ✔ {success_count}  ⚠ {skipped_count} skipped  ✘ {fail_count}  of {total}")
    print(f"{'─'*52}")


if __name__ == "__main__":
    main()
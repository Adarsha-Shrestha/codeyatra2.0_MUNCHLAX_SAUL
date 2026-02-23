"""
Fast client-case ingestion that skips LLM metadata extraction.
Usage: python ingest_client_direct.py --case-id 001 --folder data/docs/client_cases/case-001
"""
import argparse
import os
import sys

# Ensure project root is on path
sys.path.insert(0, os.path.dirname(__file__))

from ingestion.parser import DocumentParser
from ingestion.chunker import SectionAwareChunker
from ingestion.embedder import DocumentEmbedder
from config.settings import settings


def main():
    parser = argparse.ArgumentParser(description="Fast client case ingestion (no LLM metadata)")
    parser.add_argument("--case-id", required=True, help="Client case ID (e.g. 001)")
    parser.add_argument("--folder", required=True, help="Folder containing the case documents")
    args = parser.parse_args()

    folder = args.folder
    case_id = args.case_id

    if not os.path.isdir(folder):
        print(f"Error: folder not found: {folder}")
        sys.exit(1)

    files = []
    for root, _, filenames in os.walk(folder):
        for fname in filenames:
            if os.path.splitext(fname)[1].lower() in {".pdf", ".docx", ".doc", ".txt"}:
                files.append(os.path.join(root, fname))

    if not files:
        print(f"No supported files found in {folder}")
        sys.exit(1)

    for file_path in files:
        print(f"Ingesting: {file_path}")

        try:
            text = DocumentParser.parse_file(file_path)
            if not text.strip():
                print(f"  Warning: empty text, skipping.")
                continue
        except Exception as e:
            print(f"  Failed to parse: {e}")
            continue

        # Build metadata manually — no LLM call
        common_meta = {
            "client_case_id": case_id,
            "source_file": os.path.basename(file_path),
            "source_title": os.path.splitext(os.path.basename(file_path))[0],
            "doc_type": "client_case",
        }

        chunks = SectionAwareChunker.chunk_document(text, doc_type=settings.CLIENT_DB_NAME)
        print(f"  Created {len(chunks)} chunks.")

        DocumentEmbedder.embed_and_store(chunks, settings.CLIENT_DB_NAME, common_meta)
        print(f"  Done: {file_path}")

    print("\nIngestion complete.")


if __name__ == "__main__":
    main()

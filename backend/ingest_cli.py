import argparse
import os
from ingestion.parser import DocumentParser
from ingestion.chunker import SectionAwareChunker
from ingestion.metadata import MetadataExtractor
from ingestion.embedder import DocumentEmbedder
from config.settings import settings

def main():
    parser = argparse.ArgumentParser(description="Ingest legal documents into the RAG system")
    parser.add_argument("--db", type=str, required=True, choices=["law", "cases", "client"], help="Target database")
    parser.add_argument("--file", type=str, help="Path to a single file to ingest")
    parser.add_argument("--folder", type=str, help="Path to a folder of files to ingest")
    parser.add_argument("--case-id", type=str, help="Client case ID (required if db is client)", default=None)
    
    args = parser.parse_args()
    
    db_mapping = {
        "law": settings.LAW_DB_NAME,
        "cases": settings.CASES_DB_NAME,
        "client": settings.CLIENT_DB_NAME
    }
    
    target_db = db_mapping[args.db]
    
    if args.db == "client" and not args.case_id:
        print("Error: --case-id is required when ingesting to client DB.")
        return
        
    files_to_process = []
    if args.file:
        files_to_process.append(args.file)
    elif args.folder:
        for root, _, files in os.walk(args.folder):
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in [".pdf", ".docx", ".doc", ".txt"]:
                    files_to_process.append(os.path.join(root, file))
    else:
        print("Error: Must specify either --file or --folder.")
        return
        
    for file_path in files_to_process:
        print(f"Ingesting: {file_path}")
        
        # 1. Parse
        try:
            text = DocumentParser.parse_file(file_path)
            if not text.strip():
                print(f"Warning: Extracted text is empty for {file_path}")
                continue
        except Exception as e:
            print(f"Failed to parse {file_path}: {e}")
            continue
            
        # 2. Extract Metadata
        # Adjust model name for metadata extraction vs judge depending on setup
        extracted_meta = MetadataExtractor.extract_with_llm(text, settings.JUDGE_MODEL)
        
        manual_meta = {
            "source_file": os.path.basename(file_path)
        }
        if args.case_id:
            manual_meta["client_case_id"] = args.case_id
            
        final_meta = MetadataExtractor.merge_metadata(extracted_meta, manual_meta)
        
        # 3. Chunk
        chunks = SectionAwareChunker.chunk_document(text, doc_type=target_db)
        print(f"Created {len(chunks)} chunks.")
        
        # 4. Embed and Store
        DocumentEmbedder.embed_and_store(chunks, target_db, final_meta)
        print(f"Successfully ingested {file_path}")
        
if __name__ == "__main__":
    main()

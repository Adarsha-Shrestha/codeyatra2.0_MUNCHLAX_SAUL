



Claim offer
This is a copy of a conversation between ChatGPT & Anonymous.

Report conversation
You said:
Explain each and every section of this codebase in detail form the beginning to the end of the prcoess, think step by step, dont miss out key detials
================================================
FILE: README.md
================================================
# CodeYatra 2.0
CodeYatra 2.0 is a hackathon conducted by Himalayan College of Engineering. Conducted on 2/22/2026. 

## Team Members
- Aadarsha Shrestha 
- Rohan Singh
- Niraj Nath
- Shailaj Dhahal

## Project Theme 
- 

## Project Title 
- 

## Project Objective
- 


================================================
FILE: analytics_orchestrator.py
================================================
from typing import Dict, Any, List
import ollama
from retrieval.search import QuerySearcher
from retrieval.ranker import ResultRanker
from generation.prompts import AnalyticType, get_analytics_prompt
from config.settings import settings
from config.database import db_client

class AnalyticsOrchestrator:
    @staticmethod
    def generate_analytics(client_case_id: str, analytic_type: str) -> Dict[str, Any]:
        # 1. Fetch Subject (Client Case)
        client_db = db_client.get_client_db()
        try:
            results = client_db.get(
                where={"client_case_id": client_case_id},
                include=["documents", "metadatas"]
            )
        except Exception as e:
            return {"error": f"Failed to query client database: {e}"}

        if not results or not results.get("documents") or not results["documents"]:
            return {"error": f"No documents found for client_case_id: {client_case_id}"}

        # Combine all parts of the client case if chunked
        client_case_text = "\n".join(results["documents"])
        
        # 2. Retrieve Context (Law and Past Cases)
        # For the query, we use a truncated version of the case text or just the first chunk
        search_query = results["documents"][0][:1000] 
        db_names = [settings.LAW_DB_NAME, settings.CASES_DB_NAME]
        
        raw_results = QuerySearcher.search(search_query, db_names=db_names, top_k=7)
        ranked_results = ResultRanker.rank_and_filter(raw_results)
        
        assembled_context = ResultRanker.assemble_context(ranked_results)
        
        # 3. Prompt Construction
        try:
            analytic_enum = AnalyticType(analytic_type)
        except ValueError:
            return {"error": f"Invalid analytic_type: {analytic_type}. Must be one of {[e.value for e in AnalyticType]}"}
            
        system_prompt = get_analytics_prompt(analytic_enum)
        
        user_prompt = f"""CLIENT CASE FACTS:
{client_case_text}

RELEVANT LAW AND PAST CASES:
{assembled_context}
"""

        # 4. Generation
        try:
            response = ollama.chat(
                model=settings.GENERATION_MODEL,
                messages=[
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': user_prompt}
                ]
            )
            response_text = response.get('message', {}).get('content', '')
        except Exception as e:
            print(f"Error generating analytics response: {e}")
            return {"error": "Could not generate response from LLM."}

        # Format sources
        formatted_sources = []
        for i, src in enumerate(ranked_results[:5]):
            meta = src.get("metadata", {})
            formatted_sources.append({
                "id": i + 1,
                "title": meta.get("source_title", meta.get("title", meta.get("source_file", "Unknown"))),
                "date": meta.get("date", meta.get("effective_date", "Unknown")),
                "type": meta.get("doc_type", "Document")
            })

        return {
            "analytic_type": analytic_enum.value,
            "client_case_id": client_case_id,
            "report": response_text,
            "sources": formatted_sources
        }



================================================
FILE: ingest_cli.py
================================================
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



================================================
FILE: orchestrator.py
================================================
from typing import List, Dict, Any
from retrieval.search import QuerySearcher
from retrieval.ranker import ResultRanker
from generation.llm import GeneratorLLM
from evaluation.judge import EvaluatorJudge
from config.settings import settings

class RAGOrchestrator:
    @staticmethod
    def process_query(query: str, db_names: List[str] = None) -> Dict[str, Any]:
        """Runs the full RAG pipeline: retrieval, generation, evaluation, and retry loop."""
        if db_names is None:
            db_names = [settings.LAW_DB_NAME, settings.CASES_DB_NAME, settings.CLIENT_DB_NAME]
            
        # 1. Retrieval
        raw_results = QuerySearcher.search(query, db_names=db_names)
        ranked_results = ResultRanker.rank_and_filter(raw_results)
        
        if not ranked_results:
            return RAGOrchestrator.format_response("No relevant context found in the database.", [], low_confidence=True)
            
        context = ResultRanker.assemble_context(ranked_results)
        
        # 2. Generation & Evaluation Loop
        attempts = []
        previous_feedback = ""
        
        for attempt in range(settings.MAX_RETRIES):
            print(f"Generation attempt {attempt + 1}...")
            response_text = GeneratorLLM.generate(query, context, previous_feedback)
            evaluation = EvaluatorJudge.evaluate(query, context, response_text)
            
            attempts.append({"response": response_text, "score": evaluation["score"], "eval": evaluation})
            
            if evaluation["score"] >= 7 or evaluation["is_helpful"]:
                return RAGOrchestrator.format_response(response_text, ranked_results, evaluation=evaluation)
                
            previous_feedback = evaluation.get("suggestion", "Provide a more accurate and grounded response.")
            
        # 3. All retries exhausted
        best_attempt = max(attempts, key=lambda x: x["score"])
        return RAGOrchestrator.format_response(
            best_attempt["response"], 
            ranked_results, 
            low_confidence=True, 
            evaluation=best_attempt["eval"]
        )
        
    @staticmethod
    def format_response(answer: str, sources: List[Dict[str, Any]], low_confidence: bool = False, evaluation: Dict[str, Any] = None) -> Dict[str, Any]:
        """Formats the final response payload."""
        formatted_sources = []
        for i, src in enumerate(sources[:5]):
            meta = src.get("metadata", {})
            formatted_sources.append({
                "id": i + 1,
                "title": meta.get("source_title", meta.get("title", meta.get("source_file", "Unknown"))),
                "date": meta.get("date", meta.get("effective_date", "Unknown")),
                "type": meta.get("doc_type", "Document")
            })
            
        confidence = "High" if not low_confidence else "Low"
        
        response = {
            "answer": answer,
            "sources": formatted_sources,
            "confidence": confidence,
        }
        
        if low_confidence:
            response["note"] = "Response quality below threshold after maximum retries."
            
        if evaluation:
            response["evaluation_metrics"] = evaluation
            
        return response



================================================
FILE: requirements.txt
================================================
chromadb
ollama
langchain
pypdf
python-docx
pytesseract
fastapi
uvicorn
pydantic
pydantic-settings
python-dotenv
rank_bm25



================================================
FILE: config/database.py
================================================
import os
import chromadb
from chromadb.config import Settings
from config.settings import settings

class DatabaseClient:
    def __init__(self):
        # Ensure the persistent directory exists
        os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
        
        self.client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
        
        # Initialize collections
        self.law_db = self.client.get_or_create_collection(
            name=settings.LAW_DB_NAME,
            metadata={"description": "Law & Reference Database"}
        )
        
        self.cases_db = self.client.get_or_create_collection(
            name=settings.CASES_DB_NAME,
            metadata={"description": "Past Cases & Case History Database"}
        )
        
        self.client_db = self.client.get_or_create_collection(
            name=settings.CLIENT_DB_NAME,
            metadata={"description": "Individual Client Cases Database"}
        )

    def get_law_db(self):
        return self.law_db
        
    def get_cases_db(self):
        return self.cases_db
        
    def get_client_db(self):
        return self.client_db

# Singleton instance
db_client = DatabaseClient()



================================================
FILE: config/settings.py
================================================
import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "Legal Intelligence System"
    DEBUG: bool = True
    
    # Ollama Settings
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    EMBEDDING_MODEL: str = "mxbai-embed-large:latest"
    GENERATION_MODEL: str = "deepseek-r1:7b-qwen-distill-q4_K_M"
    JUDGE_MODEL: str = "deepseek-r1:7b-qwen-distill-q4_K_M"
    
    # DB Settings
    CHROMA_PERSIST_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "chroma")
    
    # Collections
    LAW_DB_NAME: str = "law_reference_db"
    CASES_DB_NAME: str = "case_history_db"
    CLIENT_DB_NAME: str = "client_cases_db"
    
    # Generation settings
    MAX_RETRIES: int = 3
    SIMILARITY_THRESHOLD: float = 0.75
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()



================================================
FILE: evaluation/judge.py
================================================
import json
import ollama
from typing import Dict, Any
from config.settings import settings

class EvaluatorJudge:
    @staticmethod
    def evaluate(query: str, context: str, response: str) -> Dict[str, Any]:
        """Evaluates a generated response using a judge LLM."""
        
        prompt = f"""Evaluate the following legal AI response. Return ONLY valid JSON, no other text.

Original Question: {query}
Retrieved Context: {context}
Generated Response: {response}

Return EXACTLY this JSON format:
{{
  "score": <int 1-10>,
  "is_helpful": <bool>,
  "is_grounded": <bool>,
  "hallucination_detected": <bool>,
  "reason": "<brief explanation>",
  "suggestion": "<how to improve if score < 7>"
}}
"""
        try:
            res = ollama.chat(
                model=settings.JUDGE_MODEL,
                messages=[{'role': 'user', 'content': prompt}],
                format='json'
            )
            content = res.get('message', {}).get('content', '{}')
            evaluation = json.loads(content)
            
            # Ensure defaults
            if "score" not in evaluation:
                evaluation["score"] = 5
            if "is_helpful" not in evaluation:
                evaluation["is_helpful"] = False
            if "suggestion" not in evaluation:
                evaluation["suggestion"] = ""
                
            return evaluation
        except Exception as e:
            print(f"Error evaluating response: {e}")
            return {
                "score": 5, 
                "is_helpful": True, 
                "is_grounded": True, 
                "hallucination_detected": False, 
                "reason": "Evaluation failed, assuming ok.", 
                "suggestion": ""
            }



================================================
FILE: generation/llm.py
================================================
import ollama
from config.settings import settings

class GeneratorLLM:
    @staticmethod
    def generate(query: str, assembled_context: str, previous_feedback: str = "") -> str:
        """Generates an answer to the legal query using context."""
        
        system_prompt = """You are a legal research assistant. Answer the user's question using ONLY
the provided legal context. Cite your sources explicitly using [SOURCE N].
If the context does not contain sufficient information, say so clearly.
Do not speculate or add information not present in the context.
"""
        prompt = f"""CONTEXT:
{assembled_context}

QUESTION:
{query}
"""
        if previous_feedback:
            prompt += f"\nPREVIOUS FEEDBACK TO FIX:\n{previous_feedback}\n"

        try:
            response = ollama.chat(
                model=settings.GENERATION_MODEL,
                messages=[
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': prompt}
                ]
            )
            return response.get('message', {}).get('content', '')
        except Exception as e:
            print(f"Error generating response: {e}")
            return "Error: Could not generate response."



================================================
FILE: generation/prompts.py
================================================
from enum import Enum

class AnalyticType(str, Enum):
    CHECKLIST = "checklist"
    GAP_ANALYSIS = "gap_analysis"
    ARGUMENT_MAPPING = "argument_mapping"
    RISK_ASSESSMENT = "risk_assessment"
    COMPLIANCE_TRACKER = "compliance_tracker"


ANALYTICS_PROMPTS = {
    AnalyticType.CHECKLIST: """You are an expert legal assistant. Create a Strategic To-Do List & Procedural Checklist.
Review the provided CLIENT CASE FACTS, and cross-reference them with the provided RELEVANT LAW and PAST CASES.
Identify the current status of the client's case.
Generate a strictly formatted checklist of mandatory procedural steps, deadlines, and filings the lawyer must complete.
Provide explicit citations to the provided legal documents (e.g. [Law Document 1], [Case 2]) for each requirement.

Output in clear Markdown format with headings and bullet points. Never hallucinate facts outside the provided context.""",

    AnalyticType.GAP_ANALYSIS: """You are an expert legal assistant. Perform an Information & Evidence Gap Analysis.
Review the provided CLIENT CASE FACTS, and cross-reference them with the provided RELEVANT LAW and PAST CASES.
Compare the current evidence in the client's file against the legal burden of proof required for their specific charges/claims based on statutes and past case outcomes.
Highlight weaknesses in the case and explicitly state what evidence is missing or weak compared to successful past cases.
Provide explicit citations to the provided legal documents (e.g. [Law Document 1], [Case 2]).

Output in clear Markdown format with headings and bullet points. Never hallucinate facts outside the provided context.""",

    AnalyticType.ARGUMENT_MAPPING: """You are an expert legal assistant. Perform a Precedent Argument & Vulnerability Mapping.
Review the provided CLIENT CASE FACTS, and cross-reference them with the provided RELEVANT LAW and PAST CASES.
Identify the most similar past cases from the context.
Map out the successful arguments used by the winning side in those past cases, and identify vulnerabilities in the current client's fact pattern.
Help the lawyer draft their arguments by mimicking successful past strategies and preparing defenses for expected counter-arguments.
Provide explicit citations to the provided legal documents (e.g. [Law Document 1], [Case 2]).

Output in clear Markdown format with headings and bullet points. Never hallucinate facts outside the provided context.""",

    AnalyticType.RISK_ASSESSMENT: """You are an expert legal assistant. Perform a Risk Assessment & Settlement Calculator analysis.
Review the provided CLIENT CASE FACTS, and cross-reference them with the provided RELEVANT LAW and PAST CASES.
Evaluate the severity of the facts against similar past rulings.
Output a qualitative probability of success at trial versus the benefits of settlement/plea deal based on the precedents. Provide a data-backed recommendation for advising the client on whether to proceed to trial or negotiate.
Provide explicit citations to the provided legal documents (e.g. [Law Document 1], [Case 2]).

Output in clear Markdown format with headings and bullet points. Never hallucinate facts outside the provided context.""",

    AnalyticType.COMPLIANCE_TRACKER: """You are an expert legal assistant. Create a Statute of Limitations & Compliance Tracker.
Review the provided CLIENT CASE FACTS, and cross-reference them with the provided RELEVANT LAW and PAST CASES.
Specifically scan all dates mentioned in the client document and flag any approaching statutory deadlines, expired claims, or compliance requirements.
Be explicit about what dates matter and why, referring to the provided law.
Provide explicit citations to the provided legal documents (e.g. [Law Document 1], [Case 2]).

Output in clear Markdown format with headings and bullet points. Never hallucinate facts outside the provided context."""
}

def get_analytics_prompt(analytic_type: AnalyticType) -> str:
    return ANALYTICS_PROMPTS.get(analytic_type, "You are a helpful legal assistant.")



================================================
FILE: ingestion/chunker.py
================================================
import re
from typing import List, Dict, Any

class SectionAwareChunker:
    """Chunks documents based on structural markers."""
    
    @staticmethod
    def chunk_by_tokens(text: str, chunk_size: int = 512, overlap: int = 50) -> List[Dict[str, Any]]:
        """Fallback chunker if no structural markers are found."""
        # Simple word-based chunking for demonstration purposes
        words = text.split()
        chunks = []
        for i in range(0, len(words), chunk_size - overlap):
            chunk_text = " ".join(words[i:i + chunk_size])
            chunks.append({
                "text": chunk_text,
                "metadata": {
                    "chunk_type": "text",
                }
            })
            if i + chunk_size >= len(words):
                break
                
        # Update metadata indices
        for idx, chunk in enumerate(chunks):
            chunk["metadata"]["chunk_index"] = idx + 1
            chunk["metadata"]["chunk_total"] = len(chunks)
            
        return chunks

    @staticmethod
    def chunk_law_document(text: str) -> List[Dict[str, Any]]:
        """
        Splits by Article, Section.
        Regex matches 'Article X' or 'Section Y'
        """
        # Split by "Article" or "Section"
        pattern = r"(?i)(?=Article\s+\d+|Section\s+\d+)"
        sections = re.split(pattern, text)
        sections = [s.strip() for s in sections if s.strip()]
        
        chunks = []
        for idx, sec in enumerate(sections):
            chunks.append({
                "text": sec,
                "metadata": {
                    "chunk_type": "law_section",
                    "chunk_index": idx + 1,
                    "chunk_total": len(sections)
                }
            })
            
        return chunks if chunks else SectionAwareChunker.chunk_by_tokens(text)

    @staticmethod
    def chunk_document(text: str, doc_type: str = "general") -> List[Dict[str, Any]]:
        if doc_type == "law_reference_db":
            return SectionAwareChunker.chunk_law_document(text)
        else:
            # For cases and clients, fall back to simple chunking for now
            return SectionAwareChunker.chunk_by_tokens(text)



================================================
FILE: ingestion/embedder.py
================================================
import uuid
from typing import List, Dict, Any
import ollama
from config.database import db_client
from config.settings import settings

class DocumentEmbedder:
    @staticmethod
    def embed_and_store(chunks: List[Dict[str, Any]], db_name: str, common_metadata: Dict[str, Any]):
        """Generates embeddings and stores in the appropriate ChromaDB collection."""
        
        if db_name == settings.LAW_DB_NAME:
            collection = db_client.get_law_db()
        elif db_name == settings.CASES_DB_NAME:
            collection = db_client.get_cases_db()
        elif db_name == settings.CLIENT_DB_NAME:
            collection = db_client.get_client_db()
        else:
            raise ValueError(f"Unknown DB: {db_name}")

        for chunk in chunks:
            text = chunk["text"]
            # Combine chunk specific metadata with common document metadata
            meta = {**common_metadata, **chunk.get("metadata", {})}
            
            # Ensure metadata values are str, int, float, or bool for ChromaDB
            clean_meta = {}
            for k, v in meta.items():
                if isinstance(v, (str, int, float, bool)):
                    clean_meta[k] = v
                elif isinstance(v, list):
                    clean_meta[k] = ", ".join([str(x) for x in v])
                elif v is None:
                    clean_meta[k] = "None"
                else:
                    clean_meta[k] = str(v)

            try:
                # Generate embedding
                response = ollama.embeddings(model=settings.EMBEDDING_MODEL, prompt=text)
                embedding = response.get('embedding')
                
                if embedding:
                    # Generate a unique ID for the chunk (can be deterministic if needed)
                    doc_id = str(uuid.uuid4())
                    
                    collection.upsert(
                        ids=[doc_id],
                        embeddings=[embedding],
                        documents=[text],
                        metadatas=[clean_meta]
                    )
            except Exception as e:
                print(f"Error embedding/storing chunk: {e}")



================================================
FILE: ingestion/metadata.py
================================================
import json
import ollama
from typing import Dict, Any

class MetadataExtractor:
    @staticmethod
    def extract_with_llm(text: str, model_name: str = "llama3.2") -> Dict[str, Any]:
        """Uses Ollama to extract metadata from the first page of a document."""
        prompt = f"""Extract the following fields from this legal document header and return as JSON:
title, date, court, judge (list), plaintiff (list), plaintiff_atty (list),
defendant (list), defendant_atty (list), case_type, subject_tags (list of keywords).

Document:
{text[:2000]}
"""
        try:
            response = ollama.chat(
                model=model_name,
                messages=[{'role': 'user', 'content': prompt}],
                format='json'
            )
            content = response.get('message', {}).get('content', '{}')
            return json.loads(content)
        except Exception as e:
            print(f"Error extracting metadata: {e}")
            return {}

    @staticmethod
    def merge_metadata(extracted: Dict[str, Any], manual: Dict[str, Any]) -> Dict[str, Any]:
        """Merges LLM extracted metadata with manual inputs/defaults."""
        merged = extracted.copy()
        for k, v in manual.items():
            if v: # Only override if manual input has a value
                merged[k] = v
        return merged



================================================
FILE: ingestion/parser.py
================================================
import os
from io import BytesIO
from pypdf import PdfReader
from docx import Document

class DocumentParser:
    @staticmethod
    def parse_pdf(file_path: str) -> str:
        """Parses a digital PDF and returns extracted text."""
        text = ""
        try:
            reader = PdfReader(file_path)
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        except Exception as e:
            print(f"Error parsing PDF {file_path}: {e}")
        return text

    @staticmethod
    def parse_docx(file_path: str) -> str:
        """Parses a DOCX file and returns extracted text."""
        text = ""
        try:
            doc = Document(file_path)
            for para in doc.paragraphs:
                text += para.text + "\n"
        except Exception as e:
            print(f"Error parsing DOCX {file_path}: {e}")
        return text

    @staticmethod
    def parse_txt(file_path: str) -> str:
        """Parses a standard plain text file."""
        text = ""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
        except Exception as e:
            print(f"Error parsing TXT {file_path}: {e}")
        return text
        
    @staticmethod
    def parse_file(file_path: str) -> str:
        """Routes file to correct parser based on extension."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
            
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf":
            return DocumentParser.parse_pdf(file_path)
        elif ext in [".doc", ".docx"]:
            return DocumentParser.parse_docx(file_path)
        elif ext == ".txt":
            return DocumentParser.parse_txt(file_path)
        else:
            raise ValueError(f"Unsupported file extension: {ext}")



================================================
FILE: retrieval/ranker.py
================================================
from typing import List, Dict, Any

class ResultRanker:
    @staticmethod
    def rank_and_filter(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Filters results below similarity threshold and sorts them."""
        # ChromaDB distance is lower for more similar vectors. 
        # Sort by distance (ascending)
        sorted_results = sorted(results, key=lambda x: x["distance"])
        return sorted_results

    @staticmethod
    def assemble_context(results: List[Dict[str, Any]], top_n: int = 5) -> str:
        """Assembles ranked chunks into a context string."""
        context_parts = []
        
        for i, res in enumerate(results[:top_n]):
            meta = res.get("metadata", {})
            source = meta.get("source_file", meta.get("title", f"Document {i+1}"))
            date = meta.get("date", meta.get("effective_date", "Unknown Date"))
            
            context_block = f"[SOURCE {i+1}] {source} ({date})\n"
            
            if "chunk_type" in meta:
                context_block += f"Type: {meta['chunk_type']}\n"
                
            context_block += f"{res['text']}\n"
            context_parts.append(context_block)
            
        return "\n".join(context_parts)



================================================
FILE: retrieval/search.py
================================================
from typing import List, Dict, Any, Optional
import ollama
from config.database import db_client
from config.settings import settings

class QuerySearcher:
    @staticmethod
    def preprocess_query(query: str) -> Dict[str, Any]:
        """
        Extracts intent and builds metadata filters from query.
        For MVP, we'll keep it simple: no complex filters unless explicitly detected.
        """
        filters = {}
        # In a full implementation, you'd use an LLM here to structure natural language into a filter
        return filters

    @staticmethod
    def search(query: str, db_names: List[str], top_k: int = 5, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Embedded query search across specified databases."""
        if not filters:
            filters = QuerySearcher.preprocess_query(query)
            
        try:
            response = ollama.embeddings(model=settings.EMBEDDING_MODEL, prompt=query)
            query_embedding = response.get('embedding')
        except Exception as e:
            print(f"Error embedding query: {e}")
            return []
            
        results_list = []
        
        for db_name in db_names:
            if db_name == settings.LAW_DB_NAME:
                collection = db_client.get_law_db()
            elif db_name == settings.CASES_DB_NAME:
                collection = db_client.get_cases_db()
            elif db_name == settings.CLIENT_DB_NAME:
                collection = db_client.get_client_db()
            else:
                continue

            try:
                # Query the collection
                clargs = {
                    "query_embeddings": [query_embedding],
                    "n_results": top_k
                }
                if filters:
                    clargs["where"] = filters
                    
                results = collection.query(**clargs)
                
                # Format Chroma DB results into list of dicts
                if results and results.get("ids") and results["ids"][0]:
                    for i in range(len(results["ids"][0])):
                        results_list.append({
                            "id": results["ids"][0][i],
                            "text": results["documents"][0][i],
                            "metadata": results["metadatas"][0][i],
                            "distance": results["distances"][0][i],
                            "db_source": db_name
                        })
            except Exception as e:
                print(f"Error querying db {db_name}: {e}")
                
        return results_list


ChatGPT said:
Love this project idea — this is a full end-to-end RAG (Retrieval Augmented Generation) legal intelligence system with ingestion, search, ranking, generation, evaluation, and analytics.

I’ll explain the entire pipeline step-by-step, from:

📄 Document ingestion → 🧠 embeddings → 🗄️ vector DB → 🔍 retrieval → ✍️ generation → 🧪 evaluation → 📊 analytics

I’ll go file by file, but also show how data flows across them.

🧭 BIG PICTURE ARCHITECTURE
There are 3 main pipelines:

1️⃣ Ingestion Pipeline (ingest_cli.py)
Used to add documents into the vector database:

File → Text → Metadata → Chunks → Embeddings → ChromaDB
2️⃣ RAG Query Pipeline (orchestrator.py)
Used when user asks a question:

Query → Embed → Retrieve → Rank → Build context → Generate → Judge → Retry → Final Answer
3️⃣ Analytics Pipeline (analytics_orchestrator.py)
Used to generate structured legal reports:

Client Case → Retrieve laws + cases → Build analytic prompt → Generate report
📁 README.md
Just documentation:
Project name, team members, hackathon info.
No logic here.

⚙️ config/settings.py (Global Configuration)
This is the central configuration hub.

Defines:
Ollama models:

EMBEDDING_MODEL = "mxbai-embed-large"
GENERATION_MODEL = "deepseek-r1"
JUDGE_MODEL = "deepseek-r1"
Database names:

LAW_DB_NAME = "law_reference_db"
CASES_DB_NAME = "case_history_db"
CLIENT_DB_NAME = "client_cases_db"
Retry logic:

MAX_RETRIES = 3
SIMILARITY_THRESHOLD = 0.75
Everything else imports settings.

So if you change models or DB names → whole system updates.

🗄️ config/database.py (ChromaDB Client)
Creates 3 vector databases (collections):

law_db
cases_db
client_db
Stored persistently in:

/data/chroma
Each collection stores:

embeddings

document text

metadata

Singleton pattern:

db_client = DatabaseClient()
So every file uses the same DB instance.

📥 INGESTION PIPELINE
ingest_cli.py (Entry point)
This is the command line tool:

python ingest_cli.py --db law --file contract.pdf
Step 1: Argument parsing
--db law|cases|client
--file or --folder
--case-id (only for client db)
Maps db choice:

law → law_reference_db
cases → case_history_db
client → client_cases_db
Step 2: File parsing (DocumentParser)
From ingestion/parser.py:

Depending on file type:

File	Parser
PDF	PdfReader
DOCX	python-docx
TXT	open()
Returns raw text.

Step 3: Metadata Extraction (metadata.py)
LLM extracts structured metadata:

Prompt:

Extract:
title, date, court, judge, plaintiff, defendant, case_type, subject_tags
LLM returns JSON:

{
  "title": "...",
  "date": "...",
  "judge": ["..."]
}
Then merges with manual metadata:

manual_meta = {"source_file": "abc.pdf", "client_case_id": "..."}
Final metadata = LLM + manual override.

Step 4: Chunking (chunker.py)
For law documents:
Regex split by:

Article X
Section Y
Each chunk gets:

{
  "chunk_type": "law_section",
  "chunk_index": 1,
  "chunk_total": 10
}
For cases & client:
Fallback word-based chunking:

512 words with overlap
This avoids embedding huge documents.

Step 5: Embedding & Storing (embedder.py)
For each chunk:

Generate embedding:

ollama.embeddings(model=EMBEDDING_MODEL, prompt=text)
Clean metadata (ChromaDB only accepts str/int/bool/float)

Store in ChromaDB:

collection.upsert(
  ids=[uuid],
  embeddings=[embedding],
  documents=[text],
  metadatas=[metadata]
)
Now your document is searchable.

🔍 RETRIEVAL PIPELINE
retrieval/search.py
When user asks:

QuerySearcher.search(query, db_names)
Step 1: Embed query
query_embedding = ollama.embeddings(prompt=query)
Step 2: Search each DB
collection.query(query_embeddings=[query_embedding])
Returns:

{
  id,
  text,
  metadata,
  distance,
  db_source
}
Combined results from:

law db

cases db

client db

retrieval/ranker.py
rank_and_filter()
Sorts by:

distance (lower = more similar)
assemble_context()
Builds context like:

[SOURCE 1] Contract Act (2020)
Type: law_section
<chunk text>
This becomes LLM input.

🧠 GENERATION PIPELINE
generation/llm.py
System prompt:

Use ONLY provided context.
Cite sources [SOURCE 1]
No hallucination.
User prompt:

CONTEXT:
...

QUESTION:
...
Calls:

ollama.chat(model=GENERATION_MODEL)
Returns answer text.

🧪 EVALUATION PIPELINE
evaluation/judge.py
LLM acts as judge.

Prompt asks it to return JSON:

{
  "score": 1-10,
  "is_helpful": true,
  "hallucination_detected": false,
  "suggestion": "..."
}
This enforces structured feedback.

🔁 RAG ORCHESTRATOR (orchestrator.py)
This ties everything together.

Step 1: Retrieval
raw_results = search()
ranked_results = rank_and_filter()
context = assemble_context()
If empty → return low confidence answer.

Step 2: Generation loop
for attempt in range(MAX_RETRIES):
    response = generate()
    evaluation = judge()
If:

score >= 7 or is_helpful == True
→ accept response.

Else:

previous_feedback = evaluation["suggestion"]
and retry.

Step 3: Format response
Returns:

{
  "answer": "...",
  "sources": [...],
  "confidence": "High",
  "evaluation_metrics": {...}
}
📊 ANALYTICS PIPELINE
analytics_orchestrator.py
Used for structured legal analysis (not Q&A).

Step 1: Fetch client case from DB
client_db.get(where={"client_case_id": id})
Combine chunks into full case text.

Step 2: Retrieve law & cases
Search using first chunk of case as query.

Step 3: Choose analytic type
Enum:

checklist

gap_analysis

argument_mapping

risk_assessment

compliance_tracker

Step 4: Prompt construction
From generation/prompts.py:

Each analytic type has its own long structured prompt.

Example: checklist prompt instructs:

generate procedural steps

cite sources

markdown output

Step 5: Generate report
LLM returns structured report.

Step 6: Format sources
Return:

{
  "analytic_type": "checklist",
  "client_case_id": "...",
  "report": "...",
  "sources": [...]
}
🧩 requirements.txt
Key libraries:

Library	Purpose
chromadb	vector DB
ollama	local LLM
pypdf	PDF parsing
python-docx	DOCX parsing
rank_bm25	ranking
fastapi + uvicorn	API (future)
🔗 FULL FLOW SUMMARY
Ingestion:
File → Parser → Metadata → Chunker → Embeddings → ChromaDB
Query:
Query → Embedding → Search DB → Rank → Context → Generate → Judge → Retry → Answer
Analytics:
Client case → Retrieve laws → Prompt → Generate structured legal report
🚨 Why your metadata is capped
From earlier discussion:
In ranker.py and format_response() you only return:

title, date, type
So even though full metadata exists in DB, you are not returning it in output.

You must modify:

formatted_sources.append(meta)
if you want full metadata.

🎯 Key Strengths of this Codebase
✅ Modular
✅ LLM-judge retry loop
✅ Structured analytics
✅ Metadata extraction
✅ Multi-database retrieval
✅ Production-ready design

If you want, next I can give you one of these (your choice):

1️⃣ Draw full pipeline diagram (ASCII or visual)
2️⃣ Explain exactly how metadata is stored and retrieved
3️⃣ Show how to fix metadata capping issue
4️⃣ Explain how similarity search mathematically works
5️⃣ Explain how to convert this into FastAPI backend

Just say which number you want: 1–5





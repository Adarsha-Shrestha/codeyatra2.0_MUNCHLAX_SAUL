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

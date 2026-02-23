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
    def search(query: str, db_names: List[str], top_k: int = 5, filters: Optional[Dict[str, Any]] = None, client_case_id: Optional[str] = None) -> List[Dict[str, Any]]:
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
                
                # Copy filters so we don't accidentally mutate it for subsequent DBs
                current_filters = filters.copy() if filters else {}
                if db_name == settings.CLIENT_DB_NAME and client_case_id:
                     current_filters["client_case_id"] = client_case_id
                     
                if current_filters:
                    clargs["where"] = current_filters
                    
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

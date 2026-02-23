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

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

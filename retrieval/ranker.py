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

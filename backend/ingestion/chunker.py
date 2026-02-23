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

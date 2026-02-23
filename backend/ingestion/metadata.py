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

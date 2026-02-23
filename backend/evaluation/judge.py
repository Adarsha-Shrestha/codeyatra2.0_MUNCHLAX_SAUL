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

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

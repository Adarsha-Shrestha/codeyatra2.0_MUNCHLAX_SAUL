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

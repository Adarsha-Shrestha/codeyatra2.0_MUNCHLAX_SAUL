import os
from urllib.parse import quote_plus
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

    # ChromaDB Settings
    CHROMA_PERSIST_DIR: str = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "data", "chroma"
    )

    # ChromaDB Collections
    LAW_DB_NAME: str = "law_reference_db"
    CASES_DB_NAME: str = "case_history_db"
    CLIENT_DB_NAME: str = "client_cases_db"

    # PostgreSQL Settings
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "lol@"
    POSTGRES_DB: str = "legal_rag"

    @property
    def POSTGRES_URL(self) -> str:
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{quote_plus(self.POSTGRES_PASSWORD)}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def POSTGRES_ASYNC_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{quote_plus(self.POSTGRES_PASSWORD)}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # File storage – where uploaded files are persisted on disk
    FILE_STORAGE_DIR: str = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "data", "docs"
    )

    # Generation settings
    MAX_RETRIES: int = 3
    SIMILARITY_THRESHOLD: float = 0.75

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
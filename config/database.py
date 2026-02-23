import os
import chromadb
from chromadb.config import Settings
from config.settings import settings

class DatabaseClient:
    def __init__(self):
        # Ensure the persistent directory exists
        os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
        
        self.client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
        
        # Initialize collections
        self.law_db = self.client.get_or_create_collection(
            name=settings.LAW_DB_NAME,
            metadata={"description": "Law & Reference Database"}
        )
        
        self.cases_db = self.client.get_or_create_collection(
            name=settings.CASES_DB_NAME,
            metadata={"description": "Past Cases & Case History Database"}
        )
        
        self.client_db = self.client.get_or_create_collection(
            name=settings.CLIENT_DB_NAME,
            metadata={"description": "Individual Client Cases Database"}
        )

    def get_law_db(self):
        return self.law_db
        
    def get_cases_db(self):
        return self.cases_db
        
    def get_client_db(self):
        return self.client_db

# Singleton instance
db_client = DatabaseClient()

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from orchestrator import RAGOrchestrator
from analytics_orchestrator import AnalyticsOrchestrator
from config.database import db_client
from config.settings import settings

router = APIRouter()

class QueryRequest(BaseModel):
    query: str
    databases: Optional[List[str]] = [settings.LAW_DB_NAME, settings.CASES_DB_NAME]

class AnalyticsRequest(BaseModel):
    client_case_id: str
    analytic_type: str

@router.post("/query")
async def query_rag(request: QueryRequest):
    try:
        result = RAGOrchestrator.process_query(request.query, request.databases)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
@router.post("/analytics")
async def generate_analytics(request: AnalyticsRequest):
    try:
        result = AnalyticsOrchestrator.generate_analytics(request.client_case_id, request.analytic_type)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cases")
async def list_cases():
    try:
        client_db = db_client.get_client_db()
        results = client_db.get(include=["metadatas"])
        
        unique_cases = set()
        for meta in results.get("metadatas", []):
            if meta and "client_case_id" in meta:
                unique_cases.add(meta["client_case_id"])
                
        return {"cases": list(unique_cases)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

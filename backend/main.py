from fastapi import FastAPI
from config.settings import settings
from api.routes import router as api_router

app = FastAPI(
    title=settings.APP_NAME,
    description="Local Agentic RAG — Legal Intelligence System",
    version="1.0.0"
)

app.include_router(api_router, prefix="/api")

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=settings.DEBUG)

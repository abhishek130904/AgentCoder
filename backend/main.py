from fastapi import FastAPI
from backend.routes import router

app = FastAPI(title="Agentic AI API")

app.include_router(router, prefix="/api")
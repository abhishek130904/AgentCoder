import asyncio
import json
import os
import pathlib

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from backend.routes import router
from backend.jobs import get_job

app = FastAPI(title="CoderBuddy API")

# Bug #19: CORS origins are now configurable via environment variable.
# Defaults to ["*"] for development convenience. In production, set
# CORS_ORIGINS to a comma-separated list of allowed origins.
cors_origins_raw = os.getenv("CORS_ORIGINS", "*")
cors_origins = (
    ["*"]
    if cors_origins_raw.strip() == "*"
    else [o.strip() for o in cors_origins_raw.split(",") if o.strip()]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


# Health check endpoint for Render (and other hosting platforms).
# Render pings GET / or HEAD / to verify the service is alive.
@app.get("/health")
def health_check():
    return {"status": "ok"}


# IMP-03: Server-Sent Events endpoint for real-time status updates.
# Replaces the need for frontend polling every 2 seconds.
@app.get("/api/projects/{job_id}/stream")
async def stream_status(job_id: str):
    """Stream job status updates via Server-Sent Events."""
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_generator():
        while True:
            job_data = get_job(job_id)
            status = job_data.get("status", "unknown") if job_data else "unknown"
            yield f"data: {json.dumps({'status': status})}\n\n"
            if status in ("completed", "failed"):
                break
            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ---------------------------------------------------------------------------
# Serve the React frontend in production.
# After `npm run build` in frontend/, the output lands in frontend/dist/.
# Mount it as static files so the entire app is served from one process.
# This MUST come after all /api routes to avoid shadowing them.
# ---------------------------------------------------------------------------
FRONTEND_DIR = pathlib.Path(__file__).resolve().parent.parent / "frontend" / "dist"

if FRONTEND_DIR.is_dir():
    # Serve JS/CSS/assets at /assets/...
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")

    # Catch-all: serve index.html for any non-API route (supports React client-side routing)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # If the exact file exists in dist, serve it (e.g. favicon, manifest)
        file_path = FRONTEND_DIR / full_path
        if full_path and file_path.is_file():
            return FileResponse(file_path)
        # Otherwise fall back to index.html for client-side routing
        return FileResponse(FRONTEND_DIR / "index.html")
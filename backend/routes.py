import os
import tempfile
import zipfile
import pathlib

from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from starlette.background import BackgroundTask

from backend.jobs import create_job, run_agent, get_job, list_all_jobs

router = APIRouter()

# Root directory where projects are stored
PROJECT_ROOT = pathlib.Path("generated_project")


# BUG-14 FIX: Pydantic request model with max_length validation.
# Prevents users from submitting 100KB prompts that burn API tokens.
class ProjectRequest(BaseModel):
    prompt: str = Field(..., min_length=10, max_length=2000)


# -----------------------------
# Create Project
# -----------------------------
@router.post("/projects")
def create_project(request: ProjectRequest, background_tasks: BackgroundTasks):
    job_id = create_job(request.prompt)
    background_tasks.add_task(run_agent, job_id, request.prompt)
    return {
        "job_id": job_id,
        "status": "started"
    }


# -----------------------------
# Check Job Status
# -----------------------------
# BUG-05 FIX: All error responses now use HTTPException with proper status codes
# instead of returning 200 OK with {"error": ...} in the body.
@router.get("/projects/{job_id}/status")
def get_status(job_id: str):
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


# -----------------------------
# List Project Files
# -----------------------------
@router.get("/projects/{job_id}/files")
def list_project_files(job_id: str):
    project_dir = PROJECT_ROOT / job_id

    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    files = []
    for f in project_dir.rglob("*"):
        if f.is_file():
            files.append(str(f.relative_to(project_dir)))

    return {"files": files}


# -----------------------------
# Get File Content
# -----------------------------
@router.get("/projects/{job_id}/files/{filepath:path}")
def get_file(job_id: str, filepath: str):
    project_dir = PROJECT_ROOT / job_id
    file_path = project_dir / filepath

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    content = file_path.read_text(encoding="utf-8")
    return {"content": content}


# -----------------------------
# Download Project as ZIP
# -----------------------------
# BUG-07 FIX: Use a temp file for the ZIP and clean it up after the response.
# The old code wrote to a fixed path (PROJECT_ROOT/{job_id}.zip) that was never
# deleted, leaking disk space. It also had a race condition if two users
# downloaded the same project simultaneously.
@router.get("/projects/{job_id}/download")
def download_project(job_id: str):
    project_dir = PROJECT_ROOT / job_id

    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    try:
        with zipfile.ZipFile(tmp.name, "w", zipfile.ZIP_DEFLATED) as zipf:
            for file in project_dir.rglob("*"):
                if file.is_file():
                    zipf.write(file, file.relative_to(project_dir))
    except Exception:
        os.unlink(tmp.name)
        raise

    return FileResponse(
        tmp.name,
        filename=f"{job_id}.zip",
        media_type="application/zip",
        background=BackgroundTask(os.unlink, tmp.name),
    )
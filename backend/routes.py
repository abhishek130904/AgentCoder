from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import FileResponse
import pathlib
import zipfile

from backend.jobs import create_job, run_agent, jobs

router = APIRouter()

# Root directory where projects are stored
PROJECT_ROOT = pathlib.Path("generated_project")


# -----------------------------
# Create Project
# -----------------------------
@router.post("/projects")
def create_project(prompt: str, background_tasks: BackgroundTasks):

    job_id = create_job(prompt)

    background_tasks.add_task(run_agent, job_id, prompt)

    return {
        "job_id": job_id,
        "status": "started"
    }


# -----------------------------
# Check Job Status
# -----------------------------
@router.get("/projects/{job_id}/status")
def get_status(job_id: str):

    if job_id not in jobs:
        return {"error": "job not found"}

    return jobs[job_id]


# -----------------------------
# List Project Files
# -----------------------------
@router.get("/projects/{job_id}/files")
def list_project_files(job_id: str):

    project_dir = PROJECT_ROOT / job_id

    if not project_dir.exists():
        return {"error": "project not found"}

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
        return {"error": "file not found"}

    content = file_path.read_text(encoding="utf-8")

    return {"content": content}


# -----------------------------
# Download Project as ZIP
# -----------------------------
@router.get("/projects/{job_id}/download")
def download_project(job_id: str):

    project_dir = PROJECT_ROOT / job_id

    if not project_dir.exists():
        return {"error": "project not found"}

    zip_path = PROJECT_ROOT / f"{job_id}.zip"

    with zipfile.ZipFile(zip_path, "w") as zipf:
        for file in project_dir.rglob("*"):
            if file.is_file():
                zipf.write(file, file.relative_to(project_dir))

    return FileResponse(zip_path, filename=f"{job_id}.zip")
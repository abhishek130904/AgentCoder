from fastapi import APIRouter, BackgroundTasks
from backend.jobs import create_job, run_agent, jobs

router = APIRouter()


@router.post("/projects")
def create_project(prompt: str, background_tasks: BackgroundTasks):

    job_id = create_job(prompt)

    background_tasks.add_task(run_agent, job_id, prompt)

    return {
        "job_id": job_id,
        "status": "started"
    }


@router.get("/projects/{job_id}/status")
def get_status(job_id: str):

    if job_id not in jobs:
        return {"error": "job not found"}

    return jobs[job_id]
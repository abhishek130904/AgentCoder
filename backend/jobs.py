"""Job store with JSON file persistence.

BUG-06 FIX: The old in-memory ``jobs = {}`` lost all data on every server restart.
This module persists jobs to a JSON file on disk so they survive restarts
(including Render's auto-sleep). For a production system you'd want SQLite
or a real database, but JSON-file is a pragmatic choice for a demo project.
"""

import json
import pathlib
import threading
import uuid
from typing import Optional

from agent.graph import agent
from agent.tools import set_job_root

JOBS_FILE = pathlib.Path("jobs_store.json")
_lock = threading.Lock()


def _load_jobs() -> dict:
    """Load all jobs from disk. Returns empty dict if file doesn't exist."""
    if not JOBS_FILE.exists():
        return {}
    try:
        with open(JOBS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}


def _save_jobs(data: dict) -> None:
    """Persist the full jobs dict to disk atomically."""
    tmp = JOBS_FILE.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)
    tmp.replace(JOBS_FILE)


def _update_job(job_id: str, updates: dict) -> None:
    """Thread-safe read-modify-write for a single job."""
    with _lock:
        jobs = _load_jobs()
        if job_id in jobs:
            jobs[job_id].update(updates)
            _save_jobs(jobs)


def get_job(job_id: str) -> Optional[dict]:
    """Return a single job's data, or None if not found."""
    with _lock:
        jobs = _load_jobs()
    return jobs.get(job_id)


def list_all_jobs() -> dict:
    """Return all jobs."""
    with _lock:
        return _load_jobs()


def create_job(prompt: str) -> str:
    """Create a new job entry and persist it."""
    job_id = str(uuid.uuid4())
    with _lock:
        jobs = _load_jobs()
        jobs[job_id] = {
            "status": "pending",
            "prompt": prompt,
        }
        _save_jobs(jobs)
    return job_id


def run_agent(job_id: str, prompt: str) -> None:
    """Execute the multi-agent pipeline for a job (called as a background task)."""
    try:
        _update_job(job_id, {"status": "running"})

        set_job_root(job_id)

        result = agent.invoke(
            {"user_prompt": prompt},
            {"recursion_limit": 100},
        )

        _update_job(job_id, {"status": "completed"})

    except Exception as e:
        _update_job(job_id, {"status": "failed", "error": str(e)})
import uuid
from agent.graph import agent
from agent.tools import set_job_root

jobs = {}

def run_agent(job_id: str, prompt: str):
    try:
        jobs[job_id]["status"] = "running"

        set_job_root(job_id)

        result = agent.invoke(
            {"user_prompt": prompt},
            {"recursion_limit": 100}
        )

        jobs[job_id]["status"] = "completed"
        jobs[job_id]["result"] = result

    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)

def create_job(prompt: str):

    job_id = str(uuid.uuid4())

    jobs[job_id] = {
        "status": "pending",
        "prompt": prompt
    }

    return job_id
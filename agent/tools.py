import pathlib
import subprocess
from typing import Tuple

from langchain_core.tools import tool

PROJECT_ROOT = pathlib.Path.cwd() / "generated_project"
CURRENT_JOB = None

def set_job_root(job_id: str):
    global CURRENT_JOB
    CURRENT_JOB = PROJECT_ROOT / job_id
    CURRENT_JOB.mkdir(parents=True, exist_ok=True)

def safe_path_for_project(path: str) -> pathlib.Path:
    root = CURRENT_JOB if CURRENT_JOB else PROJECT_ROOT
    p = (root / path).resolve()

    if root.resolve() not in p.parents and root.resolve() != p.parent and root.resolve() != p:
        raise ValueError("Attempt to write outside project root")

    return p

@tool
def write_file(path: str, content: str) -> str:
    """Writes content to a file at the specified path within the project root."""
    p = safe_path_for_project(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        f.write(content)
    return f"WROTE:{p}"


@tool
def read_file(path: str) -> str:
    """Reads content from a file at the specified path within the project root."""
    p = safe_path_for_project(path)
    if not p.exists():
        return ""
    with open(p, "r", encoding="utf-8") as f:
        return f.read()


@tool
def get_current_directory() -> str:
    """Returns the current project directory."""
    root = CURRENT_JOB if CURRENT_JOB else PROJECT_ROOT
    return str(root)

@tool
def list_files(directory: str = ".") -> str:
    """Lists all files in the specified directory within the project root."""
    p = safe_path_for_project(directory)
    if not p.is_dir():
        return f"ERROR: {p} is not a directory"
    files = [str(f.relative_to(PROJECT_ROOT)) for f in p.glob("**/*") if f.is_file()]
    return "\n".join(files) if files else "No files found."

@tool
def run_cmd(cmd: str, cwd: str = None, timeout: int = 30) -> Tuple[int, str, str]:
    """Runs a shell command in the specified directory and returns the result."""
    root = CURRENT_JOB if CURRENT_JOB else PROJECT_ROOT
    cwd_dir = safe_path_for_project(cwd) if cwd else root
    res = subprocess.run(cmd, shell=True, cwd=str(cwd_dir), capture_output=True, text=True, timeout=timeout)
    return res.returncode, res.stdout, res.stderr


def init_project_root():
    PROJECT_ROOT.mkdir(parents=True, exist_ok=True)
    return str(PROJECT_ROOT)
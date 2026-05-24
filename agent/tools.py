import os
import pathlib
import contextvars
from typing import List

from langchain_core.tools import tool

PROJECT_ROOT = pathlib.Path.cwd() / "generated_project"

# BUG-02 FIX: Use contextvars instead of global mutable state.
# This prevents race conditions when multiple users submit prompts concurrently —
# each thread/task gets its own isolated job root.
_current_job: contextvars.ContextVar[pathlib.Path | None] = contextvars.ContextVar(
    "current_job", default=None
)


def set_job_root(job_id: str) -> None:
    """Set the current job root directory (thread-safe via contextvars)."""
    job_path = PROJECT_ROOT / job_id
    job_path.mkdir(parents=True, exist_ok=True)
    _current_job.set(job_path)


def get_job_root() -> pathlib.Path:
    """Return the current job root, falling back to PROJECT_ROOT."""
    return _current_job.get() or PROJECT_ROOT


# BUG-03 FIX: Use str.startswith with os.sep for reliable path containment.
# The old check was fragile and didn't properly prevent symlink or traversal attacks.
def safe_path_for_project(path: str) -> pathlib.Path:
    """Resolve *path* under the current job root and verify it stays inside."""
    root = get_job_root()
    resolved_root = root.resolve()
    p = (root / path).resolve()

    # Ensure the resolved path is either the root itself or strictly inside it.
    if not str(p).startswith(str(resolved_root) + os.sep) and p != resolved_root:
        raise ValueError(f"Path escapes project root: {path}")

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
    return str(get_job_root())


# BUG-08 FIX: Use `root` (the actual job root) for relative_to instead of
# PROJECT_ROOT, which gave confusing paths like "job-uuid/file.py".
@tool
def list_files(directory: str = ".") -> str:
    """Lists all files in the specified directory within the project root."""
    root = get_job_root()
    p = safe_path_for_project(directory)
    if not p.is_dir():
        return f"ERROR: {p} is not a directory"
    files = [str(f.relative_to(root)) for f in p.glob("**/*") if f.is_file()]
    return "\n".join(files) if files else "No files found."


# BUG-04 / #17 / #18: REMOVED run_cmd (shell injection risk + dead code)
# and init_project_root (dead code, never called).
# The coder_tools list in graph.py never included run_cmd, but leaving it
# in the codebase was a latent security hole.
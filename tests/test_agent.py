"""Unit tests for AgentCoder core modules.

Covers:
- Path traversal prevention (BUG-03 regression tests)
- Pydantic model validation
- Tool behavior
- Job store operations
"""

import pathlib
import pytest


# ---------------------------------------------------------------------------
# Tests for agent/tools.py
# ---------------------------------------------------------------------------

class TestSafePathForProject:
    """Regression tests for BUG-03: path traversal prevention."""

    def test_blocks_parent_traversal(self):
        """../../etc/passwd must be rejected."""
        from agent.tools import safe_path_for_project
        with pytest.raises(ValueError, match="Path escapes project root"):
            safe_path_for_project("../../etc/passwd")

    def test_blocks_absolute_path(self):
        """Absolute paths outside the project root must be rejected."""
        from agent.tools import safe_path_for_project
        with pytest.raises(ValueError, match="Path escapes project root"):
            safe_path_for_project("/etc/passwd")

    def test_allows_valid_relative_path(self):
        """Normal relative paths inside the project root must be allowed."""
        from agent.tools import safe_path_for_project, PROJECT_ROOT
        p = safe_path_for_project("src/app.py")
        assert str(PROJECT_ROOT.resolve()) in str(p)

    def test_allows_nested_path(self):
        """Deeply nested paths should work fine."""
        from agent.tools import safe_path_for_project, PROJECT_ROOT
        p = safe_path_for_project("src/components/Button.tsx")
        assert str(PROJECT_ROOT.resolve()) in str(p)

    def test_blocks_dot_dot_in_middle(self):
        """Paths with .. in the middle that escape root must be rejected."""
        from agent.tools import safe_path_for_project
        with pytest.raises(ValueError, match="Path escapes project root"):
            safe_path_for_project("src/../../../../../../etc/shadow")


# ---------------------------------------------------------------------------
# Tests for agent/states.py
# ---------------------------------------------------------------------------

class TestPlanModel:
    """Test Pydantic model validation for Plan."""

    def test_plan_creation(self):
        from agent.states import Plan
        plan = Plan(
            name="test-app",
            description="A test application",
            techstack="python",
            features=["auth", "dashboard"],
            files=[],
        )
        assert plan.name == "test-app"
        assert len(plan.features) == 2

    def test_plan_requires_name(self):
        from agent.states import Plan
        with pytest.raises(Exception):
            Plan(description="test", techstack="python", features=[], files=[])


class TestTaskPlanModel:
    """Test TaskPlan allows extra fields (used for attaching plan)."""

    def test_task_plan_empty_steps(self):
        from agent.states import TaskPlan
        tp = TaskPlan(implementation_steps=[])
        assert tp.implementation_steps == []

    def test_task_plan_extra_fields(self):
        """TaskPlan uses ConfigDict(extra='allow'), so extra fields shouldn't raise."""
        from agent.states import TaskPlan
        tp = TaskPlan(implementation_steps=[])
        tp.plan = "some_plan"  # extra field
        assert tp.plan == "some_plan"


class TestReviewResultModel:
    """Test the new ReviewResult model."""

    def test_review_passed(self):
        from agent.states import ReviewResult
        r = ReviewResult(passed=True)
        assert r.passed is True
        assert r.issues == []

    def test_review_failed_with_issues(self):
        from agent.states import ReviewResult
        r = ReviewResult(passed=False, issues=["Missing import os in main.py"])
        assert r.passed is False
        assert len(r.issues) == 1


# ---------------------------------------------------------------------------
# Tests for agent/tools.py — contextvars (BUG-02)
# ---------------------------------------------------------------------------

class TestJobRoot:
    """Test that set_job_root uses contextvars correctly."""

    def test_set_and_get_job_root(self):
        from agent.tools import set_job_root, get_job_root, PROJECT_ROOT
        import shutil

        set_job_root("test-job-12345")
        root = get_job_root()
        assert root == PROJECT_ROOT / "test-job-12345"
        assert root.exists()

        # Cleanup
        shutil.rmtree(root, ignore_errors=True)

    def test_default_root_is_project_root(self):
        """When no job is set, get_job_root falls back to PROJECT_ROOT."""
        from agent.tools import get_job_root, PROJECT_ROOT, _current_job
        # Reset to default
        token = _current_job.set(None)
        try:
            assert get_job_root() == PROJECT_ROOT
        finally:
            _current_job.reset(token)


# ---------------------------------------------------------------------------
# Tests for backend/routes.py — input validation (BUG-14)
# ---------------------------------------------------------------------------

class TestProjectRequest:
    """Test the Pydantic request validation model."""

    def test_valid_prompt(self):
        from backend.routes import ProjectRequest
        req = ProjectRequest(prompt="Build a todo app with React")
        assert req.prompt == "Build a todo app with React"

    def test_prompt_too_short(self):
        from backend.routes import ProjectRequest
        with pytest.raises(Exception):
            ProjectRequest(prompt="hi")

    def test_prompt_too_long(self):
        from backend.routes import ProjectRequest
        with pytest.raises(Exception):
            ProjectRequest(prompt="x" * 2001)

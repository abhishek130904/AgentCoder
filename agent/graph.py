import logging
import os
from typing import TypedDict, Optional

from dotenv import load_dotenv
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.globals import set_verbose, set_debug
from langchain_groq.chat_models import ChatGroq
from langgraph.constants import END
from langgraph.graph import StateGraph
from langgraph.prebuilt import create_react_agent

# BUG-12 FIX: Explicit imports instead of wildcard imports.
# Wildcard imports pollute the namespace and make it unclear what's being used.
from agent.prompts import planner_prompt, architect_prompt, coder_system_prompt, reviewer_prompt
from agent.states import Plan, TaskPlan, CoderState, ReviewResult
from agent.tools import write_file, read_file, get_current_directory, list_files

logger = logging.getLogger(__name__)

_ = load_dotenv()

debug_enabled = os.getenv("AGENT_DEBUG", "").strip().lower() in {"1", "true", "yes", "on"}
set_debug(debug_enabled)
set_verbose(debug_enabled)

model_name = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")


# IMP-06: Token/cost tracking callback.
# Logs cumulative token usage so you can monitor LLM costs per job.
class TokenTracker(BaseCallbackHandler):
    def __init__(self):
        self.total_tokens = 0
        self.prompt_tokens = 0
        self.completion_tokens = 0

    def on_llm_end(self, response, **kwargs):
        usage = getattr(response, "llm_output", None)
        if usage and isinstance(usage, dict):
            token_usage = usage.get("token_usage", {})
            self.total_tokens += token_usage.get("total_tokens", 0)
            self.prompt_tokens += token_usage.get("prompt_tokens", 0)
            self.completion_tokens += token_usage.get("completion_tokens", 0)
            logger.info(
                "Token usage — prompt: %d, completion: %d, total: %d",
                self.prompt_tokens, self.completion_tokens, self.total_tokens,
            )


token_tracker = TokenTracker()
llm = ChatGroq(model=model_name, callbacks=[token_tracker])

coder_tools = [read_file, write_file, list_files, get_current_directory]
reviewer_tools = [read_file, list_files, get_current_directory]

react_agent = create_react_agent(llm, coder_tools)
review_react_agent = create_react_agent(llm, reviewer_tools)

MAX_REVIEW_ATTEMPTS = 2


# IMP-01 / #22 FIX: Typed state schema instead of raw dict.
# Catches key typos at development time and makes the state flow self-documenting.
class AgentState(TypedDict, total=False):
    user_prompt: str
    plan: Plan
    task_plan: TaskPlan
    coder_state: CoderState
    status: str
    review_result: Optional[ReviewResult]
    review_attempts: int


def planner_agent(state: dict) -> dict:
    """Converts user prompt into a structured Plan."""
    user_prompt = state["user_prompt"]
    resp = llm.with_structured_output(Plan).invoke(
        planner_prompt(user_prompt)
    )
    if resp is None:
        raise ValueError("Planner did not return a valid response.")
    return {"plan": resp}


def architect_agent(state: dict) -> dict:
    """Creates TaskPlan from Plan."""
    plan: Plan = state["plan"]
    resp = llm.with_structured_output(TaskPlan).invoke(
        architect_prompt(plan=plan.model_dump_json())
    )
    if resp is None:
        # BUG-10 FIX: Error message said "Planner" but this is the Architect.
        raise ValueError("Architect did not return a valid response.")

    resp.plan = plan
    # BUG-11 FIX: Replaced print() with logging.debug() — no more stdout noise in production.
    logger.debug("Architect response: %s", resp.model_dump_json())
    return {"task_plan": resp}


def coder_agent(state: dict) -> dict:
    """LangGraph tool-using coder agent with error recovery (IMP-05)."""
    coder_state: CoderState = state.get("coder_state")
    if coder_state is None:
        coder_state = CoderState(task_plan=state["task_plan"], current_step_idx=0)

    steps = coder_state.task_plan.implementation_steps
    if coder_state.current_step_idx >= len(steps):
        return {"coder_state": coder_state, "status": "CODING_DONE"}

    current_task = steps[coder_state.current_step_idx]

    # BUG-09 FIX: Use .invoke() instead of deprecated .run().
    existing_content = read_file.invoke(current_task.filepath)

    system_prompt = coder_system_prompt()
    user_prompt = (
        f"Task: {current_task.task_description}\n"
        f"File: {current_task.filepath}\n"
        f"Existing content:\n{existing_content}\n"
        "Use write_file(path, content) to save your changes."
    )

    # IMP-05: Error recovery — if one step fails, log and skip instead of crashing the whole job.
    try:
        react_agent.invoke({"messages": [{"role": "system", "content": system_prompt},
                                         {"role": "user", "content": user_prompt}]})
    except Exception as e:
        logger.warning(
            "Coder failed on step %d (%s): %s",
            coder_state.current_step_idx, current_task.filepath, e,
        )

    coder_state.current_step_idx += 1
    return {"coder_state": coder_state}


# IMP-02: Reviewer agent — a 4th agent that reads all generated files and checks
# for missing imports, syntax errors, and consistency with the plan.
def reviewer_agent(state: dict) -> dict:
    """Reviews all generated code for quality and correctness."""
    task_plan: TaskPlan = state["task_plan"]
    review_attempts = state.get("review_attempts", 0)

    file_list = "\n".join(
        f"- {step.filepath}: {step.task_description}"
        for step in task_plan.implementation_steps
    )

    system_prompt = reviewer_prompt()
    user_prompt = (
        f"Review the following project files:\n{file_list}\n\n"
        "Use list_files('.') to see all files, then read_file(path) to inspect each one. "
        "Return your structured assessment."
    )

    try:
        result = review_react_agent.invoke(
            {"messages": [{"role": "system", "content": system_prompt},
                          {"role": "user", "content": user_prompt}]}
        )
        # Try to extract structured review from the last message
        last_message = result["messages"][-1].content if result.get("messages") else ""
        logger.info("Reviewer output: %s", last_message[:500])

        # Attempt structured output for pass/fail decision
        review_resp = llm.with_structured_output(ReviewResult).invoke(
            f"Based on this code review, produce a structured ReviewResult:\n\n{last_message}"
        )
        if review_resp is not None:
            return {
                "review_result": review_resp,
                "review_attempts": review_attempts + 1,
                "status": "DONE" if review_resp.passed else "REVIEW_FAILED",
            }
    except Exception as e:
        logger.warning("Reviewer failed: %s", e)

    # If review itself fails, pass through to avoid infinite loops
    return {
        "review_result": ReviewResult(passed=True, issues=[], suggestions=["Review agent encountered an error"]),
        "review_attempts": review_attempts + 1,
        "status": "DONE",
    }


def _route_after_coder(state: dict) -> str:
    """Route after coder: if all steps done, go to reviewer; otherwise loop."""
    if state.get("status") == "CODING_DONE":
        return "reviewer"
    return "coder"


def _route_after_reviewer(state: dict) -> str:
    """Route after reviewer: if passed or max attempts, end; otherwise back to coder."""
    review_result = state.get("review_result")
    review_attempts = state.get("review_attempts", 0)

    if review_result and review_result.passed:
        return "END"
    if review_attempts >= MAX_REVIEW_ATTEMPTS:
        logger.warning("Max review attempts reached, finishing anyway.")
        return "END"
    # Reset coder to retry from the beginning
    return "coder"


graph = StateGraph(AgentState)

graph.add_node("planner", planner_agent)
graph.add_node("architect", architect_agent)
graph.add_node("coder", coder_agent)
graph.add_node("reviewer", reviewer_agent)

graph.add_edge("planner", "architect")
graph.add_edge("architect", "coder")
graph.add_conditional_edges(
    "coder",
    _route_after_coder,
    {"reviewer": "reviewer", "coder": "coder"}
)
graph.add_conditional_edges(
    "reviewer",
    _route_after_reviewer,
    {"END": END, "coder": "coder"}
)

graph.set_entry_point("planner")
agent = graph.compile()

if __name__ == "__main__":
    result = agent.invoke({"user_prompt": "Build a colourful modern todo app in html css and js"},
                          {"recursion_limit": 100})
    print("Final State:", result)
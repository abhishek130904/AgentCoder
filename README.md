# 🤖 CoderBuddy — AI-Powered Code Generator

A multi-agent LLM pipeline that converts natural language descriptions into full project codebases.

## Architecture

```
[Planner] → [Architect] → [Coder (ReAct loop)] → [Reviewer] → Generated Project
```

| Agent      | Role                                                                 |
|------------|----------------------------------------------------------------------|
| **Planner**   | Converts a user prompt into a structured project plan (tech stack, files, features) |
| **Architect** | Breaks the plan into ordered, self-contained implementation tasks    |
| **Coder**     | Implements each task using a ReAct tool-calling loop with file I/O   |
| **Reviewer**  | Reviews all generated code for quality, missing imports, and consistency |

## Tech Stack

- **Agent Core:** LangGraph, LangChain, Groq LLM
- **Backend:** FastAPI, Python 3.11+
- **Frontend:** React 19, TypeScript, Vite, Monaco Editor

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Groq API key](https://console.groq.com)

### Backend

```bash
# 1. Clone and set up environment
cp .env.example .env   # Add your GROQ_API_KEY

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start the API server
uvicorn backend.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server proxies `/api` requests to `http://127.0.0.1:8000`.

### CLI Mode

```bash
python main.py
# Enter your project prompt when asked
```

## API Endpoints

| Method | Endpoint                              | Description                    |
|--------|---------------------------------------|--------------------------------|
| POST   | `/api/projects`                       | Create a new project           |
| GET    | `/api/projects/{id}/status`           | Check generation status        |
| GET    | `/api/projects/{id}/stream`           | SSE stream of status updates   |
| GET    | `/api/projects/{id}/files`            | List generated files           |
| GET    | `/api/projects/{id}/files/{path}`     | Get file content               |
| GET    | `/api/projects/{id}/download`         | Download project as ZIP        |

### Example: Create a Project

```bash
curl -X POST http://localhost:8000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Build a modern todo app with HTML, CSS, and JS"}'
```

## Project Structure

```
├── agent/
│   ├── graph.py       # LangGraph agent pipeline (Planner → Architect → Coder → Reviewer)
│   ├── prompts.py     # System prompts for each agent
│   ├── states.py      # Pydantic models for Plan, TaskPlan, CoderState
│   └── tools.py       # File I/O tools available to the coder agent
├── backend/
│   ├── main.py        # FastAPI app with CORS and SSE
│   ├── routes.py      # REST API endpoints
│   └── jobs.py        # Job persistence (JSON file store)
├── frontend/          # React + TypeScript + Vite
├── main.py            # CLI entry point
├── tests/             # Unit tests
├── Dockerfile         # Production container
└── .env.example       # Environment variable template
```

## Running Tests

```bash
python -m pytest tests/ -v
```

## Docker

```bash
docker build -t coderbuddy .
docker run -p 8000:8000 --env-file .env coderbuddy
```

## License

MIT

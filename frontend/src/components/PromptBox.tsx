import { useState } from "react"

interface Props {
  onSubmit: (prompt: string) => void
  disabled?: boolean
  initialPrompt?: string
}

const EXAMPLES = [
  { label: "Todo App", prompt: "Build a modern todo app with HTML, CSS, and JavaScript with local storage persistence and dark mode" },
  { label: "REST API", prompt: "Create a Python FastAPI REST API for a bookstore with CRUD operations and SQLite database" },
  { label: "Landing Page", prompt: "Build a responsive SaaS landing page with hero section, features grid, pricing cards, and footer" },
  { label: "Portfolio", prompt: "Create a developer portfolio website with dark mode, animated project cards, skills section, and contact form" },
]

export default function PromptBox({ onSubmit, disabled, initialPrompt }: Props) {
  const [prompt, setPrompt] = useState(initialPrompt || "")

  const trimmedPrompt = prompt.trim()
  const isValidLength = trimmedPrompt.length >= 10 && trimmedPrompt.length <= 2000

  const handleSubmit = () => {
    if (!isValidLength || disabled) return
    onSubmit(prompt)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault()
      handleSubmit()
    }
  }

  // Allow parent to set prompt via initialPrompt changes
  if (initialPrompt && initialPrompt !== prompt && !disabled) {
    setPrompt(initialPrompt)
  }

  return (
    <div className="prompt-box">
      <textarea
        className="prompt-input"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe the app you want to build — mention frameworks, pages, and APIs..."
        rows={5}
        disabled={disabled}
      />

      <div className="example-prompts">
        <span className="example-label">Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            type="button"
            className="example-chip"
            onClick={() => setPrompt(ex.prompt)}
            disabled={disabled}
          >
            {ex.label}
          </button>
        ))}
      </div>

      <div className="prompt-actions">
        <span className="prompt-hint">
          {trimmedPrompt.length > 0 && trimmedPrompt.length < 10 && (
            <span style={{ color: "var(--error)", fontWeight: 500 }}>
              Too short (min 10 chars)
            </span>
          )}
          {trimmedPrompt.length > 2000 && (
            <span style={{ color: "var(--error)", fontWeight: 500 }}>
              Too long (max 2000 chars)
            </span>
          )}
          {!disabled && isValidLength && (
            <span>
              Press <code>Ctrl/⌘ + Enter</code> to generate
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !isValidLength}
        >
          {disabled ? "Generating..." : "Generate project"}
        </button>
      </div>
    </div>
  )
}
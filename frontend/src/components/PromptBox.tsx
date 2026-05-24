import { useState } from "react"

interface Props {
  onSubmit: (prompt: string) => void
  disabled?: boolean
}

export default function PromptBox({ onSubmit, disabled }: Props) {
  const [prompt, setPrompt] = useState("")

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

  return (
    <div className="prompt-box">
      <textarea
        className="prompt-input"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe the app you want, what it should do, and any frameworks or APIs it should use..."
        rows={5}
        disabled={disabled}
      />

      <div className="prompt-actions">
        <span className="prompt-hint">
          {trimmedPrompt.length > 0 && trimmedPrompt.length < 10 && (
            <span style={{ color: "#f87171", marginRight: "8px", fontWeight: 500 }}>
              Prompt is too short (min 10 chars, current: {trimmedPrompt.length})
            </span>
          )}
          {trimmedPrompt.length > 2000 && (
            <span style={{ color: "#f87171", marginRight: "8px", fontWeight: 500 }}>
              Prompt is too long (max 2000 chars, current: {trimmedPrompt.length})
            </span>
          )}
          {!disabled && isValidLength && (
            <span>Press <code>Ctrl ⌃ / Cmd ⌘ + Enter</code> to generate.</span>
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
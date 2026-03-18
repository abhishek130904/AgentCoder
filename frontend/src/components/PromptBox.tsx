import { useState } from "react"

interface Props {
  onSubmit: (prompt: string) => void
  disabled?: boolean
}

export default function PromptBox({ onSubmit, disabled }: Props) {
  const [prompt, setPrompt] = useState("")

  const handleSubmit = () => {
    if (!prompt.trim() || disabled) return
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
          Press <code>Ctrl ⌃ / Cmd ⌘ + Enter</code> to generate.
        </span>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !prompt.trim()}
        >
          {disabled ? "Generating..." : "Generate project"}
        </button>
      </div>
    </div>
  )
}
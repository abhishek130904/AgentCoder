import Editor from "@monaco-editor/react"

interface Props {
  code: string
  fileName?: string
}

function guessLanguage(fileName?: string) {
  if (!fileName) return "text"
  const lower = fileName.toLowerCase()

  if (lower.endsWith(".ts") || lower.endsWith(".tsx")) return "typescript"
  if (lower.endsWith(".js") || lower.endsWith(".jsx")) return "javascript"
  if (lower.endsWith(".json")) return "json"
  if (lower.endsWith(".py")) return "python"
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html"
  if (lower.endsWith(".css") || lower.endsWith(".scss")) return "css"
  if (lower.endsWith(".md") || lower.endsWith(".mdx")) return "markdown"

  return "text"
}

export default function CodeViewer({ code, fileName }: Props) {
  const language = guessLanguage(fileName)

  if (!code && !fileName) {
    return (
      <div className="code-empty">
        <p>Select a file from the explorer to preview its contents.</p>
      </div>
    )
  }

  if (!code && fileName) {
    return (
      <div className="code-empty">
        <p>We could not display this file yet. Try reopening it.</p>
      </div>
    )
  }

  return (
    <div className="code-viewer">
      {fileName && (
        <div className="code-header">
          <span className="code-filename">{fileName}</span>
        </div>
      )}
      <Editor
        height="500px"
        language={language}
        value={code}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          wordWrap: "on",
          readOnly: true,
          lineNumbers: "on"
        }}
      />
    </div>
  )
}
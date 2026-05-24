import { useState, useEffect } from "react"
import Editor from "@monaco-editor/react"

interface Props {
  code: string
  fileName?: string
  fileContents?: Record<string, string>
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

function inlineHtml(html: string, fileContents: Record<string, string>): string {
  let inlined = html

  // 1. Inline CSS stylesheets: <link rel="stylesheet" href="style.css">
  const cssRegex = /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']\s*([^"']+)\s*["'][^>]*>/gi
  inlined = inlined.replace(cssRegex, (match, href) => {
    const cleanHref = href.replace(/^\.\//, "").replace(/^\//, "").trim()
    const cssContent = fileContents[cleanHref]
    if (cssContent) {
      return `<style>\n${cssContent}\n</style>`
    }
    return match
  })

  // 2. Inline JS scripts: <script src="script.js"></script>
  const jsRegex = /<script\s+[^>]*src=["']\s*([^"']+)\s*["'][^>]*><\/script>/gi
  inlined = inlined.replace(jsRegex, (match, src) => {
    const cleanSrc = src.replace(/^\.\//, "").replace(/^\//, "").trim()
    const jsContent = fileContents[cleanSrc]
    if (jsContent) {
      return `<script>\n${jsContent}\n</script>`
    }
    return match
  })

  return inlined
}

export default function CodeViewer({ code, fileName, fileContents = {} }: Props) {
  const [tab, setTab] = useState<"code" | "preview">("code")
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const language = guessLanguage(fileName)
  const isHtml = language === "html"

  // Reset tab to code if file changes
  useEffect(() => {
    setTab("code")
  }, [fileName])

  // Fix the render-revoke cycle bug: create/revoke URL inside useEffect
  useEffect(() => {
    if (isHtml && tab === "preview" && code) {
      const processedHtml = inlineHtml(code, fileContents)
      const blob = new Blob([processedHtml], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)

      return () => {
        URL.revokeObjectURL(url)
      }
    } else {
      setPreviewUrl("")
    }
  }, [isHtml, tab, code, fileContents])

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
          {isHtml && (
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                className={`code-header-tab ${tab === "code" ? "active" : ""}`}
                onClick={() => setTab("code")}
              >
                💻 Code
              </button>
              <button
                type="button"
                className={`code-header-tab ${tab === "preview" ? "active" : ""}`}
                onClick={() => setTab("preview")}
              >
                👁️ Preview
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "preview" && previewUrl ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div className="preview-toolbar">
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="preview-btn"
                onClick={() => setTab("code")}
              >
                ⬅️ Back to Code
              </button>
              <button
                type="button"
                className="preview-btn"
                onClick={() => {
                  // Force a reload by clearing and rebuilding the blob
                  const currentUrl = previewUrl
                  setPreviewUrl("")
                  setTimeout(() => setPreviewUrl(currentUrl), 50)
                }}
              >
                🔄 Reload Preview
              </button>
            </div>
            <span style={{ opacity: 0.6, fontSize: "11px" }}>Sandboxed Live Preview</span>
          </div>
          <iframe
            src={previewUrl}
            title="Live HTML Preview"
            sandbox="allow-scripts"
            style={{
              width: "100%",
              height: "500px",
              border: "none",
              borderRadius: "8px",
              background: "#ffffff",
            }}
          />
        </div>
      ) : (
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
            lineNumbers: "on",
            theme: "vs-dark",
          }}
        />
      )}
    </div>
  )
}
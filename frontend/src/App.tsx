import { Suspense, lazy, useState } from "react"
import PromptBox from "./components/PromptBox"
import FileExplorer from "./components/FileExp"
import "./App.css"

import {
  createProject,
  getStatus,
  getFiles,
  getFileContent,
  downloadProject
} from "./api/api"

const CodeViewer = lazy(() => import("./components/CodeViewer"))

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

function App() {
  const [jobId, setJobId] = useState("")
  const [files, setFiles] = useState<string[]>([])
  const [code, setCode] = useState("")
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [statusMessage, setStatusMessage] = useState(
    "Describe the app you want and we will scaffold it for you."
  )
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async (prompt: string) => {
    const trimmed = prompt.trim()
    if (!trimmed || isGenerating) return

    setIsGenerating(true)
    setError(null)
    setStatusMessage("Sending your idea to the generator...")
    setFiles([])
    setCode("")
    setSelectedFile(null)
    setJobId("")

    try {
      const res = await createProject(trimmed)
      const id =
        (res.data && (res.data.job_id || res.data.id || res.data.jobId)) || ""

      if (!id) {
        throw new Error("Missing job id from API response")
      }

      setJobId(id)
      setStatusMessage("Planning and generating the project…")

      // Poll backend status + files until job completes or fails.
      const maxPollMs = 90_000
      const intervalMs = 2_000
      let elapsed = 0

      // eslint-disable-next-line no-constant-condition
      while (true) {
        // eslint-disable-next-line no-await-in-loop
        const [statusRes, filesRes] = await Promise.all([
          getStatus(id).catch(() => null),
          getFiles(id).catch(() => null)
        ])

        const jobStatus = statusRes?.data?.status as
          | "pending"
          | "running"
          | "completed"
          | "failed"
          | undefined

        const list: string[] = (filesRes?.data?.files as string[]) || []

        if (list.length > 0) {
          setFiles((prev) => {
            const merged = new Set([...prev, ...list])
            return Array.from(merged).sort()
          })
        }

        if (jobStatus === "failed") {
          const message =
            (statusRes?.data?.error as string) ||
            "The generator failed while creating the project."
          setError(message)
          setStatusMessage("Generation failed. Adjust your prompt and try again.")
          break
        }

        if (jobStatus === "completed") {
          setStatusMessage("Project ready. Pick a file on the left.")
          break
        }

        elapsed += intervalMs
        if (elapsed >= maxPollMs) {
          setStatusMessage(
            "The generator is still working. You can wait a bit longer or try a simpler prompt."
          )
          break
        }

        // eslint-disable-next-line no-await-in-loop
        await sleep(intervalMs)
      }
    } catch (err) {
      console.error(err)
      setError(
        "Something went wrong while generating the project. Please try again."
      )
      setStatusMessage("We could not complete the last request.")
    } finally {
      setIsGenerating(false)
    }
  }

  const openFile = async (file: string) => {
    if (!jobId || !file) return

    setSelectedFile(file)
    setStatusMessage(`Loading "${file}"...`)
    setError(null)

    try {
      const res = await getFileContent(jobId, file)
      setCode(res.data.content || "")
      setStatusMessage(`Viewing "${file}"`)
    } catch (err) {
      console.error(err)
      setError("Unable to load that file. Please try another one.")
      setStatusMessage("We could not load that file.")
    }
  }

  const handleDownload = () => {
    if (!jobId || isDownloading) return

    setIsDownloading(true)
    try {
      window.open(downloadProject(jobId), "_blank", "noopener,noreferrer")
    } finally {
      setIsDownloading(false)
    }
  }

  const hasFiles = files.length > 0

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-title-row">
          <h1>AI Project Generator</h1>
          <span className="app-badge">Experimental workspace</span>
        </div>
        <p className="app-subtitle">
          Turn a natural-language idea into a ready-to-explore codebase. Tweak
          the prompt, inspect files, and download the entire project when
          you&apos;re happy.
        </p>
      </header>

      <main className="app-layout">
        <section className="left-column">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Prompt</span>
              <span className="card-caption">
                Describe the product, tech stack, and constraints.
              </span>
            </div>

            <PromptBox
              onSubmit={handleGenerate}
              disabled={isGenerating}
            />

            <div className="status-row">
              <span className="status-pill">
                <span
                  className={`status-dot ${
                    error ? "error" : isGenerating ? "loading" : "idle"
                  }`}
                />
                <span className="status-text">
                  {error
                    ? "Request failed"
                    : isGenerating
                      ? "Generating..."
                      : "Ready"}
                </span>
              </span>
              <span className="status-aux">{statusMessage}</span>
            </div>

            {error && (
              <div className="error-banner">
                <span className="error-label">Error</span>
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="card">
            <div className="download-row">
              <div>
                <div className="card-title">Download project</div>
                <p className="download-help">
                  We&apos;ll bundle the generated files into a zip archive.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownload}
                disabled={!jobId || !hasFiles || isDownloading}
              >
                {isDownloading ? "Preparing..." : "Download zip"}
              </button>
            </div>
            <div className="status-row">
              <span className="pill-counter">
                {hasFiles ? `${files.length} files` : "No files yet"}
              </span>
              {!jobId && (
                <span className="status-aux">
                  Generate a project first to enable download.
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <span className="card-title">Project explorer</span>
            <span className="card-caption">
              Browse the generated files and inspect their contents.
            </span>
          </div>

          <div className="app-layout">
            <FileExplorer
              files={files}
              onSelect={openFile}
              selectedFile={selectedFile}
              isLoading={isGenerating && !hasFiles}
            />

            <Suspense
              fallback={
                <div className="code-empty">
                  <p>Loading code viewer…</p>
                </div>
              }
            >
              <CodeViewer
                code={code}
                fileName={selectedFile || undefined}
              />
            </Suspense>
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <span>Tip: be specific about frameworks, pages, and APIs.</span>
        <span>Frontend powered by React &amp; Vite.</span>
      </footer>
    </div>
  )
}

export default App
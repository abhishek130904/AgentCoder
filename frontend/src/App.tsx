import { Suspense, lazy, useState, useRef } from "react"
import PromptBox from "./components/PromptBox"
import FileExplorer from "./components/FileExp"
import ProgressPipeline from "./components/ProgressPipeline"
import PlanPreview from "./components/PlanPreview"
import GenerationStats from "./components/GenerationStats"
import HistoryDropdown, { saveToHistory } from "./components/HistoryDropdown"
import ToastContainer, { showToast } from "./components/Toast"
import "./App.css"

import {
  createProject,
  getStatus,
  getFiles,
  getFileContent,
  downloadProject,
} from "./api/api"

const CodeViewer = lazy(() => import("./components/CodeViewer"))

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

function App() {
  const [jobId, setJobId] = useState("")
  const [files, setFiles] = useState<string[]>([])
  const [code, setCode] = useState("")
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContents, setFileContents] = useState<Record<string, string>>({})

  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [statusMessage, setStatusMessage] = useState(
    "Describe the app you want and we'll scaffold it for you."
  )
  const [error, setError] = useState<string | null>(null)

  // Pipeline stage tracking
  const [stage, setStage] = useState("pending")
  const [codingStep, setCodingStep] = useState(0)
  const [codingTotal, setCodingTotal] = useState(0)
  const [plan, setPlan] = useState<any>(null)
  const [genDuration, setGenDuration] = useState(0)
  const startTimeRef = useRef<number>(0)

  // History prompt injection
  const [historyPrompt, setHistoryPrompt] = useState("")

  const handleGenerate = async (prompt: string) => {
    const trimmed = prompt.trim()
    if (!trimmed || isGenerating) return

    setIsGenerating(true)
    setError(null)
    setStatusMessage("Sending your idea to the generator...")
    setFiles([])
    setCode("")
    setSelectedFile(null)
    setFileContents({})
    setJobId("")
    setStage("pending")
    setCodingStep(0)
    setCodingTotal(0)
    setPlan(null)
    setGenDuration(0)
    startTimeRef.current = Date.now()

    try {
      const res = await createProject(trimmed)
      const id =
        (res.data && (res.data.job_id || res.data.id || res.data.jobId)) || ""

      if (!id) {
        throw new Error("Missing job id from API response")
      }

      setJobId(id)
      setStatusMessage("Planning and generating the project…")
      showToast("Generation started!", "info")

      // Poll backend status + files until job completes or fails.
      const maxPollMs = 180_000
      const intervalMs = 2_000
      let elapsed = 0

      // eslint-disable-next-line no-constant-condition
      while (true) {
        // eslint-disable-next-line no-await-in-loop
        const [statusRes, filesRes] = await Promise.all([
          getStatus(id).catch(() => null),
          getFiles(id).catch(() => null),
        ])

        const jobData = statusRes?.data
        const jobStatus = jobData?.status as
          | "pending"
          | "running"
          | "completed"
          | "failed"
          | undefined

        // Update pipeline stage
        if (jobData?.stage) {
          setStage(jobData.stage)
        }
        if (jobData?.coding_step) {
          setCodingStep(jobData.coding_step)
        }
        if (jobData?.coding_total) {
          setCodingTotal(jobData.coding_total)
        }
        if (jobData?.plan && !plan) {
          setPlan(jobData.plan)
        }

        // Update status message based on stage
        const currentStage = jobData?.stage || "pending"
        if (currentStage === "planning") {
          setStatusMessage("🧠 Planning your project architecture...")
        } else if (currentStage === "architecting") {
          setStatusMessage("📐 Breaking plan into implementation tasks...")
        } else if (currentStage === "coding") {
          const step = jobData?.coding_step || 0
          const total = jobData?.coding_total || 0
          setStatusMessage(
            `⚡ Writing code — file ${step} of ${total}...`
          )
        } else if (currentStage === "reviewing") {
          setStatusMessage("🔍 Reviewing generated code for quality...")
        }

        const list: string[] = (filesRes?.data?.files as string[]) || []

        if (list.length > 0) {
          setFiles((prev) => {
            const merged = new Set([...prev, ...list])
            return Array.from(merged).sort()
          })
        }

        if (jobStatus === "failed") {
          const message =
            (jobData?.error as string) ||
            "The generator failed while creating the project."
          setError(message)
          setStatusMessage(
            "Generation failed. Adjust your prompt and try again."
          )
          setStage("failed")
          showToast("Generation failed", "error")

          saveToHistory({
            id,
            prompt: trimmed,
            timestamp: Date.now(),
            fileCount: 0,
            status: "failed",
          })
          break
        }

        if (jobStatus === "completed") {
          const duration = Math.round(
            (Date.now() - startTimeRef.current) / 1000
          )
          setGenDuration(duration)
          setStage("done")
          setStatusMessage("Project ready! Pick a file on the left.")
          showToast(
            `Project generated in ${duration}s with ${list.length || files.length} files!`,
            "success"
          )

          // Fetch all file contents
          const contents: Record<string, string> = {}
          const finalFileList = list.length > 0 ? list : files
          await Promise.all(
            finalFileList.map(async (file) => {
              try {
                const contentRes = await getFileContent(id, file)
                contents[file] = contentRes.data.content || ""
              } catch (e) {
                console.error(e)
              }
            })
          )
          setFileContents(contents)

          // Auto-select index.html or first HTML file, fallback to first file
          const htmlFile =
            finalFileList.find((f) => f.endsWith("index.html")) ||
            finalFileList.find((f) => f.endsWith(".html")) ||
            finalFileList[0]

          if (htmlFile) {
            setSelectedFile(htmlFile)
            setCode(contents[htmlFile] || "")
          }

          saveToHistory({
            id,
            prompt: trimmed,
            timestamp: Date.now(),
            fileCount: finalFileList.length,
            status: "completed",
          })
          break
        }

        elapsed += intervalMs
        if (elapsed >= maxPollMs) {
          setStatusMessage(
            "Still working — you can wait longer or try a simpler prompt."
          )
          break
        }

        // eslint-disable-next-line no-await-in-loop
        await sleep(intervalMs)
      }
    } catch (err: any) {
      console.error(err)
      let msg =
        "Something went wrong while generating the project. Please try again."
      if (err.response?.status === 422 && err.response?.data?.detail) {
        const details = err.response.data.detail
        if (Array.isArray(details) && details.length > 0) {
          msg = `Validation Error: ${details.map((d: any) => d.msg).join(", ")}`
        } else if (typeof details === "string") {
          msg = `Validation Error: ${details}`
        }
      }
      setError(msg)
      setStatusMessage("We could not complete the last request.")
      showToast("Request failed", "error")
    } finally {
      setIsGenerating(false)
    }
  }

  const openFile = async (file: string) => {
    if (!jobId || !file) return

    setSelectedFile(file)
    setError(null)

    // Check if we have the content cached in state
    if (fileContents[file] !== undefined) {
      setCode(fileContents[file])
      setStatusMessage(`Viewing "${file}"`)
      return
    }

    setStatusMessage(`Loading "${file}"...`)
    try {
      const res = await getFileContent(jobId, file)
      const content = res.data.content || ""
      setCode(content)
      setFileContents((prev) => ({ ...prev, [file]: content }))
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
      showToast("Download started!", "success")
    } finally {
      setIsDownloading(false)
    }
  }

  const hasFiles = files.length > 0

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-title-row">
          <h1>
            <span className="app-logo">🤖</span>
            CoderBuddy
          </h1>
          <span className="app-badge">AI-Powered</span>
          <div style={{ marginLeft: "auto" }}>
            <HistoryDropdown onSelect={setHistoryPrompt} />
          </div>
        </div>
        <p className="app-subtitle">
          Turn a natural-language idea into a ready-to-explore codebase.
          Describe what you want, inspect the generated files, and download the
          project.
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
              initialPrompt={historyPrompt}
            />

            {/* Pipeline Progress */}
            {isGenerating && (
              <ProgressPipeline
                currentStage={stage}
                codingStep={codingStep}
                codingTotal={codingTotal}
              />
            )}

            {/* Plan Preview */}
            {plan && isGenerating && <PlanPreview plan={plan} />}

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

            {/* Generation Stats */}
            {!isGenerating && genDuration > 0 && hasFiles && (
              <div style={{ marginTop: "10px" }}>
                <GenerationStats
                  duration={genDuration}
                  fileCount={files.length}
                />
              </div>
            )}
          </div>

          <div className="card">
            <div className="download-row">
              <div>
                <div className="card-title">Download project</div>
                <p className="download-help">
                  Bundle the generated files into a zip archive.
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
                fileContents={fileContents}
              />
            </Suspense>
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <span>💡 Tip: be specific about frameworks, pages, and APIs.</span>
        <span>Built with React, Vite & LangGraph</span>
      </footer>

      <ToastContainer />
    </div>
  )
}

export default App
import { useState, useRef, useEffect } from "react"

interface HistoryEntry {
  id: string
  prompt: string
  timestamp: number
  fileCount: number
  status: "completed" | "failed"
}

const STORAGE_KEY = "coderbuddy-history"

export function saveToHistory(entry: HistoryEntry) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const history: HistoryEntry[] = raw ? JSON.parse(raw) : []
    history.unshift(entry)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 10)))
  } catch {
    // localStorage might be unavailable
  }
}

export function getHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

interface Props {
  onSelect: (prompt: string) => void
}

export default function HistoryDropdown({ onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) setHistory(getHistory())
  }, [open])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="history-btn"
        onClick={() => setOpen(!open)}
      >
        🕐 History
      </button>

      {open && (
        <div className="history-dropdown">
          {history.length === 0 ? (
            <div className="history-empty">No past generations yet.</div>
          ) : (
            history.map((entry) => (
              <button
                key={entry.id + entry.timestamp}
                type="button"
                className="history-item"
                onClick={() => {
                  onSelect(entry.prompt)
                  setOpen(false)
                }}
              >
                <span>{entry.status === "completed" ? "🟢" : "🔴"}</span>
                <span className="history-prompt">{entry.prompt}</span>
                <span className="history-time">{timeAgo(entry.timestamp)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

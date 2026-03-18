interface Props {
  files: string[]
  onSelect: (file: string) => void
  selectedFile?: string | null
  isLoading?: boolean
}

export default function FileExplorer({
  files,
  onSelect,
  selectedFile,
  isLoading
}: Props) {
  const hasFiles = files.length > 0

  return (
    <div className="file-explorer">
      <div className="file-explorer-header">
        <span className="file-explorer-title">Files</span>
        {hasFiles && (
          <span className="file-explorer-count">
            {files.length} file{files.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="file-explorer-body">
        {isLoading && !hasFiles && (
          <div className="file-empty">Generating files…</div>
        )}

        {!isLoading && !hasFiles && (
          <div className="file-empty">
            No files yet. Generate a project to see the structure here.
          </div>
        )}

        {hasFiles && (
          <ul className="file-list">
            {files.map((file) => {
              const isActive = file === selectedFile

              return (
                <li key={file}>
                  <button
                    type="button"
                    className={`file-item ${isActive ? "active" : ""}`}
                    onClick={() => onSelect(file)}
                    title={file}
                  >
                    <span className="file-name">{file}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
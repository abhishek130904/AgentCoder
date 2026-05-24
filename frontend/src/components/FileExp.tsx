interface Props {
  files: string[]
  onSelect: (file: string) => void
  selectedFile?: string | null
  isLoading?: boolean
}

type TreeNode = {
  name: string
  path: string
  children?: TreeNode[]
}

function buildTree(files: string[]): TreeNode[] {
  const root: Record<string, TreeNode> = {}

  files.forEach((fullPath) => {
    const parts = fullPath.split(/[\\/]/)
    let currentLevel = root
    let accumulated = ""

    parts.forEach((part, index) => {
      accumulated = accumulated ? `${accumulated}/${part}` : part
      if (!currentLevel[part]) {
        currentLevel[part] = {
          name: part,
          path: accumulated,
          children: index === parts.length - 1 ? undefined : {}
        } as TreeNode & { children: Record<string, TreeNode> }
      }
      const node = currentLevel[part] as TreeNode & { children?: Record<string, TreeNode> }
      if (node.children && index < parts.length - 1) {
        currentLevel = node.children
      }
    })
  })

  const toArray = (nodes: Record<string, TreeNode>): TreeNode[] =>
    Object.values(nodes)
      .map((n) => {
        const maybeChildren = (n as TreeNode & { children?: Record<string, TreeNode> }).children
        if (!maybeChildren) return { name: n.name, path: n.path }
        return {
          name: n.name,
          path: n.path,
          children: toArray(maybeChildren)
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))

  return toArray(root)
}

function FileTree({
  nodes,
  selectedFile,
  onSelect
}: {
  nodes: TreeNode[]
  selectedFile?: string | null
  onSelect: (file: string) => void
}) {
  return (
    <ul className="file-list">
      {nodes.map((node) => {
        const isLeaf = !node.children || node.children.length === 0
        const isActive = selectedFile === node.path

        if (isLeaf) {
          return (
            <li key={node.path}>
              <button
                type="button"
                className={`file-item ${isActive ? "active" : ""}`}
                onClick={() => onSelect(node.path)}
                title={node.path}
              >
                <span className="file-icon file-icon-file" />
                <span className="file-name">{node.name}</span>
              </button>
            </li>
          )
        }

        return (
          <li
            key={node.path}
            className="file-folder"
          >
            <div className="file-folder-header">
              <span className="file-icon file-icon-folder" />
              <span className="file-name">{node.name}</span>
            </div>
            {node.children && node.children.length > 0 && (
              <FileTree
                nodes={node.children}
                selectedFile={selectedFile}
                onSelect={onSelect}
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default function FileExplorer({
  files,
  onSelect,
  selectedFile,
  isLoading
}: Props) {
  const hasFiles = files.length > 0
  const tree = hasFiles ? buildTree(files) : []

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
          <FileTree
            nodes={tree}
            selectedFile={selectedFile}
            onSelect={onSelect}
          />
        )}
      </div>
    </div>
  )
}
interface Props {
  duration: number  // seconds
  fileCount: number
}

export default function GenerationStats({ duration, fileCount }: Props) {
  if (fileCount === 0) return null

  return (
    <div className="gen-stats">
      <span>✅ Generated in {duration}s</span>
      <span>│</span>
      <span>📁 {fileCount} files</span>
      <span>│</span>
      <span>🤖 4 agents</span>
    </div>
  )
}

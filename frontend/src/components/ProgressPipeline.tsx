interface Props {
  currentStage: string
  codingStep: number
  codingTotal: number
}

const STAGES = [
  { key: "planning", label: "Planning" },
  { key: "architecting", label: "Architecting" },
  { key: "coding", label: "Coding" },
  { key: "reviewing", label: "Reviewing" },
  { key: "done", label: "Done" },
]

const STAGE_ORDER = STAGES.map((s) => s.key)

function getStepState(
  stageKey: string,
  currentStage: string
): "pending" | "active" | "completed" {
  const currentIdx = STAGE_ORDER.indexOf(currentStage)
  const stepIdx = STAGE_ORDER.indexOf(stageKey)

  // Handle intermediate stages
  if (currentStage === "planning_done") {
    return stepIdx === 0 ? "completed" : "pending"
  }
  if (currentStage === "architecting_done") {
    return stepIdx <= 1 ? "completed" : "pending"
  }

  if (stepIdx < currentIdx) return "completed"
  if (stepIdx === currentIdx) return "active"
  return "pending"
}

export default function ProgressPipeline({
  currentStage,
  codingStep,
  codingTotal,
}: Props) {
  if (!currentStage || currentStage === "pending") return null

  return (
    <div className="pipeline">
      {STAGES.map((stage) => {
        const state = getStepState(stage.key, currentStage)
        return (
          <div key={stage.key} className={`pipeline-step ${state}`}>
            <div className="pipeline-dot" />
            <span>{stage.label}</span>
            {stage.key === "coding" &&
              currentStage === "coding" &&
              codingTotal > 0 && (
                <span className="pipeline-sub">
                  {codingStep}/{codingTotal}
                </span>
              )}
          </div>
        )
      })}
    </div>
  )
}

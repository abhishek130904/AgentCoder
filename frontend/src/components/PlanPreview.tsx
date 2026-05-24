interface PlanData {
  name: string
  description: string
  techstack: string
  features: string[]
  files: { path: string; purpose: string }[]
}

interface Props {
  plan: PlanData | null
}

export default function PlanPreview({ plan }: Props) {
  if (!plan) return null

  return (
    <div className="plan-preview">
      <h3>📋 Project Plan</h3>
      <div className="plan-meta">
        <span className="plan-tag">{plan.name}</span>
        <span className="plan-tag">{plan.techstack}</span>
        <span className="plan-tag">{plan.files?.length || 0} files</span>
      </div>
      {plan.features && plan.features.length > 0 && (
        <ul className="plan-features">
          {plan.features.slice(0, 6).map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

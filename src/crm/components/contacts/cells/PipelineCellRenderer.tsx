import type { ICellRendererParams } from 'ag-grid-community'
import { theme } from '../../../config/theme'
import type { Contact } from '../../../types'

// Pipeline steps in order from earliest to deepest
const PIPELINE_STEPS = [
  { key: 'meeting_booked', label: 'Meeting Booked', color: '#a78bfa' },
  { key: 'showed_up_to_disco', label: 'Showed to Disco', color: '#c084fc' },
  { key: 'qualified', label: 'Qualified', color: '#fbbf24' },
  { key: 'demo_booked', label: 'Demo Booked', color: '#fb923c' },
  { key: 'showed_up_to_demo', label: 'Showed to Demo', color: '#f97316' },
  { key: 'proposal_sent', label: 'Proposal Sent', color: '#2dd4bf' },
  { key: 'closed', label: 'Closed Won', color: '#22c55e' },
] as const

interface PipelineCellRendererProps extends ICellRendererParams {
  data: Contact
}

export function PipelineCellRenderer({ data }: PipelineCellRendererProps) {
  // Find the deepest completed step
  let deepestStep: typeof PIPELINE_STEPS[number] | null = null

  for (const step of PIPELINE_STEPS) {
    if (data[step.key as keyof Contact]) {
      deepestStep = step
    }
  }

  if (!deepestStep) {
    return (
      <span
        style={{
          fontSize: theme.fontSize.sm,
          color: theme.text.muted,
        }}
      >
        No progress
      </span>
    )
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        backgroundColor: `${deepestStep.color}15`,
        borderRadius: theme.radius.md,
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.medium,
          color: deepestStep.color,
          whiteSpace: 'nowrap',
        }}
      >
        {deepestStep.label}
      </span>
    </div>
  )
}

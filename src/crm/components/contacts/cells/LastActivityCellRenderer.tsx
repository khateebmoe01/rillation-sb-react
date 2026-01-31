import type { ICellRendererParams } from 'ag-grid-community'

export function LastActivityCellRenderer(props: ICellRendererParams) {
  if (!props.value) return <span className="text-rillation-text-muted">-</span>

  const date = new Date(props.value)
  const formatted = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <span className="text-rillation-text-muted text-sm">
      {formatted}
    </span>
  )
}

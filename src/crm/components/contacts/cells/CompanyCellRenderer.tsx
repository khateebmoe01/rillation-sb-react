import type { ICellRendererParams } from 'ag-grid-community'

export function CompanyCellRenderer(props: ICellRendererParams) {
  return (
    <span className="text-rillation-text-muted">
      {props.value || '-'}
    </span>
  )
}

import type { ICellRendererParams } from 'ag-grid-community'

export function NameCellRenderer(props: ICellRendererParams) {
  return (
    <span className="font-medium text-white">
      {props.value || '-'}
    </span>
  )
}

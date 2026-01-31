import type { ICellRendererParams } from 'ag-grid-community'
import { MoreHorizontal } from 'lucide-react'

export function ActionsCellRenderer(_props: ICellRendererParams) {
  return (
    <button className="p-1 text-rillation-text-muted hover:text-white rounded">
      <MoreHorizontal size={16} />
    </button>
  )
}

import type { ICellRendererParams } from 'ag-grid-community'
import { theme } from '../../../config/theme'
import type { Contact } from '../../../types'
import { CONTACT_STAGE_INFO, getContactStatus } from '../../../types'

interface StageCellRendererProps extends ICellRendererParams {
  data: Contact
}

export function StageCellRenderer({ data }: StageCellRendererProps) {
  // Use getContactStatus to derive the actual stage from pipeline flags
  const status = getContactStatus(data)
  const stageInfo = CONTACT_STAGE_INFO[status]

  if (!stageInfo) {
    return (
      <span style={{ fontSize: theme.fontSize.sm, color: theme.text.muted }}>
        —
      </span>
    )
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 10px',
        backgroundColor: stageInfo.bgColor,
        borderRadius: theme.radius.full,
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: theme.radius.full,
          backgroundColor: stageInfo.color,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.medium,
          color: stageInfo.color,
          whiteSpace: 'nowrap',
        }}
      >
        {stageInfo.label}
      </span>
    </div>
  )
}

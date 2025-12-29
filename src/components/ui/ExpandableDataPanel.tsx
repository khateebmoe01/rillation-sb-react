import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { formatNumber } from '../../lib/supabase'

interface Column {
  key: string
  label: string
  format?: 'date' | 'datetime' | 'number' | 'text'
}

interface ExpandableDataPanelProps {
  title: string
  data: Record<string, any>[]
  columns: Column[]
  totalCount: number
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
  onClose: () => void
  isOpen: boolean
  onRowClick?: (row: Record<string, any>) => void
}

export default function ExpandableDataPanel({
  title,
  data,
  columns,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onClose,
  isOpen,
  onRowClick,
}: ExpandableDataPanelProps) {
  if (!isOpen) return null

  const totalPages = Math.ceil(totalCount / pageSize)
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalCount)

  const formatValue = (value: any, format?: string): string => {
    if (value === null || value === undefined) return '-'
    
    switch (format) {
      case 'date': {
        // Parse date string without timezone conversion
        const dateStr = typeof value === 'string' ? value.split('T')[0] : value
        const [year, month, day] = dateStr.split('-').map(Number)
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return `${monthNames[month - 1]} ${day}, ${year}`
      }
      case 'datetime': {
        // For datetime, create Date in local timezone
        const dateStr = typeof value === 'string' ? value : value.toString()
        if (dateStr.includes('T')) {
          const [datePart, timePart] = dateStr.split('T')
          const [year, month, day] = datePart.split('-').map(Number)
          const date = new Date(year, month - 1, day)
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          const time = timePart.split('.')[0] // Remove milliseconds
          return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}, ${time}`
        }
        return new Date(value).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      }
      case 'number':
        return formatNumber(value)
      default:
        return String(value)
    }
  }

  return (
    <div className="bg-rillation-card rounded-xl border border-rillation-border overflow-hidden fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-rillation-border">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-rillation-text">{title}</h3>
          <span className="text-sm text-rillation-text-muted">
            Showing {startItem} - {endItem} of {totalCount}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-rillation-card-hover rounded-lg transition-colors"
        >
          <X size={20} className="text-rillation-text-muted" />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-rillation-card-hover">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={index}
                className={`border-b border-rillation-border/30 hover:bg-rillation-card-hover transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-rillation-text">
                    {formatValue(row[col.key], col.format)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t border-rillation-border">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-rillation-text-muted hover:text-rillation-text disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === pageNum
                      ? 'bg-rillation-purple text-white'
                      : 'text-rillation-text-muted hover:bg-rillation-card-hover'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>
          
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-rillation-text-muted hover:text-rillation-text disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}


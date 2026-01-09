import { ChevronDown, X } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { CRM_STAGES, LEAD_SOURCES, type CRMFilters as CRMFiltersType } from '../../types/crm'

interface CRMFiltersProps {
  filters: CRMFiltersType
  onFiltersChange: (filters: CRMFiltersType) => void
  uniqueAssignees: string[]
}

export default function CRMFilters({ filters, onFiltersChange, uniqueAssignees }: CRMFiltersProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleStageToggle = (stageId: string) => {
    const currentStages = filters.stage || []
    const newStages = currentStages.includes(stageId)
      ? currentStages.filter((s) => s !== stageId)
      : [...currentStages, stageId]
    
    onFiltersChange({
      ...filters,
      stage: newStages.length > 0 ? newStages : undefined,
    })
  }

  const handleAssigneeChange = (assignee: string | undefined) => {
    onFiltersChange({ ...filters, assignee })
    setOpenDropdown(null)
  }

  const handleLeadSourceChange = (source: string | undefined) => {
    onFiltersChange({ ...filters, leadSource: source })
    setOpenDropdown(null)
  }

  const clearFilters = () => {
    onFiltersChange({})
  }

  const hasFilters = filters.stage?.length || filters.assignee || filters.leadSource

  return (
    <div ref={containerRef} className="flex items-center gap-2 mt-4 flex-wrap">
      {/* Stage Filter */}
      <div className="relative">
        <button
          onClick={() => setOpenDropdown(openDropdown === 'stage' ? null : 'stage')}
          className={`
            flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors
            ${filters.stage?.length
              ? 'bg-crm-card-hover border-crm-text-muted text-crm-text'
              : 'bg-crm-card border-crm-border text-crm-text-muted hover:text-crm-text'
            }
          `}
        >
          Stage
          {filters.stage?.length ? ` (${filters.stage.length})` : ''}
          <ChevronDown size={14} />
        </button>

        {openDropdown === 'stage' && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-crm-card border border-crm-border rounded-lg shadow-xl z-50 py-1 max-h-64 overflow-y-auto">
            {CRM_STAGES.map((stage) => (
              <button
                key={stage.id}
                onClick={() => handleStageToggle(stage.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-crm-card-hover transition-colors"
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    filters.stage?.includes(stage.id)
                      ? 'bg-crm-checkbox border-crm-checkbox'
                      : 'border-crm-border'
                  }`}
                >
                  {filters.stage?.includes(stage.id) && (
                    <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="text-crm-text">{stage.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Assignee Filter */}
      <div className="relative">
        <button
          onClick={() => setOpenDropdown(openDropdown === 'assignee' ? null : 'assignee')}
          className={`
            flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors
            ${filters.assignee
              ? 'bg-crm-card-hover border-crm-text-muted text-crm-text'
              : 'bg-crm-card border-crm-border text-crm-text-muted hover:text-crm-text'
            }
          `}
        >
          {filters.assignee || 'Assignee'}
          <ChevronDown size={14} />
        </button>

        {openDropdown === 'assignee' && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-crm-card border border-crm-border rounded-lg shadow-xl z-50 py-1">
            <button
              onClick={() => handleAssigneeChange(undefined)}
              className="w-full px-3 py-2 text-sm text-left text-crm-text-muted hover:bg-crm-card-hover transition-colors"
            >
              All Assignees
            </button>
            {uniqueAssignees.map((assignee) => (
              <button
                key={assignee}
                onClick={() => handleAssigneeChange(assignee)}
                className={`w-full px-3 py-2 text-sm text-left hover:bg-crm-card-hover transition-colors ${
                  filters.assignee === assignee ? 'text-white bg-crm-card-hover' : 'text-crm-text'
                }`}
              >
                {assignee}
              </button>
            ))}
            {uniqueAssignees.length === 0 && (
              <div className="px-3 py-2 text-sm text-crm-text-muted">
                No assignees yet
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lead Source Filter */}
      <div className="relative">
        <button
          onClick={() => setOpenDropdown(openDropdown === 'source' ? null : 'source')}
          className={`
            flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors
            ${filters.leadSource
              ? 'bg-crm-card-hover border-crm-text-muted text-crm-text'
              : 'bg-crm-card border-crm-border text-crm-text-muted hover:text-crm-text'
            }
          `}
        >
          {filters.leadSource || 'Lead Source'}
          <ChevronDown size={14} />
        </button>

        {openDropdown === 'source' && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-crm-card border border-crm-border rounded-lg shadow-xl z-50 py-1">
            <button
              onClick={() => handleLeadSourceChange(undefined)}
              className="w-full px-3 py-2 text-sm text-left text-crm-text-muted hover:bg-crm-card-hover transition-colors"
            >
              All Sources
            </button>
            {LEAD_SOURCES.map((source) => (
              <button
                key={source}
                onClick={() => handleLeadSourceChange(source)}
                className={`w-full px-3 py-2 text-sm text-left hover:bg-crm-card-hover transition-colors ${
                  filters.leadSource === source ? 'text-white bg-crm-card-hover' : 'text-crm-text'
                }`}
              >
                {source}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Clear Filters */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1 px-2 py-1.5 text-sm text-crm-text-muted hover:text-crm-text transition-colors"
        >
          <X size={14} />
          Clear
        </button>
      )}
    </div>
  )
}

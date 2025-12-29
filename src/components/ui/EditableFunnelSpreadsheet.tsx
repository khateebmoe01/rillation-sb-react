import { useState, useEffect } from 'react'
import { Save, Loader2, Settings, ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Button from './Button'

interface FunnelForecastRow {
  id?: number
  metric_key: string
  estimate_low: number
  estimate_avg: number
  estimate_high: number
  estimate_1: number
  estimate_2: number
  actual: number
  projected: number
}

interface EditableFunnelSpreadsheetProps {
  data: FunnelForecastRow[]
  month: number
  year: number
  onSave?: () => void
}

// Metric rows configuration - organized by stage
const metricRows = [
  { key: 'total_messages_sent', label: 'Total Messages Sent', format: 'number', stage: 'outreach' },
  { key: 'total_leads_contacted', label: 'Total Leads Contacted', format: 'number', stage: 'outreach' },
  { key: 'response_rate', label: 'Response Rate', format: 'percent', stage: 'engagement' },
  { key: 'total_responses', label: 'Total Responses', format: 'number', stage: 'engagement' },
  { key: 'positive_response_rate', label: 'Positive Response Rate', format: 'percent', stage: 'engagement' },
  { key: 'total_pos_response', label: 'Total Positive Responses', format: 'number', stage: 'engagement' },
  { key: 'booked_rate', label: 'Booked Rate', format: 'percent', stage: 'meetings' },
  { key: 'total_booked', label: 'Total Booked', format: 'number', stage: 'meetings' },
  { key: 'meetings_passed', label: 'Meetings Passed', format: 'number', stage: 'meetings' },
  { key: 'show_up_to_disco_rate', label: 'Show Up Rate', format: 'percent', stage: 'discovery' },
  { key: 'total_show_up_to_disco', label: 'Total Show Up to Discovery', format: 'number', stage: 'discovery' },
  { key: 'qualified_rate', label: 'Qualified Rate', format: 'percent', stage: 'discovery' },
  { key: 'total_qualified', label: 'Total Qualified', format: 'number', stage: 'discovery' },
  { key: 'close_rate', label: 'Close Rate', format: 'percent', stage: 'closing' },
  { key: 'total_PILOT_accepted', label: 'Total Pilots Accepted', format: 'number', stage: 'closing' },
  { key: 'LM_converted_to_close', label: 'LM Converted to Close', format: 'percent', stage: 'closing' },
  { key: 'total_deals_closed', label: 'Total Deals Closed', format: 'number', stage: 'closing' },
  { key: 'cost_per_close', label: 'Cost per Close', format: 'currency', stage: 'revenue' },
  { key: 'AVG_CC_per_client', label: 'Avg CC per Client', format: 'currency', stage: 'revenue' },
  { key: 'MRR_added', label: 'MRR Added', format: 'currency', stage: 'revenue' },
]

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

// Simplified columns - Actual first, then Target and Projected
const columns = ['actual', 'estimate_avg', 'projected']
const columnLabels: Record<string, string> = {
  'actual': 'Actual',
  'estimate_avg': 'Target',
  'projected': 'Projected'
}

const stageFilters = [
  { key: 'all', label: 'All Stages' },
  { key: 'outreach', label: 'Outreach' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'discovery', label: 'Discovery' },
  { key: 'closing', label: 'Closing' },
  { key: 'revenue', label: 'Revenue' },
]

export default function EditableFunnelSpreadsheet({ 
  data, 
  month, 
  year,
  onSave 
}: EditableFunnelSpreadsheetProps) {
  const [editedData, setEditedData] = useState<Map<string, FunnelForecastRow>>(new Map())
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [selectedStage, setSelectedStage] = useState('all')

  // Initialize edited data from props
  useEffect(() => {
    const dataMap = new Map<string, FunnelForecastRow>()
    data.forEach((row) => {
      dataMap.set(row.metric_key, { ...row })
    })
    // Fill in missing metrics
    metricRows.forEach((metric) => {
      if (!dataMap.has(metric.key)) {
        dataMap.set(metric.key, {
          metric_key: metric.key,
          estimate_low: 0,
          estimate_avg: 0,
          estimate_high: 0,
          estimate_1: 0,
          estimate_2: 0,
          actual: 0,
          projected: 0,
        })
      }
    })
    setEditedData(dataMap)
    setHasChanges(false)
  }, [data])

  // Format value for display in input (limit decimals, no symbols)
  const formatValueForInput = (value: number, format: string): string => {
    if (value === 0 || value === null || value === undefined) return ''
    
    switch (format) {
      case 'percent':
        // Limit to 2 decimal places for percentages, remove trailing zeros
        const rounded = parseFloat(value.toFixed(2))
        return rounded.toString()
      case 'currency':
        // Whole numbers for currency
        return Math.round(value).toString()
      default:
        // Whole numbers for regular numbers
        return Math.round(value).toString()
    }
  }

  // Handle cell edit
  const handleCellChange = (metricKey: string, column: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value) || 0
    setEditedData((prev) => {
      const newMap = new Map(prev)
      const row = newMap.get(metricKey)
      if (row) {
        newMap.set(metricKey, { ...row, [column]: numValue })
      }
      return newMap
    })
    setHasChanges(true)
  }

  // Handle focus - select all text
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select()
  }

  // Save changes
  const handleSave = async () => {
    setSaving(true)
    try {
      const upsertData = Array.from(editedData.values()).map((row) => ({
        id: row.id,
        month,
        year,
        metric_key: row.metric_key,
        estimate_low: row.estimate_low,
        estimate_avg: row.estimate_avg,
        estimate_high: row.estimate_high,
        estimate_1: row.estimate_1,
        estimate_2: row.estimate_2,
        actual: row.actual,
        projected: row.projected,
      }))

      const { error } = await supabase
        .from('funnel_forecasts')
        .upsert(upsertData as any, { 
          onConflict: 'metric_key,month,year',
          ignoreDuplicates: false 
        })

      if (error) throw error

      setHasChanges(false)
      onSave?.()
    } catch (err) {
      console.error('Error saving:', err)
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  // Filter metrics by stage
  const filteredMetrics = selectedStage === 'all' 
    ? metricRows 
    : metricRows.filter(m => m.stage === selectedStage)

  return (
    <div className="bg-gradient-to-br from-rillation-card to-rillation-bg rounded-xl border border-rillation-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-rillation-border bg-rillation-card/50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-rillation-text">Funnel Breakdown</h3>
            
            {/* Stage Filter Dropdown */}
            <div className="relative">
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 text-sm bg-rillation-bg border border-rillation-border rounded-lg text-rillation-text focus:outline-none focus:border-rillation-purple cursor-pointer"
              >
                {stageFilters.map(filter => (
                  <option key={filter.key} value={filter.key}>{filter.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-rillation-text-muted pointer-events-none" />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-rillation-text-muted">Year:</span>
              <select className="bg-rillation-bg border border-rillation-border rounded px-2 py-1 text-sm text-rillation-text">
                <option value={year}>{year}</option>
              </select>
            </div>
            {hasChanges && (
              <Button 
                variant="primary" 
                size="sm" 
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-rillation-purple to-rillation-magenta">
              <th className="px-4 py-3 text-left text-sm font-medium text-white min-w-[200px]">
                Metric
              </th>
              <th colSpan={3} className="px-4 py-3 text-center text-sm font-medium text-white">
                {monthNames[month - 1]} {year}
              </th>
            </tr>
            <tr className="bg-rillation-card-hover/50">
              <th className="px-4 py-2 text-left text-xs font-medium text-rillation-text-muted"></th>
              {columns.map((col) => (
                <th 
                  key={col}
                  className={`px-4 py-2 text-center text-xs font-medium min-w-[100px] ${
                    col === 'actual' ? 'text-rillation-cyan' : 
                    col === 'projected' ? 'text-rillation-green' : 
                    'text-rillation-purple'
                  }`}
                >
                  {columnLabels[col]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredMetrics.map((row, index) => {
              const rowData = editedData.get(row.key)
              
              return (
                <tr 
                  key={row.key}
                  className={`border-b border-rillation-border/20 transition-colors hover:bg-rillation-card-hover/30 ${
                    index % 2 === 0 ? 'bg-rillation-card/30' : 'bg-rillation-bg/20'
                  }`}
                >
                  <td className="px-4 py-3 text-sm text-rillation-text font-medium">
                    {row.label}
                    <span className="ml-2 text-xs text-rillation-text-muted capitalize">
                      ({row.stage})
                    </span>
                  </td>
                  {columns.map((col) => {
                    const cellValue = rowData?.[col as keyof FunnelForecastRow] ?? 0
                    const displayValue = formatValueForInput(cellValue, row.format)
                    
                    return (
                      <td key={col} className="px-2 py-2">
                        <input
                          type="number"
                          value={displayValue}
                          onChange={(e) => handleCellChange(row.key, col, e.target.value)}
                          onFocus={handleFocus}
                          className={`w-full px-3 py-2 text-sm text-center rounded-lg border transition-all
                            focus:border-rillation-purple focus:outline-none focus:ring-1 focus:ring-rillation-purple/50
                            hover:border-rillation-border
                            ${col === 'actual' 
                              ? 'bg-rillation-cyan/10 border-rillation-cyan/30 text-rillation-cyan font-bold' 
                              : col === 'projected'
                              ? 'bg-rillation-green/10 border-rillation-green/30 text-rillation-green font-medium'
                              : 'bg-rillation-bg/50 border-rillation-border/50 text-rillation-text-muted'
                            }
                          `}
                          step={row.format === 'percent' ? '0.01' : '1'}
                        />
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

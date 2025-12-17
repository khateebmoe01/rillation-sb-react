import { useState, useEffect } from 'react'
import { Save, Loader2 } from 'lucide-react'
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

// Metric rows configuration
const metricRows = [
  { key: 'total_messages_sent', label: 'total messages sent', format: 'number' },
  { key: 'total_leads_contacted', label: 'total leads contacted', format: 'number' },
  { key: 'response_rate', label: '% response rate', format: 'percent' },
  { key: 'total_responses', label: 'total responses', format: 'number' },
  { key: 'positive_response_rate', label: '% positive response', format: 'percent' },
  { key: 'total_pos_response', label: 'total pos response', format: 'number' },
  { key: 'booked_rate', label: '% booked', format: 'percent' },
  { key: 'total_booked', label: 'total booked', format: 'number' },
  { key: 'meetings_passed', label: 'meetings passed', format: 'number' },
  { key: 'show_up_to_disco_rate', label: '% show up to disco', format: 'percent' },
  { key: 'total_show_up_to_disco', label: 'total show up to disco', format: 'number' },
  { key: 'qualified_rate', label: '% qualified', format: 'percent' },
  { key: 'total_qualified', label: 'total qualified', format: 'number' },
  { key: 'close_rate', label: '% close rate', format: 'percent' },
  { key: 'total_PILOT_accepted', label: 'total PILOT accepted', format: 'number' },
  { key: 'LM_converted_to_close', label: 'LM converted to close', format: 'percent' },
  { key: 'total_deals_closed', label: 'total deals closed', format: 'number' },
  { key: 'cost_per_close', label: 'Cost per close', format: 'currency' },
  { key: 'AVG_CC_per_client', label: 'AVG CC per client', format: 'currency' },
  { key: 'MRR_added', label: 'MRR Added', format: 'currency' },
]

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const columns = ['estimate_low', 'estimate_avg', 'estimate_high', 'estimate_1', 'estimate_2', 'actual', 'projected']

export default function EditableFunnelSpreadsheet({ 
  data, 
  month, 
  year,
  onSave 
}: EditableFunnelSpreadsheetProps) {
  const [editedData, setEditedData] = useState<Map<string, FunnelForecastRow>>(new Map())
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

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
        ...row,
        month,
        year,
      }))

      const { error } = await supabase
        .from('funnel_forecasts')
        .upsert(upsertData, { 
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

  return (
    <div className="bg-rillation-card rounded-xl border border-rillation-border overflow-hidden">
      <div className="p-4 border-b border-rillation-border flex items-center justify-between">
        <h3 className="text-lg font-semibold text-rillation-text">Overall Funnel Breakdown</h3>
        <div className="flex items-center gap-4">
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
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-rillation-purple to-rillation-magenta">
              <th className="px-4 py-3 text-left text-sm font-medium text-white min-w-[180px]">
                Metric
              </th>
              <th colSpan={7} className="px-4 py-3 text-center text-sm font-medium text-white">
                {monthNames[month - 1]}
              </th>
            </tr>
            <tr className="bg-rillation-card-hover">
              <th className="px-4 py-2 text-left text-xs font-medium text-rillation-text-muted"></th>
              <th className="px-4 py-2 text-center text-xs font-medium text-rillation-purple">
                Estimate LOW
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-rillation-purple">
                Estimate AVG
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-rillation-magenta">
                Estimate HIGH
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-rillation-purple">
                Estimate
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-rillation-purple">
                Estimate
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-rillation-text">
                Actual
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-rillation-green">
                Projected
              </th>
            </tr>
          </thead>
          <tbody>
            {metricRows.map((row, index) => {
              const rowData = editedData.get(row.key)
              
              return (
                <tr 
                  key={row.key}
                  className={`border-b border-rillation-border/30 ${
                    index % 2 === 0 ? 'bg-rillation-card' : 'bg-rillation-bg/30'
                  }`}
                >
                  <td className="px-4 py-2 text-sm text-rillation-text">
                    {row.label}
                  </td>
                  {columns.map((col) => {
                    const cellValue = rowData?.[col as keyof FunnelForecastRow] ?? 0
                    // Show empty string if value is 0 so user can type immediately
                    const displayValue = cellValue === 0 ? '' : cellValue
                    
                    return (
                      <td key={col} className="px-2 py-1">
                        <input
                          type="number"
                          value={displayValue}
                          onChange={(e) => handleCellChange(row.key, col, e.target.value)}
                          onFocus={handleFocus}
                          className={`w-full px-2 py-1 text-sm text-center bg-transparent border border-transparent rounded
                            focus:border-rillation-purple focus:outline-none focus:bg-rillation-bg
                            hover:border-rillation-border transition-colors
                            ${col === 'actual' ? 'text-rillation-text font-medium' : 'text-rillation-text-muted'}
                            ${col === 'projected' ? 'text-rillation-green font-medium' : ''}
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

import { formatNumber, formatPercentage, formatCurrency } from '../../lib/supabase'
import type { FunnelForecast } from '../../types/database'

interface FunnelSpreadsheetProps {
  data: FunnelForecast[]
  month: number
  year: number
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

export default function FunnelSpreadsheet({ data, month, year }: FunnelSpreadsheetProps) {
  // Create data map
  const dataMap = new Map<string, FunnelForecast>()
  data.forEach((row) => {
    dataMap.set(row.metric_key, row)
  })

  // Format value based on type
  const formatValue = (value: number | null | undefined, format: string): string => {
    if (value === null || value === undefined) return '0'
    
    switch (format) {
      case 'percent':
        return formatPercentage(value)
      case 'currency':
        return formatCurrency(value)
      default:
        return formatNumber(value)
    }
  }

  return (
    <div className="bg-rillation-card rounded-xl border border-rillation-border overflow-hidden">
      <div className="p-4 border-b border-rillation-border flex items-center justify-between">
        <h3 className="text-lg font-semibold text-rillation-text">Overall Funnel Breakdown</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-rillation-text-muted">Year:</span>
          <select className="bg-rillation-bg border border-rillation-border rounded px-2 py-1 text-sm text-rillation-text">
            <option value={year}>{year}</option>
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-rillation-purple to-rillation-magenta">
              <th className="px-4 py-3 text-left text-sm font-medium text-white min-w-[180px]">
                Metric
              </th>
              <th colSpan={6} className="px-4 py-3 text-center text-sm font-medium text-white">
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
              const rowData = dataMap.get(row.key)
              
              return (
                <tr 
                  key={row.key}
                  className={`border-b border-rillation-border/30 hover:bg-rillation-card-hover transition-colors ${
                    index % 2 === 0 ? 'bg-rillation-card' : 'bg-rillation-bg/30'
                  }`}
                >
                  <td className="px-4 py-2 text-sm text-rillation-text">
                    {row.label}
                  </td>
                  <td className="px-4 py-2 text-sm text-center text-rillation-text-muted">
                    {formatValue(rowData?.estimate_low, row.format)}
                  </td>
                  <td className="px-4 py-2 text-sm text-center text-rillation-text-muted">
                    {formatValue(rowData?.estimate_avg, row.format)}
                  </td>
                  <td className="px-4 py-2 text-sm text-center text-rillation-text-muted">
                    {formatValue(rowData?.estimate_high, row.format)}
                  </td>
                  <td className="px-4 py-2 text-sm text-center text-rillation-text-muted">
                    {formatValue(rowData?.estimate_1, row.format)}
                  </td>
                  <td className="px-4 py-2 text-sm text-center text-rillation-text-muted">
                    {formatValue(rowData?.estimate_2, row.format)}
                  </td>
                  <td className="px-4 py-2 text-sm text-center text-rillation-text font-medium">
                    {formatValue(rowData?.actual, row.format)}
                  </td>
                  <td className="px-4 py-2 text-sm text-center text-rillation-green font-medium">
                    {formatValue(rowData?.projected, row.format)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}


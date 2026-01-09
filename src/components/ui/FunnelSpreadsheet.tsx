import { formatNumber, formatPercentage, formatCurrency } from '../../lib/supabase'
import type { FunnelForecast } from '../../types/database'
import AnimatedSelect from './AnimatedSelect'

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
    <div className="bg-rillation-card rounded-lg border border-rillation-border overflow-hidden">
      <div className="px-3 py-2 border-b border-rillation-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-rillation-text">Overall Funnel Breakdown</h3>
        <div className="flex items-center gap-1.5 min-w-[80px]">
          <span className="text-xs text-rillation-text-muted">Year:</span>
          <AnimatedSelect
            value={String(year)}
            onChange={() => {}}
            size="sm"
            showCheck={false}
            options={[{ value: String(year), label: String(year) }]}
          />
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gradient-to-r from-rillation-purple to-rillation-magenta">
              <th className="px-2 py-1.5 text-left text-xs font-medium text-white min-w-[120px]">
                Metric
              </th>
              <th colSpan={6} className="px-2 py-1.5 text-center text-xs font-medium text-white">
                {monthNames[month - 1]}
              </th>
            </tr>
            <tr className="bg-rillation-card-hover">
              <th className="px-2 py-1 text-left text-[10px] font-medium text-rillation-text-muted"></th>
              <th className="px-2 py-1 text-center text-[10px] font-medium text-rillation-purple min-w-[60px]">
                Low
              </th>
              <th className="px-2 py-1 text-center text-[10px] font-medium text-rillation-purple min-w-[60px]">
                Avg
              </th>
              <th className="px-2 py-1 text-center text-[10px] font-medium text-rillation-magenta min-w-[60px]">
                High
              </th>
              <th className="px-2 py-1 text-center text-[10px] font-medium text-rillation-purple min-w-[60px]">
                Est 1
              </th>
              <th className="px-2 py-1 text-center text-[10px] font-medium text-rillation-purple min-w-[60px]">
                Est 2
              </th>
              <th className="px-2 py-1 text-center text-[10px] font-medium text-rillation-text min-w-[60px]">
                Actual
              </th>
              <th className="px-2 py-1 text-center text-[10px] font-medium text-rillation-green min-w-[60px]">
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
                  className={`border-b border-rillation-border/40 hover:bg-rillation-card-hover transition-colors ${
                    index % 2 === 0 ? 'bg-rillation-card/40' : 'bg-rillation-bg/40'
                  }`}
                >
                  <td className="px-2 py-1 text-[11px] text-rillation-text font-medium">
                    {row.label}
                  </td>
                  <td className="px-2 py-1 text-[11px] text-center text-rillation-text-muted">
                    {formatValue(rowData?.estimate_low, row.format)}
                  </td>
                  <td className="px-2 py-1 text-[11px] text-center text-rillation-text-muted">
                    {formatValue(rowData?.estimate_avg, row.format)}
                  </td>
                  <td className="px-2 py-1 text-[11px] text-center text-rillation-text-muted">
                    {formatValue(rowData?.estimate_high, row.format)}
                  </td>
                  <td className="px-2 py-1 text-[11px] text-center text-rillation-text-muted">
                    {formatValue(rowData?.estimate_1, row.format)}
                  </td>
                  <td className="px-2 py-1 text-[11px] text-center text-rillation-text-muted">
                    {formatValue(rowData?.estimate_2, row.format)}
                  </td>
                  <td className="px-2 py-1 text-[11px] text-center text-rillation-text font-semibold">
                    {formatValue(rowData?.actual, row.format)}
                  </td>
                  <td className="px-2 py-1 text-[11px] text-center text-rillation-green font-semibold">
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


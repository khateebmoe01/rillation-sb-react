import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { SalesMetric } from '../../hooks/useSalesMetrics'
import { formatCurrency, formatPercentage } from '../../lib/supabase'

export type ChartType = 'revenue' | 'dealCount' | 'avgValue' | 'winRate'

interface SalesMetricsChartProps {
  data: SalesMetric[]
  type: ChartType
  title: string
}

export default function SalesMetricsChart({ data, type, title }: SalesMetricsChartProps) {
  // Custom tooltip with proper formatting based on chart type
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const formatValue = (value: number) => {
        switch (type) {
          case 'revenue':
          case 'avgValue':
            return formatCurrency(value)
          case 'winRate':
            return formatPercentage(value, 1)
          default:
            return value.toLocaleString()
        }
      }

      return (
        <div className="bg-rillation-card border border-rillation-border rounded-lg p-3 shadow-xl">
          <p className="text-xs text-rillation-text-muted mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs font-medium" style={{ color: entry.color }}>
              {entry.name || title}: {formatValue(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const renderChart = () => {
    switch (type) {
      case 'revenue':
        return (
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              tick={{ fontSize: 10 }}
              tickLine={{ stroke: '#2a2a3a' }}
            />
            <YAxis
              stroke="#94a3b8"
              tick={{ fontSize: 10 }}
              tickLine={{ stroke: '#2a2a3a' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#a855f7"
              fillOpacity={1}
              fill="url(#colorRevenue)"
              strokeWidth={2}
            />
          </AreaChart>
        )

      case 'dealCount':
        return (
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              tick={{ fontSize: 10 }}
              tickLine={{ stroke: '#2a2a3a' }}
            />
            <YAxis
              stroke="#94a3b8"
              tick={{ fontSize: 10 }}
              tickLine={{ stroke: '#2a2a3a' }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="dealCount" name="Deals" fill="#f97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        )

      case 'avgValue':
        return (
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              tick={{ fontSize: 10 }}
              tickLine={{ stroke: '#2a2a3a' }}
            />
            <YAxis
              stroke="#94a3b8"
              tick={{ fontSize: 10 }}
              tickLine={{ stroke: '#2a2a3a' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="avgValue"
              name="Avg Deal Value"
              stroke="#22d3ee"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#22d3ee' }}
            />
          </LineChart>
        )

      case 'winRate':
        return (
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              tick={{ fontSize: 10 }}
              tickLine={{ stroke: '#2a2a3a' }}
            />
            <YAxis
              stroke="#94a3b8"
              tick={{ fontSize: 10 }}
              tickLine={{ stroke: '#2a2a3a' }}
              tickFormatter={(value) => `${value}%`}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="winRate"
              name="Win Rate"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#22c55e' }}
            />
          </LineChart>
        )

      default:
        return null
    }
  }

  return (
    <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border shadow-lg hover:shadow-xl hover:border-rillation-purple/20 transition-all">
      <h3 className="text-sm font-semibold text-rillation-text mb-3">{title}</h3>
      <div className="bg-rillation-bg/40 rounded-lg p-2 border border-rillation-border/50">
        <ResponsiveContainer width="100%" height={200}>
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  )
}


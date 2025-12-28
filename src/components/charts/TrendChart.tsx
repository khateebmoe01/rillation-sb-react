import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { ChartDataPoint } from '../../types/database'

interface TrendChartProps {
  data: ChartDataPoint[]
}

export default function TrendChart({ data }: TrendChartProps) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-rillation-card border border-rillation-border rounded-lg p-3 shadow-xl">
          <p className="text-xs text-rillation-text-muted mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="chart-container p-6">
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
          <XAxis 
            dataKey="date" 
            stroke="#94a3b8" 
            tick={{ fontSize: 11 }}
            tickLine={{ stroke: '#2a2a3a' }}
          />
          <YAxis 
            yAxisId="left"
            stroke="#94a3b8" 
            tick={{ fontSize: 11 }}
            tickLine={{ stroke: '#2a2a3a' }}
            tickFormatter={(value) => value.toLocaleString()}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right"
            stroke="#94a3b8" 
            tick={{ fontSize: 11 }}
            tickLine={{ stroke: '#2a2a3a' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => <span className="text-xs text-rillation-text-muted">{value}</span>}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="sent"
            name="Sent"
            stroke="#a855f7"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#a855f7' }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="prospects"
            name="Unique Prospects"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#f97316' }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="replied"
            name="Replied"
            stroke="#22d3ee"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#22d3ee' }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="positiveReplies"
            name="Interested"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#22c55e' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}


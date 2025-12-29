import { DollarSign, TrendingUp, Target, Briefcase } from 'lucide-react'
import { formatCurrency, formatPercentage } from '../../lib/supabase'
import type { SalesSummary } from '../../hooks/useSalesMetrics'

interface SalesMetricCardsProps {
  summary: SalesSummary
}

export default function SalesMetricCards({ summary }: SalesMetricCardsProps) {
  const cards = [
    {
      title: 'Total Revenue',
      value: summary.totalRevenue,
      formatter: formatCurrency,
      icon: <DollarSign size={18} />,
      colorClass: 'text-rillation-green',
    },
    {
      title: 'Avg Deal Value',
      value: summary.avgDealValue,
      formatter: formatCurrency,
      icon: <Target size={18} />,
      colorClass: 'text-rillation-purple',
    },
    {
      title: 'Win Rate',
      value: summary.winRate,
      formatter: (val: number) => formatPercentage(val, 1),
      icon: <TrendingUp size={18} />,
      colorClass: 'text-rillation-cyan',
    },
    {
      title: 'Closed Deals',
      value: summary.totalDeals,
      formatter: (val: number) => val.toLocaleString(),
      icon: <Briefcase size={18} />,
      colorClass: 'text-rillation-orange',
      subtitle: `${summary.totalClosedWon} won, ${summary.totalClosedLost} lost`,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className="metric-card bg-rillation-card rounded-xl p-4 card-glow border border-rillation-border shadow-lg"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className={card.colorClass}>{card.icon}</span>
            <span className="text-xs font-medium text-rillation-text-muted uppercase tracking-wider">
              {card.title}
            </span>
          </div>

          {/* Value */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rillation-text">
              {card.formatter(card.value)}
            </span>
          </div>

          {/* Subtitle */}
          {card.subtitle && (
            <p className="text-xs text-rillation-text-muted mt-1">
              {card.subtitle}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}


import { formatNumber, formatPercentage } from '../../lib/supabase'
import type { ClientBubbleData } from '../../types/database'

interface ExtendedClientBubbleData extends ClientBubbleData {
  positiveReplies?: number
}

interface ClientBubbleProps {
  data: ExtendedClientBubbleData
  onClick?: () => void
}

interface MetricRowProps {
  label: string
  actual: number
  target: number
}

interface RatioRowProps {
  label: string
  value: number
}

function MetricRow({ label, actual, target }: MetricRowProps) {
  const isOverTarget = target > 0 && actual >= target
  const isUnderTarget = target > 0 && actual < target
  
  return (
    <div className="flex items-center justify-between py-2 border-b border-rillation-border/50 last:border-0">
      <span className="text-sm text-rillation-text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-rillation-text">
          {formatNumber(actual)}
        </span>
        {target > 0 && (
          <span className={`text-xs font-medium ${
            isOverTarget ? 'text-rillation-green' : 
            isUnderTarget ? 'text-rillation-red' : 
            'text-rillation-text-muted'
          }`}>
            {formatNumber(target)}
          </span>
        )}
      </div>
    </div>
  )
}

function RatioRow({ label, value }: RatioRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-rillation-text-muted">{label}</span>
      <span className="text-xs font-medium text-rillation-cyan">
        {formatPercentage(value)}
      </span>
    </div>
  )
}

export default function ClientBubble({ data, onClick }: ClientBubbleProps) {
  // Calculate ratios
  const emailsToMeetingRatio = data.meetings > 0 && data.emailsSent > 0
    ? (data.meetings / data.emailsSent) * 100
    : 0
    
  const leadToReplyRatio = data.uniqueProspects > 0 && data.realReplies > 0
    ? (data.realReplies / data.uniqueProspects) * 100
    : 0
    
  const replyToPositiveRatio = data.realReplies > 0 && (data.positiveReplies || 0) > 0
    ? ((data.positiveReplies || 0) / data.realReplies) * 100
    : 0
    
  const positiveToMeetingRatio = (data.positiveReplies || 0) > 0 && data.meetings > 0
    ? (data.meetings / (data.positiveReplies || 1)) * 100
    : 0

  return (
    <div 
      className="bg-rillation-card rounded-xl p-6 border border-rillation-border hover:border-rillation-purple/30 transition-all duration-200 group cursor-pointer"
      onClick={onClick}
    >
      {/* Client Name */}
      <h3 className="text-lg font-semibold text-rillation-text mb-4 group-hover:text-rillation-purple transition-colors">
        {data.client}
      </h3>
      
      {/* Main Metrics */}
      <div className="space-y-0 mb-4">
        <MetricRow 
          label="Emails Sent" 
          actual={data.emailsSent} 
          target={data.emailsTarget} 
        />
        <MetricRow 
          label="Unique Prospects" 
          actual={data.uniqueProspects} 
          target={data.prospectsTarget} 
        />
        <MetricRow 
          label="Real Replies" 
          actual={data.realReplies} 
          target={data.repliesTarget} 
        />
        <MetricRow 
          label="Meetings" 
          actual={data.meetings} 
          target={data.meetingsTarget} 
        />
      </div>
      
      {/* Ratios Section */}
      <div className="pt-3 border-t border-rillation-border">
        <p className="text-xs font-medium text-rillation-text-muted mb-2 uppercase tracking-wider">
          Conversion Ratios
        </p>
        <RatioRow label="Emails → Meeting" value={emailsToMeetingRatio} />
        <RatioRow label="Lead → Reply" value={leadToReplyRatio} />
        <RatioRow label="Reply → Interested" value={replyToPositiveRatio} />
        <RatioRow label="Positive → Meeting" value={positiveToMeetingRatio} />
      </div>
      
      {/* Click hint */}
      <p className="text-xs text-rillation-purple opacity-0 group-hover:opacity-100 transition-opacity mt-4 text-center">
        Click to edit targets
      </p>
    </div>
  )
}

import { useRef } from 'react'
import { motion, useMotionValue, useTransform, useSpring, useMotionTemplate } from 'framer-motion'
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

  // Magnetic hover effect
  const cardRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  
  // Spring values for smooth following
  const springConfig = { damping: 25, stiffness: 300 }
  const xSpring = useSpring(x, springConfig)
  const ySpring = useSpring(y, springConfig)
  
  // Transform values - limit movement to 15px
  const rotateX = useTransform(ySpring, [-0.5, 0.5], [5, -5])
  const rotateY = useTransform(xSpring, [-0.5, 0.5], [-5, 5])
  const moveX = useTransform(xSpring, [-0.5, 0.5], [-12, 12])
  const moveY = useTransform(ySpring, [-0.5, 0.5], [-12, 12])
  
  // Glow position
  const glowX = useTransform(xSpring, [-0.5, 0.5], ['20%', '80%'])
  const glowY = useTransform(ySpring, [-0.5, 0.5], ['20%', '80%'])
  const glowBackground = useMotionTemplate`radial-gradient(circle 200px at ${glowX} ${glowY}, rgba(139, 92, 246, 0.15), rgba(6, 182, 212, 0.1), transparent 70%)`

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    
    const rect = cardRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const mouseX = e.clientX - centerX
    const mouseY = e.clientY - centerY
    
    // Normalize to -0.5 to 0.5 range
    const normalizedX = mouseX / rect.width
    const normalizedY = mouseY / rect.height
    
    x.set(normalizedX)
    y.set(normalizedY)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={cardRef}
      className="relative bg-rillation-card rounded-xl p-6 border border-rillation-border group cursor-pointer overflow-hidden"
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        x: moveX,
        y: moveY,
        transformStyle: 'preserve-3d',
      }}
      whileHover={{
        scale: 1.02,
        borderColor: 'rgba(139, 92, 246, 0.3)',
        transition: { duration: 0.2 }
      }}
      whileTap={{
        scale: 0.98,
        transition: { duration: 0.1 }
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300"
        style={{
          background: glowBackground,
          filter: 'blur(40px)',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
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
    </motion.div>
  )
}

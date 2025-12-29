import { motion } from 'framer-motion'
import { MessageSquare, ThumbsUp, ThumbsDown, Clock, Users, Calendar } from 'lucide-react'
import AnimatedMetric from './AnimatedMetric'

interface InsightsSummaryBarProps {
  totalReplies: number
  interested: number
  notInterested: number
  outOfOffice: number
  engagedLeads: number
  meetingsBooked: number
  onMetricClick?: (metric: string) => void
  activeMetric?: string
}

export default function InsightsSummaryBar({
  totalReplies,
  interested,
  notInterested,
  outOfOffice,
  engagedLeads,
  meetingsBooked,
  onMetricClick,
  activeMetric,
}: InsightsSummaryBarProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25,
      },
    },
  }

  // Calculate rates
  const interestedRate = totalReplies > 0 ? ((interested / totalReplies) * 100).toFixed(1) : '0'
  const realReplies = totalReplies - outOfOffice
  const realReplyInterestRate = realReplies > 0 ? ((interested / realReplies) * 100).toFixed(1) : '0'

  const metrics = [
    {
      id: 'replies',
      value: totalReplies,
      label: 'Total Replies',
      icon: <MessageSquare size={16} />,
      colorClass: 'text-rillation-cyan',
      subLabel: `${realReplies.toLocaleString()} excl. OOO`,
    },
    {
      id: 'interested',
      value: interested,
      label: 'Interested',
      icon: <ThumbsUp size={16} />,
      colorClass: 'text-rillation-green',
      subLabel: `${interestedRate}% of total`,
    },
    {
      id: 'notInterested',
      value: notInterested,
      label: 'Not Interested',
      icon: <ThumbsDown size={16} />,
      colorClass: 'text-rillation-red',
      subLabel: `${realReplyInterestRate}% interest rate`,
    },
    {
      id: 'ooo',
      value: outOfOffice,
      label: 'Out of Office',
      icon: <Clock size={16} />,
      colorClass: 'text-rillation-orange',
      subLabel: 'Auto-replies',
    },
    {
      id: 'leads',
      value: engagedLeads,
      label: 'Engaged Leads',
      icon: <Users size={16} />,
      colorClass: 'text-rillation-purple',
      subLabel: 'Active prospects',
    },
    {
      id: 'meetings',
      value: meetingsBooked,
      label: 'Meetings Booked',
      icon: <Calendar size={16} />,
      colorClass: 'text-rillation-magenta',
      subLabel: interested > 0 ? `${((meetingsBooked / interested) * 100).toFixed(0)}% conversion` : '-',
    },
  ]

  return (
    <motion.div
      className="w-full"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Glassmorphism container */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rillation-card/80 to-rillation-bg/50 backdrop-blur-xl border border-rillation-border/50 p-4">
        {/* Animated gradient background */}
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(217, 70, 239, 0.05) 50%, rgba(34, 211, 238, 0.1) 100%)',
          }}
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Metrics grid */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {metrics.map((metric) => (
            <motion.div key={metric.id} variants={itemVariants}>
              <AnimatedMetric
                value={metric.value}
                label={metric.label}
                icon={metric.icon}
                colorClass={metric.colorClass}
                subLabel={metric.subLabel}
                onClick={onMetricClick ? () => onMetricClick(metric.id) : undefined}
                isActive={activeMetric === metric.id}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}


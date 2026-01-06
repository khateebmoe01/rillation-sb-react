import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Target, 
  Lightbulb, 
  TrendingUp, 
  Users, 
  MessageSquare,
  Zap,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock
} from 'lucide-react'

// Mock strategic initiatives data
const strategicInitiatives = [
  {
    id: 1,
    title: 'Expand into Healthcare Vertical',
    description: 'Target mid-market healthcare companies with HIPAA-compliant messaging',
    status: 'in-progress',
    priority: 'high',
    progress: 65,
    dueDate: '2026-02-15',
    impact: 'High Revenue Potential',
  },
  {
    id: 2,
    title: 'ABM Campaign for Enterprise Accounts',
    description: 'Personalized multi-touch sequences for Fortune 500 prospects',
    status: 'planning',
    priority: 'high',
    progress: 25,
    dueDate: '2026-03-01',
    impact: 'Brand Positioning',
  },
  {
    id: 3,
    title: 'Partner Channel Development',
    description: 'Build referral partnerships with CRM consultancies',
    status: 'completed',
    priority: 'medium',
    progress: 100,
    dueDate: '2026-01-10',
    impact: 'New Revenue Stream',
  },
  {
    id: 4,
    title: 'Content-Led Demand Generation',
    description: 'Launch thought leadership series targeting VP+ decision makers',
    status: 'in-progress',
    priority: 'medium',
    progress: 40,
    dueDate: '2026-02-28',
    impact: 'Pipeline Growth',
  },
]

const strategicMetrics = [
  {
    label: 'Target Accounts',
    value: '247',
    change: '+12%',
    trend: 'up',
    icon: Target,
  },
  {
    label: 'Avg Deal Size',
    value: '$48.2K',
    change: '+8.5%',
    trend: 'up',
    icon: TrendingUp,
  },
  {
    label: 'ICP Match Rate',
    value: '73%',
    change: '+5%',
    trend: 'up',
    icon: Users,
  },
  {
    label: 'Engagement Score',
    value: '8.4',
    change: '+0.6',
    trend: 'up',
    icon: Zap,
  },
]

const strategicInsights = [
  {
    type: 'opportunity',
    title: 'Fintech Vertical Showing High Intent',
    description: 'Companies in fintech are responding 2.3x better to your messaging. Consider allocating more resources here.',
    action: 'Create dedicated campaign',
  },
  {
    type: 'warning',
    title: 'Enterprise Cycle Times Increasing',
    description: 'Average deal cycle has increased by 15 days for enterprise accounts. Review nurture sequences.',
    action: 'Analyze pipeline',
  },
  {
    type: 'success',
    title: 'SMB Conversion Rate at All-Time High',
    description: 'Your streamlined SMB sequence is converting 28% better than last quarter.',
    action: 'Scale approach',
  },
]

const quarterlyGoals = [
  { goal: 'Generate 150 SQLs', current: 112, target: 150 },
  { goal: 'Book 45 Demos', current: 38, target: 45 },
  { goal: 'Close $750K Revenue', current: 520000, target: 750000, isCurrency: true },
  { goal: 'Expand to 3 New Verticals', current: 2, target: 3 },
]

export default function StrategyView() {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'initiatives' | 'goals'>('overview')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-rillation-green'
      case 'in-progress': return 'text-rillation-yellow'
      case 'planning': return 'text-rillation-text-muted'
      default: return 'text-rillation-text-muted'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle2
      case 'in-progress': return Clock
      case 'planning': return Circle
      default: return Circle
    }
  }

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'opportunity': return 'border-l-rillation-green'
      case 'warning': return 'border-l-rillation-yellow'
      case 'success': return 'border-l-rillation-green'
      default: return 'border-l-rillation-border'
    }
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-rillation-text">Strategy</h1>
          <p className="text-sm text-rillation-text-muted mt-1">
            Strategic planning and initiative tracking
          </p>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex gap-1 bg-rillation-card rounded-lg p-1 border border-rillation-border">
          {(['overview', 'initiatives', 'goals'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 capitalize ${
                selectedTab === tab
                  ? 'bg-white text-black'
                  : 'text-rillation-text-muted hover:text-rillation-text'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Strategic Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {strategicMetrics.map((metric, index) => {
          const Icon = metric.icon
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-rillation-card rounded-xl p-5 border border-rillation-border hover:border-rillation-text-muted transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-rillation-card-hover flex items-center justify-center">
                  <Icon size={20} className="text-rillation-text" />
                </div>
                <span className="text-xs font-medium text-rillation-green">
                  {metric.change}
                </span>
              </div>
              <div className="text-2xl font-bold text-rillation-text mb-1">
                {metric.value}
              </div>
              <div className="text-xs text-rillation-text-muted">
                {metric.label}
              </div>
            </motion.div>
          )
        })}
      </div>

      {selectedTab === 'overview' && (
        <div className="grid grid-cols-3 gap-6">
          {/* Strategic Insights */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb size={18} className="text-rillation-yellow" />
              <h2 className="text-lg font-semibold text-rillation-text">Strategic Insights</h2>
            </div>
            
            {strategicInsights.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className={`bg-rillation-card rounded-xl p-5 border border-rillation-border border-l-4 ${getInsightColor(insight.type)}`}
              >
                <h3 className="text-sm font-semibold text-rillation-text mb-2">
                  {insight.title}
                </h3>
                <p className="text-sm text-rillation-text-muted mb-4">
                  {insight.description}
                </p>
                <button className="flex items-center gap-2 text-xs font-medium text-white hover:text-rillation-text-muted transition-colors">
                  {insight.action}
                  <ArrowRight size={14} />
                </button>
              </motion.div>
            ))}
          </div>

          {/* Quick Goals Progress */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Target size={18} className="text-rillation-text" />
              <h2 className="text-lg font-semibold text-rillation-text">Q1 Progress</h2>
            </div>
            
            <div className="bg-rillation-card rounded-xl p-5 border border-rillation-border space-y-5">
              {quarterlyGoals.map((goal, index) => {
                const percentage = Math.min((goal.current / goal.target) * 100, 100)
                const displayCurrent = goal.isCurrency 
                  ? `$${(goal.current / 1000).toFixed(0)}K`
                  : goal.current
                const displayTarget = goal.isCurrency
                  ? `$${(goal.target / 1000).toFixed(0)}K`
                  : goal.target
                
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                  >
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-rillation-text-muted">{goal.goal}</span>
                      <span className="text-rillation-text font-medium">
                        {displayCurrent} / {displayTarget}
                      </span>
                    </div>
                    <div className="h-2 bg-rillation-bg rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          percentage >= 100 
                            ? 'bg-rillation-green' 
                            : percentage >= 75 
                              ? 'bg-rillation-yellow' 
                              : 'bg-white'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
                      />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'initiatives' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={18} className="text-rillation-text" />
            <h2 className="text-lg font-semibold text-rillation-text">Strategic Initiatives</h2>
          </div>
          
          <div className="grid gap-4">
            {strategicInitiatives.map((initiative, index) => {
              const StatusIcon = getStatusIcon(initiative.status)
              
              return (
                <motion.div
                  key={initiative.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-rillation-card rounded-xl p-6 border border-rillation-border hover:border-rillation-text-muted transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <StatusIcon 
                          size={18} 
                          className={getStatusColor(initiative.status)} 
                        />
                        <h3 className="text-base font-semibold text-rillation-text">
                          {initiative.title}
                        </h3>
                        {initiative.priority === 'high' && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-rillation-red/20 text-rillation-red rounded">
                            High Priority
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-rillation-text-muted pl-8">
                        {initiative.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-rillation-text-muted mb-1">Due</div>
                      <div className="text-sm text-rillation-text">
                        {new Date(initiative.dueDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pl-8">
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-rillation-text-muted">
                        Impact: <span className="text-rillation-text">{initiative.impact}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-rillation-text-muted">
                        {initiative.progress}%
                      </span>
                      <div className="w-32 h-1.5 bg-rillation-bg rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            initiative.status === 'completed'
                              ? 'bg-rillation-green'
                              : 'bg-white'
                          }`}
                          style={{ width: `${initiative.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {selectedTab === 'goals' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Quarterly Goals Detail */}
          <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border">
            <h2 className="text-lg font-semibold text-rillation-text mb-6">Q1 2026 Goals</h2>
            
            <div className="space-y-6">
              {quarterlyGoals.map((goal, index) => {
                const percentage = Math.min((goal.current / goal.target) * 100, 100)
                const displayCurrent = goal.isCurrency 
                  ? `$${(goal.current / 1000).toFixed(0)}K`
                  : goal.current
                const displayTarget = goal.isCurrency
                  ? `$${(goal.target / 1000).toFixed(0)}K`
                  : goal.target
                
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 bg-rillation-bg rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-rillation-text">{goal.goal}</span>
                      <span className={`text-sm font-bold ${
                        percentage >= 100 ? 'text-rillation-green' : 'text-rillation-text'
                      }`}>
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-3 bg-rillation-card rounded-full overflow-hidden mb-2">
                      <motion.div
                        className={`h-full rounded-full ${
                          percentage >= 100 
                            ? 'bg-rillation-green' 
                            : percentage >= 75 
                              ? 'bg-rillation-yellow' 
                              : 'bg-white'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.3 + index * 0.1, duration: 0.8 }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-rillation-text-muted">
                      <span>Current: {displayCurrent}</span>
                      <span>Target: {displayTarget}</span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Goals Summary */}
          <div className="space-y-4">
            <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border">
              <h3 className="text-base font-semibold text-rillation-text mb-4">Overall Progress</h3>
              <div className="flex items-center justify-center py-8">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      stroke="#222222"
                      strokeWidth="12"
                    />
                    <motion.circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="12"
                      strokeLinecap="round"
                      initial={{ strokeDasharray: '0 440' }}
                      animate={{ strokeDasharray: '310 440' }}
                      transition={{ delay: 0.5, duration: 1 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-rillation-text">71%</span>
                    <span className="text-xs text-rillation-text-muted">Complete</span>
                  </div>
                </div>
              </div>
              <p className="text-center text-sm text-rillation-text-muted">
                On track to meet Q1 targets
              </p>
            </div>

            <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border">
              <h3 className="text-base font-semibold text-rillation-text mb-4">Key Focus Areas</h3>
              <div className="space-y-3">
                {[
                  { area: 'Pipeline Generation', status: 'On Track' },
                  { area: 'Demo Conversions', status: 'Needs Attention' },
                  { area: 'Revenue Targets', status: 'On Track' },
                ].map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-rillation-border last:border-0"
                  >
                    <span className="text-sm text-rillation-text">{item.area}</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      item.status === 'On Track' 
                        ? 'bg-rillation-green/20 text-rillation-green'
                        : 'bg-rillation-yellow/20 text-rillation-yellow'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


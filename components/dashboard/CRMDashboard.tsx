import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, DollarSign, CheckSquare, 
  TrendingUp, AlertCircle,
  Clock, Building2
} from 'lucide-react'
import { theme } from '../../config/theme'
import { useCRM } from '../../context/CRMContext'
import { Card, CardHeader, Badge, LoadingSkeleton } from '../shared'
import { DEAL_STAGE_INFO, type DealStage } from '../../types'

export function CRMDashboard() {
  const { contacts, deals, tasks, loading } = useCRM()
  
  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    // Contact stats - group by company
    const uniqueCompanies = new Set(contacts.map(c => c.company_name).filter(Boolean)).size
    
    // Deal stats
    const activeDeals = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost')
    const totalPipeline = activeDeals.reduce((sum, d) => sum + (d.amount || 0), 0)
    const weightedPipeline = activeDeals.reduce(
      (sum, d) => sum + ((d.amount || 0) * (d.probability || 0) / 100), 
      0
    )
    const wonDeals = deals.filter(d => d.stage === 'won')
    const wonValue = wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0)
    
    // Task stats
    const pendingTasks = tasks.filter(t => !t.done)
    const overdueTasks = tasks.filter(
      t => !t.done && t.due_date && new Date(t.due_date) < now
    )
    const todayTasks = tasks.filter(t => {
      if (!t.due_date) return false
      const dueDate = new Date(t.due_date)
      return dueDate >= today && dueDate < new Date(today.getTime() + 86400000)
    })
    
    return {
      contacts: contacts.length,
      uniqueCompanies,
      activeDeals: activeDeals.length,
      totalPipeline,
      weightedPipeline,
      wonDeals: wonDeals.length,
      wonValue,
      pendingTasks: pendingTasks.length,
      overdueTasks: overdueTasks.length,
      todayTasks: todayTasks.length,
    }
  }, [contacts, deals, tasks])
  
  // Recent deals with contact info
  const recentDeals = useMemo(() => {
    return [...deals]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(deal => {
        const contact = contacts.find(c => c.id === deal.contact_id)
        return { ...deal, contact }
      })
  }, [deals, contacts])
  
  // Upcoming tasks
  const upcomingTasks = useMemo(() => {
    return tasks
      .filter(t => !t.done && t.due_date)
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 5)
  }, [tasks])
  
  // Deal stage breakdown
  const stageBreakdown = useMemo(() => {
    const stages: DealStage[] = ['lead', 'qualification', 'discovery', 'demo', 'proposal', 'negotiation']
    return stages.map(stage => ({
      stage,
      count: deals.filter(d => d.stage === stage).length,
      value: deals.filter(d => d.stage === stage).reduce((sum, d) => sum + (d.amount || 0), 0),
    }))
  }, [deals])
  
  if (loading.deals || loading.tasks || loading.contacts) {
    return (
      <div style={{ padding: 20 }}>
        <LoadingSkeleton rows={8} />
      </div>
    )
  }
  
  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: theme.fontSize['3xl'],
            fontWeight: theme.fontWeight.bold,
            color: theme.text.primary,
            margin: 0,
          }}
        >
          CRM Dashboard
        </h1>
        <p
          style={{
            fontSize: theme.fontSize.base,
            color: theme.text.muted,
            margin: '8px 0 0 0',
          }}
        >
          Overview of your sales pipeline and activities
        </p>
      </div>
      
      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <StatCard
          icon={<Users size={20} />}
          iconColor={theme.entity.contact}
          label="Contacts"
          value={stats.contacts}
          subValue={`${stats.uniqueCompanies} companies`}
        />
        <StatCard
          icon={<Building2 size={20} />}
          iconColor={'#a78bfa'}
          label="Companies"
          value={stats.uniqueCompanies}
          subValue="Unique organizations"
        />
        <StatCard
          icon={<DollarSign size={20} />}
          iconColor={theme.entity.deal}
          label="Active Deals"
          value={stats.activeDeals}
          subValue={`$${formatCurrency(stats.totalPipeline)} pipeline`}
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          iconColor={theme.status.success}
          label="Weighted Pipeline"
          value={`$${formatCurrency(stats.weightedPipeline)}`}
          isLarge
        />
        <StatCard
          icon={<CheckSquare size={20} />}
          iconColor={theme.entity.task}
          label="Pending Tasks"
          value={stats.pendingTasks}
          subValue={stats.overdueTasks > 0 ? `${stats.overdueTasks} overdue` : undefined}
          alert={stats.overdueTasks > 0}
        />
      </div>
      
      {/* Main Content */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: 20,
        }}
      >
        {/* Pipeline Breakdown */}
        <Card padding="lg">
          <CardHeader title="Pipeline by Stage" subtitle="Active opportunities" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {stageBreakdown.map(({ stage, count, value }) => {
              const info = DEAL_STAGE_INFO[stage]
              const maxValue = Math.max(...stageBreakdown.map(s => s.value))
              const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0
              
              return (
                <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: theme.radius.full,
                      backgroundColor: info.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      width: 100,
                      fontSize: theme.fontSize.sm,
                      color: theme.text.secondary,
                    }}
                  >
                    {info.label}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      backgroundColor: theme.bg.muted,
                      borderRadius: theme.radius.full,
                      overflow: 'hidden',
                    }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      style={{
                        height: '100%',
                        backgroundColor: info.color,
                        borderRadius: theme.radius.full,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      width: 30,
                      fontSize: theme.fontSize.sm,
                      color: theme.text.muted,
                      textAlign: 'right',
                    }}
                  >
                    {count}
                  </span>
                  <span
                    style={{
                      width: 70,
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.medium,
                      color: theme.text.primary,
                      textAlign: 'right',
                    }}
                  >
                    ${formatCurrency(value)}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
        
        {/* Recent Deals */}
        <Card padding="lg">
          <CardHeader title="Recent Deals" subtitle="Latest opportunities" />
          {recentDeals.length === 0 ? (
            <p style={{ color: theme.text.muted, fontSize: theme.fontSize.sm }}>
              No deals yet
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentDeals.map(deal => {
                const info = DEAL_STAGE_INFO[deal.stage]
                return (
                  <div
                    key={deal.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      backgroundColor: theme.bg.muted,
                      borderRadius: theme.radius.lg,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: theme.fontSize.base,
                          fontWeight: theme.fontWeight.medium,
                          color: theme.text.primary,
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {deal.name}
                      </p>
                      <p
                        style={{
                          fontSize: theme.fontSize.sm,
                          color: theme.text.muted,
                          margin: '2px 0 0 0',
                        }}
                      >
                        {deal.contact?.company_name || deal.contact?.full_name || 'No contact'}
                      </p>
                    </div>
                    <Badge color={info.color} bgColor={info.bgColor}>
                      {info.label}
                    </Badge>
                    <span
                      style={{
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.semibold,
                        color: theme.status.success,
                      }}
                    >
                      ${formatCurrency(deal.amount)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
        
        {/* Upcoming Tasks */}
        <Card padding="lg">
          <CardHeader 
            title="Upcoming Tasks" 
            subtitle={stats.overdueTasks > 0 ? `${stats.overdueTasks} overdue` : 'Stay on track'}
          />
          {upcomingTasks.length === 0 ? (
            <p style={{ color: theme.text.muted, fontSize: theme.fontSize.sm }}>
              No upcoming tasks
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcomingTasks.map(task => {
                const now = new Date()
                const isOverdue = task.due_date && new Date(task.due_date) < now
                
                return (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      backgroundColor: theme.bg.muted,
                      borderRadius: theme.radius.lg,
                      borderLeft: `3px solid ${isOverdue ? theme.status.error : theme.accent.primary}`,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: theme.fontSize.sm,
                          fontWeight: theme.fontWeight.medium,
                          color: theme.text.primary,
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {task.text}
                      </p>
                    </div>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: theme.fontSize.xs,
                        color: isOverdue ? theme.status.error : theme.text.muted,
                      }}
                    >
                      {isOverdue && <AlertCircle size={12} />}
                      <Clock size={12} />
                      {formatDueDate(task.due_date!)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

// Stat Card
interface StatCardProps {
  icon: React.ReactNode
  iconColor: string
  label: string
  value: number | string
  subValue?: string
  alert?: boolean
  isLarge?: boolean
}

function StatCard({ icon, iconColor, label, value, subValue, alert, isLarge }: StatCardProps) {
  return (
    <Card padding="md">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: theme.radius.lg,
            backgroundColor: `${iconColor}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: iconColor,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div>
          <p
            style={{
              fontSize: theme.fontSize.sm,
              color: theme.text.muted,
              margin: 0,
              marginBottom: 4,
            }}
          >
            {label}
          </p>
          <p
            style={{
              fontSize: isLarge ? theme.fontSize['2xl'] : theme.fontSize.xl,
              fontWeight: theme.fontWeight.bold,
              color: theme.text.primary,
              margin: 0,
            }}
          >
            {value}
          </p>
          {subValue && (
            <p
              style={{
                fontSize: theme.fontSize.xs,
                color: alert ? theme.status.error : theme.text.muted,
                margin: '4px 0 0 0',
              }}
            >
              {subValue}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}

// Format currency helper
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M'
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K'
  }
  return value.toLocaleString()
}

// Format due date
function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (date >= today && date < tomorrow) return 'Today'
  if (date >= tomorrow && date < new Date(tomorrow.getTime() + 86400000)) return 'Tomorrow'
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

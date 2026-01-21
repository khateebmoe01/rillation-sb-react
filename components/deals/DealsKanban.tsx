import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DollarSign, Plus, Building2, Calendar, MoreHorizontal, Trash2, Edit2 } from 'lucide-react'
import { theme } from '../../config/theme'
import { useCRM } from '../../context/CRMContext'
import { Button, SearchInput, Avatar, LoadingSkeleton } from '../shared'
import { DealModal } from './DealModal'
import { DEAL_STAGES, DEAL_STAGE_INFO, type Deal, type DealStage } from '../../types'

export function DealsKanban() {
  const { deals, loading, moveDealToStage, deleteDeal } = useCRM()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createForStage, setCreateForStage] = useState<DealStage | null>(null)
  
  // Filter deals by search
  const filteredDeals = useMemo(() => {
    if (!searchQuery.trim()) return deals
    
    const query = searchQuery.toLowerCase()
    return deals.filter(d => 
      d.name?.toLowerCase().includes(query) ||
      d.contact?.company_name?.toLowerCase().includes(query) ||
      d.contact?.full_name?.toLowerCase().includes(query)
    )
  }, [deals, searchQuery])
  
  // Group deals by stage
  const dealsByStage = useMemo(() => {
    const grouped: Record<DealStage, Deal[]> = {
      lead: [],
      qualification: [],
      discovery: [],
      demo: [],
      proposal: [],
      negotiation: [],
      won: [],
      lost: [],
    }
    
    filteredDeals.forEach(deal => {
      if (deal.stage in grouped) {
        grouped[deal.stage].push(deal)
      }
    })
    
    // Sort by index within each stage
    Object.keys(grouped).forEach(stage => {
      grouped[stage as DealStage].sort((a, b) => a.index - b.index)
    })
    
    return grouped
  }, [filteredDeals])
  
  // Calculate stage totals
  const stageTotals = useMemo(() => {
    const totals: Record<DealStage, number> = {} as Record<DealStage, number>
    DEAL_STAGES.forEach(stage => {
      totals[stage] = dealsByStage[stage].reduce((sum, d) => sum + (d.amount || 0), 0)
    })
    return totals
  }, [dealsByStage])
  
  const handleOpenDeal = (deal: Deal) => {
    setSelectedDeal(deal)
    setIsCreating(false)
    setIsModalOpen(true)
  }
  
  const handleCreateDeal = (stage?: DealStage) => {
    setSelectedDeal(null)
    setIsCreating(true)
    setCreateForStage(stage || null)
    setIsModalOpen(true)
  }
  
  const handleDragEnd = async (dealId: string, newStage: DealStage, newIndex: number) => {
    await moveDealToStage(dealId, newStage, newIndex)
  }
  
  if (loading.deals) {
    return <LoadingSkeleton rows={6} />
  }
  
  // Only show active stages (not won/lost by default for cleaner view)
  const activeStages = DEAL_STAGES.filter(s => s !== 'won' && s !== 'lost')
  const closedStages = ['won', 'lost'] as DealStage[]
  
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 20,
          gap: 16,
          flexWrap: 'wrap',
          borderBottom: `1px solid ${theme.border.subtle}`,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: theme.fontSize['2xl'],
              fontWeight: theme.fontWeight.bold,
              color: theme.text.primary,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <DollarSign size={24} style={{ color: theme.entity.deal }} />
            Deals Pipeline
          </h1>
          <p
            style={{
              fontSize: theme.fontSize.sm,
              color: theme.text.muted,
              margin: '4px 0 0 0',
            }}
          >
            {deals.length} {deals.length === 1 ? 'deal' : 'deals'} • 
            ${formatCurrency(deals.filter(d => d.stage !== 'lost').reduce((sum, d) => sum + (d.amount || 0), 0))} pipeline value
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder="Search deals..."
            style={{ width: 240 }}
          />
          <Button
            icon={<Plus size={16} />}
            onClick={() => handleCreateDeal()}
          >
            Add Deal
          </Button>
        </div>
      </div>
      
      {/* Kanban Board */}
      <div
        style={{
          flex: 1,
          overflowX: 'auto',
          overflowY: 'hidden',
          padding: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 16,
            height: '100%',
            minWidth: 'fit-content',
          }}
        >
          {activeStages.map(stage => (
            <KanbanColumn
              key={stage}
              stage={stage}
              deals={dealsByStage[stage]}
              total={stageTotals[stage]}
              onOpenDeal={handleOpenDeal}
              onCreateDeal={() => handleCreateDeal(stage)}
              onDragEnd={handleDragEnd}
              onDeleteDeal={deleteDeal}
            />
          ))}
          
          {/* Closed Deals Section */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              minWidth: 280,
            }}
          >
            {closedStages.map(stage => (
              <KanbanColumn
                key={stage}
                stage={stage}
                deals={dealsByStage[stage]}
                total={stageTotals[stage]}
                onOpenDeal={handleOpenDeal}
                onCreateDeal={() => handleCreateDeal(stage)}
                onDragEnd={handleDragEnd}
                onDeleteDeal={deleteDeal}
                compact
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Deal Modal */}
      <DealModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setCreateForStage(null)
        }}
        deal={isCreating ? null : selectedDeal}
        defaultStage={createForStage}
      />
    </div>
  )
}

// Kanban Column
interface KanbanColumnProps {
  stage: DealStage
  deals: Deal[]
  total: number
  onOpenDeal: (deal: Deal) => void
  onCreateDeal: () => void
  onDragEnd: (dealId: string, newStage: DealStage, newIndex: number) => void
  onDeleteDeal: (id: string) => void
  compact?: boolean
}

function KanbanColumn({
  stage,
  deals,
  total,
  onOpenDeal,
  onCreateDeal,
  onDragEnd,
  onDeleteDeal,
  compact = false,
}: KanbanColumnProps) {
  const info = DEAL_STAGE_INFO[stage]
  const [isDragOver, setIsDragOver] = useState(false)
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }
  
  const handleDragLeave = () => {
    setIsDragOver(false)
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const dealId = e.dataTransfer.getData('dealId')
    if (dealId) {
      onDragEnd(dealId, stage, deals.length)
    }
  }
  
  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: compact ? '100%' : 280,
        minWidth: compact ? '100%' : 280,
        maxHeight: compact ? 200 : '100%',
        backgroundColor: isDragOver ? theme.accent.primaryBg : theme.bg.card,
        borderRadius: theme.radius.xl,
        border: `1px solid ${isDragOver ? theme.accent.primary : theme.border.subtle}`,
        boxShadow: isDragOver 
          ? `0 0 0 1px ${theme.accent.primary}, 0 0 25px rgba(17, 119, 84, 0.25), 0 1px 3px rgba(0, 0, 0, 0.5)`
          : `0 0 0 1px rgba(255, 255, 255, 0.05), 0 1px 3px rgba(0, 0, 0, 0.5)`,
        transition: `all ${theme.transition.fast}`,
      }}
    >
      {/* Column Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: compact ? '10px 12px' : '12px 16px',
          borderBottom: `1px solid ${theme.border.subtle}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: theme.radius.full,
              backgroundColor: info.color,
            }}
          />
          <span
            style={{
              fontSize: compact ? theme.fontSize.sm : theme.fontSize.base,
              fontWeight: theme.fontWeight.semibold,
              color: theme.text.primary,
            }}
          >
            {info.label}
          </span>
          <span
            style={{
              fontSize: theme.fontSize.xs,
              fontWeight: theme.fontWeight.medium,
              color: theme.text.muted,
              backgroundColor: theme.bg.muted,
              padding: '2px 6px',
              borderRadius: theme.radius.full,
            }}
          >
            {deals.length}
          </span>
        </div>
        
        {!compact && (
          <button
            onClick={onCreateDeal}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: theme.radius.md,
              color: theme.text.muted,
              cursor: 'pointer',
              transition: `all ${theme.transition.fast}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.bg.hover
              e.currentTarget.style.color = theme.text.primary
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = theme.text.muted
            }}
          >
            <Plus size={16} />
          </button>
        )}
      </div>
      
      {/* Column Total */}
      {total > 0 && (
        <div
          style={{
            padding: compact ? '6px 12px' : '8px 16px',
            borderBottom: `1px solid ${theme.border.subtle}`,
          }}
        >
          <span
            style={{
              fontSize: compact ? theme.fontSize.xs : theme.fontSize.sm,
              fontWeight: theme.fontWeight.semibold,
              color: info.color,
            }}
          >
            ${formatCurrency(total)}
          </span>
        </div>
      )}
      
      {/* Cards */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: compact ? 8 : 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <AnimatePresence mode="popLayout">
          {deals.map((deal, index) => (
            <motion.div
              key={deal.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.02 }}
              layout
            >
              <DealCard
                deal={deal}
                onClick={() => onOpenDeal(deal)}
                onDelete={() => onDeleteDeal(deal.id)}
                compact={compact}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        
        {deals.length === 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: compact ? 12 : 24,
              color: theme.text.muted,
              fontSize: theme.fontSize.sm,
            }}
          >
            No deals
          </div>
        )}
      </div>
    </div>
  )
}

// Deal Card
interface DealCardProps {
  deal: Deal
  onClick: () => void
  onDelete: () => void
  compact?: boolean
}

function DealCard({ deal, onClick, onDelete, compact = false }: DealCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('dealId', deal.id)
    setIsDragging(true)
  }
  
  const handleDragEnd = () => {
    setIsDragging(false)
  }
  
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: compact ? 10 : 14,
        backgroundColor: theme.bg.elevated,
        borderRadius: theme.radius.lg,
        border: `1px solid ${isHovered ? 'rgba(255, 255, 255, 0.15)' : theme.border.subtle}`,
        boxShadow: isHovered
          ? `0 0 0 1px rgba(255, 255, 255, 0.15), 0 0 20px rgba(17, 119, 84, 0.15), 0 1px 3px rgba(0, 0, 0, 0.5)`
          : `0 0 0 1px rgba(255, 255, 255, 0.05), 0 1px 3px rgba(0, 0, 0, 0.5)`,
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        position: 'relative',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: `all ${theme.transition.fast}`,
      }}
    >
      {/* Deal Name & Amount */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <p
          style={{
            fontSize: compact ? theme.fontSize.sm : theme.fontSize.base,
            fontWeight: theme.fontWeight.medium,
            color: theme.text.primary,
            margin: 0,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {deal.name}
        </p>
        
        {deal.amount > 0 && (
          <span
            style={{
              fontSize: compact ? theme.fontSize.xs : theme.fontSize.sm,
              fontWeight: theme.fontWeight.semibold,
              color: theme.status.success,
              whiteSpace: 'nowrap',
            }}
          >
            ${formatCurrency(deal.amount)}
          </span>
        )}
      </div>
      
      {/* Company & Contact */}
      {!compact && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {deal.contact?.company_name && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Building2 size={12} style={{ color: theme.text.muted }} />
              <span
                style={{
                  fontSize: theme.fontSize.sm,
                  color: theme.text.secondary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {deal.contact.company_name}
              </span>
            </div>
          )}
          
          {deal.contact && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Avatar
                src={deal.contact.avatar_url}
                name={deal.contact.full_name}
                size="sm"
              />
              <span
                style={{
                  fontSize: theme.fontSize.sm,
                  color: theme.text.muted,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {deal.contact.full_name}
              </span>
            </div>
          )}
          
          {deal.expected_close_date && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={12} style={{ color: theme.text.muted }} />
              <span
                style={{
                  fontSize: theme.fontSize.xs,
                  color: theme.text.muted,
                }}
              >
                {new Date(deal.expected_close_date).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      )}
      
      {/* Menu button */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
        }}
        onClick={(e) => {
          e.stopPropagation()
          setShowMenu(!showMenu)
        }}
      >
        <button
          style={{
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: theme.radius.sm,
            color: theme.text.muted,
            cursor: 'pointer',
            opacity: 0,
            transition: `opacity ${theme.transition.fast}`,
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        >
          <MoreHorizontal size={14} />
        </button>
        
        {showMenu && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 4,
              backgroundColor: theme.bg.elevated,
              border: `1px solid ${theme.border.default}`,
              borderRadius: theme.radius.lg,
              boxShadow: theme.shadow.dropdown,
              zIndex: theme.z.dropdown,
              overflow: 'hidden',
              minWidth: 120,
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClick()
                setShowMenu(false)
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: 'transparent',
                border: 'none',
                color: theme.text.primary,
                fontSize: theme.fontSize.sm,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Edit2 size={14} />
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
                setShowMenu(false)
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: 'transparent',
                border: 'none',
                color: theme.status.error,
                fontSize: theme.fontSize.sm,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
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

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DollarSign, Plus, Building2, Calendar, MoreHorizontal, Trash2, Edit2, ArrowUpDown, Filter } from 'lucide-react'
import { theme } from '../../config/theme'
import { useCRM } from '../../context/CRMContext'
import { SearchInput, Avatar, LoadingSkeleton } from '../shared'
import { DealModal } from './DealModal'
import { DEAL_STAGES, DEAL_STAGE_INFO, type Deal, type DealStage } from '../../types'

// Sort types for deals
type SortDirection = 'asc' | 'desc'
interface DealSortRule {
  field: 'name' | 'amount' | 'created_at' | 'expected_close_date' | 'company'
  direction: SortDirection
}

// Sort field options
const DEAL_SORT_FIELDS = [
  { key: 'name', label: 'Deal Name' },
  { key: 'amount', label: 'Amount' },
  { key: 'created_at', label: 'Created Date' },
  { key: 'expected_close_date', label: 'Expected Close' },
  { key: 'company', label: 'Company' },
] as const

export function DealsKanban() {
  const { deals, loading, moveDealToStage, deleteDeal } = useCRM()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  // Track selected deal index for keyboard navigation
  const [, setSelectedDealIndex] = useState<number>(-1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createForStage, setCreateForStage] = useState<DealStage | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Sort and filter state
  const [sortRule, setSortRule] = useState<DealSortRule | null>(null)
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [stageFilter, setStageFilter] = useState<DealStage | 'all'>('all')
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)
  
  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortMenu(false)
      }
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Filter and sort deals
  const filteredDeals = useMemo(() => {
    let result = [...deals]
    
    // Apply stage filter
    if (stageFilter !== 'all') {
      result = result.filter(d => d.stage === stageFilter)
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(d => 
        d.name?.toLowerCase().includes(query) ||
        d.contact?.company?.toLowerCase().includes(query) ||
        d.contact?.full_name?.toLowerCase().includes(query)
      )
    }
    
    // Apply sort
    if (sortRule) {
      result.sort((a, b) => {
        let comparison = 0
        switch (sortRule.field) {
          case 'name':
            comparison = (a.name || '').localeCompare(b.name || '')
            break
          case 'amount':
            comparison = (a.amount || 0) - (b.amount || 0)
            break
          case 'created_at':
            comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
            break
          case 'expected_close_date':
            comparison = new Date(a.expected_close_date || 0).getTime() - new Date(b.expected_close_date || 0).getTime()
            break
          case 'company':
            comparison = (a.contact?.company || '').localeCompare(b.contact?.company || '')
            break
        }
        return sortRule.direction === 'asc' ? comparison : -comparison
      })
    }
    
    return result
  }, [deals, searchQuery, stageFilter, sortRule])
  
  // Group deals by stage
  const dealsByStage = useMemo(() => {
    const grouped: Record<DealStage, Deal[]> = {
      interested: [],
      discovery: [],
      demo: [],
      negotiation: [],
      proposal: [],
      closed: [],
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
  
  // Flatten all deals for keyboard navigation (sorted by stage and index)
  const allDealsFlat = useMemo(() => {
    const stageOrder: DealStage[] = ['interested', 'discovery', 'demo', 'negotiation', 'proposal', 'closed', 'lost']
    const flat: Deal[] = []
    stageOrder.forEach(stage => {
      flat.push(...dealsByStage[stage])
    })
    return flat
  }, [dealsByStage])
  
  // Create a 2D grid structure for navigation: [stage][index]
  const dealsGrid = useMemo(() => {
    const stageOrder: DealStage[] = ['interested', 'discovery', 'demo', 'negotiation', 'proposal', 'closed', 'lost']
    return stageOrder.map(stage => dealsByStage[stage])
  }, [dealsByStage])
  
  // Find current deal position in grid
  const findDealPosition = useCallback((dealId: string | undefined) => {
    if (!dealId) return { stageIndex: -1, dealIndex: -1 }
    
    for (let stageIndex = 0; stageIndex < dealsGrid.length; stageIndex++) {
      const dealIndex = dealsGrid[stageIndex].findIndex(d => d.id === dealId)
      if (dealIndex !== -1) {
        return { stageIndex, dealIndex }
      }
    }
    return { stageIndex: -1, dealIndex: -1 }
  }, [dealsGrid])
  
  // Keyboard navigation - instant, no lag
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't handle if typing in an input
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      
      // Don't handle if no deals available
      if (allDealsFlat.length === 0) return
      
      const currentPos = findDealPosition(selectedDeal?.id)
      
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        // Move down within same stage
        if (currentPos.stageIndex >= 0 && currentPos.dealIndex >= 0) {
          const currentStage = dealsGrid[currentPos.stageIndex]
          if (currentPos.dealIndex < currentStage.length - 1) {
            // Move to next deal in same stage
            const nextDeal = currentStage[currentPos.dealIndex + 1]
            setSelectedDeal(nextDeal)
            const newIndex = allDealsFlat.findIndex(d => d.id === nextDeal.id)
            if (newIndex !== -1) setSelectedDealIndex(newIndex)
          } else {
            // Move to first deal in next stage
            for (let i = currentPos.stageIndex + 1; i < dealsGrid.length; i++) {
              if (dealsGrid[i].length > 0) {
                const nextDeal = dealsGrid[i][0]
                setSelectedDeal(nextDeal)
                const newIndex = allDealsFlat.findIndex(d => d.id === nextDeal.id)
                if (newIndex !== -1) setSelectedDealIndex(newIndex)
                break
              }
            }
          }
        } else if (allDealsFlat.length > 0) {
          // Start from first deal
          const firstDeal = allDealsFlat[0]
          setSelectedDeal(firstDeal)
          setSelectedDealIndex(0)
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        // Move up within same stage
        if (currentPos.stageIndex >= 0 && currentPos.dealIndex >= 0) {
          if (currentPos.dealIndex > 0) {
            // Move to previous deal in same stage
            const currentStage = dealsGrid[currentPos.stageIndex]
            const prevDeal = currentStage[currentPos.dealIndex - 1]
            setSelectedDeal(prevDeal)
            const newIndex = allDealsFlat.findIndex(d => d.id === prevDeal.id)
            if (newIndex !== -1) setSelectedDealIndex(newIndex)
          } else {
            // Move to last deal in previous stage
            for (let i = currentPos.stageIndex - 1; i >= 0; i--) {
              if (dealsGrid[i].length > 0) {
                const prevDeal = dealsGrid[i][dealsGrid[i].length - 1]
                setSelectedDeal(prevDeal)
                const newIndex = allDealsFlat.findIndex(d => d.id === prevDeal.id)
                if (newIndex !== -1) setSelectedDealIndex(newIndex)
                break
              }
            }
          }
        } else if (allDealsFlat.length > 0) {
          // Start from last deal
          const lastDeal = allDealsFlat[allDealsFlat.length - 1]
          setSelectedDeal(lastDeal)
          setSelectedDealIndex(allDealsFlat.length - 1)
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        // Move right to next stage (same position in stage)
        if (currentPos.stageIndex >= 0 && currentPos.dealIndex >= 0) {
          for (let i = currentPos.stageIndex + 1; i < dealsGrid.length; i++) {
            const targetStage = dealsGrid[i]
            if (targetStage.length > 0) {
              // Try to find deal at same index, or closest
              const targetIndex = Math.min(currentPos.dealIndex, targetStage.length - 1)
              const nextDeal = targetStage[targetIndex]
              setSelectedDeal(nextDeal)
              const newIndex = allDealsFlat.findIndex(d => d.id === nextDeal.id)
              if (newIndex !== -1) setSelectedDealIndex(newIndex)
              break
            }
          }
        } else if (allDealsFlat.length > 0) {
          // Start from first deal
          const firstDeal = allDealsFlat[0]
          setSelectedDeal(firstDeal)
          setSelectedDealIndex(0)
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        // Move left to previous stage (same position in stage)
        if (currentPos.stageIndex >= 0 && currentPos.dealIndex >= 0) {
          for (let i = currentPos.stageIndex - 1; i >= 0; i--) {
            const targetStage = dealsGrid[i]
            if (targetStage.length > 0) {
              // Try to find deal at same index, or closest
              const targetIndex = Math.min(currentPos.dealIndex, targetStage.length - 1)
              const prevDeal = targetStage[targetIndex]
              setSelectedDeal(prevDeal)
              const newIndex = allDealsFlat.findIndex(d => d.id === prevDeal.id)
              if (newIndex !== -1) setSelectedDealIndex(newIndex)
              break
            }
          }
        } else if (allDealsFlat.length > 0) {
          // Start from first deal
          const firstDeal = allDealsFlat[0]
          setSelectedDeal(firstDeal)
          setSelectedDealIndex(0)
        }
      } else if (e.key === 'Enter' && selectedDeal) {
        e.preventDefault()
        setIsModalOpen(true)
      } else if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedDeal, allDealsFlat, dealsGrid, findDealPosition, isModalOpen])
  
  // Update selected index when deal changes (instant, no delay)
  useEffect(() => {
    if (selectedDeal) {
      const index = allDealsFlat.findIndex(d => d.id === selectedDeal.id)
      if (index !== -1) {
        setSelectedDealIndex(index)
      } else {
        setSelectedDealIndex(-1)
      }
    } else {
      setSelectedDealIndex(-1)
    }
  }, [selectedDeal, allDealsFlat])
  
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
  
  // Only show active stages (not closed/lost by default for cleaner view)
  const activeStages = DEAL_STAGES.filter(s => s !== 'closed' && s !== 'lost')
  const closedStages = ['closed', 'lost'] as DealStage[]
  
  return (
    <div 
      ref={containerRef}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      tabIndex={0}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          gap: 16,
          borderBottom: `1px solid ${theme.border.subtle}`,
        }}
      >
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
            fontSize: '1.02rem',
            color: theme.text.muted,
            margin: 0,
          }}
        >
          {filteredDeals.length} of {deals.length} {deals.length === 1 ? 'deal' : 'deals'} • 
          ${formatCurrency(filteredDeals.filter(d => d.stage !== 'lost').reduce((sum, d) => sum + (d.amount || 0), 0))} pipeline value
        </p>
      </div>
      
      {/* Search & Filter/Sort Bar */}
      <div
        style={{
          padding: '12px 20px',
          backgroundColor: theme.bg.card,
          borderBottom: `1px solid ${theme.border.subtle}`,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery('')}
          placeholder="Search deals..."
          style={{ width: 200, flexShrink: 0 }}
        />
        
        {/* Sort Button */}
        <div ref={sortRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
              color: '#fff',
              backgroundColor: theme.accent.primary,
              border: `1px solid ${theme.accent.primary}`,
              borderRadius: theme.radius.md,
              cursor: 'pointer',
              transition: `all ${theme.transition.fast}`,
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.accent.primaryHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.accent.primary}
          >
            <ArrowUpDown size={14} />
            <span>Sort</span>
            {sortRule && (
              <span style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.25)', 
                color: '#fff', 
                borderRadius: theme.radius.full,
                padding: '1px 6px',
                fontSize: theme.fontSize.xs,
                fontWeight: theme.fontWeight.semibold,
              }}>
                1
              </span>
            )}
          </button>
          
          {/* Sort Dropdown */}
          <AnimatePresence>
            {showSortMenu && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 8,
                  minWidth: 200,
                  backgroundColor: theme.bg.elevated,
                  border: `1px solid ${theme.border.default}`,
                  borderRadius: 12,
                  boxShadow: theme.shadow.dropdown,
                  zIndex: 9999,
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border.subtle}` }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary }}>Sort by</span>
                </div>
                <div style={{ padding: 8 }}>
                  {DEAL_SORT_FIELDS.map(field => (
                    <button
                      key={field.key}
                      onClick={() => {
                        if (sortRule?.field === field.key) {
                          // Toggle direction or clear
                          if (sortRule.direction === 'asc') {
                            setSortRule({ field: field.key, direction: 'desc' })
                          } else {
                            setSortRule(null)
                          }
                        } else {
                          setSortRule({ field: field.key, direction: 'asc' })
                        }
                        setShowSortMenu(false)
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 13,
                        color: sortRule?.field === field.key ? theme.accent.primary : theme.text.primary,
                        backgroundColor: sortRule?.field === field.key ? theme.accent.primaryBg : 'transparent',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span>{field.label}</span>
                      {sortRule?.field === field.key && (
                        <span style={{ fontSize: 11, color: theme.text.muted }}>
                          {sortRule.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {sortRule && (
                  <div style={{ padding: '8px 16px', borderTop: `1px solid ${theme.border.subtle}` }}>
                    <button
                      onClick={() => {
                        setSortRule(null)
                        setShowSortMenu(false)
                      }}
                      style={{
                        fontSize: 12,
                        color: theme.text.muted,
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Clear sort
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Filter Button */}
        <div ref={filterRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
              color: '#fff',
              backgroundColor: theme.accent.primary,
              border: `1px solid ${theme.accent.primary}`,
              borderRadius: theme.radius.md,
              cursor: 'pointer',
              transition: `all ${theme.transition.fast}`,
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.accent.primaryHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.accent.primary}
          >
            <Filter size={14} />
            <span>Filter</span>
            {stageFilter !== 'all' && (
              <span style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.25)', 
                color: '#fff', 
                borderRadius: theme.radius.full,
                padding: '1px 6px',
                fontSize: theme.fontSize.xs,
                fontWeight: theme.fontWeight.semibold,
              }}>
                1
              </span>
            )}
          </button>
          
          {/* Filter Dropdown */}
          <AnimatePresence>
            {showFilterMenu && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 8,
                  minWidth: 200,
                  backgroundColor: theme.bg.elevated,
                  border: `1px solid ${theme.border.default}`,
                  borderRadius: 12,
                  boxShadow: theme.shadow.dropdown,
                  zIndex: 9999,
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border.subtle}` }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary }}>Filter by Stage</span>
                </div>
                <div style={{ padding: 8 }}>
                  <button
                    onClick={() => {
                      setStageFilter('all')
                      setShowFilterMenu(false)
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: 13,
                      color: stageFilter === 'all' ? theme.accent.primary : theme.text.primary,
                      backgroundColor: stageFilter === 'all' ? theme.accent.primaryBg : 'transparent',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    All Stages
                  </button>
                  {DEAL_STAGES.map(stage => (
                    <button
                      key={stage}
                      onClick={() => {
                        setStageFilter(stage)
                        setShowFilterMenu(false)
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 13,
                        color: stageFilter === stage ? theme.accent.primary : theme.text.primary,
                        backgroundColor: stageFilter === stage ? theme.accent.primaryBg : 'transparent',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: DEAL_STAGE_INFO[stage].color,
                        }}
                      />
                      {DEAL_STAGE_INFO[stage].label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Add Deal Button */}
        <button
          onClick={() => handleCreateDeal()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeight.medium,
            color: '#fff',
            backgroundColor: theme.accent.primary,
            border: `1px solid ${theme.accent.primary}`,
            borderRadius: theme.radius.md,
            cursor: 'pointer',
            transition: `all ${theme.transition.fast}`,
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.accent.primaryHover}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.accent.primary}
        >
          <Plus size={14} />
          <span>Add Deal</span>
        </button>
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
            width: '100%',
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
              selectedDealId={selectedDeal?.id}
            />
          ))}
          
          {/* Closed Deals Section */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              flex: 1,
              minWidth: 320,
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
                selectedDealId={selectedDeal?.id}
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
  selectedDealId?: string
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
  selectedDealId,
  compact = false,
}: KanbanColumnProps) {
  const info = DEAL_STAGE_INFO[stage]
  const [isDragOver, setIsDragOver] = useState(false)
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    // Only set drag over to false if we're leaving the column itself, not a child
    if (e.currentTarget === e.target) {
      setIsDragOver(false)
    }
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    const dealId = e.dataTransfer.getData('dealId')
    if (dealId) {
      // Calculate the index based on where the card was dropped
      // For now, append to the end of the stage
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
        flex: compact ? 'none' : 1,
        width: compact ? '100%' : 'auto',
        minWidth: compact ? '100%' : 320,
        maxWidth: compact ? '100%' : 'none',
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
                isSelected={selectedDealId === deal.id}
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
  isSelected?: boolean
}

function DealCard({ deal, onClick, onDelete, compact = false, isSelected = false }: DealCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [hasDragged, setHasDragged] = useState(false)
  
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('dealId', deal.id)
    e.dataTransfer.effectAllowed = 'move'
    setIsDragging(true)
    setHasDragged(false)
  }
  
  const handleDragEnd = () => {
    setIsDragging(false)
    setHasDragged(true)
    // Reset hasDragged after a short delay to allow click to be prevented
    setTimeout(() => setHasDragged(false), 100)
  }
  
  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger onClick if we just finished dragging
    if (hasDragged) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    onClick()
  }
  
  return (
    <motion.div
      draggable={false}
      animate={{
        border: isSelected 
          ? '1px solid rgba(255, 255, 255, 0.8)' 
          : isHovered 
            ? '1px solid rgba(255, 255, 255, 0.15)' 
            : `1px solid ${theme.border.subtle}`,
        boxShadow: isSelected
          ? `0 0 0 1px rgba(255, 255, 255, 0.8), 0 0 30px rgba(255, 255, 255, 0.3), 0 0 60px rgba(255, 255, 255, 0.15), 0 1px 3px rgba(0, 0, 0, 0.5)`
          : isHovered
            ? `0 0 0 1px rgba(255, 255, 255, 0.15), 0 0 20px rgba(17, 119, 84, 0.15), 0 1px 3px rgba(0, 0, 0, 0.5)`
            : `0 0 0 1px rgba(255, 255, 255, 0.05), 0 1px 3px rgba(0, 0, 0, 0.5)`,
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
      transition={{ duration: 0.2 }}
      style={{
        padding: compact ? 10 : 14,
        backgroundColor: theme.bg.elevated,
        borderRadius: theme.radius.lg,
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        position: 'relative',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        style={{ width: '100%', height: '100%' }}
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
          {deal.contact?.company && (
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
                {deal.contact.company}
              </span>
            </div>
          )}
          
          {deal.contact && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Avatar
                name={deal.contact.full_name || deal.contact.email || 'Unknown'}
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
    </motion.div>
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

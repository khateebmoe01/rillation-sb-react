import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Calendar } from 'lucide-react'
import { theme } from '../../config/theme'

export interface PipelineProgress {
  meeting_booked?: string | null
  disco_show?: string | null
  qualified?: string | null
  demo_booked?: string | null
  demo_show?: string | null
  proposal_sent?: string | null
  closed?: string | null
}

interface PipelineStage {
  key: keyof PipelineProgress
  label: string
}

const PIPELINE_STAGES: PipelineStage[] = [
  { key: 'meeting_booked', label: 'Meeting Booked' },
  { key: 'disco_show', label: 'Disco Show' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'demo_booked', label: 'Demo Booked' },
  { key: 'demo_show', label: 'Demo Show' },
  { key: 'proposal_sent', label: 'Proposal Sent' },
  { key: 'closed', label: 'Closed' },
]

interface PipelineProgressDropdownProps {
  value: PipelineProgress | null
  onChange: (value: PipelineProgress) => void
  disabled?: boolean
}

export function PipelineProgressDropdown({ 
  value, 
  onChange, 
  disabled = false 
}: PipelineProgressDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const progress = value || {}

  // Find the deepest (last) checked stage
  const getDeepestStage = () => {
    for (let i = PIPELINE_STAGES.length - 1; i >= 0; i--) {
      const stage = PIPELINE_STAGES[i]
      if (progress[stage.key]) {
        return stage
      }
    }
    return null
  }

  const deepestStage = getDeepestStage()

  // Check if dropdown should open upward
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect()
      const dropdownHeight = 400 // max height of dropdown
      const spaceBelow = window.innerHeight - buttonRect.bottom
      const spaceAbove = buttonRect.top
      
      // Open upward if there's not enough space below but more space above
      setOpenUpward(spaceBelow < dropdownHeight && spaceAbove > spaceBelow)
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const isContained = dropdownRef.current && dropdownRef.current.contains(target)
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/dd30fd30-28f2-438b-a53d-4389ace883b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PipelineProgressDropdown.tsx:handleClickOutside',message:'Click outside check',data:{isContained,targetTag:(target as HTMLElement).tagName,targetClass:(target as HTMLElement).className},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H6'})}).catch(()=>{});
      // #endregion
      if (!isContained) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleToggleStage = (stageKey: keyof PipelineProgress) => {
    const newProgress = { ...progress }
    
    if (newProgress[stageKey]) {
      // Uncheck this stage
      newProgress[stageKey] = null
    } else {
      // Check this stage with current date
      newProgress[stageKey] = new Date().toISOString()
    }
    
    onChange(newProgress)
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div 
      ref={dropdownRef} 
      style={{ position: 'relative' }}
      onClick={(e) => {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/dd30fd30-28f2-438b-a53d-4389ace883b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PipelineProgressDropdown.tsx:wrapper',message:'Wrapper div onClick',data:{eventType:e.type,target:(e.target as HTMLElement).tagName},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        e.stopPropagation()
      }}
      onMouseDown={(e) => {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/dd30fd30-28f2-438b-a53d-4389ace883b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PipelineProgressDropdown.tsx:wrapper',message:'Wrapper div onMouseDown',data:{eventType:e.type,target:(e.target as HTMLElement).tagName},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        e.stopPropagation()
      }}
    >
      <button
        ref={buttonRef}
        onClick={(e) => {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/dd30fd30-28f2-438b-a53d-4389ace883b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PipelineProgressDropdown.tsx:button',message:'Button onClick triggered',data:{disabled,currentIsOpen:isOpen,willSetTo:!isOpen},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2-H3'})}).catch(()=>{});
          // #endregion
          e.stopPropagation()
          if (!disabled) setIsOpen(!isOpen)
        }}
        disabled={disabled}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          backgroundColor: theme.bg.elevated,
          border: `1px solid ${theme.border.default}`,
          borderRadius: theme.radius.lg,
          color: theme.text.primary,
          fontSize: theme.fontSize.sm,
          cursor: disabled ? 'not-allowed' : 'pointer',
          minWidth: 160,
          justifyContent: 'space-between',
          opacity: disabled ? 0.5 : 1,
          transition: `all ${theme.transition.fast}`,
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = theme.border.strong
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = theme.border.default
        }}
      >
        {deepestStage ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
            <span style={{ 
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              width: '100%',
            }}>
              {deepestStage.label}
            </span>
            {progress[deepestStage.key] && (
              <span style={{ 
                fontSize: theme.fontSize.xs, 
                color: theme.text.muted,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%',
              }}>
                {formatDate(progress[deepestStage.key])}
              </span>
            )}
          </div>
        ) : (
          <span style={{ color: theme.text.muted }}>No progress</span>
        )}
        <ChevronDown size={14} style={{ color: theme.text.muted, flexShrink: 0 }} />
      </button>

      {/* #region agent log */}
      {(() => { fetch('http://127.0.0.1:7243/ingest/dd30fd30-28f2-438b-a53d-4389ace883b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PipelineProgressDropdown.tsx:render',message:'Component render state',data:{isOpen,disabled,zIndex:theme.z.dropdown},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3-H4'})}).catch(()=>{}); return null; })()}
      {/* #endregion */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: openUpward ? 8 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: openUpward ? 8 : -8 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              ...(openUpward ? { bottom: '100%', marginBottom: 4 } : { top: '100%', marginTop: 4 }),
              left: 0,
              minWidth: 280,
              maxHeight: 400,
              overflowY: 'auto',
              backgroundColor: theme.bg.elevated,
              border: `1px solid ${theme.border.default}`,
              borderRadius: theme.radius.xl,
              boxShadow: theme.shadow.dropdown,
              zIndex: theme.z.dropdown,
              padding: 8,
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                borderBottom: `1px solid ${theme.border.subtle}`,
                marginBottom: 8,
              }}
            >
              <h4
                style={{
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.semibold,
                  color: theme.text.primary,
                  margin: 0,
                }}
              >
                PIPELINE PROGRESS
              </h4>
            </div>

            {PIPELINE_STAGES.map((stage) => {
              const isChecked = !!progress[stage.key]
              const date = progress[stage.key]

              return (
                <button
                  key={stage.key}
                  onClick={(e) => {
                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/dd30fd30-28f2-438b-a53d-4389ace883b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PipelineProgressDropdown.tsx:checkboxClick',message:'Checkbox button clicked',data:{stageKey:stage.key},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H6'})}).catch(()=>{});
                    // #endregion
                    e.stopPropagation()
                    handleToggleStage(stage.key)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: theme.radius.lg,
                    color: theme.text.primary,
                    fontSize: theme.fontSize.sm,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: `all ${theme.transition.fast}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.bg.hover
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  {/* Checkbox */}
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: theme.radius.sm,
                      border: `2px solid ${isChecked ? theme.accent.primary : theme.border.strong}`,
                      backgroundColor: isChecked ? theme.accent.primary : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: `all ${theme.transition.fast}`,
                    }}
                  >
                    {isChecked && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        style={{ color: 'white' }}
                      >
                        <path
                          d="M10 3L4.5 8.5L2 6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Label and Date */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.medium,
                        color: theme.text.primary,
                        marginBottom: isChecked && date ? 2 : 0,
                      }}
                    >
                      {stage.label}
                    </div>
                    {isChecked && date && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: theme.fontSize.xs,
                          color: theme.text.muted,
                        }}
                      >
                        <Calendar size={10} />
                        {formatDate(date)}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

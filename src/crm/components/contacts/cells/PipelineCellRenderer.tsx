import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { ICellRendererParams } from 'ag-grid-community'
import { theme } from '../../../config/theme'
import type { Contact } from '../../../types'
import { useCRM } from '../../../context/CRMContext'

// Pipeline steps in order from earliest to deepest
const PIPELINE_STEPS = [
  { key: 'meeting_booked', label: 'Meeting Booked', color: '#a78bfa' },
  { key: 'showed_up_to_disco', label: 'Showed to Disco', color: '#c084fc' },
  { key: 'qualified', label: 'Qualified', color: '#fbbf24' },
  { key: 'demo_booked', label: 'Demo Booked', color: '#fb923c' },
  { key: 'showed_up_to_demo', label: 'Showed to Demo', color: '#f97316' },
  { key: 'proposal_sent', label: 'Proposal Sent', color: '#2dd4bf' },
  { key: 'closed', label: 'Closed Won', color: '#22c55e' },
] as const

type PipelineKey = typeof PIPELINE_STEPS[number]['key']

interface PipelineCellRendererProps extends ICellRendererParams {
  data: Contact
}

export function PipelineCellRenderer({ data }: PipelineCellRendererProps) {
  const { updateContact } = useCRM()
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)

  // Find the deepest completed step
  let deepestStep: typeof PIPELINE_STEPS[number] | null = null
  let deepestIndex = -1

  for (let i = 0; i < PIPELINE_STEPS.length; i++) {
    const step = PIPELINE_STEPS[i]
    if (data[step.key as keyof Contact]) {
      deepestStep = step
      deepestIndex = i
    }
  }

  const handleOpen = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
      })
    }
    setIsOpen(true)
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handlePipelineSelect = async (selectedKey: PipelineKey) => {
    setIsOpen(false)

    const selectedIndex = PIPELINE_STEPS.findIndex(s => s.key === selectedKey)

    // Build updates - set all steps up to and including the selected one to true
    const updates: Partial<Contact> = {
      meeting_booked: selectedIndex >= 0,
      showed_up_to_disco: selectedIndex >= 1,
      qualified: selectedIndex >= 2,
      demo_booked: selectedIndex >= 3,
      showed_up_to_demo: selectedIndex >= 4,
      proposal_sent: selectedIndex >= 5,
      closed: selectedIndex >= 6,
    }

    await updateContact(data.id, updates)
  }

  const handleClearPipeline = async () => {
    setIsOpen(false)

    const updates: Partial<Contact> = {
      meeting_booked: false,
      showed_up_to_disco: false,
      qualified: false,
      demo_booked: false,
      showed_up_to_demo: false,
      proposal_sent: false,
      closed: false,
    }

    await updateContact(data.id, updates)
  }

  const dropdown = isOpen ? createPortal(
    <div
      style={{
        position: 'fixed',
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        backgroundColor: '#1e293b',
        borderRadius: theme.radius.md,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        border: '1px solid #334155',
        zIndex: 10000,
        minWidth: 180,
        overflow: 'hidden',
      }}
    >
      {PIPELINE_STEPS.map((step, index) => {
        const isCompleted = index <= deepestIndex
        const isCurrentStep = step.key === deepestStep?.key

        return (
          <div
            key={step.key}
            onClick={(e) => {
              e.stopPropagation()
              handlePipelineSelect(step.key)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              cursor: 'pointer',
              backgroundColor: isCurrentStep ? '#334155' : 'transparent',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!isCurrentStep) {
                e.currentTarget.style.backgroundColor = '#2d3a4d'
              }
            }}
            onMouseLeave={(e) => {
              if (!isCurrentStep) {
                e.currentTarget.style.backgroundColor = 'transparent'
              }
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: theme.radius.full,
                backgroundColor: isCompleted ? step.color : '#475569',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: theme.fontSize.sm,
                color: isCurrentStep ? '#fff' : isCompleted ? step.color : theme.text.secondary,
              }}
            >
              {step.label}
            </span>
          </div>
        )
      })}

      {/* Clear option */}
      <div style={{ borderTop: '1px solid #334155', marginTop: 4, paddingTop: 4 }}>
        <div
          onClick={(e) => {
            e.stopPropagation()
            handleClearPipeline()
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            cursor: 'pointer',
            backgroundColor: 'transparent',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2d3a4d'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <span style={{ fontSize: theme.fontSize.sm, color: theme.text.muted }}>
            Clear progress
          </span>
        </div>
      </div>
    </div>,
    document.body
  ) : null

  if (!deepestStep) {
    return (
      <>
        <span
          ref={triggerRef}
          onClick={(e) => {
            e.stopPropagation()
            handleOpen()
          }}
          style={{
            fontSize: theme.fontSize.sm,
            color: theme.text.muted,
            cursor: 'pointer',
          }}
        >
          No progress
        </span>
        {dropdown}
      </>
    )
  }

  return (
    <>
      <div
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation()
          handleOpen()
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          backgroundColor: `${deepestStep.color}15`,
          borderRadius: theme.radius.md,
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeight.medium,
            color: deepestStep.color,
            whiteSpace: 'nowrap',
          }}
        >
          {deepestStep.label}
        </span>
      </div>
      {dropdown}
    </>
  )
}

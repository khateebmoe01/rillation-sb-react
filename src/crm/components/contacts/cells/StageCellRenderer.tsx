import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { ICellRendererParams } from 'ag-grid-community'
import { theme } from '../../../config/theme'
import type { Contact, ContactStatus } from '../../../types'
import { CONTACT_STAGE_INFO, getContactStatus } from '../../../types'
import { useCRM } from '../../../context/CRMContext'

// Stage options for dropdown
const STAGE_OPTIONS: { value: ContactStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'engaged', label: 'Engaged' },
  { value: 'meeting_booked', label: 'Meeting Booked' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'demo', label: 'Demo' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'closed', label: 'Closed Won' },
]

interface StageCellRendererProps extends ICellRendererParams {
  data: Contact
}

export function StageCellRenderer({ data }: StageCellRendererProps) {
  const { updateContact } = useCRM()
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const pillRef = useRef<HTMLDivElement>(null)

  // Use getContactStatus to derive the actual stage from pipeline flags
  const status = getContactStatus(data)
  const stageInfo = CONTACT_STAGE_INFO[status]

  const handleOpen = useCallback(() => {
    if (pillRef.current) {
      const rect = pillRef.current.getBoundingClientRect()
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
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    // Use setTimeout to avoid closing immediately from the same click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleStageSelect = async (newStage: ContactStatus) => {
    setIsOpen(false)

    // Map stage to the appropriate boolean flags
    const updates: Partial<Contact> = {
      stage: newStage,
      // Reset all pipeline flags first
      meeting_booked: false,
      qualified: false,
      showed_up_to_disco: false,
      demo_booked: false,
      showed_up_to_demo: false,
      proposal_sent: false,
      closed: false,
    }

    // Set the appropriate flag based on the new stage
    switch (newStage) {
      case 'meeting_booked':
        updates.meeting_booked = true
        break
      case 'qualified':
        updates.meeting_booked = true
        updates.qualified = true
        break
      case 'demo':
        updates.meeting_booked = true
        updates.qualified = true
        updates.demo_booked = true
        break
      case 'proposal':
        updates.meeting_booked = true
        updates.qualified = true
        updates.demo_booked = true
        updates.proposal_sent = true
        break
      case 'closed':
        updates.meeting_booked = true
        updates.qualified = true
        updates.demo_booked = true
        updates.proposal_sent = true
        updates.closed = true
        break
    }

    await updateContact(data.id, updates)
  }

  if (!stageInfo) {
    return (
      <span style={{ fontSize: theme.fontSize.sm, color: theme.text.muted }}>
        —
      </span>
    )
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
        minWidth: 160,
        overflow: 'hidden',
      }}
    >
      {STAGE_OPTIONS.map((option) => {
        const optionInfo = CONTACT_STAGE_INFO[option.value]
        const isSelected = status === option.value

        return (
          <div
            key={option.value}
            onClick={(e) => {
              e.stopPropagation()
              handleStageSelect(option.value)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              cursor: 'pointer',
              backgroundColor: isSelected ? '#334155' : 'transparent',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = '#2d3a4d'
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = 'transparent'
              }
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: theme.radius.full,
                backgroundColor: optionInfo?.color || '#94a3b8',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: theme.fontSize.sm,
                color: isSelected ? '#fff' : theme.text.secondary,
              }}
            >
              {option.label}
            </span>
          </div>
        )
      })}
    </div>,
    document.body
  ) : null

  return (
    <>
      <div
        ref={pillRef}
        onClick={(e) => {
          e.stopPropagation()
          handleOpen()
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 10px',
          backgroundColor: stageInfo.bgColor,
          borderRadius: theme.radius.full,
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: theme.radius.full,
            backgroundColor: stageInfo.color,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeight.medium,
            color: stageInfo.color,
            whiteSpace: 'nowrap',
          }}
        >
          {stageInfo.label}
        </span>
      </div>
      {dropdown}
    </>
  )
}

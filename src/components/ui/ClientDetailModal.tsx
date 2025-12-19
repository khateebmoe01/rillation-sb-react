import { useState, useEffect } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { supabase, formatNumber, formatPercentage, formatDateForDisplay } from '../../lib/supabase'
import Button from './Button'

interface ClientDetailModalProps {
  isOpen: boolean
  onClose: () => void
  clientName: string
  startDate: Date
  endDate: Date
  actualData: {
    emailsSent: number
    uniqueProspects: number
    realReplies: number
    meetings: number
    positiveReplies?: number
  }
  onTargetsSaved?: () => void
}

export default function ClientDetailModal({
  isOpen,
  onClose,
  clientName,
  startDate,
  endDate,
  actualData,
  onTargetsSaved,
}: ClientDetailModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [emailsPerDay, setEmailsPerDay] = useState(0)
  const [prospectsPerDay, setProspectsPerDay] = useState(0)
  const [repliesPerDay, setRepliesPerDay] = useState(0)
  const [meetingsPerDay, setMeetingsPerDay] = useState(0)

  // Calculate number of days in range
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

  // Calculate targets for the period
  const emailsTarget = emailsPerDay * daysDiff
  const prospectsTarget = prospectsPerDay * daysDiff
  const repliesTarget = repliesPerDay * daysDiff
  const meetingsTarget = meetingsPerDay * daysDiff

  // Calculate percentages
  const emailsPct = emailsTarget > 0 ? (actualData.emailsSent / emailsTarget) * 100 : 0
  const prospectsPct = prospectsTarget > 0 ? (actualData.uniqueProspects / prospectsTarget) * 100 : 0
  const repliesPct = repliesTarget > 0 ? (actualData.realReplies / repliesTarget) * 100 : 0
  const meetingsPct = meetingsTarget > 0 ? (actualData.meetings / meetingsTarget) * 100 : 0

  // Fetch targets
  useEffect(() => {
    if (!isOpen) return

    async function fetchTargets() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('client_targets')
          .select('*')
          .eq('client', clientName)
          .single()

        if (error && error.code !== 'PGRST116') throw error

        type TargetRow = {
          client: string
          emails_per_day: number | null
          prospects_per_day: number | null
          replies_per_day: number | null
          meetings_per_day: number | null
        }

        const targetData = data as TargetRow | null

        if (targetData) {
          setEmailsPerDay(targetData.emails_per_day || 0)
          setProspectsPerDay(targetData.prospects_per_day || 0)
          setRepliesPerDay(targetData.replies_per_day || 0)
          setMeetingsPerDay(targetData.meetings_per_day || 0)
        } else {
          // Reset to 0 if no targets found
          setEmailsPerDay(0)
          setProspectsPerDay(0)
          setRepliesPerDay(0)
          setMeetingsPerDay(0)
        }
      } catch (err) {
        console.error('Error fetching targets:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTargets()
  }, [isOpen, clientName])

  // Handle focus - select all text
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select()
  }

  // Save targets
  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('client_targets')
        .upsert({
          client: clientName,
          emails_per_day: emailsPerDay,
          prospects_per_day: prospectsPerDay,
          replies_per_day: repliesPerDay,
          meetings_per_day: meetingsPerDay,
        } as any, {
          onConflict: 'client'
        })

      if (error) throw error

      onTargetsSaved?.()
      onClose()
    } catch (err) {
      console.error('Error saving targets:', err)
      alert('Failed to save targets')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const getPercentageColor = (pct: number) => {
    if (pct >= 100) return 'text-rillation-green'
    if (pct >= 75) return 'text-rillation-orange'
    return 'text-rillation-red'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-rillation-card border border-rillation-border rounded-xl w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-rillation-border">
          <h2 className="text-xl font-semibold text-rillation-text">{clientName}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-rillation-card-hover rounded-lg transition-colors"
          >
            <X size={20} className="text-rillation-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Date Range */}
              <div>
                <h3 className="text-sm font-medium text-rillation-text-muted mb-2">Date Range</h3>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 bg-rillation-bg border border-rillation-border rounded text-sm text-rillation-text">
                    {formatDateForDisplay(startDate)}
                  </div>
                  <span className="text-rillation-text-muted">to</span>
                  <div className="px-3 py-1.5 bg-rillation-bg border border-rillation-border rounded text-sm text-rillation-text">
                    {formatDateForDisplay(endDate)}
                  </div>
                </div>
              </div>

              {/* Actual vs Target */}
              <div>
                <h3 className="text-sm font-medium text-rillation-text mb-2">Actual vs Target</h3>
                <p className="text-xs text-rillation-text-muted mb-3">
                  Period: {formatDateForDisplay(startDate)} - {formatDateForDisplay(endDate)}
                </p>
                
                <div className="border border-rillation-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-rillation-card-hover">
                        <th className="px-4 py-2 text-left text-xs font-medium text-rillation-text-muted">Metric</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-rillation-text-muted">Actual</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-rillation-text-muted">Target</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-rillation-text-muted">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rillation-border/30">
                      <tr>
                        <td className="px-4 py-2 text-sm text-rillation-text">Emails Sent</td>
                        <td className="px-4 py-2 text-sm text-right font-medium text-rillation-text">
                          {formatNumber(actualData.emailsSent)}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-rillation-text-muted">
                          {formatNumber(emailsTarget)}
                        </td>
                        <td className={`px-4 py-2 text-sm text-right font-medium ${getPercentageColor(emailsPct)}`}>
                          {formatPercentage(emailsPct)}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-sm text-rillation-text">Unique Prospects</td>
                        <td className="px-4 py-2 text-sm text-right font-medium text-rillation-text">
                          {formatNumber(actualData.uniqueProspects)}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-rillation-text-muted">
                          {formatNumber(prospectsTarget)}
                        </td>
                        <td className={`px-4 py-2 text-sm text-right font-medium ${getPercentageColor(prospectsPct)}`}>
                          {formatPercentage(prospectsPct)}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-sm text-rillation-text">Real Replies</td>
                        <td className="px-4 py-2 text-sm text-right font-medium text-rillation-text">
                          {formatNumber(actualData.realReplies)}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-rillation-text-muted">
                          {formatNumber(repliesTarget)}
                        </td>
                        <td className={`px-4 py-2 text-sm text-right font-medium ${getPercentageColor(repliesPct)}`}>
                          {formatPercentage(repliesPct)}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-sm text-rillation-text">Meetings</td>
                        <td className="px-4 py-2 text-sm text-right font-medium text-rillation-text">
                          {formatNumber(actualData.meetings)}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-rillation-text-muted">
                          {formatNumber(meetingsTarget)}
                        </td>
                        <td className={`px-4 py-2 text-sm text-right font-medium ${getPercentageColor(meetingsPct)}`}>
                          {formatPercentage(meetingsPct)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Edit Daily Targets */}
              <div>
                <h3 className="text-sm font-medium text-rillation-text mb-3">Edit Daily Targets</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-rillation-text-muted mb-1">
                      Emails per Day
                    </label>
                    <input
                      type="number"
                      value={emailsPerDay || ''}
                      onChange={(e) => setEmailsPerDay(parseInt(e.target.value) || 0)}
                      onFocus={handleFocus}
                      className="w-full px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text focus:outline-none focus:border-rillation-purple"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-rillation-text-muted mb-1">
                      Prospects per Day
                    </label>
                    <input
                      type="number"
                      value={prospectsPerDay || ''}
                      onChange={(e) => setProspectsPerDay(parseInt(e.target.value) || 0)}
                      onFocus={handleFocus}
                      className="w-full px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text focus:outline-none focus:border-rillation-purple"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-rillation-text-muted mb-1">
                      Replies per Day
                    </label>
                    <input
                      type="number"
                      value={repliesPerDay || ''}
                      onChange={(e) => setRepliesPerDay(parseInt(e.target.value) || 0)}
                      onFocus={handleFocus}
                      className="w-full px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text focus:outline-none focus:border-rillation-purple"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-rillation-text-muted mb-1">
                      Meetings per Day
                    </label>
                    <input
                      type="number"
                      value={meetingsPerDay || ''}
                      onChange={(e) => setMeetingsPerDay(parseInt(e.target.value) || 0)}
                      onFocus={handleFocus}
                      className="w-full px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text focus:outline-none focus:border-rillation-purple"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-rillation-border">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Targets
          </Button>
        </div>
      </div>
    </div>
  )
}

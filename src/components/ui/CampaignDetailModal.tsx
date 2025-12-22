import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase, formatDateForQuery, formatNumber, formatPercentage } from '../../lib/supabase'
import type { CampaignStat } from '../../hooks/useCampaignStats'

interface CampaignDetailModalProps {
  isOpen: boolean
  onClose: () => void
  campaign: CampaignStat | null
  startDate: Date
  endDate: Date
  clientFilter?: string
}

interface SequenceStep {
  step_number?: number
  email_subject?: string
  emails_sent?: number
  leads_contacted?: number
  opened?: number
  unique_opens_per_contact?: number
  unique_replies_per_contact?: number
  bounced?: number
  interested?: number
  delay?: number
  delay_unit?: string
}

interface CampaignDetail {
  campaign_name: string
  campaign_id: string
  client: string
  totalSent: number
  uniqueProspects: number
  totalReplies: number
  realReplies: number
  positiveReplies: number
  bounces: number
  meetingsBooked: number
  sequenceSteps: SequenceStep[]
}

export default function CampaignDetailModal({
  isOpen,
  onClose,
  campaign,
  startDate,
  endDate,
  clientFilter,
}: CampaignDetailModalProps) {
  const [detail, setDetail] = useState<CampaignDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !campaign) {
      setDetail(null)
      return
    }

    async function fetchCampaignDetail() {
      if (!campaign) return
      
      setLoading(true)
      try {
        const startStr = formatDateForQuery(startDate)
        const endStr = formatDateForQuery(endDate)

        // Fetch campaign_reporting data with sequence_step_stats
        let query = supabase
          .from('campaign_reporting')
          .select('*')
          .eq('campaign_name', campaign.campaign_name)
          .gte('date', startStr)
          .lte('date', endStr)
          .order('date', { ascending: false })
          .limit(100000) // Avoid 1000-row default limit

        // Apply client filter if active
        if (clientFilter) {
          query = query.eq('client', clientFilter)
        }

        const { data: campaignData, error: campaignError } = await query

        if (campaignError) throw campaignError

        // Aggregate sequence steps from all dates
        const sequenceStepsMap = new Map<number, SequenceStep>()

        campaignData?.forEach((row: any) => {
          const steps = row.sequence_step_stats || []
          if (Array.isArray(steps)) {
            steps.forEach((step: any) => {
              const stepNum = step.step_number || step.stepNumber || 0
              if (!sequenceStepsMap.has(stepNum)) {
                sequenceStepsMap.set(stepNum, {
                  step_number: stepNum,
                  email_subject: step.email_subject || step.emailSubject || '',
                  emails_sent: 0,
                  leads_contacted: 0,
                  opened: 0,
                  unique_opens_per_contact: 0,
                  unique_replies_per_contact: 0,
                  bounced: 0,
                  interested: 0,
                  delay: step.delay,
                  delay_unit: step.delay_unit || step.delayUnit,
                })
              }

              const existingStep = sequenceStepsMap.get(stepNum)!
              existingStep.emails_sent = (existingStep.emails_sent || 0) + (step.emails_sent || 0)
              existingStep.leads_contacted = (existingStep.leads_contacted || 0) + (step.leads_contacted || 0)
              existingStep.opened = (existingStep.opened || 0) + (step.opened || 0)
              existingStep.unique_opens_per_contact = (existingStep.unique_opens_per_contact || 0) + (step.unique_opens_per_contact || 0)
              existingStep.unique_replies_per_contact = (existingStep.unique_replies_per_contact || 0) + (step.unique_replies_per_contact || 0)
              existingStep.bounced = (existingStep.bounced || 0) + (step.bounced || 0)
              existingStep.interested = (existingStep.interested || 0) + (step.interested || 0)
            })
          }
        })

        // Convert to sorted array
        const sequenceSteps = Array.from(sequenceStepsMap.values()).sort(
          (a, b) => (a.step_number || 0) - (b.step_number || 0)
        )

        setDetail({
          campaign_name: campaign.campaign_name,
          campaign_id: campaign.campaign_id,
          client: campaign.client,
          totalSent: campaign.totalSent,
          uniqueProspects: campaign.uniqueProspects,
          totalReplies: campaign.totalReplies,
          realReplies: campaign.realReplies,
          positiveReplies: campaign.positiveReplies,
          bounces: campaign.bounces,
          meetingsBooked: campaign.meetingsBooked,
          sequenceSteps,
        })
      } catch (err) {
        console.error('Error fetching campaign detail:', err)
        // Set detail with campaign data even if sequence fetch fails
        setDetail({
          campaign_name: campaign.campaign_name,
          campaign_id: campaign.campaign_id,
          client: campaign.client,
          totalSent: campaign.totalSent,
          uniqueProspects: campaign.uniqueProspects,
          totalReplies: campaign.totalReplies,
          realReplies: campaign.realReplies,
          positiveReplies: campaign.positiveReplies,
          bounces: campaign.bounces,
          meetingsBooked: campaign.meetingsBooked,
          sequenceSteps: [],
        })
      } finally {
        setLoading(false)
      }
    }

    fetchCampaignDetail()
  }, [isOpen, campaign, startDate, endDate, clientFilter])

  if (!isOpen || !campaign) return null

  const displayDetail = detail || {
    ...campaign,
    sequenceSteps: [] as SequenceStep[]
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-rillation-card border border-rillation-border rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-rillation-border">
          <div>
            <h2 className="text-xl font-semibold text-rillation-text">
              {campaign.campaign_name}
            </h2>
            <p className="text-sm text-rillation-text-muted mt-1">
              {campaign.client} • {formatDateForQuery(startDate)} - {formatDateForQuery(endDate)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-rillation-card-hover rounded-lg transition-colors"
          >
            <X size={20} className="text-rillation-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Campaign Summary Metrics */}
              <div>
                <h3 className="text-sm font-medium text-rillation-text-muted mb-4 uppercase tracking-wider">
                  Campaign Summary
                </h3>
                <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
                  <div className="bg-rillation-card-hover rounded-lg p-4 border border-rillation-border">
                    <div className="text-xs text-rillation-text-muted mb-1">Total Sent</div>
                    <div className="text-lg font-semibold text-rillation-text">
                      {formatNumber(displayDetail.totalSent)}
                    </div>
                  </div>
                  <div className="bg-rillation-card-hover rounded-lg p-4 border border-rillation-border">
                    <div className="text-xs text-rillation-text-muted mb-1">Prospects</div>
                    <div className="text-lg font-semibold text-rillation-text">
                      {formatNumber(displayDetail.uniqueProspects)}
                    </div>
                  </div>
                  <div className="bg-rillation-card-hover rounded-lg p-4 border border-rillation-border">
                    <div className="text-xs text-rillation-text-muted mb-1">Total Replies</div>
                    <div className="text-lg font-semibold text-rillation-text">
                      {formatNumber(displayDetail.totalReplies)}
                    </div>
                  </div>
                  <div className="bg-rillation-card-hover rounded-lg p-4 border border-rillation-border">
                    <div className="text-xs text-rillation-text-muted mb-1">Real Replies</div>
                    <div className="text-lg font-semibold text-rillation-text">
                      {formatNumber(displayDetail.realReplies)}
                    </div>
                  </div>
                  <div className="bg-rillation-card-hover rounded-lg p-4 border border-rillation-border">
                    <div className="text-xs text-rillation-text-muted mb-1">Positive</div>
                    <div className="text-lg font-semibold text-rillation-text">
                      {formatNumber(displayDetail.positiveReplies)}
                    </div>
                  </div>
                  <div className="bg-rillation-card-hover rounded-lg p-4 border border-rillation-border">
                    <div className="text-xs text-rillation-text-muted mb-1">Bounces</div>
                    <div className="text-lg font-semibold text-rillation-text">
                      {formatNumber(displayDetail.bounces)}
                    </div>
                  </div>
                  <div className="bg-rillation-card-hover rounded-lg p-4 border border-rillation-border">
                    <div className="text-xs text-rillation-text-muted mb-1">Meetings</div>
                    <div className="text-lg font-semibold text-rillation-text">
                      {formatNumber(displayDetail.meetingsBooked)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sequence Breakdown */}
              {displayDetail.sequenceSteps && displayDetail.sequenceSteps.length > 0 ? (
                <div>
                  <h3 className="text-sm font-medium text-rillation-text-muted mb-4 uppercase tracking-wider">
                    Sequence Breakdown
                  </h3>
                  <div className="border border-rillation-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-rillation-card-hover border-b border-rillation-border">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase tracking-wider">
                              Step
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase tracking-wider">
                              Subject
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-rillation-text-muted uppercase tracking-wider">
                              Sent
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-rillation-text-muted uppercase tracking-wider">
                              Contacted
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-rillation-text-muted uppercase tracking-wider">
                              Opens
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-rillation-text-muted uppercase tracking-wider">
                              Replies
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-rillation-text-muted uppercase tracking-wider">
                              Bounced
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-rillation-text-muted uppercase tracking-wider">
                              Interested
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rillation-border/30">
                          {displayDetail.sequenceSteps && displayDetail.sequenceSteps.map((step: SequenceStep, index: number) => {
                            const openRate =
                              step.leads_contacted && step.leads_contacted > 0
                                ? ((step.unique_opens_per_contact || 0) / step.leads_contacted) * 100
                                : 0
                            const replyRate =
                              step.leads_contacted && step.leads_contacted > 0
                                ? ((step.unique_replies_per_contact || 0) / step.leads_contacted) * 100
                                : 0

                            return (
                              <tr
                                key={step.step_number || index}
                                className="hover:bg-rillation-card-hover transition-colors"
                              >
                                <td className="px-4 py-3 text-sm text-rillation-text font-medium">
                                  {step.step_number || index + 1}
                                </td>
                                <td className="px-4 py-3 text-sm text-rillation-text">
                                  {step.email_subject || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-right text-rillation-text">
                                  {formatNumber(step.emails_sent || 0)}
                                </td>
                                <td className="px-4 py-3 text-sm text-right text-rillation-text">
                                  {formatNumber(step.leads_contacted || 0)}
                                </td>
                                <td className="px-4 py-3 text-sm text-right text-rillation-text">
                                  <div>{formatNumber(step.unique_opens_per_contact || 0)}</div>
                                  <div className="text-xs text-rillation-text-muted">
                                    {formatPercentage(openRate)}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-right text-rillation-text">
                                  <div>{formatNumber(step.unique_replies_per_contact || 0)}</div>
                                  <div className="text-xs text-rillation-text-muted">
                                    {formatPercentage(replyRate)}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-right text-rillation-text">
                                  {formatNumber(step.bounced || 0)}
                                </td>
                                <td className="px-4 py-3 text-sm text-right text-rillation-text">
                                  {formatNumber(step.interested || 0)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-rillation-text-muted text-sm">
                  No sequence steps data available
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}







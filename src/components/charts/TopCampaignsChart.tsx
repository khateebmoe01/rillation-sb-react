import { formatNumber } from '../../lib/supabase'
import type { CampaignStat } from '../../hooks/useCampaignStats'

interface TopCampaignsChartProps {
  campaigns: CampaignStat[]
  maxItems?: number
}

export default function TopCampaignsChart({ campaigns, maxItems = 5 }: TopCampaignsChartProps) {
  // Sort by emails sent and take top N
  const topCampaigns = [...campaigns]
    .sort((a, b) => (b.totalSent || 0) - (a.totalSent || 0))
    .slice(0, maxItems)

  if (topCampaigns.length === 0) {
    return (
      <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
        <h3 className="text-base font-semibold text-rillation-text mb-4">Top Campaigns</h3>
        <div className="text-sm text-rillation-text-muted text-center py-4">
          No campaign data available
        </div>
      </div>
    )
  }

  // Calculate max for percentage bars
  const maxEmails = Math.max(...topCampaigns.map((c) => c.totalSent || 0), 1)

  return (
    <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
      <h3 className="text-base font-semibold text-rillation-text mb-4">Top {maxItems} Campaigns by Volume</h3>
      
      <div className="space-y-3">
        {topCampaigns.map((campaign, index) => {
          const emailsSent = campaign.totalSent || 0
          const percentage = (emailsSent / maxEmails) * 100

          return (
            <div key={campaign.campaign_name || index} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-rillation-text font-medium truncate flex-1 min-w-0">
                  {campaign.campaign_name || 'Unknown Campaign'}
                </span>
                <span className="text-rillation-text-muted ml-2 flex-shrink-0">
                  {formatNumber(emailsSent)} sent
                </span>
              </div>
              
              {/* Horizontal bar */}
              <div className="w-full h-2 bg-rillation-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rillation-purple-dark to-rillation-purple transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


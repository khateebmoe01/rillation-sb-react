import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { formatNumber } from '../../lib/supabase'
import type { CampaignStat } from '../../hooks/useCampaignStats'
import { useAI } from '../../contexts/AIContext'

interface TopCampaignsChartProps {
  campaigns: CampaignStat[]
  maxItems?: number
}

export default function TopCampaignsChart({ campaigns, maxItems = 5 }: TopCampaignsChartProps) {
  const { askAboutChart } = useAI()
  
  // Sort by emails sent and take top N
  const topCampaigns = [...campaigns]
    .sort((a, b) => (b.totalSent || 0) - (a.totalSent || 0))
    .slice(0, maxItems)

  // Handle AI click on the chart
  const handleAskAI = () => {
    askAboutChart({
      chartTitle: `Top ${maxItems} Campaigns by Volume`,
      chartType: 'bar-chart',
      data: topCampaigns,
    }, `Analyze the top ${maxItems} campaigns by volume. Which campaigns are performing best in terms of efficiency (not just volume)? What patterns do you notice?`)
  }

  // Handle click on a specific campaign
  const handleCampaignClick = (campaign: CampaignStat) => {
    askAboutChart({
      chartTitle: `Top ${maxItems} Campaigns by Volume`,
      chartType: 'bar-chart',
      data: topCampaigns,
      clickedDataPoint: campaign,
    }, `Tell me about the "${campaign.campaign_name}" campaign. How is it performing compared to other campaigns? What can we learn from it?`)
  }

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
    <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border relative group">
      {/* AI Ask Button - appears on hover */}
      <motion.button
        onClick={handleAskAI}
        className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 bg-black/80 border border-white/20 hover:border-white/40 hover:bg-black rounded text-white text-[11px] font-mono opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Sparkles size={11} />
        ANALYZE
      </motion.button>

      <h3 className="text-base font-semibold text-rillation-text mb-4">Top {maxItems} Campaigns by Volume</h3>
      
      <div className="space-y-3">
        {topCampaigns.map((campaign, index) => {
          const emailsSent = campaign.totalSent || 0
          const percentage = (emailsSent / maxEmails) * 100

          return (
            <motion.div 
              key={campaign.campaign_name || index} 
              className="space-y-1 cursor-pointer p-2 -mx-2 rounded-lg hover:bg-slate-700/30 transition-colors"
              onClick={() => handleCampaignClick(campaign)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.99 }}
            >
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
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}


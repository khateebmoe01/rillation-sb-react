import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Terminal } from 'lucide-react'
import { useAI, ChartContext } from '../../contexts/AIContext'

interface ClickableChartWrapperProps {
  children: ReactNode
  chartTitle: string
  chartType: string
  data: any
  className?: string
}

/**
 * Wraps any chart component to make it clickable for AI analysis.
 * When clicked, it opens the AI panel with the chart's context pre-loaded.
 * 
 * Usage:
 * <ClickableChartWrapper
 *   chartTitle="Top Campaigns by Volume"
 *   chartType="bar-chart"
 *   data={campaignData}
 * >
 *   <TopCampaignsChart campaigns={campaigns} />
 * </ClickableChartWrapper>
 */
export default function ClickableChartWrapper({
  children,
  chartTitle,
  chartType,
  data,
  className = '',
}: ClickableChartWrapperProps) {
  const { askAboutChart } = useAI()

  const handleClick = () => {
    const chartContext: ChartContext = {
      chartTitle,
      chartType,
      data,
    }
    askAboutChart(chartContext)
  }

  return (
    <motion.div
      className={`relative group cursor-pointer ${className}`}
      onClick={handleClick}
      whileHover={{ scale: 1.002 }}
      transition={{ duration: 0.2 }}
    >
      {/* Chart content */}
      {children}
      
      {/* Hover overlay with AI hint */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl pointer-events-none flex items-end justify-center pb-4"
      >
        <motion.div
          className="flex items-center gap-2 px-3 py-1.5 bg-black/90 border border-white/20 rounded text-white text-[11px] font-mono backdrop-blur-sm"
          initial={{ y: 10, opacity: 0 }}
          whileHover={{ y: 0, opacity: 1 }}
        >
          <Terminal size={11} />
          CLICK TO ANALYZE
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

/**
 * Hook to create a chart click handler for inline use
 * 
 * Usage in a chart component:
 * const handleChartClick = useChartClick('My Chart', 'bar-chart', myData)
 * return <div onClick={handleChartClick}>...</div>
 */
export function useChartClick(chartTitle: string, chartType: string, data: any) {
  const { askAboutChart } = useAI()
  
  return (clickedDataPoint?: any) => {
    askAboutChart({
      chartTitle,
      chartType,
      data,
      clickedDataPoint,
    })
  }
}


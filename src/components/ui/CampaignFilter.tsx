import { ChevronDown } from 'lucide-react'

interface CampaignFilterProps {
  campaigns: string[]
  selectedCampaign: string
  onChange: (campaign: string) => void
}

export default function CampaignFilter({
  campaigns,
  selectedCampaign,
  onChange,
}: CampaignFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-rillation-text-muted">Campaign:</span>
      <div className="relative">
        <select
          value={selectedCampaign}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none px-3 py-1.5 pr-8 text-xs bg-rillation-card border border-rillation-border rounded-lg text-rillation-text focus:outline-none focus:border-rillation-purple cursor-pointer min-w-[160px]"
        >
          <option value="">All Campaigns</option>
          {campaigns.map((campaign) => (
            <option key={campaign} value={campaign}>
              {campaign}
            </option>
          ))}
        </select>
        <ChevronDown 
          size={14} 
          className="absolute right-2 top-1/2 -translate-y-1/2 text-rillation-text-muted pointer-events-none" 
        />
      </div>
    </div>
  )
}


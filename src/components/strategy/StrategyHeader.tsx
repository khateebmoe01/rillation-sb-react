import { useFilters } from '../../contexts/FilterContext'
import { useClients } from '../../hooks/useClients'
import ClientFilter from '../ui/ClientFilter'

interface StrategyHeaderProps {
  title: string
  actions?: React.ReactNode
}

export default function StrategyHeader({ title, actions }: StrategyHeaderProps) {
  const { strategyClient, setStrategyClient } = useFilters()
  const { clients } = useClients()

  return (
    <div className="flex-shrink-0 bg-rillation-card border-b border-rillation-border px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Title on left */}
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-rillation-text">{title}</h1>
          {actions}
        </div>

        {/* Client Dropdown on right */}
        <ClientFilter
          clients={clients}
          selectedClient={strategyClient}
          onChange={setStrategyClient}
          requireSelection
        />
      </div>
    </div>
  )
}

import { ChevronDown } from 'lucide-react'

interface ClientFilterProps {
  clients: string[]
  selectedClient: string
  onChange: (client: string) => void
  label?: string
}

export default function ClientFilter({
  clients,
  selectedClient,
  onChange,
  label = 'Client',
}: ClientFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-rillation-text-muted">{label}:</span>
      <div className="relative">
        <select
          value={selectedClient}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none px-3 py-1.5 pr-8 text-xs bg-rillation-card border border-rillation-border rounded-lg text-rillation-text focus:outline-none focus:border-rillation-purple cursor-pointer"
        >
          <option value="">All Clients</option>
          {clients.map((client) => (
            <option key={client} value={client}>
              {client}
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


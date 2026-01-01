import { useState } from 'react'
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { useDomains } from '../../hooks/useDomains'
import { useClients } from '../../hooks/useClients'
import { syncDomainsPorkbun } from '../../lib/infrastructure-api'
import Button from '../ui/Button'
import ClientFilter from '../ui/ClientFilter'

export default function DomainList() {
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('')
  const [syncing, setSyncing] = useState(false)

  const { clients } = useClients()
  const { domains, loading, error, refetch } = useDomains({
    client: selectedClient || undefined,
    provider: selectedProvider || undefined,
  })

  const handleSync = async () => {
    setSyncing(true)
    try {
      await syncDomainsPorkbun()
      await refetch()
    } catch (err) {
      console.error('Error syncing domains:', err)
    } finally {
      setSyncing(false)
    }
  }

  const providers = Array.from(new Set(domains.map((d) => d.provider).filter(Boolean)))

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <ClientFilter
              clients={clients}
              selectedClient={selectedClient}
              onChange={setSelectedClient}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-rillation-text-muted">Provider:</span>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="appearance-none px-3 py-1.5 text-xs bg-rillation-card border border-rillation-border rounded-lg text-rillation-text focus:outline-none focus:border-rillation-purple cursor-pointer"
              >
                <option value="">All Providers</option>
                {providers.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            Sync with Porkbun
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Domains Table */}
      {!loading && (
        <div className="bg-rillation-card rounded-xl border border-rillation-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-rillation-card-hover">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">
                    Domain
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">
                    Provider
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">
                    DNS Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">
                    Registered
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">
                    Expires
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rillation-border/30">
                {domains.map((domain) => (
                  <tr key={domain.id} className="hover:bg-rillation-card-hover transition-colors">
                    <td className="px-4 py-3 text-sm text-rillation-text font-medium">
                      {domain.domain}
                    </td>
                    <td className="px-4 py-3 text-sm text-rillation-text-muted">
                      {domain.provider || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-rillation-text-muted">
                      {domain.client || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {domain.dns_configured ? (
                        <span className="flex items-center gap-1 text-rillation-green text-xs">
                          <CheckCircle size={14} />
                          Configured
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rillation-red text-xs">
                          <XCircle size={14} />
                          Not Configured
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-rillation-text-muted">
                      {domain.registered_date
                        ? new Date(domain.registered_date).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-rillation-text-muted">
                      {domain.expiry_date
                        ? new Date(domain.expiry_date).toLocaleDateString()
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {domains.length === 0 && (
            <div className="text-center py-12 text-rillation-text-muted">
              No domains found
            </div>
          )}
        </div>
      )}
    </div>
  )
}

















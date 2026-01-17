import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Building2, ChevronRight, Sparkles, FileText, BookOpen } from 'lucide-react'

interface ClientStrategyListProps {
  clients: string[]
  selectedClient: string | null
  onClientSelect: (client: string) => void
  clientStats?: Record<string, { hasKnowledgeBase: boolean; hasOpportunityMap: boolean; callCount: number }>
  loading?: boolean
}

export default function ClientStrategyList({
  clients,
  selectedClient,
  onClientSelect,
  clientStats = {},
  loading = false,
}: ClientStrategyListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients
    const query = searchQuery.toLowerCase()
    return clients.filter(client => client.toLowerCase().includes(query))
  }, [clients, searchQuery])

  return (
    <div className="h-full flex flex-col bg-rillation-card border-r border-rillation-border">
      {/* Header */}
      <div className="p-4 border-b border-rillation-border">
        <h2 className="text-lg font-semibold text-rillation-text mb-3">Clients</h2>
        
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-rillation-text-muted" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted focus:outline-none focus:border-rillation-text-muted transition-colors"
          />
        </div>
      </div>

      {/* Client List */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-8 text-rillation-text-muted text-sm">
            {searchQuery ? 'No clients found' : 'No clients yet'}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredClients.map((client, index) => {
              const stats = clientStats[client]
              const isSelected = selectedClient === client
              
              return (
                <motion.button
                  key={client}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => onClientSelect(client)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl mb-1 transition-all duration-150 group ${
                    isSelected
                      ? 'bg-white text-black'
                      : 'hover:bg-rillation-card-hover text-rillation-text'
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-black/10' : 'bg-rillation-bg'
                  }`}>
                    <Building2 size={18} className={isSelected ? 'text-black/60' : 'text-rillation-text-muted'} />
                  </div>

                  {/* Client Info */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="font-medium text-sm truncate">{client}</div>
                    
                    {/* Status Indicators */}
                    <div className="flex items-center gap-2 mt-1">
                      {stats?.hasKnowledgeBase && (
                        <div className={`flex items-center gap-1 text-xs ${isSelected ? 'text-black/50' : 'text-rillation-green'}`}>
                          <BookOpen size={10} />
                          <span>KB</span>
                        </div>
                      )}
                      {stats?.hasOpportunityMap && (
                        <div className={`flex items-center gap-1 text-xs ${isSelected ? 'text-black/50' : 'text-rillation-green'}`}>
                          <Sparkles size={10} />
                          <span>Map</span>
                        </div>
                      )}
                      {stats?.callCount > 0 && (
                        <div className={`flex items-center gap-1 text-xs ${isSelected ? 'text-black/50' : 'text-rillation-text-muted'}`}>
                          <FileText size={10} />
                          <span>{stats.callCount}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight 
                    size={16} 
                    className={`flex-shrink-0 transition-transform ${
                      isSelected ? 'text-black/40' : 'text-rillation-text-muted group-hover:translate-x-0.5'
                    }`}
                  />
                </motion.button>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-rillation-border">
        <div className="text-xs text-rillation-text-muted">
          {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      </div>
    </div>
  )
}

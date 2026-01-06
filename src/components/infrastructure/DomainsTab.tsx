import { useState } from 'react'
import DomainGenerator from './DomainGenerator'
import DomainList from './DomainList'

export default function DomainsTab() {
  const [activeView, setActiveView] = useState<'generator' | 'list'>('generator')

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView('generator')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeView === 'generator'
                ? 'bg-rillation-purple/20 text-rillation-purple border border-rillation-purple/30'
                : 'bg-rillation-card-hover border border-rillation-border text-rillation-text-muted hover:text-rillation-text'
            }`}
          >
            Domain Generator
          </button>
          <button
            onClick={() => setActiveView('list')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeView === 'list'
                ? 'bg-rillation-purple/20 text-rillation-purple border border-rillation-purple/30'
                : 'bg-rillation-card-hover border border-rillation-border text-rillation-text-muted hover:text-rillation-text'
            }`}
          >
            Domain List
          </button>
        </div>
      </div>

      {/* Content */}
      {activeView === 'generator' && <DomainGenerator />}
      {activeView === 'list' && <DomainList />}
    </div>
  )
}























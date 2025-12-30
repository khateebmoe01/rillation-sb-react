import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { generateDomains } from '../../lib/infrastructure-api'
import { useClients } from '../../hooks/useClients'
import Button from '../ui/Button'
import ClientFilter from '../ui/ClientFilter'

const DEFAULT_PREFIXES = [
  'try', 'use', 'join', 'grow', 'get', 'start', 'build', 'launch', 'scale', 'boost',
  'power', 'drive', 'fuel', 'amplify', 'accelerate', 'transform', 'elevate', 'unlock', 'discover', 'explore'
]

const DEFAULT_SUFFIXES = ['go', 'max', 'pro', 'top']

export default function DomainGenerator() {
  const { clients } = useClients()
  const [baseName, setBaseName] = useState('')
  const [selectedPrefixes, setSelectedPrefixes] = useState<string[]>([])
  const [selectedSuffixes, setSelectedSuffixes] = useState<string[]>([])
  const [selectedClient, setSelectedClient] = useState('')
  const [generatedDomains, setGeneratedDomains] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePrefixToggle = (prefix: string) => {
    setSelectedPrefixes((prev) =>
      prev.includes(prefix) ? prev.filter((p) => p !== prefix) : [...prev, prefix]
    )
  }

  const handleSuffixToggle = (suffix: string) => {
    setSelectedSuffixes((prev) =>
      prev.includes(suffix) ? prev.filter((s) => s !== suffix) : [...prev, suffix]
    )
  }

  const handleGenerate = async () => {
    if (!baseName.trim()) {
      setError('Please enter a base name')
      return
    }

    if (selectedPrefixes.length === 0 && selectedSuffixes.length === 0) {
      setError('Please select at least one prefix or suffix')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await generateDomains({
        base_name: baseName.trim(),
        prefixes: selectedPrefixes.length > 0 ? selectedPrefixes : undefined,
        suffixes: selectedSuffixes.length > 0 ? selectedSuffixes : undefined,
        client: selectedClient || undefined,
        check_availability: false, // Can be enabled later
      })

      if (result?.domains) {
        setGeneratedDomains(result.domains)
      } else {
        // Generate locally if API doesn't return
        const domains: string[] = []
        if (selectedPrefixes.length > 0 && selectedSuffixes.length > 0) {
          selectedPrefixes.forEach((prefix) => {
            selectedSuffixes.forEach((suffix) => {
              domains.push(`${prefix}${baseName.trim()}${suffix}.com`)
            })
          })
        } else if (selectedPrefixes.length > 0) {
          selectedPrefixes.forEach((prefix) => {
            domains.push(`${prefix}${baseName.trim()}.com`)
          })
        } else if (selectedSuffixes.length > 0) {
          selectedSuffixes.forEach((suffix) => {
            domains.push(`${baseName.trim()}${suffix}.com`)
          })
        }
        setGeneratedDomains(domains)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate domains')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Generator Form */}
      <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border">
        <h3 className="text-lg font-semibold text-rillation-text mb-4 flex items-center gap-2">
          <Sparkles size={20} className="text-rillation-purple" />
          Generate Domains
        </h3>

        <div className="space-y-4">
          {/* Base Name Input */}
          <div>
            <label className="block text-sm font-medium text-rillation-text-muted mb-2">
              Base Name
            </label>
            <input
              type="text"
              value={baseName}
              onChange={(e) => setBaseName(e.target.value)}
              placeholder="e.g., mycompany"
              className="w-full px-4 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-rillation-text focus:outline-none focus:border-rillation-purple"
            />
          </div>

          {/* Client Selection */}
          <div>
            <label className="block text-sm font-medium text-rillation-text-muted mb-2">
              Client (Optional)
            </label>
            <ClientFilter
              clients={clients}
              selectedClient={selectedClient}
              onChange={setSelectedClient}
            />
          </div>

          {/* Prefixes */}
          <div>
            <label className="block text-sm font-medium text-rillation-text-muted mb-2">
              Prefixes
            </label>
            <div className="grid grid-cols-5 gap-2">
              {DEFAULT_PREFIXES.map((prefix) => (
                <button
                  key={prefix}
                  onClick={() => handlePrefixToggle(prefix)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedPrefixes.includes(prefix)
                      ? 'bg-rillation-purple text-white'
                      : 'bg-rillation-card-hover border border-rillation-border text-rillation-text-muted hover:text-rillation-text'
                  }`}
                >
                  {prefix}
                </button>
              ))}
            </div>
          </div>

          {/* Suffixes */}
          <div>
            <label className="block text-sm font-medium text-rillation-text-muted mb-2">
              Suffixes
            </label>
            <div className="grid grid-cols-4 gap-2">
              {DEFAULT_SUFFIXES.map((suffix) => (
                <button
                  key={suffix}
                  onClick={() => handleSuffixToggle(suffix)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedSuffixes.includes(suffix)
                      ? 'bg-rillation-purple text-white'
                      : 'bg-rillation-card-hover border border-rillation-border text-rillation-text-muted hover:text-rillation-text'
                  }`}
                >
                  {suffix}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={loading || !baseName.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate Domains
              </>
            )}
          </Button>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Generated Domains */}
      {generatedDomains.length > 0 && (
        <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border">
          <h3 className="text-lg font-semibold text-rillation-text mb-4">
            Generated Domains ({generatedDomains.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {generatedDomains.map((domain, index) => (
              <div
                key={index}
                className="bg-rillation-bg rounded-lg p-3 border border-rillation-border text-sm text-rillation-text"
              >
                {domain}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}














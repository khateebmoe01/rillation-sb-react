import { useState, useMemo } from 'react'
import { 
  Sparkles, 
  Plus, 
  X, 
  Check, 
  AlertTriangle, 
  Save,
  FolderOpen,
  CheckSquare
} from 'lucide-react'
import { useDomainTemplates } from '../../hooks/useDomainTemplates'
import { useDomainInventory } from '../../hooks/useDomainInventory'
import { useClients } from '../../hooks/useClients'
import { generateDomainCombinations, type GeneratedDomainResult } from '../../lib/csv-generators'
import Button from '../ui/Button'
import ClientFilter from '../ui/ClientFilter'

export default function DomainGeneratorV2() {
  const { clients } = useClients()
  const { templates, createTemplate, markTemplateUsed, getDefaults } = useDomainTemplates()
  const { addDomains, checkDuplicates } = useDomainInventory()

  const [selectedClient, setSelectedClient] = useState('')
  const [baseNames, setBaseNames] = useState<string[]>([''])
  const [prefixes, setPrefixes] = useState<string[]>(getDefaults().prefixes)
  const [suffixes, setSuffixes] = useState<string[]>(getDefaults().suffixes)
  const [tlds, setTlds] = useState<string[]>(['.co', '.info'])
  const [newPrefix, setNewPrefix] = useState('')
  const [newSuffix, setNewSuffix] = useState('')

  const [generatedDomains, setGeneratedDomains] = useState<(GeneratedDomainResult & { isDuplicate?: boolean; source?: string })[]>([])
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [templateName, setTemplateName] = useState('')

  const handleGenerate = async () => {
    setLoading(true)
    
    const validBaseNames = baseNames.filter(n => n.trim())
    if (validBaseNames.length === 0) {
      setLoading(false)
      return
    }

    // Generate combinations
    const domains = generateDomainCombinations({
      baseNames: validBaseNames,
      prefixes,
      suffixes,
      tlds,
    })

    // Check for duplicates
    const domainNames = domains.map(d => d.domain)
    const duplicateResults = await checkDuplicates(domainNames)

    // Merge results
    const domainsWithDuplicates = domains.map(d => ({
      ...d,
      isDuplicate: duplicateResults.get(d.domain)?.isDuplicate || false,
      source: duplicateResults.get(d.domain)?.source,
    }))

    setGeneratedDomains(domainsWithDuplicates)
    
    // Auto-select non-duplicates
    const nonDuplicates = domainsWithDuplicates.filter(d => !d.isDuplicate).map(d => d.domain)
    setSelectedDomains(new Set(nonDuplicates))
    
    setLoading(false)
  }

  const handleLoadTemplate = async (template: any) => {
    setBaseNames(template.base_names || [''])
    setPrefixes(template.prefixes || getDefaults().prefixes)
    setSuffixes(template.suffixes || getDefaults().suffixes)
    setTlds(template.tlds || ['.co', '.info'])
    await markTemplateUsed(template.id)
  }

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return
    
    await createTemplate({
      name: templateName,
      client: selectedClient || undefined,
      base_names: baseNames.filter(n => n.trim()),
      prefixes,
      suffixes,
      tlds,
    })
    
    setShowSaveModal(false)
    setTemplateName('')
  }

  const handleAddToInventory = async () => {
    if (selectedDomains.size === 0 || !selectedClient) return
    
    setLoading(true)
    try {
      await addDomains(Array.from(selectedDomains), selectedClient, {
        name: `Generated ${new Date().toLocaleDateString()}`,
      })
      
      // Clear selections
      setGeneratedDomains([])
      setSelectedDomains(new Set())
    } catch (err) {
      console.error('Failed to add domains:', err)
    }
    setLoading(false)
  }

  const toggleDomain = (domain: string) => {
    const newSet = new Set(selectedDomains)
    if (newSet.has(domain)) {
      newSet.delete(domain)
    } else {
      newSet.add(domain)
    }
    setSelectedDomains(newSet)
  }

  const selectAllNonDuplicates = () => {
    const nonDuplicates = generatedDomains.filter(d => !d.isDuplicate).map(d => d.domain)
    setSelectedDomains(new Set(nonDuplicates))
  }

  const stats = useMemo(() => {
    const duplicates = generatedDomains.filter(d => d.isDuplicate).length
    const available = generatedDomains.length - duplicates
    return { total: generatedDomains.length, duplicates, available }
  }, [generatedDomains])

  // Group domains by base name and type for matrix view (for future use)
  const _domainMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, (GeneratedDomainResult & { isDuplicate?: boolean })[]>> = {}
    
    for (const domain of generatedDomains) {
      const key = domain.baseName
      if (!matrix[key]) matrix[key] = { prefix: [], suffix: [], base: [] }
      matrix[key][domain.type].push(domain)
    }
    
    return matrix
  }, [generatedDomains])
  void _domainMatrix // Suppress unused warning

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles size={20} className="text-rillation-purple" />
            Domain Generator
          </h3>
          <div className="flex items-center gap-2">
            {templates.length > 0 && (
              <div className="relative group">
                <Button variant="secondary" size="sm">
                  <FolderOpen size={14} />
                  Load Template
                </Button>
                <div className="absolute right-0 top-full mt-1 w-48 bg-rillation-card border border-rillation-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  {templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleLoadTemplate(t)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-rillation-card-hover text-rillation-text"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Button variant="secondary" size="sm" onClick={() => setShowSaveModal(true)}>
              <Save size={14} />
              Save Template
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Client */}
            <div>
              <label className="block text-sm font-medium text-rillation-text-muted mb-2">
                Client *
              </label>
              <ClientFilter
                clients={clients}
                selectedClient={selectedClient}
                onChange={setSelectedClient}
                requireSelection={true}
              />
            </div>

            {/* Base Names */}
            <div>
              <label className="block text-sm font-medium text-rillation-text-muted mb-2">
                Base Names (company name variants)
              </label>
              <div className="space-y-2">
                {baseNames.map((name, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        const newNames = [...baseNames]
                        newNames[idx] = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')
                        setBaseNames(newNames)
                      }}
                      placeholder="e.g., bkatxtransport"
                      className="flex-1 px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-white text-sm focus:outline-none focus:border-rillation-purple"
                    />
                    {baseNames.length > 1 && (
                      <button
                        onClick={() => setBaseNames(baseNames.filter((_, i) => i !== idx))}
                        className="p-2 text-rillation-text-muted hover:text-rillation-red"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setBaseNames([...baseNames, ''])}
                  className="text-sm text-rillation-purple hover:text-rillation-magenta flex items-center gap-1"
                >
                  <Plus size={14} /> Add variant
                </button>
              </div>
            </div>

            {/* TLDs */}
            <div>
              <label className="block text-sm font-medium text-rillation-text-muted mb-2">
                TLDs
              </label>
              <div className="flex flex-wrap gap-2">
                {['.co', '.info', '.com', '.net', '.io'].map(tld => (
                  <label key={tld} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tlds.includes(tld)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTlds([...tlds, tld])
                        } else {
                          setTlds(tlds.filter(t => t !== tld))
                        }
                      }}
                      className="rounded border-rillation-border"
                    />
                    <span className="text-sm text-rillation-text">{tld}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Prefixes */}
            <div>
              <label className="block text-sm font-medium text-rillation-text-muted mb-2">
                Prefixes
              </label>
              <div className="flex flex-wrap gap-1 mb-2">
                {prefixes.map(prefix => (
                  <span
                    key={prefix}
                    className="px-2 py-1 bg-rillation-purple/20 text-rillation-purple text-xs rounded-full flex items-center gap-1"
                  >
                    {prefix}
                    <button onClick={() => setPrefixes(prefixes.filter(p => p !== prefix))}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newPrefix}
                  onChange={(e) => setNewPrefix(e.target.value.toLowerCase().replace(/[^a-z]/g, ''))}
                  placeholder="Add prefix"
                  className="flex-1 px-3 py-1.5 bg-rillation-bg border border-rillation-border rounded-lg text-white text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newPrefix && !prefixes.includes(newPrefix)) {
                      setPrefixes([...prefixes, newPrefix])
                      setNewPrefix('')
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (newPrefix && !prefixes.includes(newPrefix)) {
                      setPrefixes([...prefixes, newPrefix])
                      setNewPrefix('')
                    }
                  }}
                  className="p-1.5 bg-rillation-purple/20 text-rillation-purple rounded"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Suffixes */}
            <div>
              <label className="block text-sm font-medium text-rillation-text-muted mb-2">
                Suffixes
              </label>
              <div className="flex flex-wrap gap-1 mb-2">
                {suffixes.map(suffix => (
                  <span
                    key={suffix}
                    className="px-2 py-1 bg-rillation-cyan/20 text-rillation-cyan text-xs rounded-full flex items-center gap-1"
                  >
                    {suffix}
                    <button onClick={() => setSuffixes(suffixes.filter(s => s !== suffix))}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSuffix}
                  onChange={(e) => setNewSuffix(e.target.value.toLowerCase().replace(/[^a-z]/g, ''))}
                  placeholder="Add suffix"
                  className="flex-1 px-3 py-1.5 bg-rillation-bg border border-rillation-border rounded-lg text-white text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newSuffix && !suffixes.includes(newSuffix)) {
                      setSuffixes([...suffixes, newSuffix])
                      setNewSuffix('')
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (newSuffix && !suffixes.includes(newSuffix)) {
                      setSuffixes([...suffixes, newSuffix])
                      setNewSuffix('')
                    }
                  }}
                  className="p-1.5 bg-rillation-cyan/20 text-rillation-cyan rounded"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-rillation-border flex items-center justify-between">
          <p className="text-sm text-rillation-text-muted">
            Will generate ~{baseNames.filter(n => n.trim()).length * (prefixes.length + suffixes.length + 1) * tlds.length} domains
          </p>
          <Button variant="primary" onClick={handleGenerate} disabled={loading || !baseNames.some(n => n.trim()) || !selectedClient}>
            {loading ? 'Generating...' : 'Generate Matrix'}
          </Button>
        </div>
      </div>

      {/* Results */}
      {generatedDomains.length > 0 && (
        <div className="bg-rillation-card rounded-xl border border-rillation-border overflow-hidden">
          <div className="p-4 border-b border-rillation-border flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-white">Generated Domains</h3>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-rillation-text-muted">Total: {stats.total}</span>
                <span className="text-rillation-green flex items-center gap-1">
                  <Check size={14} /> Available: {stats.available}
                </span>
                <span className="text-rillation-orange flex items-center gap-1">
                  <AlertTriangle size={14} /> Duplicates: {stats.duplicates}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={selectAllNonDuplicates}>
                <CheckSquare size={14} />
                Select All Available
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={handleAddToInventory}
                disabled={selectedDomains.size === 0 || !selectedClient}
              >
                Add {selectedDomains.size} to Inventory
              </Button>
            </div>
          </div>

          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-rillation-text-muted uppercase">
                  <th className="text-left pb-2 w-8"></th>
                  <th className="text-left pb-2">Domain</th>
                  <th className="text-left pb-2">Type</th>
                  <th className="text-left pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rillation-border/20">
                {generatedDomains.map((domain) => (
                  <tr 
                    key={domain.domain}
                    className={`${domain.isDuplicate ? 'opacity-50' : ''} hover:bg-rillation-card-hover`}
                  >
                    <td className="py-2">
                      <input
                        type="checkbox"
                        checked={selectedDomains.has(domain.domain)}
                        onChange={() => toggleDomain(domain.domain)}
                        disabled={domain.isDuplicate}
                        className="rounded border-rillation-border"
                      />
                    </td>
                    <td className="py-2 font-mono text-white">{domain.domain}</td>
                    <td className="py-2 text-rillation-text-muted capitalize">{domain.type}</td>
                    <td className="py-2">
                      {domain.isDuplicate ? (
                        <span className="text-rillation-orange flex items-center gap-1">
                          <AlertTriangle size={14} />
                          Duplicate ({domain.source})
                        </span>
                      ) : (
                        <span className="text-rillation-green flex items-center gap-1">
                          <Check size={14} />
                          Available
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-rillation-card rounded-xl p-6 w-96 border border-rillation-border">
            <h3 className="text-lg font-semibold text-white mb-4">Save Template</h3>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name"
              className="w-full px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-white mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowSaveModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleSaveTemplate}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

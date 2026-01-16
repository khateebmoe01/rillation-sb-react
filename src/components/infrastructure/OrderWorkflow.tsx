import { useState, useMemo } from 'react'
import { 
  Download,
  Copy,
  Check,
  ExternalLink,
  Package,
  FileText,
  Upload,
  Image,
  X
} from 'lucide-react'
import { useProviderOrders } from '../../hooks/useProviderOrders'
import { useDomainInventory } from '../../hooks/useDomainInventory'
import { useClients } from '../../hooks/useClients'
import type { OrderProvider, MailboxConfig } from '../../types/infrastructure'
import {
  generateMissionInboxDomainsCSV,
  generateMissionInboxMailboxesCSV,
  generateInboxKitDomainsCSV,
  generateInboxKitMailboxesCSV,
  downloadCSV,
  copyToClipboard,
  PROVIDER_URLS,
} from '../../lib/csv-generators'
import Button from '../ui/Button'
import ClientFilter from '../ui/ClientFilter'

// Start with empty names - user types 1-3 names which are distributed evenly
const DEFAULT_FIRST_NAMES: string[] = []
const DEFAULT_LAST_NAMES: string[] = []

interface GeneratedCSVs {
  missionInboxDomains: string
  missionInboxMailboxes: string
  inboxKitDomains: string
  inboxKitMailboxes: string
}

export default function OrderWorkflow() {
  const { clients, getClientWebsite } = useClients()
  const { createOrder, saveCSVData, markAsSubmitted } = useProviderOrders()
  const { domains: allDomains } = useDomainInventory()

  const [selectedProviders, setSelectedProviders] = useState<Set<OrderProvider>>(new Set())
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set())
  const [mailboxConfig, setMailboxConfig] = useState<MailboxConfig>({
    first_names: DEFAULT_FIRST_NAMES,
    last_names: DEFAULT_LAST_NAMES,
    password_pattern: 'SecurePass{n}$',
    warmup: 'ON',
    inboxes_per_domain: 3,
  })
  const [showPreview, setShowPreview] = useState(false)
  const [generatedCSVs, setGeneratedCSVs] = useState<GeneratedCSVs>({
    missionInboxDomains: '',
    missionInboxMailboxes: '',
    inboxKitDomains: '',
    inboxKitMailboxes: '',
  })
  const [copiedSection, setCopiedSection] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [profilePictures, setProfilePictures] = useState<File[]>([])

  // Filter domains for selected client that are ready for order
  const availableDomains = useMemo(() => {
    return allDomains.filter(d => 
      d.client === selectedClient && 
      (d.status === 'available' || d.status === 'purchased' || d.status === 'configured') &&
      (d.inboxes_ordered === 0 || d.inboxes_ordered === null)
    )
  }, [allDomains, selectedClient])

  // Group by purchase date
  const domainsByDate = useMemo(() => {
    const groups: Record<string, typeof availableDomains> = {}
    for (const domain of availableDomains) {
      const date = domain.purchased_at 
        ? new Date(domain.purchased_at).toLocaleDateString() 
        : 'No date'
      if (!groups[date]) groups[date] = []
      groups[date].push(domain)
    }
    return groups
  }, [availableDomains])

  const generateCSV = () => {
    const domainList = Array.from(selectedDomains)
    const clientWebsite = getClientWebsite(selectedClient)
    
    // Get profile picture filenames for InboxKit
    const profilePicNames = profilePictures.map(f => f.name)

    // Generate all 4 CSVs
    const csvs: GeneratedCSVs = {
      missionInboxDomains: selectedProviders.has('missioninbox') 
        ? generateMissionInboxDomainsCSV(domainList, selectedClient, clientWebsite)
        : '',
      missionInboxMailboxes: selectedProviders.has('missioninbox')
        ? generateMissionInboxMailboxesCSV(domainList, mailboxConfig)
        : '',
      inboxKitDomains: selectedProviders.has('inboxkit')
        ? generateInboxKitDomainsCSV(domainList)
        : '',
      inboxKitMailboxes: selectedProviders.has('inboxkit')
        ? generateInboxKitMailboxesCSV(domainList, mailboxConfig, profilePicNames)
        : '',
    }

    setGeneratedCSVs(csvs)
    setShowPreview(true)
  }

  const handleDownloadCSV = (csv: string, type: string) => {
    const filename = `${type}_${selectedClient.replace(/\s+/g, '_')}_${Date.now()}.csv`
    downloadCSV(csv, filename)
  }

  const handleCopyCSV = async (csv: string, section: string) => {
    await copyToClipboard(csv)
    setCopiedSection(section)
    setTimeout(() => setCopiedSection(null), 2000)
  }

  const handleSaveAndMark = async () => {
    // Create order record for the first provider (or could be modified to create multiple)
    const firstProvider = Array.from(selectedProviders)[0]
    const order = await createOrder({
      provider: firstProvider as OrderProvider,
      order_type: 'both' as OrderType,
      client: selectedClient,
      domains: Array.from(selectedDomains),
      mailbox_config: mailboxConfig,
    })

    setOrderId(order.id)
    // Save all CSVs as JSON
    const allCSVs = JSON.stringify(generatedCSVs)
    await saveCSVData(order.id, allCSVs)
  }

  const handleProfileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      setProfilePictures(Array.from(files))
    }
  }

  const handleMarkSubmitted = async () => {
    if (orderId) {
      await markAsSubmitted(orderId)
    }
  }

  const selectAllUnused = () => {
    setSelectedDomains(new Set(availableDomains.map(d => d.domain_name)))
  }

  const toggleDateGroup = (date: string) => {
    const groupDomains = domainsByDate[date] || []
    const allSelected = groupDomains.every(d => selectedDomains.has(d.domain_name))
    
    const newSet = new Set(selectedDomains)
    if (allSelected) {
      groupDomains.forEach(d => newSet.delete(d.domain_name))
    } else {
      groupDomains.forEach(d => newSet.add(d.domain_name))
    }
    setSelectedDomains(newSet)
  }

  const totalMailboxes = selectedDomains.size * mailboxConfig.inboxes_per_domain
  const canGenerate = selectedProviders.size > 0 && selectedClient && selectedDomains.size > 0 && 
    mailboxConfig.first_names.length > 0 &&
    mailboxConfig.last_names.length > 0 &&
    mailboxConfig.password_pattern &&
    mailboxConfig.inboxes_per_domain > 0

  return (
    <div className="space-y-6">
      <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Package size={24} className="text-emerald-400" />
          Create Order
        </h2>

        <div className="space-y-6">
          {/* Provider & Client */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Provider(s) * <span className="text-white/50 font-normal">(select one or both)</span></label>
              <div className="grid grid-cols-2 gap-3">
                {(['missioninbox', 'inboxkit'] as OrderProvider[]).map((p) => {
                  const isSelected = selectedProviders.has(p)
                  return (
                    <button
                      key={p}
                      onClick={() => {
                        const newSet = new Set(selectedProviders)
                        if (newSet.has(p)) {
                          newSet.delete(p)
                        } else {
                          newSet.add(p)
                        }
                        setSelectedProviders(newSet)
                      }}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        isSelected 
                          ? 'border-emerald-500 bg-emerald-500/10' 
                          : 'border-rillation-border hover:border-emerald-500/50'
                      }`}
                    >
                      <p className="font-semibold text-white capitalize">{p}</p>
                      <p className="text-xs text-white/60 mt-1">
                        {p === 'missioninbox' ? 'SMTP/IMAP inboxes' : 'Google Workspace inboxes'}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Client *</label>
              <ClientFilter
                clients={clients}
                selectedClient={selectedClient}
                onChange={setSelectedClient}
                requireSelection={true}
              />
            </div>
          </div>

          {/* Domains Selection */}
          {selectedClient && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-white">Select Domains *</label>
                {availableDomains.length > 0 && (
                  <Button variant="secondary" size="sm" onClick={selectAllUnused}>
                    Select All ({availableDomains.length})
                  </Button>
                )}
              </div>
              
              {availableDomains.length === 0 ? (
                <div className="text-center py-8 text-white/60 bg-rillation-bg/50 rounded-lg">
                  No unused domains found for {selectedClient}. Add domains to inventory first.
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto bg-rillation-bg/30 rounded-lg p-4">
                  {Object.entries(domainsByDate).map(([date, domains]) => (
                    <div key={date} className="border border-rillation-border rounded-lg">
                      <div 
                        className="flex items-center gap-3 p-3 bg-rillation-bg/50 cursor-pointer hover:bg-rillation-bg/70 transition-colors"
                        onClick={() => toggleDateGroup(date)}
                      >
                        <input
                          type="checkbox"
                          checked={domains.every(d => selectedDomains.has(d.domain_name))}
                          onChange={() => {}}
                          className="rounded border-rillation-border"
                        />
                        <span className="font-medium text-white">Purchased: {date}</span>
                        <span className="text-sm text-white/60">({domains.length} domains)</span>
                      </div>
                      <div className="p-3 grid grid-cols-3 gap-2">
                        {domains.map((domain) => (
                          <label key={domain.id} className="flex items-center gap-2 cursor-pointer hover:text-emerald-400 transition-colors">
                            <input
                              type="checkbox"
                              checked={selectedDomains.has(domain.domain_name)}
                              onChange={() => {
                                const newSet = new Set(selectedDomains)
                                if (newSet.has(domain.domain_name)) {
                                  newSet.delete(domain.domain_name)
                                } else {
                                  newSet.add(domain.domain_name)
                                }
                                setSelectedDomains(newSet)
                              }}
                              className="rounded border-rillation-border"
                            />
                            <span className="text-sm font-mono text-white">{domain.domain_name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-2 text-sm text-white/60">
                Selected: <span className="text-white font-medium">{selectedDomains.size}</span> domains
              </div>
            </div>
          )}

          {/* Mailbox Configuration - Show when domains are selected */}
          {selectedDomains.size > 0 && (
            <div className="border-t border-rillation-border pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Mailbox Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    First Names (one per line)
                  </label>
                  <textarea
                    value={mailboxConfig.first_names.join('\n')}
                    onChange={(e) => setMailboxConfig({
                      ...mailboxConfig,
                      first_names: e.target.value.split('\n').filter(n => n.trim())
                    })}
                    rows={6}
                    className="w-full px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Last Names (one per line)
                  </label>
                  <textarea
                    value={mailboxConfig.last_names.join('\n')}
                    onChange={(e) => setMailboxConfig({
                      ...mailboxConfig,
                      last_names: e.target.value.split('\n').filter(n => n.trim())
                    })}
                    rows={6}
                    className="w-full px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Password Pattern
                  </label>
                  <input
                    type="text"
                    value={mailboxConfig.password_pattern}
                    onChange={(e) => setMailboxConfig({ ...mailboxConfig, password_pattern: e.target.value })}
                    placeholder="SecurePass{n}$"
                    className="w-full px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-xs text-white/60 mt-1">{'{n}'} will be replaced with a number</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Inboxes per Domain
                  </label>
                  <input
                    type="number"
                    value={mailboxConfig.inboxes_per_domain}
                    onChange={(e) => setMailboxConfig({ ...mailboxConfig, inboxes_per_domain: parseInt(e.target.value) || 1 })}
                    min={1}
                    max={10}
                    className="w-full px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Warmup
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={mailboxConfig.warmup === 'ON'}
                        onChange={() => setMailboxConfig({ ...mailboxConfig, warmup: 'ON' })}
                        className="text-emerald-500"
                      />
                      <span className="text-white">ON (recommended)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={mailboxConfig.warmup === 'OFF'}
                        onChange={() => setMailboxConfig({ ...mailboxConfig, warmup: 'OFF' })}
                        className="text-emerald-500"
                      />
                      <span className="text-white">OFF</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <p className="text-sm text-white">
                  Will generate: <strong>{selectedDomains.size}</strong> domains × <strong>{mailboxConfig.inboxes_per_domain}</strong> inboxes = <strong className="text-emerald-400">{totalMailboxes} mailboxes</strong>
                </p>
              </div>

              {/* Profile Pictures Upload */}
              {selectedProviders.has('inboxkit') && (
                <div className="mt-6 pt-4 border-t border-rillation-border">
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Profile Pictures (optional - for InboxKit)
                  </label>
                  <div className="flex items-start gap-4">
                    <label className="flex items-center gap-2 px-4 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-white text-sm cursor-pointer hover:border-emerald-500 transition-colors">
                      <Upload size={16} />
                      Upload Images
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleProfileUpload}
                        className="hidden"
                      />
                    </label>
                    {profilePictures.length > 0 && (
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-2">
                          {profilePictures.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-rillation-bg rounded text-xs text-white">
                              <Image size={12} />
                              {file.name}
                              <button
                                onClick={() => setProfilePictures(profilePictures.filter((_, i) => i !== idx))}
                                className="text-white/50 hover:text-red-400"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-white/60 mt-1">{profilePictures.length} images will be assigned to mailboxes</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Generate & Actions */}
          <div className="border-t border-rillation-border pt-6">
            <div className="flex items-center gap-3">
              <Button 
                variant="primary" 
                onClick={generateCSV}
                disabled={!canGenerate}
                className="flex-1"
              >
                <FileText size={16} />
                Generate CSV
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* CSV Previews - 4 Separate Sections */}
      {showPreview && (
        <div className="space-y-4">
          {/* MissionInbox Domains */}
          {generatedCSVs.missionInboxDomains && (
            <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <FileText size={18} className="text-emerald-400" />
                  MissionInbox Domains
                  <a 
                    href={PROVIDER_URLS.missioninbox.domains}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    <ExternalLink size={14} />
                  </a>
                </h3>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => handleCopyCSV(generatedCSVs.missionInboxDomains, 'mi-domains')}>
                    {copiedSection === 'mi-domains' ? <Check size={14} /> : <Copy size={14} />}
                    {copiedSection === 'mi-domains' ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => handleDownloadCSV(generatedCSVs.missionInboxDomains, 'missioninbox_domains')}>
                    <Download size={14} />
                    Download
                  </Button>
                </div>
              </div>
              <pre className="bg-rillation-bg rounded-lg p-3 text-xs text-white/80 font-mono overflow-x-auto max-h-[150px] overflow-y-auto border border-rillation-border">
                {generatedCSVs.missionInboxDomains}
              </pre>
            </div>
          )}

          {/* MissionInbox Mailboxes */}
          {generatedCSVs.missionInboxMailboxes && (
            <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <FileText size={18} className="text-emerald-400" />
                  MissionInbox Mailboxes
                  <a 
                    href={PROVIDER_URLS.missioninbox.mailboxes}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    <ExternalLink size={14} />
                  </a>
                </h3>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => handleCopyCSV(generatedCSVs.missionInboxMailboxes, 'mi-mailboxes')}>
                    {copiedSection === 'mi-mailboxes' ? <Check size={14} /> : <Copy size={14} />}
                    {copiedSection === 'mi-mailboxes' ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => handleDownloadCSV(generatedCSVs.missionInboxMailboxes, 'missioninbox_mailboxes')}>
                    <Download size={14} />
                    Download
                  </Button>
                </div>
              </div>
              <pre className="bg-rillation-bg rounded-lg p-3 text-xs text-white/80 font-mono overflow-x-auto max-h-[150px] overflow-y-auto border border-rillation-border">
                {generatedCSVs.missionInboxMailboxes}
              </pre>
            </div>
          )}

          {/* InboxKit Domains */}
          {generatedCSVs.inboxKitDomains && (
            <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <FileText size={18} className="text-cyan-400" />
                  InboxKit Domains
                  <a 
                    href={PROVIDER_URLS.inboxkit.domains}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300"
                  >
                    <ExternalLink size={14} />
                  </a>
                </h3>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => handleCopyCSV(generatedCSVs.inboxKitDomains, 'ik-domains')}>
                    {copiedSection === 'ik-domains' ? <Check size={14} /> : <Copy size={14} />}
                    {copiedSection === 'ik-domains' ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => handleDownloadCSV(generatedCSVs.inboxKitDomains, 'inboxkit_domains')}>
                    <Download size={14} />
                    Download
                  </Button>
                </div>
              </div>
              <pre className="bg-rillation-bg rounded-lg p-3 text-xs text-white/80 font-mono overflow-x-auto max-h-[150px] overflow-y-auto border border-rillation-border">
                {generatedCSVs.inboxKitDomains}
              </pre>
            </div>
          )}

          {/* InboxKit Mailboxes */}
          {generatedCSVs.inboxKitMailboxes && (
            <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <FileText size={18} className="text-cyan-400" />
                  InboxKit Mailboxes
                  <a 
                    href={PROVIDER_URLS.inboxkit.mailboxes}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300"
                  >
                    <ExternalLink size={14} />
                  </a>
                </h3>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => handleCopyCSV(generatedCSVs.inboxKitMailboxes, 'ik-mailboxes')}>
                    {copiedSection === 'ik-mailboxes' ? <Check size={14} /> : <Copy size={14} />}
                    {copiedSection === 'ik-mailboxes' ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => handleDownloadCSV(generatedCSVs.inboxKitMailboxes, 'inboxkit_mailboxes')}>
                    <Download size={14} />
                    Download
                  </Button>
                </div>
              </div>
              <pre className="bg-rillation-bg rounded-lg p-3 text-xs text-white/80 font-mono overflow-x-auto max-h-[150px] overflow-y-auto border border-rillation-border">
                {generatedCSVs.inboxKitMailboxes}
              </pre>
            </div>
          )}

          {/* Save Order */}
          <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={handleSaveAndMark} disabled={!!orderId}>
                {orderId ? 'Order Saved' : 'Save Order'}
              </Button>
              {orderId && (
                <Button variant="primary" onClick={handleMarkSubmitted}>
                  Mark as Submitted
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

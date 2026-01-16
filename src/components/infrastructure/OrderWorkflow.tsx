import { useState, useMemo } from 'react'
import { 
  ChevronRight, 
  ChevronLeft,
  Download,
  Copy,
  Check,
  ExternalLink,
  Package
} from 'lucide-react'
import { useProviderOrders } from '../../hooks/useProviderOrders'
import { useDomainInventory } from '../../hooks/useDomainInventory'
import { useClients } from '../../hooks/useClients'
import type { OrderProvider, OrderType, MailboxConfig } from '../../types/infrastructure'
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

const STEPS = ['Provider', 'Type', 'Client', 'Domains', 'Config', 'Export']

const DEFAULT_FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Quinn', 'Avery', 'Reese']
const DEFAULT_LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez']

export default function OrderWorkflow() {
  const { clients } = useClients()
  const { createOrder, saveCSVData, markAsSubmitted } = useProviderOrders()
  const { domains: allDomains } = useDomainInventory()

  const [step, setStep] = useState(0)
  const [provider, setProvider] = useState<OrderProvider | ''>('')
  const [orderType, setOrderType] = useState<OrderType | ''>('')
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set())
  const [mailboxConfig, setMailboxConfig] = useState<MailboxConfig>({
    first_names: DEFAULT_FIRST_NAMES,
    last_names: DEFAULT_LAST_NAMES,
    password_pattern: 'SecurePass{n}$',
    warmup: 'ON',
    inboxes_per_domain: 3,
  })
  const [csvPreview, setCsvPreview] = useState('')
  const [copied, setCopied] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)

  // Filter domains for selected client that are ready for order
  const availableDomains = useMemo(() => {
    return allDomains.filter(d => 
      d.client === selectedClient && 
      (d.status === 'purchased' || d.status === 'configured') &&
      d.inboxes_ordered === 0
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

  const canProceed = () => {
    switch (step) {
      case 0: return !!provider
      case 1: return !!orderType
      case 2: return !!selectedClient
      case 3: return selectedDomains.size > 0
      case 4: return orderType === 'domains' || (
        mailboxConfig.first_names.length > 0 &&
        mailboxConfig.last_names.length > 0 &&
        mailboxConfig.password_pattern &&
        mailboxConfig.inboxes_per_domain > 0
      )
      default: return true
    }
  }

  const handleNext = async () => {
    if (step === 4) {
      // Generate CSV preview
      generateCSV()
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    }
  }

  const generateCSV = () => {
    const domainList = Array.from(selectedDomains)
    let csv = ''

    if (provider === 'missioninbox') {
      if (orderType === 'domains' || orderType === 'both') {
        csv = generateMissionInboxDomainsCSV(domainList, selectedClient)
      }
      if (orderType === 'mailboxes' || orderType === 'both') {
        const mailboxCSV = generateMissionInboxMailboxesCSV(domainList, mailboxConfig)
        csv = orderType === 'both' ? `${csv}\n\n---MAILBOXES---\n\n${mailboxCSV}` : mailboxCSV
      }
    } else if (provider === 'inboxkit') {
      if (orderType === 'domains' || orderType === 'both') {
        csv = generateInboxKitDomainsCSV(domainList)
      }
      if (orderType === 'mailboxes' || orderType === 'both') {
        const mailboxCSV = generateInboxKitMailboxesCSV(domainList, mailboxConfig)
        csv = orderType === 'both' ? `${csv}\n\n---MAILBOXES---\n\n${mailboxCSV}` : mailboxCSV
      }
    }

    setCsvPreview(csv)
  }

  const handleDownload = () => {
    const filename = `${provider}_${orderType}_${selectedClient.replace(/\s+/g, '_')}_${Date.now()}.csv`
    downloadCSV(csvPreview, filename)
  }

  const handleCopy = async () => {
    await copyToClipboard(csvPreview)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveAndMark = async () => {
    // Create order record
    const order = await createOrder({
      provider: provider as OrderProvider,
      order_type: orderType as OrderType,
      client: selectedClient,
      domains: Array.from(selectedDomains),
      mailbox_config: orderType !== 'domains' ? mailboxConfig : undefined,
    })

    setOrderId(order.id)
    await saveCSVData(order.id, csvPreview)
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

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
        <div className="flex items-center justify-between">
          {STEPS.map((stepName, idx) => (
            <div key={stepName} className="flex items-center">
              <div className={`flex items-center gap-2 ${
                idx === step ? 'text-rillation-purple' : 
                idx < step ? 'text-rillation-green' : 'text-rillation-text-muted'
              }`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  idx === step ? 'bg-rillation-purple text-white' :
                  idx < step ? 'bg-rillation-green text-white' : 'bg-rillation-bg text-rillation-text-muted'
                }`}>
                  {idx < step ? <Check size={16} /> : idx + 1}
                </span>
                <span className="text-sm font-medium hidden sm:block">{stepName}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <ChevronRight size={20} className="mx-2 text-rillation-border" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border min-h-[400px]">
        {/* Step 0: Provider */}
        {step === 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Select Provider</h3>
            <div className="grid grid-cols-2 gap-4">
              {(['missioninbox', 'inboxkit'] as OrderProvider[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className={`p-6 rounded-xl border-2 text-left transition-all ${
                    provider === p 
                      ? 'border-rillation-purple bg-rillation-purple/10' 
                      : 'border-rillation-border hover:border-rillation-purple/50'
                  }`}
                >
                  <Package size={32} className={provider === p ? 'text-rillation-purple' : 'text-rillation-text-muted'} />
                  <p className="text-lg font-semibold text-white mt-2 capitalize">{p}</p>
                  <p className="text-sm text-rillation-text-muted mt-1">
                    {p === 'missioninbox' ? 'Google & Microsoft inboxes' : 'SMTP/IMAP inboxes'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Order Type */}
        {step === 1 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Order Type</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: 'domains', label: 'Domains Only', desc: 'Add domains to provider' },
                { value: 'mailboxes', label: 'Mailboxes Only', desc: 'Create mailboxes on existing domains' },
                { value: 'both', label: 'Domains + Mailboxes', desc: 'Add domains and create mailboxes' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setOrderType(opt.value as OrderType)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    orderType === opt.value 
                      ? 'border-rillation-purple bg-rillation-purple/10' 
                      : 'border-rillation-border hover:border-rillation-purple/50'
                  }`}
                >
                  <p className="font-semibold text-white">{opt.label}</p>
                  <p className="text-sm text-rillation-text-muted mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Client */}
        {step === 2 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Select Client</h3>
            <ClientFilter
              clients={clients}
              selectedClient={selectedClient}
              onChange={setSelectedClient}
            />
          </div>
        )}

        {/* Step 3: Domains */}
        {step === 3 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Select Domains</h3>
              <Button variant="secondary" size="sm" onClick={selectAllUnused}>
                Select All Unused ({availableDomains.length})
              </Button>
            </div>
            
            {availableDomains.length === 0 ? (
              <div className="text-center py-8 text-rillation-text-muted">
                No unused domains found for {selectedClient}. Add domains first.
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {Object.entries(domainsByDate).map(([date, domains]) => (
                  <div key={date} className="border border-rillation-border rounded-lg">
                    <div 
                      className="flex items-center gap-3 p-3 bg-rillation-bg/50 cursor-pointer"
                      onClick={() => toggleDateGroup(date)}
                    >
                      <input
                        type="checkbox"
                        checked={domains.every(d => selectedDomains.has(d.domain_name))}
                        onChange={() => {}}
                        className="rounded border-rillation-border"
                      />
                      <span className="font-medium text-white">Purchased: {date}</span>
                      <span className="text-sm text-rillation-text-muted">({domains.length} domains)</span>
                    </div>
                    <div className="p-3 grid grid-cols-3 gap-2">
                      {domains.map((domain) => (
                        <label key={domain.id} className="flex items-center gap-2 cursor-pointer">
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
                          <span className="text-sm font-mono text-rillation-text">{domain.domain_name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4 text-sm text-rillation-text-muted">
              Selected: {selectedDomains.size} domains
            </div>
          </div>
        )}

        {/* Step 4: Mailbox Config */}
        {step === 4 && orderType !== 'domains' && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Mailbox Configuration</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-rillation-text-muted mb-2">
                  First Names (one per line)
                </label>
                <textarea
                  value={mailboxConfig.first_names.join('\n')}
                  onChange={(e) => setMailboxConfig({
                    ...mailboxConfig,
                    first_names: e.target.value.split('\n').filter(n => n.trim())
                  })}
                  rows={6}
                  className="w-full px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-rillation-text-muted mb-2">
                  Last Names (one per line)
                </label>
                <textarea
                  value={mailboxConfig.last_names.join('\n')}
                  onChange={(e) => setMailboxConfig({
                    ...mailboxConfig,
                    last_names: e.target.value.split('\n').filter(n => n.trim())
                  })}
                  rows={6}
                  className="w-full px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-rillation-text-muted mb-2">
                  Password Pattern
                </label>
                <input
                  type="text"
                  value={mailboxConfig.password_pattern}
                  onChange={(e) => setMailboxConfig({ ...mailboxConfig, password_pattern: e.target.value })}
                  placeholder="SecurePass{n}$"
                  className="w-full px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-white text-sm"
                />
                <p className="text-xs text-rillation-text-muted mt-1">{'{n}'} will be replaced with a number</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-rillation-text-muted mb-2">
                  Inboxes per Domain
                </label>
                <input
                  type="number"
                  value={mailboxConfig.inboxes_per_domain}
                  onChange={(e) => setMailboxConfig({ ...mailboxConfig, inboxes_per_domain: parseInt(e.target.value) || 1 })}
                  min={1}
                  max={10}
                  className="w-full px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-rillation-text-muted mb-2">
                  Warmup
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={mailboxConfig.warmup === 'ON'}
                      onChange={() => setMailboxConfig({ ...mailboxConfig, warmup: 'ON' })}
                    />
                    <span className="text-rillation-text">ON (recommended)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={mailboxConfig.warmup === 'OFF'}
                      onChange={() => setMailboxConfig({ ...mailboxConfig, warmup: 'OFF' })}
                    />
                    <span className="text-rillation-text">OFF</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-rillation-bg rounded-lg">
              <p className="text-sm text-rillation-text">
                Will generate: {selectedDomains.size} domains x {mailboxConfig.inboxes_per_domain} inboxes = <strong className="text-white">{totalMailboxes} mailboxes</strong>
              </p>
            </div>
          </div>
        )}

        {step === 4 && orderType === 'domains' && (
          <div className="text-center py-8">
            <Check size={48} className="mx-auto text-rillation-green mb-4" />
            <p className="text-lg text-white">Ready to generate {selectedDomains.size} domains CSV</p>
            <p className="text-sm text-rillation-text-muted mt-2">Click Next to preview and export</p>
          </div>
        )}

        {/* Step 5: Export */}
        {step === 5 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">CSV Preview & Export</h3>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={handleCopy}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button variant="primary" size="sm" onClick={handleDownload}>
                  <Download size={14} />
                  Download CSV
                </Button>
              </div>
            </div>

            <pre className="bg-rillation-bg rounded-lg p-4 text-sm text-rillation-text font-mono overflow-x-auto max-h-[250px] overflow-y-auto">
              {csvPreview}
            </pre>

            <div className="mt-6 p-4 bg-rillation-bg rounded-lg">
              <p className="text-sm font-medium text-white mb-3">After downloading:</p>
              <div className="flex items-center gap-4">
                <a 
                  href={provider ? PROVIDER_URLS[provider as keyof typeof PROVIDER_URLS]?.domains : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-rillation-purple hover:text-rillation-magenta"
                >
                  <ExternalLink size={16} />
                  Open {provider} Domains
                </a>
                <a 
                  href={provider ? PROVIDER_URLS[provider as keyof typeof PROVIDER_URLS]?.mailboxes : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-rillation-purple hover:text-rillation-magenta"
                >
                  <ExternalLink size={16} />
                  Open {provider} Mailboxes
                </a>
              </div>

              <div className="mt-4 pt-4 border-t border-rillation-border">
                <Button variant="secondary" onClick={handleSaveAndMark} disabled={!!orderId}>
                  {orderId ? 'Order Saved' : 'Save Order'}
                </Button>
                {orderId && (
                  <Button variant="primary" onClick={handleMarkSubmitted} className="ml-2">
                    Mark as Submitted
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button 
          variant="secondary" 
          onClick={() => setStep(step - 1)}
          disabled={step === 0}
        >
          <ChevronLeft size={16} />
          Back
        </Button>
        <Button 
          variant="primary" 
          onClick={handleNext}
          disabled={!canProceed() || step === STEPS.length - 1}
        >
          Next
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  )
}

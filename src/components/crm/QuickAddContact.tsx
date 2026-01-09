import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Loader2, User, Mail, Building2, Phone } from 'lucide-react'
import { CRM_STAGES, LEAD_SOURCES, type CRMContact } from '../../types/crm'

interface QuickAddContactProps {
  onClose: () => void
  onCreate: (contact: Partial<CRMContact>) => Promise<CRMContact | null>
}

export default function QuickAddContact({ onClose, onCreate }: QuickAddContactProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    company: '',
    lead_phone: '',
    job_title: '',
    stage: 'new',
    lead_source: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email.trim()) {
      return
    }

    setIsCreating(true)
    
    const contact: Partial<CRMContact> = {
      ...formData,
      full_name: [formData.first_name, formData.last_name].filter(Boolean).join(' ') || formData.email.split('@')[0],
      lead_source: formData.lead_source || undefined,
    }

    await onCreate(contact)
    setIsCreating(false)
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-rillation-card border border-rillation-border rounded-2xl z-50 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-rillation-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-rillation-text">Add New Contact</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-rillation-card-hover rounded-lg transition-colors"
          >
            <X size={20} className="text-rillation-text-muted" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-rillation-text-muted mb-1.5 block">First Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-rillation-text-muted" />
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  placeholder="John"
                  className="w-full pl-10 pr-3 py-2.5 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted/50 focus:outline-none focus:border-rillation-text-muted transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-rillation-text-muted mb-1.5 block">Last Name</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                placeholder="Doe"
                className="w-full px-3 py-2.5 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted/50 focus:outline-none focus:border-rillation-text-muted transition-colors"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-xs text-rillation-text-muted mb-1.5 block">
              Email <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-rillation-text-muted" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="john@company.com"
                required
                className="w-full pl-10 pr-3 py-2.5 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted/50 focus:outline-none focus:border-rillation-text-muted transition-colors"
              />
            </div>
          </div>

          {/* Company */}
          <div>
            <label className="text-xs text-rillation-text-muted mb-1.5 block">Company</label>
            <div className="relative">
              <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-rillation-text-muted" />
              <input
                type="text"
                value={formData.company}
                onChange={(e) => handleChange('company', e.target.value)}
                placeholder="Acme Inc."
                className="w-full pl-10 pr-3 py-2.5 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted/50 focus:outline-none focus:border-rillation-text-muted transition-colors"
              />
            </div>
          </div>

          {/* Phone & Job Title */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-rillation-text-muted mb-1.5 block">Phone</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-rillation-text-muted" />
                <input
                  type="tel"
                  value={formData.lead_phone}
                  onChange={(e) => handleChange('lead_phone', e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full pl-10 pr-3 py-2.5 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted/50 focus:outline-none focus:border-rillation-text-muted transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-rillation-text-muted mb-1.5 block">Job Title</label>
              <input
                type="text"
                value={formData.job_title}
                onChange={(e) => handleChange('job_title', e.target.value)}
                placeholder="CEO"
                className="w-full px-3 py-2.5 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted/50 focus:outline-none focus:border-rillation-text-muted transition-colors"
              />
            </div>
          </div>

          {/* Stage & Source */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-rillation-text-muted mb-1.5 block">Stage</label>
              <select
                value={formData.stage}
                onChange={(e) => handleChange('stage', e.target.value)}
                className="w-full px-3 py-2.5 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text focus:outline-none focus:border-rillation-text-muted transition-colors"
              >
                {CRM_STAGES.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-rillation-text-muted mb-1.5 block">Lead Source</label>
              <select
                value={formData.lead_source}
                onChange={(e) => handleChange('lead_source', e.target.value)}
                className="w-full px-3 py-2.5 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text focus:outline-none focus:border-rillation-text-muted transition-colors"
              >
                <option value="">Select source...</option>
                {LEAD_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-rillation-text-muted hover:text-rillation-text transition-colors"
            >
              Cancel
            </button>
            <motion.button
              type="submit"
              disabled={isCreating || !formData.email.trim()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-2 bg-rillation-green text-white font-medium rounded-lg text-sm hover:bg-rillation-green-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isCreating && <Loader2 size={16} className="animate-spin" />}
              {isCreating ? 'Creating...' : 'Create Contact'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </>
  )
}

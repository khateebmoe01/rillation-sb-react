import { useState, useEffect } from 'react'
import { X, Save, Loader2, ChevronDown, ChevronUp, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { MeetingBooked } from '../../types/database'

interface MeetingsBookedEditorProps {
  isOpen: boolean
  onClose: () => void
  meeting: MeetingBooked | null
  onSave?: () => void
}

// Editable fields grouped by category
const FIELD_GROUPS = {
  'Contact Info': ['first_name', 'last_name', 'email', 'title'],
  'Company Info': ['company', 'company_domain', 'company_linkedin', 'profile_url'],
  'Campaign': ['campaign_name', 'campaign_id'],
  'Firmographics': [
    'company_size', 'annual_revenue', 'industry', 
    'company_hq_city', 'company_hq_state', 'company_hq_country',
    'year_founded', 'business_model', 'funding_stage', 'growth_score'
  ],
  'Other': ['is_hiring', 'tech_stack']
}

// Field display names
const FIELD_LABELS: Record<string, string> = {
  first_name: 'First Name',
  last_name: 'Last Name',
  email: 'Email',
  title: 'Job Title',
  company: 'Company',
  company_domain: 'Domain',
  company_linkedin: 'Company LinkedIn',
  profile_url: 'LinkedIn Profile',
  campaign_name: 'Campaign Name',
  campaign_id: 'Campaign ID',
  company_size: 'Company Size',
  annual_revenue: 'Annual Revenue',
  industry: 'Industry',
  company_hq_city: 'HQ City',
  company_hq_state: 'HQ State',
  company_hq_country: 'HQ Country',
  year_founded: 'Year Founded',
  business_model: 'Business Model',
  funding_stage: 'Funding Stage',
  growth_score: 'Growth Score',
  is_hiring: 'Is Hiring',
  tech_stack: 'Tech Stack'
}

export default function MeetingsBookedEditor({ 
  isOpen, 
  onClose, 
  meeting, 
  onSave 
}: MeetingsBookedEditorProps) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [customVarsJson, setCustomVarsJson] = useState<string>('{}')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Contact Info', 'Company Info']))
  const [showCustomVars, setShowCustomVars] = useState(false)

  // Initialize form data when meeting changes
  useEffect(() => {
    if (meeting) {
      setFormData({ ...meeting })
      setCustomVarsJson(JSON.stringify(meeting.custom_variables_jsonb || {}, null, 2))
      setJsonError(null)
      setSaveStatus('idle')
    }
  }, [meeting])

  if (!isOpen || !meeting) return null

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCustomVarsChange = (value: string) => {
    setCustomVarsJson(value)
    try {
      JSON.parse(value)
      setJsonError(null)
    } catch (e) {
      setJsonError('Invalid JSON format')
    }
  }

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return next
    })
  }

  const handleSave = async () => {
    if (!meeting.id) return

    setSaving(true)
    setSaveStatus('idle')

    try {
      // Parse custom variables JSON
      let customVarsJsonb = {}
      try {
        customVarsJsonb = JSON.parse(customVarsJson)
      } catch (e) {
        setJsonError('Invalid JSON format')
        setSaving(false)
        setSaveStatus('error')
        return
      }

      // Build update payload
      const updateData: Record<string, any> = {
        first_name: formData.first_name || null,
        last_name: formData.last_name || null,
        full_name: [formData.first_name, formData.last_name].filter(Boolean).join(' ') || null,
        email: formData.email || null,
        title: formData.title || null,
        company: formData.company || null,
        company_domain: formData.company_domain || null,
        company_linkedin: formData.company_linkedin || null,
        profile_url: formData.profile_url || null,
        campaign_name: formData.campaign_name || null,
        campaign_id: formData.campaign_id || null,
        company_size: formData.company_size || null,
        annual_revenue: formData.annual_revenue || null,
        industry: formData.industry || null,
        company_hq_city: formData.company_hq_city || null,
        company_hq_state: formData.company_hq_state || null,
        company_hq_country: formData.company_hq_country || null,
        year_founded: formData.year_founded || null,
        business_model: formData.business_model || null,
        funding_stage: formData.funding_stage || null,
        growth_score: formData.growth_score || null,
        is_hiring: formData.is_hiring ?? null,
        tech_stack: formData.tech_stack || null,
        custom_variables_jsonb: customVarsJsonb
      }

      const { error } = await supabase
        .from('meetings_booked')
        // @ts-expect-error - updateData matches the table schema
        .update(updateData)
        .eq('id', meeting.id)

      if (error) {
        console.error('Error updating meeting:', error)
        setSaveStatus('error')
      } else {
        setSaveStatus('success')
        setTimeout(() => {
          onSave?.()
        }, 500)
      }
    } catch (error) {
      console.error('Error saving meeting:', error)
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const renderField = (field: string) => {
    const value = formData[field]
    const label = FIELD_LABELS[field] || field

    // Boolean fields
    if (field === 'is_hiring') {
      return (
        <div key={field} className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600 w-32">{label}</label>
          <select
            value={value === true ? 'true' : value === false ? 'false' : ''}
            onChange={(e) => handleFieldChange(field, e.target.value === '' ? null : e.target.value === 'true')}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Unknown</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
      )
    }

    // Array fields
    if (field === 'tech_stack') {
      const arrayValue = Array.isArray(value) ? value.join(', ') : (value || '')
      return (
        <div key={field} className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600 w-32">{label}</label>
          <input
            type="text"
            value={arrayValue}
            onChange={(e) => handleFieldChange(field, e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            placeholder="Comma-separated values"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )
    }

    // Text fields
    return (
      <div key={field} className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600 w-32">{label}</label>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Edit Meeting Record</h2>
            <p className="text-sm text-gray-500">{meeting.email} • {meeting.client}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Field Groups */}
          {Object.entries(FIELD_GROUPS).map(([groupName, fields]) => (
            <div key={groupName} className="border border-gray-100 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleGroup(groupName)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="font-medium text-gray-700">{groupName}</span>
                {expandedGroups.has(groupName) ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {expandedGroups.has(groupName) && (
                <div className="p-4 space-y-3 bg-white">
                  {fields.map(field => renderField(field))}
                </div>
              )}
            </div>
          ))}

          {/* Custom Variables JSONB */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowCustomVars(!showCustomVars)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="font-medium text-gray-700">Custom Variables (JSON)</span>
              {showCustomVars ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {showCustomVars && (
              <div className="p-4 bg-white">
                <p className="text-xs text-gray-500 mb-2">
                  Raw custom variables from Bison API. Edit carefully.
                </p>
                <textarea
                  value={customVarsJson}
                  onChange={(e) => handleCustomVarsChange(e.target.value)}
                  rows={8}
                  className={`w-full px-3 py-2 font-mono text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                    jsonError 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-200 focus:ring-blue-500'
                  }`}
                />
                {jsonError && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {jsonError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <div className="text-sm text-gray-500">
            {saveStatus === 'success' && (
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Saved successfully
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Error saving changes
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !!jsonError}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}



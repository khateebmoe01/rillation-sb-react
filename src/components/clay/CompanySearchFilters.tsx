import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  MapPin,
  Sparkles,
  Link2,
  Save,
  RotateCcw,
  Loader2,
} from 'lucide-react'
import CollapsibleSection from './CollapsibleSection'
import MultiSelectDropdown from './MultiSelectDropdown'
import ChipSelect, { CompactChipSelect } from './ChipSelect'
import TagInput, { UrlTagInput } from './TagInput'
import NumberInput, { NumberRangeInput } from './NumberInput'
import {
  CompanySearchFilters as FilterType,
  createDefaultFilters,
  COMPANY_SIZES,
  ANNUAL_REVENUES,
  FUNDING_AMOUNTS,
  COMPANY_TYPES,
  BUSINESS_TYPES,
  MAX_COMPANY_LIMIT,
  MAX_LOOKALIKE_COMPANIES,
} from '../../../clay-automation/types/company-search'

// Import industries from JSON
import industriesData from '../../../clay-automation/api-docs/filter-options/industries.json'

// Common countries for quick selection
const COMMON_COUNTRIES = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Netherlands',
  'India',
  'Singapore',
  'United Arab Emirates',
]

interface CompanySearchFiltersProps {
  onSearch: (filters: FilterType) => void
  onSave?: (name: string, filters: FilterType) => void
  initialFilters?: FilterType
  isSearching?: boolean
  isSaving?: boolean
  className?: string
}

export default function CompanySearchFilters({
  onSearch,
  onSave,
  initialFilters,
  isSearching = false,
  isSaving = false,
  className = '',
}: CompanySearchFiltersProps) {
  const [filters, setFilters] = useState<FilterType>(
    initialFilters ? { ...createDefaultFilters(), ...initialFilters } : createDefaultFilters()
  )

  // Sync filters when initialFilters changes (e.g., from AI generation)
  useEffect(() => {
    if (initialFilters) {
      setFilters({ ...createDefaultFilters(), ...initialFilters })
    }
  }, [initialFilters])

  const [showSaveModal, setShowSaveModal] = useState(false)
  const [searchName, setSearchName] = useState('')

  // Calculate active filter count for badges
  const activeFilterCounts = useMemo(() => ({
    industries: (filters.industries?.length || 0) + (filters.industries_exclude?.length || 0),
    sizes: filters.sizes?.length || 0,
    revenues: filters.annual_revenues?.length || 0,
    funding: filters.funding_amounts?.length || 0,
    types: filters.types?.length || 0,
    business: filters.derived_business_types?.length || 0,
    members: (filters.minimum_member_count || filters.maximum_member_count) ? 1 : 0,
    followers: filters.minimum_follower_count ? 1 : 0,
    keywords: (filters.description_keywords?.length || 0) + (filters.description_keywords_exclude?.length || 0),
    location: (filters.country_names?.length || 0) + (filters.country_names_exclude?.length || 0) +
              (filters.locations?.length || 0) + (filters.locations_exclude?.length || 0),
    lookalike: filters.company_identifier?.length || 0,
    semantic: filters.semantic_description ? 1 : 0,
  }), [filters])

  const totalActiveFilters = Object.values(activeFilterCounts).reduce((a, b) => a + b, 0)

  const updateFilter = <K extends keyof FilterType>(key: K, value: FilterType[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleReset = () => {
    setFilters(createDefaultFilters())
  }

  const handleSearch = () => {
    onSearch(filters)
  }

  const handleSave = () => {
    if (searchName.trim() && onSave) {
      onSave(searchName.trim(), filters)
      setShowSaveModal(false)
      setSearchName('')
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with action buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-rillation-text">Find Companies</h2>
          {totalActiveFilters > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="px-2.5 py-0.5 bg-white/10 rounded-full text-xs text-rillation-text"
            >
              {totalActiveFilters} filter{totalActiveFilters !== 1 ? 's' : ''} active
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            onClick={handleReset}
            disabled={totalActiveFilters === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rillation-text/70 hover:text-rillation-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RotateCcw size={14} />
            Reset
          </motion.button>
          {onSave && (
            <motion.button
              type="button"
              onClick={() => setShowSaveModal(true)}
              disabled={totalActiveFilters === 0 || isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rillation-card border border-rillation-border rounded-lg text-xs text-rillation-text hover:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Search
            </motion.button>
          )}
        </div>
      </div>

      {/* Main Filters Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Industries */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-rillation-card border border-rillation-border rounded-xl p-4"
          >
            <MultiSelectDropdown
              label="Industries"
              options={industriesData as string[]}
              value={filters.industries || []}
              onChange={(val) => updateFilter('industries', val)}
              placeholder="Search and select industries..."
              searchable
              maxHeight={320}
            />
            {(filters.industries?.length || 0) > 0 && (
              <div className="mt-3 pt-3 border-t border-rillation-border/50">
                <MultiSelectDropdown
                  label="Exclude Industries"
                  options={industriesData as string[]}
                  value={filters.industries_exclude || []}
                  onChange={(val) => updateFilter('industries_exclude', val)}
                  placeholder="Industries to exclude..."
                  searchable
                  maxHeight={280}
                />
              </div>
            )}
          </motion.div>

          {/* Company Sizes */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-rillation-card border border-rillation-border rounded-xl p-4"
          >
            <ChipSelect
              label="Company Size"
              options={COMPANY_SIZES}
              value={filters.sizes || []}
              onChange={(val) => updateFilter('sizes', val as typeof filters.sizes)}
              columns={3}
            />
          </motion.div>

          {/* Annual Revenue */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-rillation-card border border-rillation-border rounded-xl p-4"
          >
            <ChipSelect
              label="Annual Revenue"
              options={ANNUAL_REVENUES}
              value={filters.annual_revenues || []}
              onChange={(val) => updateFilter('annual_revenues', val as typeof filters.annual_revenues)}
              columns={3}
            />
          </motion.div>

          {/* Funding Raised */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-rillation-card border border-rillation-border rounded-xl p-4"
          >
            <ChipSelect
              label="Funding Raised"
              options={FUNDING_AMOUNTS}
              value={filters.funding_amounts || []}
              onChange={(val) => updateFilter('funding_amounts', val as typeof filters.funding_amounts)}
              columns={3}
            />
          </motion.div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Company & Business Types */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-rillation-card border border-rillation-border rounded-xl p-4 space-y-4"
          >
            <ChipSelect
              label="Company Type"
              options={COMPANY_TYPES}
              value={filters.types || []}
              onChange={(val) => updateFilter('types', val as typeof filters.types)}
              columns={2}
            />

            <div className="pt-3 border-t border-rillation-border/50">
              <CompactChipSelect
                label="Business Type"
                options={BUSINESS_TYPES}
                value={filters.derived_business_types || []}
                onChange={(val) => updateFilter('derived_business_types', val as typeof filters.derived_business_types)}
              />
            </div>
          </motion.div>

          {/* Member & Follower Count */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-rillation-card border border-rillation-border rounded-xl p-4 space-y-4"
          >
            <NumberRangeInput
              label="Employee Count (LinkedIn Members)"
              minValue={filters.minimum_member_count || null}
              maxValue={filters.maximum_member_count || null}
              onMinChange={(val) => updateFilter('minimum_member_count', val)}
              onMaxChange={(val) => updateFilter('maximum_member_count', val)}
              minPlaceholder="Min employees"
              maxPlaceholder="Max employees"
            />

            <div className="pt-3 border-t border-rillation-border/50">
              <NumberInput
                label="Minimum Followers"
                value={filters.minimum_follower_count || null}
                onChange={(val) => updateFilter('minimum_follower_count', val)}
                placeholder="Minimum follower count"
                min={0}
              />
            </div>
          </motion.div>

          {/* Keywords */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-rillation-card border border-rillation-border rounded-xl p-4 space-y-4"
          >
            <TagInput
              label="Description Keywords (Include)"
              value={filters.description_keywords || []}
              onChange={(val) => updateFilter('description_keywords', val)}
              placeholder="Add keywords to include..."
              variant="include"
            />

            <TagInput
              label="Description Keywords (Exclude)"
              value={filters.description_keywords_exclude || []}
              onChange={(val) => updateFilter('description_keywords_exclude', val)}
              placeholder="Add keywords to exclude..."
              variant="exclude"
            />
          </motion.div>

          {/* Results Limit */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-rillation-card border border-rillation-border rounded-xl p-4"
          >
            <NumberInput
              label="Results Limit"
              value={filters.limit || 100}
              onChange={(val) => updateFilter('limit', val || 100)}
              placeholder="Max results"
              min={1}
              max={MAX_COMPANY_LIMIT}
            />
            <p className="mt-1.5 text-xs text-rillation-text/50">
              Maximum {MAX_COMPANY_LIMIT} companies per search
            </p>
          </motion.div>
        </div>
      </div>

      {/* Advanced Filters (Collapsible) */}
      <div className="space-y-3">
        {/* Location Filters */}
        <CollapsibleSection
          title="Location Filters"
          icon={<MapPin size={16} />}
          badge={activeFilterCounts.location || undefined}
        >
          <div className="space-y-4">
            <MultiSelectDropdown
              label="Countries (Include)"
              options={COMMON_COUNTRIES}
              value={filters.country_names || []}
              onChange={(val) => updateFilter('country_names', val)}
              placeholder="Select countries..."
            />

            <MultiSelectDropdown
              label="Countries (Exclude)"
              options={COMMON_COUNTRIES}
              value={filters.country_names_exclude || []}
              onChange={(val) => updateFilter('country_names_exclude', val)}
              placeholder="Countries to exclude..."
            />

            <TagInput
              label="Cities/States (Include)"
              value={filters.locations || []}
              onChange={(val) => updateFilter('locations', val)}
              placeholder="Add cities or states..."
              variant="include"
            />

            <TagInput
              label="Cities/States (Exclude)"
              value={filters.locations_exclude || []}
              onChange={(val) => updateFilter('locations_exclude', val)}
              placeholder="Cities or states to exclude..."
              variant="exclude"
            />
          </div>
        </CollapsibleSection>

        {/* Lookalike Companies */}
        <CollapsibleSection
          title="Lookalike Companies"
          icon={<Link2 size={16} />}
          badge={activeFilterCounts.lookalike || undefined}
        >
          <UrlTagInput
            label="Company URLs or Domains"
            value={filters.company_identifier || []}
            onChange={(val) => updateFilter('company_identifier', val)}
            placeholder="Enter LinkedIn URL or domain (e.g., company.com)"
            maxUrls={MAX_LOOKALIKE_COMPANIES}
          />
          <p className="mt-2 text-xs text-rillation-text/50">
            Find companies similar to these. Add up to {MAX_LOOKALIKE_COMPANIES} company identifiers.
          </p>
        </CollapsibleSection>

        {/* Semantic Search */}
        <CollapsibleSection
          title="Products & Services Search"
          icon={<Sparkles size={16} />}
          badge={activeFilterCounts.semantic || undefined}
        >
          <div>
            <label className="block text-sm font-medium text-rillation-text mb-2">
              Describe Products or Services
            </label>
            <textarea
              value={filters.semantic_description || ''}
              onChange={(e) => updateFilter('semantic_description', e.target.value)}
              placeholder="Describe the products or services these companies should offer..."
              rows={4}
              className="w-full px-3 py-2.5 bg-rillation-card border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text/40 focus:outline-none focus:border-white/30 transition-colors resize-none"
            />
            <p className="mt-1.5 text-xs text-rillation-text/50">
              Use natural language to describe what products or services target companies should offer.
            </p>
          </div>
        </CollapsibleSection>
      </div>

      {/* Search Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="pt-4"
      >
        <motion.button
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-black font-medium rounded-xl hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          whileHover={{ scale: 1.01, boxShadow: '0 0 20px rgba(255, 255, 255, 0.3)' }}
          whileTap={{ scale: 0.99 }}
        >
          {isSearching ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search size={18} />
              Find Companies
            </>
          )}
        </motion.button>
      </motion.div>

      {/* Save Search Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSaveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-rillation-card border border-rillation-border rounded-2xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-rillation-text mb-4">
                Save Search Configuration
              </h3>
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Enter a name for this search..."
                className="w-full px-3 py-2.5 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text/40 focus:outline-none focus:border-white/30 transition-colors mb-4"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchName.trim()) {
                    handleSave()
                  }
                }}
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 text-sm text-rillation-text/70 hover:text-rillation-text transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  type="button"
                  onClick={handleSave}
                  disabled={!searchName.trim() || isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

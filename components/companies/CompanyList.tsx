import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Plus, Globe, Phone, MapPin, Users, ExternalLink } from 'lucide-react'
import { theme } from '../../config/theme'
import { useCRM } from '../../context/CRMContext'
import { Card, Avatar, StatusBadge, Button, SearchInput, EmptyState, LoadingSkeleton } from '../shared'
import { CompanyModal } from './CompanyModal'
import type { Company } from '../../types'

export function CompanyList() {
  const { companies, loading } = useCRM()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  
  // Filter companies by search
  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies
    
    const query = searchQuery.toLowerCase()
    return companies.filter(c => 
      c.name?.toLowerCase().includes(query) ||
      c.industry?.toLowerCase().includes(query) ||
      c.city?.toLowerCase().includes(query)
    )
  }, [companies, searchQuery])
  
  const handleOpenCompany = (company: Company) => {
    setSelectedCompany(company)
    setIsCreating(false)
    setIsModalOpen(true)
  }
  
  const handleCreateCompany = () => {
    setSelectedCompany(null)
    setIsCreating(true)
    setIsModalOpen(true)
  }
  
  if (loading.companies) {
    return <LoadingSkeleton rows={6} />
  }
  
  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: theme.fontSize['2xl'],
              fontWeight: theme.fontWeight.bold,
              color: theme.text.primary,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Building2 size={24} style={{ color: theme.entity.company }} />
            Companies
          </h1>
          <p
            style={{
              fontSize: theme.fontSize.sm,
              color: theme.text.muted,
              margin: '4px 0 0 0',
            }}
          >
            {companies.length} {companies.length === 1 ? 'company' : 'companies'}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder="Search companies..."
            style={{ width: 260 }}
          />
          <Button
            icon={<Plus size={16} />}
            onClick={handleCreateCompany}
          >
            Add Company
          </Button>
        </div>
      </div>
      
      {/* Companies Grid */}
      {filteredCompanies.length === 0 ? (
        <EmptyState
          icon={<Building2 size={32} />}
          title={searchQuery ? 'No companies found' : 'No companies yet'}
          description={
            searchQuery
              ? 'Try adjusting your search terms'
              : 'Start by adding your first company to the CRM'
          }
          action={
            !searchQuery
              ? { label: 'Add Company', onClick: handleCreateCompany, icon: <Plus size={16} /> }
              : undefined
          }
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 16,
          }}
        >
          <AnimatePresence mode="popLayout">
            {filteredCompanies.map((company, index) => (
              <motion.div
                key={company.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.03 }}
                layout
              >
                <CompanyCard company={company} onClick={() => handleOpenCompany(company)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      
      {/* Company Modal */}
      <CompanyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        company={isCreating ? null : selectedCompany}
      />
    </div>
  )
}

// Individual company card
interface CompanyCardProps {
  company: Company
  onClick: () => void
}

function CompanyCard({ company, onClick }: CompanyCardProps) {
  const location = [company.city, company.state, company.country].filter(Boolean).join(', ')
  
  return (
    <Card hover onClick={onClick} padding="md">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <Avatar src={company.logo_url} name={company.name} size="lg" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontSize: theme.fontSize.md,
              fontWeight: theme.fontWeight.semibold,
              color: theme.text.primary,
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {company.name}
          </h3>
          {company.industry && (
            <p
              style={{
                fontSize: theme.fontSize.sm,
                color: theme.text.secondary,
                margin: '2px 0 0 0',
              }}
            >
              {company.industry}
            </p>
          )}
        </div>
        <StatusBadge status={company.status} type="company" />
      </div>
      
      {/* Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={14} style={{ color: theme.text.muted, flexShrink: 0 }} />
            <span
              style={{
                fontSize: theme.fontSize.sm,
                color: theme.text.secondary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {location}
            </span>
          </div>
        )}
        
        {company.website && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Globe size={14} style={{ color: theme.text.muted, flexShrink: 0 }} />
            <a
              href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: theme.fontSize.sm,
                color: theme.accent.primary,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {company.website.replace(/^https?:\/\//, '')}
              <ExternalLink size={12} />
            </a>
          </div>
        )}
        
        {company.phone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Phone size={14} style={{ color: theme.text.muted, flexShrink: 0 }} />
            <span style={{ fontSize: theme.fontSize.sm, color: theme.text.secondary }}>
              {company.phone}
            </span>
          </div>
        )}
        
        {company.company_size && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={14} style={{ color: theme.text.muted, flexShrink: 0 }} />
            <span style={{ fontSize: theme.fontSize.sm, color: theme.text.secondary }}>
              {company.company_size} employees
            </span>
          </div>
        )}
      </div>
    </Card>
  )
}

import { useState, useEffect } from 'react'
import { supabase, formatDateForQuery, formatDateForQueryEndOfDay } from '../../lib/supabase'
import type { MeetingBooked } from '../../types/database'
import ExpandableDataPanel from './ExpandableDataPanel'

interface MeetingsBookedTableProps {
  client: string
  startDate: Date
  endDate: Date
}

const PAGE_SIZE = 10

const meetingsColumns = [
  { key: 'full_name', label: 'Name' },
  { key: 'company', label: 'Company' },
  { key: 'email', label: 'Email' },
  { key: 'title', label: 'Title' },
  { key: 'campaign_name', label: 'Campaign' },
  { key: 'created_time', label: 'Date', format: 'date' as const },
  { key: 'annual_revenue', label: 'Annual Revenue' },
  { key: 'industry', label: 'Industry' },
  { key: 'company_hq_state', label: 'HQ State' },
  { key: 'company_hq_city', label: 'HQ City' },
  { key: 'company_hq_country', label: 'HQ Country' },
  { key: 'year_founded', label: 'Year Founded' },
]

export default function MeetingsBookedTable({ client, startDate, endDate }: MeetingsBookedTableProps) {
  const [meetingsData, setMeetingsData] = useState<MeetingBooked[]>([])
  const [meetingsCount, setMeetingsCount] = useState(0)
  const [meetingsPage, setMeetingsPage] = useState(1)
  const [meetingsLoading, setMeetingsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    async function fetchMeetingsData() {
      setMeetingsLoading(true)
      const startStr = formatDateForQuery(startDate)
      const endStrNextDay = formatDateForQueryEndOfDay(endDate)
      const offset = (meetingsPage - 1) * PAGE_SIZE

      try {
        let query = supabase
          .from('meetings_booked')
          .select('*', { count: 'exact' })
          .gte('created_time', startStr)
          .lt('created_time', endStrNextDay)
          .eq('client', client)
          .order('created_time', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1)

        const { data, count, error } = await query
        if (error) throw error
        
        setMeetingsData(data || [])
        setMeetingsCount(count || 0)
      } catch (err) {
        console.error('Error fetching meetings data:', err)
      } finally {
        setMeetingsLoading(false)
      }
    }

    fetchMeetingsData()
  }, [meetingsPage, startDate, endDate, client])

  if (meetingsLoading && meetingsData.length === 0) {
    return (
      <div className="bg-rillation-card rounded-xl border border-rillation-border p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <ExpandableDataPanel
      title="Meetings Booked"
      data={meetingsData}
      columns={meetingsColumns}
      totalCount={meetingsCount}
      currentPage={meetingsPage}
      pageSize={PAGE_SIZE}
      onPageChange={setMeetingsPage}
      onClose={() => setIsOpen(false)}
      isOpen={isOpen}
    />
  )
}


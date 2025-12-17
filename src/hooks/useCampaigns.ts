import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useCampaigns(client?: string) {
  const [campaigns, setCampaigns] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        setLoading(true)
        
        let query = supabase
          .from('campaign_reporting')
          .select('campaign_name')
        
        if (client) {
          query = query.eq('client', client)
        }
        
        const { data, error } = await query

        if (error) throw error

        // Get unique campaign names
        const uniqueCampaigns = [...new Set(data?.map((c) => c.campaign_name).filter(Boolean))]
        setCampaigns(uniqueCampaigns.sort())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch campaigns')
      } finally {
        setLoading(false)
      }
    }

    fetchCampaigns()
  }, [client])

  return { campaigns, loading, error }
}


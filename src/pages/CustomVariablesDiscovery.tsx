import { useState, useEffect } from 'react'
import { Search, RefreshCw, Database, TrendingUp, AlertCircle, ChevronRight, Copy, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface VariableStats {
  name: string
  count: number
  percentage: number
  sampleValues: string[]
  hasDedicatedColumn: boolean
}

// Existing dedicated columns in meetings_booked
const DEDICATED_COLUMNS = new Set([
  'company_linkedin', 'company_domain', 'campaign_name', 'profile_url', 'campaign_id',
  'company_size', 'annual_revenue', 'industry', 'company_hq_city', 'company_hq_state',
  'company_hq_country', 'year_founded', 'business_model', 'funding_stage', 'tech_stack',
  'is_hiring', 'growth_score'
])

export default function CustomVariablesDiscovery() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalMeetings, setTotalMeetings] = useState(0)
  const [variables, setVariables] = useState<VariableStats[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'count' | 'name'>('count')
  const [copiedVar, setCopiedVar] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Get total count of meetings with custom_variables_jsonb
      const { count: total, error: countError } = await supabase
        .from('meetings_booked')
        .select('*', { count: 'exact', head: true })

      if (countError) throw countError
      setTotalMeetings(total || 0)

      // Fetch all meetings with custom_variables_jsonb
      // We need to aggregate the JSONB keys client-side since Supabase doesn't have jsonb_object_keys easily accessible
      const { data, error: fetchError } = await supabase
        .from('meetings_booked')
        .select('custom_variables_jsonb')
        .not('custom_variables_jsonb', 'is', null)
        .limit(5000)

      if (fetchError) throw fetchError

      // Aggregate variable statistics
      const variableMap = new Map<string, { count: number; samples: Set<string> }>()

      for (const row of data || []) {
        const customVars = (row as any).custom_variables_jsonb
        if (customVars && typeof customVars === 'object') {
          for (const [key, value] of Object.entries(customVars)) {
            const existing = variableMap.get(key) || { count: 0, samples: new Set() }
            existing.count++
            if (value !== null && value !== undefined && existing.samples.size < 5) {
              const strValue = String(value).substring(0, 50)
              existing.samples.add(strValue)
            }
            variableMap.set(key, existing)
          }
        }
      }

      // Convert to array and calculate percentages
      const variableStats: VariableStats[] = Array.from(variableMap.entries()).map(([name, stats]) => ({
        name,
        count: stats.count,
        percentage: total ? Math.round((stats.count / total) * 100) : 0,
        sampleValues: Array.from(stats.samples),
        hasDedicatedColumn: DEDICATED_COLUMNS.has(name.toLowerCase().replace(/[-\s]+/g, '_'))
      }))

      setVariables(variableStats)
    } catch (err) {
      console.error('Error fetching variable data:', err)
      setError('Failed to fetch custom variable data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredVariables = variables
    .filter(v => v.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'count') return b.count - a.count
      return a.name.localeCompare(b.name)
    })

  const unmappedVariables = filteredVariables.filter(v => !v.hasDedicatedColumn)
  const mappedVariables = filteredVariables.filter(v => v.hasDedicatedColumn)

  const copyPromotionCommand = (varName: string) => {
    const command = `npx tsx scripts/promote-custom-variable-to-column.ts --variable "${varName}" --type text`
    navigator.clipboard.writeText(command)
    setCopiedVar(varName)
    setTimeout(() => setCopiedVar(null), 2000)
  }

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 50) return 'bg-yellow-500'
    if (percentage >= 20) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custom Variables Discovery</h1>
          <p className="text-sm text-gray-500 mt-1">
            Analyze custom variables from Bison API stored in meetings_booked
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalMeetings.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Total Meetings</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{variables.length}</p>
              <p className="text-xs text-gray-500">Unique Variables</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{mappedVariables.length}</p>
              <p className="text-xs text-gray-500">Mapped to Columns</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{unmappedVariables.length}</p>
              <p className="text-xs text-gray-500">Unmapped Variables</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search variables..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'count' | 'name')}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="count">Sort by Count</option>
          <option value="name">Sort by Name</option>
        </select>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Unmapped Variables (Candidates for Promotion) */}
          {unmappedVariables.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                Unmapped Variables
                <span className="text-sm font-normal text-gray-500">
                  (Candidates for column promotion)
                </span>
              </h2>
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Variable Name</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Count</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Coverage</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Sample Values</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {unmappedVariables.map(variable => (
                        <tr key={variable.name} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">{variable.name}</code>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {variable.count.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${getCompletionColor(variable.percentage)}`}
                                  style={{ width: `${variable.percentage}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600">{variable.percentage}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {variable.sampleValues.slice(0, 3).map((val, i) => (
                                <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 max-w-[150px] truncate">
                                  {val}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => copyPromotionCommand(variable.name)}
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              {copiedVar === variable.name ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  Copy Promote Command
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Mapped Variables */}
          {mappedVariables.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                Mapped Variables
                <span className="text-sm font-normal text-gray-500">
                  (Already have dedicated columns)
                </span>
              </h2>
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Variable Name</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Count</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Coverage</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Sample Values</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {mappedVariables.map(variable => (
                        <tr key={variable.name} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <code className="text-sm bg-green-50 px-2 py-1 rounded text-green-700">{variable.name}</code>
                              <ChevronRight className="w-4 h-4 text-gray-300" />
                              <span className="text-xs text-gray-500">column</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {variable.count.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${getCompletionColor(variable.percentage)}`}
                                  style={{ width: `${variable.percentage}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600">{variable.percentage}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {variable.sampleValues.slice(0, 3).map((val, i) => (
                                <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 max-w-[150px] truncate">
                                  {val}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <h3 className="font-medium text-blue-800 mb-2">How to Promote a Variable to a Column</h3>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>Identify variables with high coverage (50%+ recommended)</li>
          <li>Click "Copy Promote Command" next to the variable</li>
          <li>Run the command in your terminal</li>
          <li>Deploy the edge function update and run the migration</li>
        </ol>
      </div>
    </div>
  )
}



import { useState, useEffect } from 'react'
import {
  TABLE_DATE_COLUMNS,
  getQueryLog,
  clearQueryLog,
  runTestQueries,
  runAllTestQueries,
  type TableName,
  type QueryLogEntry,
  type TestQueryResult,
} from '../lib/debug-queries'

export default function DebugView() {
  const [queryLog, setQueryLog] = useState<QueryLogEntry[]>([])
  const [testResults, setTestResults] = useState<TestQueryResult[]>([])
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  // Refresh query log
  const refreshLog = () => {
    setQueryLog(getQueryLog())
  }

  // Auto-refresh query log
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(refreshLog, 1000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  // Run test queries for all tables
  const handleRunAllTests = async () => {
    setLoading(true)
    try {
      const results = await runAllTestQueries()
      setTestResults(results)
    } catch (err) {
      console.error('Error running tests:', err)
    } finally {
      setLoading(false)
    }
  }

  // Run test for single table
  const handleRunTableTest = async (table: TableName) => {
    setLoading(true)
    try {
      const result = await runTestQueries(table)
      setTestResults((prev) => {
        const filtered = prev.filter((r) => r.table !== table)
        return [...filtered, result]
      })
    } catch (err) {
      console.error('Error running test:', err)
    } finally {
      setLoading(false)
    }
  }

  // Clear log
  const handleClearLog = () => {
    clearQueryLog()
    refreshLog()
  }

  // Get validation badge color
  const getValidationBadge = (validation: string) => {
    switch (validation) {
      case 'pass':
        return 'bg-green-500/20 text-green-400 border-green-500/50'
      case 'fail':
        return 'bg-red-500/20 text-red-400 border-red-500/50'
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Debug: Date Filtering Diagnostics</h1>
        <div className="flex gap-2">
          <button
            onClick={refreshLog}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            Refresh Log
          </button>
          <button
            onClick={handleClearLog}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition"
          >
            Clear Log
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-white">Auto-refresh</span>
          </label>
        </div>
      </div>

      {/* Table Registry */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-xl font-semibold text-white mb-4">Table Registry</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="p-2 text-gray-300 font-semibold">Table Name</th>
                <th className="p-2 text-gray-300 font-semibold">Date Column</th>
                <th className="p-2 text-gray-300 font-semibold">Column Type</th>
                <th className="p-2 text-gray-300 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(TABLE_DATE_COLUMNS).map(([table, info]) => (
                <tr key={table} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="p-2 text-white font-mono">{table}</td>
                  <td className="p-2 text-gray-400 font-mono">
                    {info.column || <span className="text-gray-500 italic">N/A</span>}
                  </td>
                  <td className="p-2 text-gray-400">{info.type}</td>
                  <td className="p-2">
                    <button
                      onClick={() => handleRunTableTest(table as TableName)}
                      disabled={loading}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded transition"
                    >
                      Test
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <button
            onClick={handleRunAllTests}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition"
          >
            {loading ? 'Running Tests...' : 'Run All Tests'}
          </button>
        </div>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-xl font-semibold text-white mb-4">Test Results</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="p-2 text-gray-300 font-semibold">Table</th>
                  <th className="p-2 text-gray-300 font-semibold">Date Column</th>
                  <th className="p-2 text-gray-300 font-semibold">Total Count</th>
                  <th className="p-2 text-gray-300 font-semibold">Nov 2025</th>
                  <th className="p-2 text-gray-300 font-semibold">Dec 2025</th>
                  <th className="p-2 text-gray-300 font-semibold">Sum (Nov+Dec)</th>
                  <th className="p-2 text-gray-300 font-semibold">Validation</th>
                </tr>
              </thead>
              <tbody>
                {testResults.map((result) => (
                  <tr
                    key={result.table}
                    className="border-b border-gray-700/50 hover:bg-gray-700/30"
                  >
                    <td className="p-2 text-white font-mono">{result.table}</td>
                    <td className="p-2 text-gray-400 font-mono">
                      {result.dateColumn || <span className="text-gray-500 italic">N/A</span>}
                    </td>
                    <td className="p-2 text-gray-300">{result.totalCount.toLocaleString()}</td>
                    <td className="p-2 text-gray-300">{result.november2025.toLocaleString()}</td>
                    <td className="p-2 text-gray-300">{result.december2025.toLocaleString()}</td>
                    <td className="p-2 text-gray-300">{result.sumNovDec.toLocaleString()}</td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-1 rounded border text-xs font-semibold ${getValidationBadge(
                          result.validation
                        )}`}
                      >
                        {result.validation.toUpperCase()}
                      </span>
                      {result.error && (
                        <div className="text-red-400 text-xs mt-1">{result.error}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Query Log */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-xl font-semibold text-white mb-4">
          Live Query Log ({queryLog.length} entries)
        </h2>
        <div className="bg-gray-900 rounded p-4 max-h-96 overflow-y-auto font-mono text-sm">
          {queryLog.length === 0 ? (
            <div className="text-gray-500 italic">No queries logged yet. Navigate the app to see queries.</div>
          ) : (
            <div className="space-y-2">
              {queryLog.slice().reverse().map((entry, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded border ${
                    entry.error
                      ? 'border-red-500/50 bg-red-500/10'
                      : entry.hitLimit
                      ? 'border-yellow-500/50 bg-yellow-500/10'
                      : 'border-gray-700/50 bg-gray-700/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="text-white font-semibold">
                        [{new Date(entry.timestamp).toLocaleTimeString()}] {entry.table}
                      </div>
                      {entry.filters.length > 0 && (
                        <div className="text-gray-400 mt-1">
                          Filters: {entry.filters.join(', ')}
                        </div>
                      )}
                      <div className="text-gray-300 mt-1">
                        Rows: {entry.rowCount.toLocaleString()}
                        {entry.hitLimit && (
                          <span className="ml-2 text-yellow-400 font-semibold">
                            ⚠️ HIT 1000 ROW LIMIT!
                          </span>
                        )}
                      </div>
                      {entry.error && (
                        <div className="text-red-400 mt-1">Error: {entry.error}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



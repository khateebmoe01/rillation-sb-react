import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Types
export interface CompanyFilters {
  industries?: string[]
  sizes?: string[]
  annual_revenues?: string[]
  country_names?: string[]
  locations?: string[]
  description_keywords?: string[]
  semantic_description?: string
  limit?: number
  industries_exclude?: string[]
  country_names_exclude?: string[]
  locations_exclude?: string[]
  description_keywords_exclude?: string[]
}

export interface CreateWorkbookRequest {
  client: string
  workbookName: string
  filters: CompanyFilters
}

export interface CreateWorkbookResult {
  success: boolean
  tableId?: string
  workbookId?: string
  tableUrl?: string
  companiesFound?: number
  recordsImported?: number
  error?: string
  step?: 'create_workbook' | 'find_companies' | 'import_companies'
}

export type WorkbookStatus = 'idle' | 'creating' | 'finding' | 'importing' | 'complete' | 'error'

async function callEdgeFunction(name: string, body: Record<string, unknown>) {
  const supabaseUrl = (supabase as any).supabaseUrl || import.meta.env.VITE_SUPABASE_URL
  const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${(supabase as any).supabaseKey || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  })
  return response.json()
}

export function useClayWorkbook() {
  const [status, setStatus] = useState<WorkbookStatus>('idle')
  const [result, setResult] = useState<CreateWorkbookResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const createWorkbook = useCallback(
    async (request: CreateWorkbookRequest) => {
      setStatus('creating')
      setError(null)
      setResult(null)

      try {
        // =====================
        // STEP 1: Create workbook
        // =====================
        console.log('[useClayWorkbook] Step 1: Creating workbook...')

        const createResult = await callEdgeFunction('clay-create-workbook', {
          client: request.client,
          workbookName: request.workbookName,
        })

        if (!createResult.success) {
          setError(createResult.error || 'Failed to create workbook')
          setResult({ success: false, error: createResult.error, step: 'create_workbook' })
          setStatus('error')
          return { success: false, error: createResult.error, step: 'create_workbook' }
        }

        const { tableId, workbookId, tableUrl } = createResult
        console.log('[useClayWorkbook] Workbook created. tableId:', tableId, 'workbookId:', workbookId)

        // =====================
        // STEP 2: Find companies
        // =====================
        setStatus('finding')
        console.log('[useClayWorkbook] Step 2: Finding companies...')
        console.log('[useClayWorkbook] Filters:', JSON.stringify(request.filters, null, 2))

        const findResult = await callEdgeFunction('clay-find-companies', {
          client: request.client,
          tableId: tableId,
          filters: request.filters,
        })

        if (!findResult.success) {
          setError(findResult.error || 'Failed to find companies')
          setResult({ success: false, error: findResult.error, step: 'find_companies', tableId, workbookId, tableUrl })
          setStatus('error')
          return { success: false, error: findResult.error, step: 'find_companies' }
        }

        const { taskId, companyCount } = findResult
        console.log('[useClayWorkbook] Found companies, taskId:', taskId, 'count:', companyCount)

        // Wait for Clay to process the task before importing
        console.log('[useClayWorkbook] Waiting 5 seconds for task to be ready...')
        await new Promise(resolve => setTimeout(resolve, 5000))

        // =====================
        // STEP 3: Import companies
        // =====================
        setStatus('importing')
        console.log('[useClayWorkbook] Step 3: Importing companies to workbook...')

        const importPayload = {
          client: request.client,
          workbookName: request.workbookName,
          workbookId: workbookId,
          tableId: tableId,
          taskId: taskId,
          filters: request.filters,
        }
        console.log('[useClayWorkbook] Import payload:', JSON.stringify(importPayload, null, 2))

        const importResult = await callEdgeFunction('clay-import-companies', importPayload)

        if (!importResult.success) {
          setError(importResult.error || 'Failed to import companies')
          setResult({ success: false, error: importResult.error, step: 'import_companies', tableId, workbookId, tableUrl })
          setStatus('error')
          return { success: false, error: importResult.error, step: 'import_companies' }
        }

        const finalResult: CreateWorkbookResult = {
          success: true,
          tableId: importResult.tableId || tableId,
          workbookId: importResult.workbookId || workbookId,
          tableUrl: importResult.tableUrl || tableUrl,
          companiesFound: companyCount || importResult.recordsImported,
          recordsImported: importResult.recordsImported,
        }

        setResult(finalResult)
        setStatus('complete')
        console.log('[useClayWorkbook] Complete! Records imported:', importResult.recordsImported)
        return finalResult

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect to Clay service'
        setError(errorMessage)
        setStatus('error')
        return { success: false, error: errorMessage }
      }
    },
    []
  )

  const reset = useCallback(() => {
    setStatus('idle')
    setResult(null)
    setError(null)
  }, [])

  return {
    status,
    result,
    error,
    createWorkbook,
    reset,
  }
}

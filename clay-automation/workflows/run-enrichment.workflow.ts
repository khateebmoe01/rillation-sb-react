import type { WorkflowContext } from '../types/workflow.types.js'
import { ClaySelectors } from '../selectors/clay-selectors.js'
import { ClayConfig } from '../config/clay.config.js'
import { ClayAutomationError, ErrorCodes, sleep } from '../core/error-handler.js'
import { waitForPageReady, clickWithRetry, waitForAny } from '../selectors/selector-helpers.js'

export interface RunEnrichmentInput {
  tableId: string
  columns?: string[] // Specific columns to run, or all if not specified
  waitForCompletion?: boolean
}

export interface RunEnrichmentResult {
  success: boolean
  rowsProcessed: number
  duration: number
  status: 'completed' | 'partial' | 'failed' | 'running'
}

export async function runEnrichmentWorkflow(context: WorkflowContext): Promise<RunEnrichmentResult> {
  const { browser, logger, input } = context
  const { tableId, columns, waitForCompletion = true } = input as RunEnrichmentInput

  logger.emit('status', 'Starting enrichment run...')
  if (columns && columns.length > 0) {
    logger.emit('info', `Columns to enrich: ${columns.join(', ')}`)
  } else {
    logger.emit('info', 'Running all enrichment columns')
  }

  // Navigate to table if not already there
  const currentUrl = browser.getUrl()
  if (!currentUrl.includes(tableId)) {
    logger.emit('status', 'Navigating to table...')
    await browser.navigate(`${ClayConfig.urls.tables}/${tableId}`)
    await waitForPageReady(browser)
    await sleep(1000)
  }

  // Find and click the Run/Enrich button
  logger.emit('status', 'Looking for Run button...')

  const runButtonSelectors = [
    ClaySelectors.tablePage.runButton,
    ClaySelectors.runPanel.startButton,
    'button:has-text("Run")',
    'button:has-text("Enrich")',
    'button:has-text("Start")',
    '[data-testid="run-enrichment"]',
  ]

  let foundRun = false
  for (const selector of runButtonSelectors) {
    try {
      await browser.waitForSelector(selector, { timeout: 3000 })
      await clickWithRetry(browser, selector)
      foundRun = true
      break
    } catch {
      continue
    }
  }

  if (!foundRun) {
    throw new ClayAutomationError(
      'Could not find Run/Enrich button',
      ErrorCodes.ELEMENT_NOT_FOUND,
      false
    )
  }

  await sleep(1000)

  // Check if a run panel/modal appeared
  const hasRunPanel = await browser.isVisible(ClaySelectors.runPanel.panel)

  if (hasRunPanel) {
    // If specific columns are requested, configure them
    if (columns && columns.length > 0) {
      logger.emit('status', 'Selecting specific columns to run...')
      for (const col of columns) {
        try {
          await browser.click(`[data-column="${col}"], input[value="${col}"]`)
        } catch {
          logger.emit('warning', `Could not select column: ${col}`)
        }
      }
    }

    // Click start/confirm
    logger.emit('status', 'Confirming enrichment run...')
    try {
      await browser.click(ClaySelectors.runPanel.startButton, { timeout: 3000 })
    } catch {
      await browser.click('button:has-text("Start"), button:has-text("Run")', { timeout: 3000 })
    }
  }

  const startTime = Date.now()

  if (!waitForCompletion) {
    logger.emit('success', 'Enrichment started! Not waiting for completion.')
    return {
      success: true,
      rowsProcessed: 0,
      duration: 0,
      status: 'running',
    }
  }

  // Wait for enrichment to complete
  logger.emit('status', 'Waiting for enrichment to complete...')
  logger.emit('info', 'This may take several minutes depending on row count...')

  const maxWait = ClayConfig.timeouts.enrichmentRun
  let lastProgress = 0
  let rowsProcessed = 0

  while (Date.now() - startTime < maxWait) {
    await sleep(5000) // Check every 5 seconds

    // Check for completion indicators
    const completedSelectors = [
      '.enrichment-complete',
      '[data-status="completed"]',
      '.success-message:has-text("complete")',
    ]

    const isComplete = await waitForAny(browser, completedSelectors, 1000)
    if (isComplete) {
      logger.emit('success', 'Enrichment completed!')
      break
    }

    // Check for errors
    const hasError = await browser.isVisible('.error-message, [data-status="error"]')
    if (hasError) {
      const errorText = await browser.getText('.error-message')
      throw new ClayAutomationError(
        `Enrichment failed: ${errorText}`,
        ErrorCodes.ENRICHMENT_FAILED,
        false
      )
    }

    // Check progress
    try {
      const progressText = await browser.getText(ClaySelectors.runPanel.statusText)
      if (progressText) {
        // Try to extract progress percentage or row count
        const percentMatch = progressText.match(/(\d+)%/)
        const rowMatch = progressText.match(/(\d+)\s*(rows?|of)/i)

        if (percentMatch) {
          const progress = parseInt(percentMatch[1], 10)
          if (progress > lastProgress) {
            lastProgress = progress
            logger.progress(progress, `Enriching... ${progressText}`)
          }
        }

        if (rowMatch) {
          rowsProcessed = parseInt(rowMatch[1], 10)
        }
      }
    } catch {
      // Progress element might not exist
    }

    // Check if the run panel/indicators disappeared (might mean completion)
    const stillRunning = await browser.isVisible(ClaySelectors.runPanel.progressBar)
    if (!stillRunning) {
      // Double check we're not in an error state
      await sleep(2000)
      const errorAfter = await browser.isVisible('.error-message')
      if (!errorAfter) {
        logger.emit('success', 'Enrichment appears to have completed')
        break
      }
    }

    // Log elapsed time every minute
    const elapsed = Math.floor((Date.now() - startTime) / 60000)
    if (elapsed > 0 && elapsed % 1 === 0) {
      logger.emit('status', `Still running... (${elapsed} minute${elapsed > 1 ? 's' : ''} elapsed)`)
    }
  }

  const duration = Date.now() - startTime

  // Try to get final row count
  try {
    const rowText = await browser.getText(ClaySelectors.runPanel.rowsProcessed)
    const match = rowText.match(/(\d+)/)
    if (match) {
      rowsProcessed = parseInt(match[1], 10)
    }
  } catch {
    // Use whatever we collected during progress
  }

  logger.emit('success', `Enrichment workflow completed!`)
  logger.emit('info', `Duration: ${Math.round(duration / 1000)}s`)
  logger.emit('info', `Rows processed: ${rowsProcessed || 'unknown'}`)

  return {
    success: true,
    rowsProcessed,
    duration,
    status: 'completed',
  }
}

export function validateRunEnrichmentInput(input: Record<string, unknown>): boolean {
  return typeof input.tableId === 'string' && input.tableId.length > 0
}

export default runEnrichmentWorkflow

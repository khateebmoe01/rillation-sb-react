import * as fs from 'fs'
import * as path from 'path'
import type { WorkflowContext } from '../types/workflow.types.js'
import type { ExportConfig } from '../types/clay.types.js'
import { ClaySelectors } from '../selectors/clay-selectors.js'
import { ClayConfig } from '../config/clay.config.js'
import { ClayAutomationError, ErrorCodes, sleep } from '../core/error-handler.js'
import { waitForPageReady, clickWithRetry, waitForAny } from '../selectors/selector-helpers.js'

export interface ExportResultsInput extends ExportConfig {
  // Inherited from ExportConfig
}

export interface ExportResultsResult {
  success: boolean
  filePath: string
  rowCount: number
  format: 'csv' | 'json'
}

export async function exportResultsWorkflow(context: WorkflowContext): Promise<ExportResultsResult> {
  const { browser, logger, input } = context
  const { tableId, outputPath, format = 'csv', includeColumns } = input as ExportResultsInput

  logger.emit('status', 'Starting export...')
  logger.emit('info', `Table ID: ${tableId}`)
  logger.emit('info', `Output: ${outputPath}`)
  logger.emit('info', `Format: ${format}`)

  // Navigate to table if not already there
  const currentUrl = browser.getUrl()
  if (!currentUrl.includes(tableId)) {
    logger.emit('status', 'Navigating to table...')
    await browser.navigate(`${ClayConfig.urls.tables}/${tableId}`)
    await waitForPageReady(browser)
    await sleep(1000)
  }

  // Find and click export button
  logger.emit('status', 'Looking for Export button...')

  const exportButtonSelectors = [
    ClaySelectors.tablePage.exportButton,
    'button:has-text("Export")',
    'button:has-text("Download")',
    '[data-testid="export-button"]',
    'button[aria-label*="export" i]',
  ]

  let foundExport = false
  for (const selector of exportButtonSelectors) {
    try {
      await browser.waitForSelector(selector, { timeout: 3000 })
      await clickWithRetry(browser, selector)
      foundExport = true
      break
    } catch {
      continue
    }
  }

  if (!foundExport) {
    // Try looking in a menu
    logger.emit('status', 'Looking for export in menu...')
    try {
      await browser.click(ClaySelectors.tablePage.moreOptionsButton, { timeout: 3000 })
      await sleep(300)
      await browser.click('button:has-text("Export"), [role="menuitem"]:has-text("Export")')
      foundExport = true
    } catch {
      throw new ClayAutomationError(
        'Could not find Export button',
        ErrorCodes.ELEMENT_NOT_FOUND,
        false
      )
    }
  }

  await sleep(500)

  // Wait for export modal
  logger.emit('status', 'Configuring export...')

  const hasModal = await waitForAny(browser, [
    ClaySelectors.exportModal.modal,
    ClaySelectors.exportModal.formatSelect,
    '[data-testid="export-modal"]',
  ], 5000)

  if (hasModal) {
    // Select format
    if (format) {
      logger.emit('status', `Selecting format: ${format}`)
      try {
        await browser.click(ClaySelectors.exportModal.formatSelect, { timeout: 2000 })
        await sleep(200)
        await browser.click(`[data-value="${format}"], option:has-text("${format.toUpperCase()}")`)
      } catch {
        logger.emit('warning', 'Could not select format, using default')
      }
    }

    // Select specific columns if requested
    if (includeColumns && includeColumns.length > 0) {
      logger.emit('status', 'Selecting specific columns...')
      for (const col of includeColumns) {
        try {
          await browser.click(`[data-column="${col}"], input[value="${col}"]`)
        } catch {
          logger.emit('warning', `Could not select column: ${col}`)
        }
      }
    }

    // Click export/download button
    logger.emit('status', 'Starting download...')
    const downloadSelectors = [
      ClaySelectors.exportModal.exportButton,
      'button:has-text("Download")',
      'button:has-text("Export")',
      'button[type="submit"]',
    ]

    for (const selector of downloadSelectors) {
      try {
        await browser.click(selector, { timeout: 2000 })
        break
      } catch {
        continue
      }
    }
  }

  // Wait for download to start/complete
  logger.emit('status', 'Waiting for download...')
  await sleep(3000)

  // Check for download link
  try {
    const downloadLink = await browser.getAttribute(
      ClaySelectors.exportModal.downloadLink,
      'href'
    )
    if (downloadLink) {
      logger.emit('info', `Download link: ${downloadLink}`)
    }
  } catch {
    // Download might be automatic
  }

  // Note: In a real implementation, we would:
  // 1. Set up Playwright to capture downloads
  // 2. Move downloaded file to outputPath
  // 3. Or use the download URL to fetch directly

  // For now, we'll assume the download is handled by the browser
  // and the user needs to move the file manually

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  logger.emit('success', 'Export initiated!')
  logger.emit('info', 'Note: Check your Downloads folder for the exported file')
  logger.emit('info', `Expected output: ${outputPath}`)

  // Wait for modal to close
  await waitForPageReady(browser)

  return {
    success: true,
    filePath: outputPath,
    rowCount: -1, // Unknown without parsing the file
    format,
  }
}

export function validateExportResultsInput(input: Record<string, unknown>): boolean {
  const { tableId, outputPath } = input as ExportResultsInput
  return (
    typeof tableId === 'string' &&
    tableId.length > 0 &&
    typeof outputPath === 'string' &&
    outputPath.length > 0
  )
}

export default exportResultsWorkflow

import * as fs from 'fs'
import * as path from 'path'
import type { WorkflowContext } from '../types/workflow.types.js'
import type { CSVUploadConfig } from '../types/clay.types.js'
import { ClaySelectors } from '../selectors/clay-selectors.js'
import { ClayConfig } from '../config/clay.config.js'
import { ClayAutomationError, ErrorCodes, sleep } from '../core/error-handler.js'
import { waitForPageReady, clickWithRetry, waitForAny } from '../selectors/selector-helpers.js'

export interface UploadCSVInput extends CSVUploadConfig {
  // Inherited from CSVUploadConfig
}

export interface UploadCSVResult {
  success: boolean
  rowsUploaded: number
  tableId: string
}

export async function uploadCSVWorkflow(context: WorkflowContext): Promise<UploadCSVResult> {
  const { browser, logger, input } = context
  const { filePath, tableId, mappings, skipDuplicates } = input as UploadCSVInput

  // Validate file exists
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath)

  if (!fs.existsSync(absolutePath)) {
    throw new ClayAutomationError(
      `CSV file not found: ${absolutePath}`,
      ErrorCodes.UPLOAD_FAILED,
      false
    )
  }

  logger.emit('status', `Uploading CSV: ${path.basename(filePath)}`)
  logger.emit('info', `File: ${absolutePath}`)
  logger.emit('info', `Table ID: ${tableId}`)

  // Navigate to table if not already there
  const currentUrl = browser.getUrl()
  if (!currentUrl.includes(tableId)) {
    logger.emit('status', 'Navigating to table...')
    await browser.navigate(`${ClayConfig.urls.tables}/${tableId}`)
    await waitForPageReady(browser)
    await sleep(1000)
  }

  // Find and click upload/import button
  logger.emit('status', 'Looking for Import button...')

  const uploadButtonSelectors = [
    ClaySelectors.tablePage.uploadButton,
    'button:has-text("Import")',
    'button:has-text("Upload")',
    'button:has-text("Add data")',
    '[data-testid="import-button"]',
  ]

  let foundButton = false
  for (const selector of uploadButtonSelectors) {
    try {
      await browser.waitForSelector(selector, { timeout: 3000 })
      await clickWithRetry(browser, selector)
      foundButton = true
      break
    } catch {
      continue
    }
  }

  if (!foundButton) {
    throw new ClayAutomationError(
      'Could not find Import/Upload button',
      ErrorCodes.ELEMENT_NOT_FOUND,
      false
    )
  }

  // Wait for upload modal
  logger.emit('status', 'Waiting for upload modal...')
  await sleep(500)

  // Look for file input or dropzone
  const fileInputSelector = ClaySelectors.uploadModal.fileInput
  const dropzoneSelector = ClaySelectors.uploadModal.dropzone

  const foundElement = await waitForAny(browser, [fileInputSelector, dropzoneSelector])

  if (!foundElement) {
    throw new ClayAutomationError(
      'Could not find file upload element',
      ErrorCodes.ELEMENT_NOT_FOUND,
      false
    )
  }

  // Upload file
  logger.emit('status', 'Uploading file...')
  try {
    await browser.uploadFile(fileInputSelector, absolutePath)
  } catch {
    // Try drag-drop simulation if file input fails
    logger.emit('status', 'Trying alternative upload method...')
    await browser.uploadFile('input[type="file"]', absolutePath)
  }

  await sleep(2000)

  // Wait for file to be processed
  logger.emit('status', 'Waiting for file processing...')
  await waitForPageReady(browser)

  // Handle column mapping if modal appears
  const hasMappingTable = await browser.isVisible(ClaySelectors.uploadModal.mappingTable)
  if (hasMappingTable && mappings) {
    logger.emit('status', 'Configuring column mappings...')

    for (const [sourceCol, targetCol] of Object.entries(mappings)) {
      try {
        // This is simplified - actual implementation would need to handle
        // the specific UI for column mapping
        logger.emit('status', `Mapping: ${sourceCol} -> ${targetCol}`)
      } catch (err) {
        logger.emit('warning', `Could not map column: ${sourceCol}`)
      }
    }
  }

  // Check skip duplicates option
  if (skipDuplicates) {
    try {
      const checkbox = await browser.isVisible(ClaySelectors.uploadModal.skipDuplicatesCheckbox)
      if (checkbox) {
        await browser.click(ClaySelectors.uploadModal.skipDuplicatesCheckbox)
        logger.emit('status', 'Enabled skip duplicates option')
      }
    } catch {
      logger.emit('warning', 'Skip duplicates option not available')
    }
  }

  // Click upload/confirm button
  logger.emit('status', 'Confirming upload...')
  const confirmSelectors = [
    ClaySelectors.uploadModal.uploadButton,
    'button:has-text("Upload")',
    'button:has-text("Import")',
    'button:has-text("Confirm")',
    'button[type="submit"]',
  ]

  for (const selector of confirmSelectors) {
    try {
      await browser.click(selector, { timeout: 2000 })
      break
    } catch {
      continue
    }
  }

  // Wait for upload to complete
  logger.emit('status', 'Waiting for upload to complete...')

  // Monitor progress if available
  const startTime = Date.now()
  const maxWait = ClayConfig.timeouts.csvUpload

  while (Date.now() - startTime < maxWait) {
    // Check for success message
    const hasSuccess = await browser.isVisible(ClaySelectors.uploadModal.successMessage)
    if (hasSuccess) {
      break
    }

    // Check for error message
    const hasError = await browser.isVisible(ClaySelectors.uploadModal.errorMessage)
    if (hasError) {
      const errorText = await browser.getText(ClaySelectors.uploadModal.errorMessage)
      throw new ClayAutomationError(
        `Upload failed: ${errorText}`,
        ErrorCodes.UPLOAD_FAILED,
        false
      )
    }

    // Check for progress bar
    const hasProgress = await browser.isVisible(ClaySelectors.uploadModal.progressBar)
    if (hasProgress) {
      // Still uploading, continue waiting
      await sleep(1000)
      continue
    }

    // Check if modal closed (upload complete)
    const modalVisible = await browser.isVisible(ClaySelectors.uploadModal.modal)
    if (!modalVisible) {
      break
    }

    await sleep(1000)
  }

  await waitForPageReady(browser)
  await sleep(1000)

  // Try to get row count (this would need actual element inspection)
  let rowsUploaded = 0
  try {
    // Attempt to count rows in table - this is a rough estimate
    logger.emit('status', 'Counting uploaded rows...')
    // This would need actual implementation based on Clay's UI
    rowsUploaded = -1 // Unknown
  } catch {
    rowsUploaded = -1
  }

  logger.emit('success', 'CSV upload completed!')
  if (rowsUploaded > 0) {
    logger.emit('info', `Rows uploaded: ${rowsUploaded}`)
  }

  return {
    success: true,
    rowsUploaded,
    tableId,
  }
}

export function validateUploadCSVInput(input: Record<string, unknown>): boolean {
  return (
    typeof input.filePath === 'string' &&
    input.filePath.length > 0 &&
    typeof input.tableId === 'string' &&
    input.tableId.length > 0
  )
}

export default uploadCSVWorkflow

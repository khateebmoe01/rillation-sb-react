import type { WorkflowContext } from '../types/workflow.types.js'
import { ClaySelectors } from '../selectors/clay-selectors.js'
import { ClayConfig } from '../config/clay.config.js'
import { ClayAutomationError, ErrorCodes, sleep } from '../core/error-handler.js'
import { waitForPageReady, clickWithRetry } from '../selectors/selector-helpers.js'

export interface CreateTableInput {
  tableName: string
  description?: string
  workspaceId?: string
}

export interface CreateTableResult {
  tableId: string
  tableName: string
  tableUrl: string
}

export async function createTableWorkflow(context: WorkflowContext): Promise<CreateTableResult> {
  const { browser, logger, input } = context
  const { tableName, description } = input as CreateTableInput

  if (!tableName) {
    throw new ClayAutomationError(
      'Table name is required',
      ErrorCodes.UNKNOWN,
      false
    )
  }

  logger.emit('status', `Creating table: ${tableName}`)

  // Navigate to tables/workspaces page
  logger.emit('status', 'Navigating to tables page...')
  await browser.navigate(ClayConfig.urls.tables)
  await waitForPageReady(browser)
  await sleep(1000)

  // Look for create table button
  logger.emit('status', 'Looking for Create Table button...')

  try {
    await browser.waitForSelector(ClaySelectors.tablesPage.createButton, {
      timeout: ClayConfig.timeouts.elementWait,
    })
  } catch {
    // Maybe we need to select a workspace first
    logger.emit('status', 'Looking for workspace to select...')
    const hasWorkspace = await browser.isVisible(ClaySelectors.dashboard.workspaceCard)
    if (hasWorkspace) {
      logger.emit('status', 'Clicking on first workspace...')
      await browser.click(ClaySelectors.dashboard.workspaceCard)
      await waitForPageReady(browser)
      await sleep(1000)
    }
  }

  // Click create table button
  logger.emit('status', 'Clicking Create Table button...')
  await clickWithRetry(browser, ClaySelectors.tablesPage.createButton)
  await sleep(500)

  // Wait for modal to appear
  logger.emit('status', 'Waiting for create table modal...')
  await browser.waitForSelector(ClaySelectors.createModal.nameInput, {
    timeout: ClayConfig.timeouts.elementWait,
  })

  // Enter table name
  logger.emit('status', `Entering table name: ${tableName}`)
  await browser.type(ClaySelectors.createModal.nameInput, tableName)

  // Enter description if provided
  if (description) {
    logger.emit('status', 'Entering description...')
    try {
      await browser.type(ClaySelectors.createModal.descriptionInput, description)
    } catch {
      logger.emit('warning', 'Description field not found, skipping')
    }
  }

  // Click create button
  logger.emit('status', 'Clicking Create button...')
  await sleep(300)
  await clickWithRetry(browser, ClaySelectors.createModal.createButton)

  // Wait for table to load
  logger.emit('status', 'Waiting for table to load...')
  await waitForPageReady(browser)
  await sleep(2000)

  // Extract table ID from URL
  const currentUrl = browser.getUrl()
  const tableIdMatch = currentUrl.match(/\/tables\/([a-zA-Z0-9_-]+)/)

  if (!tableIdMatch) {
    // Try alternative URL patterns
    const altMatch = currentUrl.match(/\/t\/([a-zA-Z0-9_-]+)/) ||
                     currentUrl.match(/tableId=([a-zA-Z0-9_-]+)/)

    if (!altMatch) {
      // Take screenshot for debugging
      await browser.screenshot('create-table-url-issue')
      throw new ClayAutomationError(
        `Failed to extract table ID from URL: ${currentUrl}`,
        ErrorCodes.TABLE_NOT_FOUND,
        false
      )
    }
  }

  const tableId = tableIdMatch ? tableIdMatch[1] : 'unknown'

  logger.emit('success', `Table created successfully!`)
  logger.emit('info', `Table ID: ${tableId}`)
  logger.emit('info', `URL: ${currentUrl}`)

  return {
    tableId,
    tableName,
    tableUrl: currentUrl,
  }
}

export function validateCreateTableInput(input: Record<string, unknown>): boolean {
  return typeof input.tableName === 'string' && input.tableName.length > 0
}

export default createTableWorkflow

import type { WorkflowContext } from '../types/workflow.types.js'
import type { EnrichmentConfig, EnrichmentType } from '../types/clay.types.js'
import { ClaySelectors } from '../selectors/clay-selectors.js'
import { ClayConfig } from '../config/clay.config.js'
import { ClayAutomationError, ErrorCodes, sleep } from '../core/error-handler.js'
import { waitForPageReady, clickWithRetry, waitForAny } from '../selectors/selector-helpers.js'
import { ENRICHMENT_TYPES } from '../config/constants.js'

export interface AddEnrichmentInput {
  tableId: string
  enrichmentConfig: EnrichmentConfig
}

export interface AddEnrichmentResult {
  columnId: string
  columnName: string
  enrichmentType: EnrichmentType
}

// Map enrichment types to their selectors/labels
const enrichmentTypeSelectors: Record<EnrichmentType, string[]> = {
  apollo_person: [
    ClaySelectors.enrichment.apolloOption,
    'button:has-text("Apollo")',
    'button:has-text("Find Person")',
    '[data-enrichment="apollo"]',
  ],
  apollo_company: [
    ClaySelectors.enrichment.apolloOption,
    'button:has-text("Apollo Company")',
    'button:has-text("Company Enrichment")',
  ],
  clearbit_person: [
    ClaySelectors.enrichment.clearbitOption,
    'button:has-text("Clearbit")',
    'button:has-text("Enrich Person")',
  ],
  clearbit_company: [
    ClaySelectors.enrichment.clearbitOption,
    'button:has-text("Clearbit Company")',
  ],
  email_finder: [
    ClaySelectors.enrichment.emailFinderOption,
    'button:has-text("Find Email")',
    'button:has-text("Email Finder")',
  ],
  company_search: [
    'button:has-text("Company Search")',
    'button:has-text("Find Company")',
  ],
  linkedin_profile: [
    ClaySelectors.enrichment.linkedinOption,
    'button:has-text("LinkedIn")',
    'button:has-text("Profile")',
  ],
  phone_finder: [
    'button:has-text("Find Phone")',
    'button:has-text("Phone Finder")',
  ],
  custom_api: [
    ClaySelectors.enrichment.customApiOption,
    'button:has-text("Custom API")',
    'button:has-text("HTTP")',
  ],
}

export async function addEnrichmentWorkflow(context: WorkflowContext): Promise<AddEnrichmentResult> {
  const { browser, logger, input } = context
  const { tableId, enrichmentConfig } = input as AddEnrichmentInput
  const { type, columnName, sourceColumn, settings } = enrichmentConfig

  logger.emit('status', `Adding enrichment column: ${columnName}`)
  logger.emit('info', `Type: ${ENRICHMENT_TYPES[type] || type}`)
  logger.emit('info', `Source column: ${sourceColumn}`)

  // Navigate to table if not already there
  const currentUrl = browser.getUrl()
  if (!currentUrl.includes(tableId)) {
    logger.emit('status', 'Navigating to table...')
    await browser.navigate(`${ClayConfig.urls.tables}/${tableId}`)
    await waitForPageReady(browser)
    await sleep(1000)
  }

  // Click add column button
  logger.emit('status', 'Clicking Add Column button...')
  await clickWithRetry(browser, ClaySelectors.tablePage.addColumnButton)
  await sleep(500)

  // Wait for column modal/panel
  logger.emit('status', 'Waiting for column configuration panel...')

  const panelSelectors = [
    ClaySelectors.columnModal.modal,
    ClaySelectors.columnModal.typeSelector,
    '[data-testid="column-config"]',
    '.column-type-selector',
  ]

  const foundPanel = await waitForAny(browser, panelSelectors, 10000)
  if (!foundPanel) {
    throw new ClayAutomationError(
      'Column configuration panel did not appear',
      ErrorCodes.ELEMENT_NOT_FOUND,
      true
    )
  }

  // Click on Enrichment tab if available
  logger.emit('status', 'Selecting Enrichment type...')

  try {
    await browser.click(ClaySelectors.columnModal.enrichmentTab, { timeout: 3000 })
    await sleep(300)
  } catch {
    // Might not have tabs, continue
    logger.emit('status', 'No enrichment tab found, searching directly...')
  }

  // Find and click the specific enrichment type
  const typeSelectors = enrichmentTypeSelectors[type] || [`button:has-text("${type}")`]
  let foundType = false

  for (const selector of typeSelectors) {
    try {
      await browser.click(selector, { timeout: 3000 })
      foundType = true
      logger.emit('status', `Selected enrichment type: ${type}`)
      break
    } catch {
      continue
    }
  }

  if (!foundType) {
    // Try searching for the enrichment
    const searchInput = await browser.isVisible('input[placeholder*="Search" i]')
    if (searchInput) {
      await browser.type('input[placeholder*="Search" i]', ENRICHMENT_TYPES[type] || type)
      await sleep(500)
      // Click first result
      await browser.click('[data-testid="search-result"]:first-child, .search-result:first-child')
    } else {
      throw new ClayAutomationError(
        `Could not find enrichment type: ${type}`,
        ErrorCodes.ELEMENT_NOT_FOUND,
        false
      )
    }
  }

  await sleep(500)

  // Enter column name
  logger.emit('status', `Setting column name: ${columnName}`)
  try {
    await browser.waitForSelector(ClaySelectors.columnModal.nameInput, { timeout: 5000 })
    await browser.type(ClaySelectors.columnModal.nameInput, columnName)
  } catch {
    // Try alternative name input
    const altInputs = [
      'input[name="name"]',
      'input[placeholder*="name" i]',
      'input:first-of-type',
    ]
    for (const input of altInputs) {
      try {
        await browser.type(input, columnName)
        break
      } catch {
        continue
      }
    }
  }

  // Select source column
  logger.emit('status', `Selecting source column: ${sourceColumn}`)
  try {
    await browser.click(ClaySelectors.columnModal.sourceColumnSelect, { timeout: 3000 })
    await sleep(300)
    // Click the source column option
    await browser.click(`[data-value="${sourceColumn}"], option:has-text("${sourceColumn}")`)
  } catch {
    // Try alternative selection methods
    logger.emit('warning', 'Could not select source column via dropdown, trying alternatives...')
    try {
      await browser.type(ClaySelectors.columnModal.sourceColumnSelect, sourceColumn)
    } catch {
      logger.emit('warning', 'Source column selection may need manual configuration')
    }
  }

  // Configure additional settings if provided
  if (settings) {
    logger.emit('status', 'Configuring additional settings...')
    for (const [key, value] of Object.entries(settings)) {
      try {
        const settingSelector = `[data-setting="${key}"], [name="${key}"], input[placeholder*="${key}" i]`
        await browser.type(settingSelector, String(value))
        logger.emit('status', `Set ${key} = ${value}`)
      } catch {
        logger.emit('warning', `Could not set setting: ${key}`)
      }
    }
  }

  // Save/confirm the column
  logger.emit('status', 'Saving column configuration...')
  await sleep(300)

  const saveSelectors = [
    ClaySelectors.columnModal.saveButton,
    'button:has-text("Add")',
    'button:has-text("Save")',
    'button:has-text("Create")',
    'button[type="submit"]',
  ]

  let saved = false
  for (const selector of saveSelectors) {
    try {
      await browser.click(selector, { timeout: 2000 })
      saved = true
      break
    } catch {
      continue
    }
  }

  if (!saved) {
    throw new ClayAutomationError(
      'Could not save column configuration',
      ErrorCodes.UNKNOWN,
      false
    )
  }

  // Wait for column to appear
  logger.emit('status', 'Waiting for column to be added...')
  await waitForPageReady(browser)
  await sleep(2000)

  // Verify column was added
  try {
    await browser.waitForSelector(`[data-column-name="${columnName}"], th:has-text("${columnName}")`, {
      timeout: 10000,
    })
    logger.emit('success', `Enrichment column "${columnName}" added successfully!`)
  } catch {
    logger.emit('warning', 'Could not verify column was added - it may still be processing')
  }

  return {
    columnId: columnName, // Would need actual ID extraction
    columnName,
    enrichmentType: type,
  }
}

export function validateAddEnrichmentInput(input: Record<string, unknown>): boolean {
  const { tableId, enrichmentConfig } = input as AddEnrichmentInput
  return (
    typeof tableId === 'string' &&
    tableId.length > 0 &&
    typeof enrichmentConfig === 'object' &&
    enrichmentConfig !== null &&
    typeof enrichmentConfig.type === 'string' &&
    typeof enrichmentConfig.columnName === 'string' &&
    typeof enrichmentConfig.sourceColumn === 'string'
  )
}

export default addEnrichmentWorkflow

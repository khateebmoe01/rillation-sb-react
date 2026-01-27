import type { WorkflowContext } from '../types/workflow.types.js'
import type { AIPromptConfig } from '../types/clay.types.js'
import { ClaySelectors } from '../selectors/clay-selectors.js'
import { ClayConfig } from '../config/clay.config.js'
import { ClayAutomationError, ErrorCodes, sleep } from '../core/error-handler.js'
import { waitForPageReady, clickWithRetry, waitForAny } from '../selectors/selector-helpers.js'

export interface WritePromptInput {
  tableId: string
  promptConfig: AIPromptConfig
}

export interface WritePromptResult {
  columnId: string
  columnName: string
  promptLength: number
}

export async function writePromptWorkflow(context: WorkflowContext): Promise<WritePromptResult> {
  const { browser, logger, input } = context
  const { tableId, promptConfig } = input as WritePromptInput
  const { columnName, prompt, sourceColumns, model, maxTokens } = promptConfig

  logger.emit('status', `Adding AI prompt column: ${columnName}`)
  logger.emit('info', `Prompt length: ${prompt.length} characters`)
  logger.emit('info', `Source columns: ${sourceColumns.join(', ')}`)

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

  // Wait for column configuration panel
  logger.emit('status', 'Waiting for column configuration...')
  const panelSelectors = [
    ClaySelectors.columnModal.modal,
    ClaySelectors.columnModal.typeSelector,
    '[data-testid="column-config"]',
  ]

  const foundPanel = await waitForAny(browser, panelSelectors, 10000)
  if (!foundPanel) {
    throw new ClayAutomationError(
      'Column configuration panel did not appear',
      ErrorCodes.ELEMENT_NOT_FOUND,
      true
    )
  }

  // Click on AI/GPT tab
  logger.emit('status', 'Selecting AI Prompt type...')

  const aiTabSelectors = [
    ClaySelectors.columnModal.aiPromptTab,
    'button:has-text("AI")',
    'button:has-text("GPT")',
    'button:has-text("Claude")',
    'button:has-text("Generate")',
    '[data-tab="ai"]',
    '[data-type="ai-prompt"]',
  ]

  let foundAI = false
  for (const selector of aiTabSelectors) {
    try {
      await browser.click(selector, { timeout: 3000 })
      foundAI = true
      break
    } catch {
      continue
    }
  }

  if (!foundAI) {
    // Try searching
    const searchInput = await browser.isVisible('input[placeholder*="Search" i]')
    if (searchInput) {
      await browser.type('input[placeholder*="Search" i]', 'AI')
      await sleep(500)
      await browser.click('[data-testid="search-result"]:first-child, .search-result:first-child')
    } else {
      throw new ClayAutomationError(
        'Could not find AI/GPT column type',
        ErrorCodes.ELEMENT_NOT_FOUND,
        false
      )
    }
  }

  await sleep(500)

  // Enter column name
  logger.emit('status', `Setting column name: ${columnName}`)
  try {
    await browser.type(ClaySelectors.columnModal.nameInput, columnName)
  } catch {
    const altInputs = ['input[name="name"]', 'input[placeholder*="name" i]']
    for (const input of altInputs) {
      try {
        await browser.type(input, columnName)
        break
      } catch {
        continue
      }
    }
  }

  // Select source columns
  logger.emit('status', 'Selecting source columns...')
  for (const sourceCol of sourceColumns) {
    try {
      await browser.click(ClaySelectors.aiPrompt.sourceColumnsSelect, { timeout: 2000 })
      await sleep(200)
      await browser.click(`[data-value="${sourceCol}"], option:has-text("${sourceCol}")`)
      logger.emit('status', `Added source column: ${sourceCol}`)
    } catch {
      logger.emit('warning', `Could not select source column: ${sourceCol}`)
    }
  }

  // Enter the prompt
  logger.emit('status', 'Writing AI prompt...')
  const promptTextareaSelectors = [
    ClaySelectors.aiPrompt.promptTextarea,
    'textarea[name="prompt"]',
    'textarea[placeholder*="prompt" i]',
    'textarea',
  ]

  let promptEntered = false
  for (const selector of promptTextareaSelectors) {
    try {
      await browser.waitForSelector(selector, { timeout: 3000 })
      await browser.type(selector, prompt)
      promptEntered = true
      break
    } catch {
      continue
    }
  }

  if (!promptEntered) {
    throw new ClayAutomationError(
      'Could not find prompt textarea',
      ErrorCodes.ELEMENT_NOT_FOUND,
      false
    )
  }

  // Select model if specified
  if (model) {
    logger.emit('status', `Selecting model: ${model}`)
    try {
      await browser.click(ClaySelectors.aiPrompt.modelSelector, { timeout: 2000 })
      await sleep(200)
      await browser.click(`[data-value="${model}"], option:has-text("${model}")`)
    } catch {
      logger.emit('warning', 'Could not select model, using default')
    }
  }

  // Set max tokens if specified
  if (maxTokens) {
    logger.emit('status', `Setting max tokens: ${maxTokens}`)
    try {
      await browser.type(ClaySelectors.aiPrompt.maxTokensInput, String(maxTokens))
    } catch {
      logger.emit('warning', 'Could not set max tokens')
    }
  }

  // Optionally test the prompt with preview
  const hasPreview = await browser.isVisible(ClaySelectors.aiPrompt.previewButton)
  if (hasPreview) {
    logger.emit('status', 'Testing prompt preview...')
    try {
      await browser.click(ClaySelectors.aiPrompt.previewButton)
      await sleep(3000) // Wait for preview to generate
      const previewVisible = await browser.isVisible(ClaySelectors.aiPrompt.previewOutput)
      if (previewVisible) {
        logger.emit('success', 'Prompt preview generated successfully')
      }
    } catch {
      logger.emit('warning', 'Could not generate preview')
    }
  }

  // Save the column
  logger.emit('status', 'Saving AI prompt column...')
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
      'Could not save AI prompt column',
      ErrorCodes.UNKNOWN,
      false
    )
  }

  // Wait for column to be added
  logger.emit('status', 'Waiting for column to be added...')
  await waitForPageReady(browser)
  await sleep(2000)

  logger.emit('success', `AI prompt column "${columnName}" added successfully!`)

  return {
    columnId: columnName,
    columnName,
    promptLength: prompt.length,
  }
}

export function validateWritePromptInput(input: Record<string, unknown>): boolean {
  const { tableId, promptConfig } = input as WritePromptInput
  return (
    typeof tableId === 'string' &&
    tableId.length > 0 &&
    typeof promptConfig === 'object' &&
    promptConfig !== null &&
    typeof promptConfig.columnName === 'string' &&
    typeof promptConfig.prompt === 'string' &&
    promptConfig.prompt.length > 0 &&
    Array.isArray(promptConfig.sourceColumns) &&
    promptConfig.sourceColumns.length > 0
  )
}

export default writePromptWorkflow

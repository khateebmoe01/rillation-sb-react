import type { Workflow, WorkflowContext, WorkflowResult, WorkflowState } from '../types/workflow.types.js'
import { BrowserManager } from '../core/browser-manager.js'
import { SessionManager } from '../core/session-manager.js'
import { Logger } from '../core/logger.js'

// Import workflows
import { loginWorkflow } from './login.workflow.js'
import { createTableWorkflow, validateCreateTableInput } from './create-table.workflow.js'
import { uploadCSVWorkflow, validateUploadCSVInput } from './upload-csv.workflow.js'
import { addEnrichmentWorkflow, validateAddEnrichmentInput } from './add-enrichment.workflow.js'
import { writePromptWorkflow, validateWritePromptInput } from './write-prompt.workflow.js'
import { runEnrichmentWorkflow, validateRunEnrichmentInput } from './run-enrichment.workflow.js'
import { exportResultsWorkflow, validateExportResultsInput } from './export-results.workflow.js'

// Workflow registry
export const WORKFLOWS: Record<string, Workflow> = {
  login: {
    name: 'login',
    description: 'Authenticate with Clay and save session',
    execute: loginWorkflow,
  },
  createTable: {
    name: 'createTable',
    description: 'Create a new Clay table',
    execute: createTableWorkflow,
    validate: validateCreateTableInput,
  },
  uploadCSV: {
    name: 'uploadCSV',
    description: 'Upload CSV data to a Clay table',
    execute: uploadCSVWorkflow,
    validate: validateUploadCSVInput,
  },
  addEnrichment: {
    name: 'addEnrichment',
    description: 'Add an enrichment column to a table',
    execute: addEnrichmentWorkflow,
    validate: validateAddEnrichmentInput,
  },
  writePrompt: {
    name: 'writePrompt',
    description: 'Add an AI prompt column to a table',
    execute: writePromptWorkflow,
    validate: validateWritePromptInput,
  },
  runEnrichment: {
    name: 'runEnrichment',
    description: 'Run enrichment on a table',
    execute: runEnrichmentWorkflow,
    validate: validateRunEnrichmentInput,
  },
  exportResults: {
    name: 'exportResults',
    description: 'Export table data to file',
    execute: exportResultsWorkflow,
    validate: validateExportResultsInput,
  },
}

// Workflow manager class
export class WorkflowManager {
  private browser: BrowserManager
  private session: SessionManager
  private logger: Logger
  private state: WorkflowState
  private isPaused: boolean = false
  private dryRun: boolean = false

  constructor(options: { dryRun?: boolean } = {}) {
    this.dryRun = options.dryRun || false
    this.browser = new BrowserManager({ dryRun: this.dryRun })
    this.session = new SessionManager()
    this.logger = new Logger()
    this.state = {
      currentWorkflow: null,
      status: 'idle',
      currentStep: '',
      progress: 0,
      startTime: null,
      logs: [],
    }
  }

  setMCPHandler(handler: (name: string, args: Record<string, unknown>) => Promise<unknown>): void {
    this.browser.setMCPHandler(handler)
  }

  getStatus(): WorkflowState {
    return { ...this.state }
  }

  getLogger(): Logger {
    return this.logger
  }

  async executeWorkflow(
    workflowName: string,
    input: Record<string, unknown>
  ): Promise<WorkflowResult> {
    const workflow = WORKFLOWS[workflowName]

    if (!workflow) {
      throw new Error(`Unknown workflow: ${workflowName}`)
    }

    // Validate input if validator exists
    if (workflow.validate && !workflow.validate(input)) {
      throw new Error(`Invalid input for workflow: ${workflowName}`)
    }

    // Update state
    this.state.currentWorkflow = workflowName
    this.state.status = 'running'
    this.state.startTime = new Date()
    this.state.progress = 0
    this.state.currentStep = 'Starting...'

    const startTime = Date.now()

    this.logger.emit('workflow-start', { workflow: workflowName, input })

    try {
      const context: WorkflowContext = {
        browser: this.browser,
        logger: this.logger,
        session: this.session,
        input,
        dryRun: this.dryRun,
      }

      const result = await workflow.execute(context)

      const duration = Date.now() - startTime

      this.state.status = 'completed'
      this.state.progress = 100
      this.state.currentStep = 'Complete'

      this.logger.emit('workflow-complete', { workflow: workflowName, result, duration })

      return {
        success: true,
        data: result,
        duration,
      }
    } catch (error) {
      const duration = Date.now() - startTime

      this.state.status = 'failed'
      this.state.error = (error as Error).message

      this.logger.emit('workflow-error', { workflow: workflowName, error: (error as Error).message })

      return {
        success: false,
        error: (error as Error).message,
        duration,
      }
    }
  }

  async runFullPipeline(config: {
    tableName: string
    csvPath: string
    enrichmentType: string
    outputPath?: string
  }): Promise<WorkflowResult[]> {
    const results: WorkflowResult[] = []

    // Step 1: Login
    this.logger.emit('status', 'Step 1/5: Login')
    const loginResult = await this.executeWorkflow('login', {})
    results.push(loginResult)
    if (!loginResult.success) return results

    // Step 2: Create table
    this.logger.emit('status', 'Step 2/5: Create Table')
    const tableResult = await this.executeWorkflow('createTable', {
      tableName: config.tableName,
    })
    results.push(tableResult)
    if (!tableResult.success) return results

    const tableId = (tableResult.data as { tableId: string }).tableId

    // Step 3: Upload CSV
    this.logger.emit('status', 'Step 3/5: Upload CSV')
    const uploadResult = await this.executeWorkflow('uploadCSV', {
      filePath: config.csvPath,
      tableId,
    })
    results.push(uploadResult)
    if (!uploadResult.success) return results

    // Step 4: Add enrichment
    this.logger.emit('status', 'Step 4/5: Add Enrichment')
    const enrichResult = await this.executeWorkflow('addEnrichment', {
      tableId,
      enrichmentConfig: {
        type: config.enrichmentType,
        columnName: `${config.enrichmentType}_result`,
        sourceColumn: 'email', // Assume email column exists
      },
    })
    results.push(enrichResult)
    if (!enrichResult.success) return results

    // Step 5: Run enrichment
    this.logger.emit('status', 'Step 5/5: Run Enrichment')
    const runResult = await this.executeWorkflow('runEnrichment', {
      tableId,
      waitForCompletion: true,
    })
    results.push(runResult)

    // Optional: Export
    if (config.outputPath) {
      this.logger.emit('status', 'Bonus: Export Results')
      const exportResult = await this.executeWorkflow('exportResults', {
        tableId,
        outputPath: config.outputPath,
        format: 'csv',
      })
      results.push(exportResult)
    }

    return results
  }

  pause(): void {
    this.isPaused = true
    this.state.status = 'paused'
    this.logger.emit('status', 'Workflow paused')
  }

  resume(): void {
    this.isPaused = false
    this.state.status = 'running'
    this.logger.emit('status', 'Workflow resumed')
  }

  async close(): Promise<void> {
    await this.browser.close()
  }
}

// Helper function for direct workflow execution
export async function executeWorkflow(
  workflowName: string,
  input: Record<string, unknown>,
  mcpHandler?: (name: string, args: Record<string, unknown>) => Promise<unknown>
): Promise<WorkflowResult> {
  const manager = new WorkflowManager()

  if (mcpHandler) {
    manager.setMCPHandler(mcpHandler)
  }

  try {
    return await manager.executeWorkflow(workflowName, input)
  } finally {
    await manager.close()
  }
}

export { loginWorkflow } from './login.workflow.js'
export { createTableWorkflow } from './create-table.workflow.js'
export { uploadCSVWorkflow } from './upload-csv.workflow.js'
export { addEnrichmentWorkflow } from './add-enrichment.workflow.js'
export { writePromptWorkflow } from './write-prompt.workflow.js'
export { runEnrichmentWorkflow } from './run-enrichment.workflow.js'
export { exportResultsWorkflow } from './export-results.workflow.js'

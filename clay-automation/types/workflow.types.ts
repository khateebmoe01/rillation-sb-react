import type { BrowserManager } from '../core/browser-manager.js'
import type { Logger } from '../core/logger.js'
import type { SessionManager } from '../core/session-manager.js'

export type WorkflowStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'

export interface WorkflowContext {
  browser: BrowserManager
  logger: Logger
  session: SessionManager
  input: Record<string, unknown>
  dryRun: boolean
}

export interface Workflow {
  name: string
  description: string
  execute: (context: WorkflowContext) => Promise<unknown>
  validate?: (input: Record<string, unknown>) => boolean
}

export interface WorkflowResult {
  success: boolean
  data?: unknown
  error?: string
  duration: number
  screenshots?: string[]
}

export interface WorkflowState {
  currentWorkflow: string | null
  status: WorkflowStatus
  currentStep: string
  progress: number
  startTime: Date | null
  logs: LogEntry[]
  error?: string
}

export interface LogEntry {
  timestamp: Date
  level: 'info' | 'status' | 'success' | 'warning' | 'error'
  message: string
  data?: unknown
}

export interface WorkflowEvent {
  type: 'init' | 'status' | 'progress' | 'success' | 'error' | 'workflow-start' | 'workflow-complete' | 'log'
  data: unknown
  timestamp: Date
}

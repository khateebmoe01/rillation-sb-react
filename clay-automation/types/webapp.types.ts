export interface WSMessage {
  type: 'ping' | 'pong' | 'subscribe' | 'command'
  payload?: unknown
}

export interface WSBroadcast {
  type: 'init' | 'status' | 'progress' | 'success' | 'error' | 'workflow-start' | 'workflow-complete' | 'log'
  data: unknown
  timestamp: string
}

export interface APIStartRequest {
  workflow: string
  input: Record<string, unknown>
}

export interface APIStatusResponse {
  status: string
  currentWorkflow: string | null
  currentStep: string
  progress: number
  startTime: string | null
  logsCount: number
}

export interface APIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

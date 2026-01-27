import type { LogEntry, WorkflowEvent } from '../types/workflow.types.js'

type LogLevel = 'info' | 'status' | 'success' | 'warning' | 'error'
type EventCallback = (event: WorkflowEvent) => void

export class Logger {
  private logs: LogEntry[] = []
  private startTime: Date
  private eventListeners: EventCallback[] = []

  constructor() {
    this.startTime = new Date()
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  private getElapsed(): string {
    const elapsed = Date.now() - this.startTime.getTime()
    return this.formatDuration(elapsed)
  }

  private getLevelEmoji(level: LogLevel): string {
    const emojis: Record<LogLevel, string> = {
      info: 'i',
      status: '>',
      success: '+',
      warning: '!',
      error: 'X',
    }
    return emojis[level]
  }

  private formatMessage(level: LogLevel, message: string): string {
    const elapsed = this.getElapsed()
    const emoji = this.getLevelEmoji(level)
    return `[${elapsed}] [${emoji}] ${message}`
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
    }
    this.logs.push(entry)

    // Console output
    const formatted = this.formatMessage(level, message)
    switch (level) {
      case 'error':
        console.error(formatted)
        break
      case 'warning':
        console.warn(formatted)
        break
      default:
        console.log(formatted)
    }

    // Emit to listeners
    this.emitEvent('log', entry)
  }

  emit(eventType: string, data: unknown): void {
    if (eventType === 'status' || eventType === 'info') {
      this.log('status', String(data))
    } else if (eventType === 'success') {
      this.log('success', String(data))
    } else if (eventType === 'error') {
      this.log('error', String(data))
    } else if (eventType === 'warning') {
      this.log('warning', String(data))
    } else {
      // For workflow events, just emit to listeners
      this.emitEvent(eventType as WorkflowEvent['type'], data)
    }
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data)
  }

  status(message: string, data?: unknown): void {
    this.log('status', message, data)
  }

  success(message: string, data?: unknown): void {
    this.log('success', message, data)
  }

  warning(message: string, data?: unknown): void {
    this.log('warning', message, data)
  }

  error(message: string, data?: unknown): void {
    this.log('error', message, data)
  }

  progress(percent: number, message?: string): void {
    const bar = this.createProgressBar(percent)
    const text = message ? `${bar} ${percent}% - ${message}` : `${bar} ${percent}%`
    this.log('status', text)
    this.emitEvent('progress', { percent, message })
  }

  private createProgressBar(percent: number): string {
    const width = 20
    const filled = Math.round((percent / 100) * width)
    const empty = width - filled
    return `[${'='.repeat(filled)}${' '.repeat(empty)}]`
  }

  addEventListener(callback: EventCallback): () => void {
    this.eventListeners.push(callback)
    return () => {
      const index = this.eventListeners.indexOf(callback)
      if (index > -1) {
        this.eventListeners.splice(index, 1)
      }
    }
  }

  private emitEvent(type: WorkflowEvent['type'], data: unknown): void {
    const event: WorkflowEvent = {
      type,
      data,
      timestamp: new Date(),
    }
    for (const listener of this.eventListeners) {
      try {
        listener(event)
      } catch (err) {
        console.error('Error in event listener:', err)
      }
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count)
  }

  clear(): void {
    this.logs = []
    this.startTime = new Date()
  }

  printSummary(stats: Record<string, number>): void {
    console.log('\n' + '='.repeat(60))
    console.log('SUMMARY')
    console.log('='.repeat(60))
    console.log(`Duration: ${this.getElapsed()}`)
    for (const [key, value] of Object.entries(stats)) {
      console.log(`${key}: ${value}`)
    }
    console.log('='.repeat(60) + '\n')
  }
}

// Singleton logger instance
export const logger = new Logger()

export default Logger

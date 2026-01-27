import * as fs from 'fs'
import * as path from 'path'
import { SCREENSHOT_DIR } from '../config/constants.js'

export class ClayAutomationError extends Error {
  public readonly code: string
  public readonly retryable: boolean
  public readonly screenshotPath?: string
  public readonly selector?: string

  constructor(
    message: string,
    code: string,
    retryable: boolean = false,
    screenshotPath?: string,
    selector?: string
  ) {
    super(message)
    this.name = 'ClayAutomationError'
    this.code = code
    this.retryable = retryable
    this.screenshotPath = screenshotPath
    this.selector = selector
  }
}

export const ErrorCodes = {
  AUTH_FAILED: 'AUTH_FAILED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  ELEMENT_NOT_FOUND: 'ELEMENT_NOT_FOUND',
  ELEMENT_NOT_CLICKABLE: 'ELEMENT_NOT_CLICKABLE',
  TIMEOUT: 'TIMEOUT',
  NAVIGATION_FAILED: 'NAVIGATION_FAILED',
  TABLE_NOT_FOUND: 'TABLE_NOT_FOUND',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  ENRICHMENT_FAILED: 'ENRICHMENT_FAILED',
  EXPORT_FAILED: 'EXPORT_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN: 'UNKNOWN',
} as const

interface RetryOptions {
  maxRetries: number
  backoff: 'exponential' | 'linear'
  timeout: number
  onRetry?: (attempt: number, error: Error) => void
  shouldRetry?: (error: Error) => boolean
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error = new Error('Unknown error')

  for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
    try {
      // Wrap with timeout
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new ClayAutomationError('Operation timed out', ErrorCodes.TIMEOUT, true)),
            options.timeout
          )
        ),
      ])
      return result
    } catch (error) {
      lastError = error as Error

      // Check if we should retry
      if (options.shouldRetry && !options.shouldRetry(error as Error)) {
        throw error
      }

      // Check if error is retryable
      if (error instanceof ClayAutomationError && !error.retryable) {
        throw error
      }

      // Notify about retry
      if (options.onRetry) {
        options.onRetry(attempt, error as Error)
      }

      // Calculate delay
      if (attempt < options.maxRetries) {
        const delay =
          options.backoff === 'exponential'
            ? Math.pow(2, attempt) * 1000
            : attempt * 1000
        console.log(`Retry ${attempt}/${options.maxRetries} in ${delay}ms...`)
        await sleep(delay)
      }
    }
  }

  throw lastError
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function captureErrorScreenshot(
  page: { screenshot: (opts: { path: string; fullPage: boolean }) => Promise<void> },
  errorCode: string
): Promise<string | undefined> {
  try {
    // Ensure screenshot directory exists
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `error-${errorCode}-${timestamp}.png`
    const filepath = path.join(SCREENSHOT_DIR, filename)

    await page.screenshot({ path: filepath, fullPage: true })
    console.log(`Error screenshot saved: ${filepath}`)

    return filepath
  } catch (err) {
    console.error('Failed to capture error screenshot:', err)
    return undefined
  }
}

export function isRetryableError(error: Error): boolean {
  if (error instanceof ClayAutomationError) {
    return error.retryable
  }

  // Common retryable error patterns
  const retryablePatterns = [
    'timeout',
    'net::',
    'network',
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'detached',
    'navigation',
  ]

  const message = error.message.toLowerCase()
  return retryablePatterns.some((pattern) => message.includes(pattern.toLowerCase()))
}

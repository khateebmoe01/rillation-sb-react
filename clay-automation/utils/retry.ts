import { sleep } from '../core/error-handler.js'

export interface RetryOptions {
  maxRetries: number
  initialDelay: number
  maxDelay: number
  backoffFactor: number
  retryIf?: (error: Error) => boolean
  onRetry?: (attempt: number, error: Error, delay: number) => void
}

const defaultOptions: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options }
  let lastError: Error = new Error('Unknown error')
  let delay = opts.initialDelay

  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      // Check if we should retry
      if (opts.retryIf && !opts.retryIf(lastError)) {
        throw lastError
      }

      // Last attempt, don't retry
      if (attempt === opts.maxRetries) {
        throw lastError
      }

      // Calculate delay
      delay = Math.min(delay * opts.backoffFactor, opts.maxDelay)

      // Notify
      if (opts.onRetry) {
        opts.onRetry(attempt, lastError, delay)
      }

      // Wait before retry
      await sleep(delay)
    }
  }

  throw lastError
}

export function exponentialBackoff(attempt: number, baseDelay: number = 1000): number {
  return Math.pow(2, attempt - 1) * baseDelay
}

export function linearBackoff(attempt: number, baseDelay: number = 1000): number {
  return attempt * baseDelay
}

export function jitteredBackoff(attempt: number, baseDelay: number = 1000): number {
  const base = Math.pow(2, attempt - 1) * baseDelay
  const jitter = Math.random() * base * 0.5
  return base + jitter
}

export default retry

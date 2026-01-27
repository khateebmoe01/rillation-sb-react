// Wait utilities for browser automation

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function waitUntil(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number; message?: string } = {}
): Promise<void> {
  const { timeout = 30000, interval = 500, message = 'Condition not met' } = options
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const result = await condition()
    if (result) {
      return
    }
    await sleep(interval)
  }

  throw new Error(`Timeout: ${message}`)
}

export async function waitForValue<T>(
  getValue: () => T | Promise<T>,
  predicate: (value: T) => boolean,
  options: { timeout?: number; interval?: number; message?: string } = {}
): Promise<T> {
  const { timeout = 30000, interval = 500, message = 'Value condition not met' } = options
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const value = await getValue()
    if (predicate(value)) {
      return value
    }
    await sleep(interval)
  }

  throw new Error(`Timeout: ${message}`)
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastRun = 0

  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastRun >= limit) {
      lastRun = now
      fn(...args)
    }
  }
}

export default { sleep, waitUntil, waitForValue, debounce, throttle }

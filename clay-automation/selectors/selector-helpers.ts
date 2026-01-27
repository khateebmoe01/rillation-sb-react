import type { BrowserManager } from '../core/browser-manager.js'
import { ClayConfig } from '../config/clay.config.js'
import { sleep } from '../core/error-handler.js'

// Wait for element to be stable (not moving)
export async function waitForStableElement(
  browser: BrowserManager,
  selector: string,
  timeout: number = ClayConfig.timeouts.elementWait
): Promise<void> {
  const startTime = Date.now()
  let attempts = 0
  const maxAttempts = 10

  while (Date.now() - startTime < timeout && attempts < maxAttempts) {
    try {
      await browser.waitForSelector(selector, { timeout: 2000 })
      // If we get here, element exists - assume it's stable for now
      // In a real implementation with direct Playwright access, we'd check bounding box
      return
    } catch {
      attempts++
      await sleep(500)
    }
  }

  throw new Error(`Element ${selector} did not stabilize within ${timeout}ms`)
}

// Try multiple selectors until one works
export async function trySelectors(
  browser: BrowserManager,
  selectors: string[],
  action: 'click' | 'wait' | 'type',
  text?: string
): Promise<boolean> {
  for (const selector of selectors) {
    try {
      if (action === 'click') {
        await browser.click(selector, { timeout: 3000 })
        return true
      } else if (action === 'wait') {
        await browser.waitForSelector(selector, { timeout: 3000 })
        return true
      } else if (action === 'type' && text) {
        await browser.type(selector, text)
        return true
      }
    } catch {
      // Try next selector
      continue
    }
  }
  return false
}

// Wait for any of multiple selectors
export async function waitForAny(
  browser: BrowserManager,
  selectors: string[],
  timeout: number = ClayConfig.timeouts.elementWait
): Promise<string | null> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    for (const selector of selectors) {
      const visible = await browser.isVisible(selector)
      if (visible) {
        return selector
      }
    }
    await sleep(500)
  }

  return null
}

// Wait for page to be ready (no loading spinners)
export async function waitForPageReady(
  browser: BrowserManager,
  timeout: number = ClayConfig.timeouts.navigation
): Promise<void> {
  const loadingSelectors = [
    '[data-testid="loading"]',
    '.loading',
    '.spinner',
    '[class*="loading"]',
    '[class*="spinner"]',
  ]

  const startTime = Date.now()

  // First wait for any loading indicator to appear (briefly)
  await sleep(500)

  // Then wait for all loading indicators to disappear
  while (Date.now() - startTime < timeout) {
    let anyLoading = false

    for (const selector of loadingSelectors) {
      const visible = await browser.isVisible(selector)
      if (visible) {
        anyLoading = true
        break
      }
    }

    if (!anyLoading) {
      return
    }

    await sleep(500)
  }

  console.log('Warning: Page may still be loading after timeout')
}

// Click with retry and scrolling
export async function clickWithRetry(
  browser: BrowserManager,
  selector: string,
  maxRetries: number = 3
): Promise<void> {
  let lastError: Error | null = null

  for (let i = 0; i < maxRetries; i++) {
    try {
      // First try to scroll element into view
      try {
        await browser.scrollIntoView(selector)
      } catch {
        // Ignore scroll errors
      }

      await sleep(300)
      await browser.click(selector)
      return
    } catch (error) {
      lastError = error as Error
      await sleep(1000)
    }
  }

  throw lastError || new Error(`Failed to click ${selector}`)
}

// Type with clearing field first
export async function typeWithClear(
  browser: BrowserManager,
  selector: string,
  text: string
): Promise<void> {
  // Triple-click to select all, then type to replace
  await browser.click(selector)
  await browser.pressKey('Meta+a') // Select all (Mac)
  await sleep(100)
  await browser.type(selector, text)
}

import { ClayConfig } from '../config/clay.config.js'
import { EnvConfig } from '../config/env.config.js'
import {
  ClayAutomationError,
  ErrorCodes,
  sleep,
  captureErrorScreenshot,
} from './error-handler.js'

// MCP tool call interface - this will be injected by the CLI
interface MCPToolCall {
  (toolName: string, args: Record<string, unknown>): Promise<unknown>
}

export class BrowserManager {
  private mcpCall: MCPToolCall | null = null
  private connected: boolean = false
  private currentUrl: string = ''
  private dryRun: boolean = false

  constructor(options: { dryRun?: boolean } = {}) {
    this.dryRun = options.dryRun || false
  }

  setMCPHandler(handler: MCPToolCall): void {
    this.mcpCall = handler
    this.connected = true
  }

  isConnected(): boolean {
    return this.connected
  }

  private async callMCP(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    if (this.dryRun) {
      console.log(`[DRY RUN] MCP call: ${toolName}`, args)
      await sleep(300) // Simulate delay
      return { success: true, dryRun: true }
    }

    if (!this.mcpCall) {
      throw new ClayAutomationError(
        'MCP handler not set. Call setMCPHandler first.',
        ErrorCodes.NETWORK_ERROR,
        false
      )
    }

    return this.mcpCall(toolName, args)
  }

  async navigate(url: string): Promise<void> {
    console.log(`Navigating to: ${url}`)

    await this.callMCP('playwright_navigate', {
      url,
      waitUntil: 'networkidle'
    })

    this.currentUrl = url
    await sleep(ClayConfig.delays.betweenActions)
  }

  async click(selector: string, options: { timeout?: number } = {}): Promise<void> {
    const timeout = options.timeout || ClayConfig.timeouts.elementWait
    console.log(`Clicking: ${selector}`)

    try {
      await this.callMCP('playwright_click', {
        selector,
        timeout
      })
      await sleep(ClayConfig.delays.afterClick)
    } catch (error) {
      throw new ClayAutomationError(
        `Failed to click element: ${selector}`,
        ErrorCodes.ELEMENT_NOT_CLICKABLE,
        true,
        undefined,
        selector
      )
    }
  }

  async type(selector: string, text: string): Promise<void> {
    console.log(`Typing into: ${selector}`)

    try {
      // First clear the field, then type
      await this.callMCP('playwright_fill', {
        selector,
        value: text
      })
      await sleep(ClayConfig.delays.afterType)
    } catch (error) {
      throw new ClayAutomationError(
        `Failed to type into element: ${selector}`,
        ErrorCodes.ELEMENT_NOT_FOUND,
        true,
        undefined,
        selector
      )
    }
  }

  async waitForSelector(
    selector: string,
    options: { timeout?: number; state?: 'visible' | 'attached' | 'hidden' } = {}
  ): Promise<void> {
    const timeout = options.timeout || ClayConfig.timeouts.elementWait
    console.log(`Waiting for: ${selector}`)

    try {
      await this.callMCP('playwright_wait_for_selector', {
        selector,
        timeout,
        state: options.state || 'visible'
      })
    } catch (error) {
      throw new ClayAutomationError(
        `Element not found: ${selector}`,
        ErrorCodes.ELEMENT_NOT_FOUND,
        false,
        undefined,
        selector
      )
    }
  }

  async screenshot(name: string): Promise<string> {
    if (!EnvConfig.options.enableScreenshots) {
      console.log(`[Screenshot disabled] ${name}`)
      return ''
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${name}-${timestamp}.png`
    console.log(`Taking screenshot: ${filename}`)

    await this.callMCP('playwright_screenshot', {
      name: filename,
      fullPage: true
    })

    return `/tmp/clay-screenshots/${filename}`
  }

  async getText(selector: string): Promise<string> {
    console.log(`Getting text from: ${selector}`)

    const result = await this.callMCP('playwright_get_text', {
      selector
    }) as { text?: string }

    return result?.text || ''
  }

  async getAttribute(selector: string, attribute: string): Promise<string> {
    console.log(`Getting attribute ${attribute} from: ${selector}`)

    const result = await this.callMCP('playwright_get_attribute', {
      selector,
      attribute
    }) as { value?: string }

    return result?.value || ''
  }

  async isVisible(selector: string): Promise<boolean> {
    try {
      const result = await this.callMCP('playwright_is_visible', {
        selector
      }) as { visible?: boolean }
      return result?.visible || false
    } catch {
      return false
    }
  }

  async selectOption(selector: string, value: string): Promise<void> {
    console.log(`Selecting option ${value} in: ${selector}`)

    await this.callMCP('playwright_select_option', {
      selector,
      value
    })
    await sleep(ClayConfig.delays.afterClick)
  }

  async uploadFile(selector: string, filePath: string): Promise<void> {
    console.log(`Uploading file to: ${selector}`)

    await this.callMCP('playwright_upload_file', {
      selector,
      path: filePath
    })
    await sleep(ClayConfig.delays.betweenActions)
  }

  async pressKey(key: string): Promise<void> {
    console.log(`Pressing key: ${key}`)

    await this.callMCP('playwright_press', {
      key
    })
    await sleep(ClayConfig.delays.afterClick)
  }

  async scrollIntoView(selector: string): Promise<void> {
    console.log(`Scrolling to: ${selector}`)

    await this.callMCP('playwright_scroll_into_view', {
      selector
    })
    await sleep(ClayConfig.delays.afterClick)
  }

  getUrl(): string {
    return this.currentUrl
  }

  async waitForNavigation(timeout?: number): Promise<void> {
    await this.callMCP('playwright_wait_for_navigation', {
      timeout: timeout || ClayConfig.timeouts.navigation
    })
  }

  async close(): Promise<void> {
    if (this.connected) {
      try {
        await this.callMCP('playwright_close', {})
      } catch (err) {
        console.error('Error closing browser:', err)
      }
      this.connected = false
    }
  }
}

export const browserManager = new BrowserManager()

export default BrowserManager

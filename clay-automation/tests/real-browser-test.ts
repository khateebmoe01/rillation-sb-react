// Real browser test using Playwright directly
// This tests the actual browser automation without MCP

import { chromium, Browser, Page } from 'playwright'
import { SessionManager } from '../core/session-manager.js'
import { ClayConfig } from '../config/clay.config.js'

async function runRealBrowserTest(): Promise<void> {
  console.log('Real Browser Test - Clay Automation')
  console.log('='.repeat(60))
  console.log('')

  const session = new SessionManager()
  let browser: Browser | null = null
  let page: Page | null = null

  try {
    // Launch browser with persistent context
    console.log('Launching browser...')
    const profilePath = session.getProfilePath()
    console.log(`Using profile: ${profilePath}`)

    const context = await chromium.launchPersistentContext(profilePath, {
      headless: false,
      viewport: { width: 1280, height: 800 },
      args: ['--disable-blink-features=AutomationControlled'],
    })

    page = context.pages()[0] || await context.newPage()

    // Navigate to Clay
    console.log('\nNavigating to Clay.com...')
    await page.goto('https://app.clay.com', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Check current URL
    const url = page.url()
    console.log(`Current URL: ${url}`)

    // Take screenshot
    const screenshotPath = '/tmp/clay-test-screenshot.png'
    await page.screenshot({ path: screenshotPath, fullPage: true })
    console.log(`Screenshot saved: ${screenshotPath}`)

    // Check if logged in
    const isLoginPage = url.includes('/login') || url.includes('/sign')

    if (isLoginPage) {
      console.log('\n[!] Not logged in - login page detected')
      console.log('Please log in manually in the browser window...')
      console.log('Press Ctrl+C when done, or wait 60 seconds.')

      // Wait for user to log in (or timeout)
      let attempts = 0
      while (attempts < 60) {
        await page.waitForTimeout(1000)
        const currentUrl = page.url()
        if (!currentUrl.includes('/login') && !currentUrl.includes('/sign')) {
          console.log('\nLogin detected! Saving session...')
          break
        }
        attempts++
        if (attempts % 10 === 0) {
          console.log(`Waiting for login... (${60 - attempts}s remaining)`)
        }
      }
    } else {
      console.log('\n[+] Already logged in!')
    }

    // Final URL check
    const finalUrl = page.url()
    console.log(`\nFinal URL: ${finalUrl}`)

    // Try to find key elements
    console.log('\nChecking for Clay UI elements...')

    const elements = [
      { name: 'Create Table button', selector: 'button:has-text("Create"), button:has-text("New")' },
      { name: 'Workspace/Table list', selector: '[class*="workspace"], [class*="table"]' },
      { name: 'Navigation', selector: 'nav, [role="navigation"]' },
    ]

    for (const el of elements) {
      try {
        const found = await page.locator(el.selector).first().isVisible({ timeout: 2000 })
        console.log(`  ${found ? '[+]' : '[-]'} ${el.name}`)
      } catch {
        console.log(`  [-] ${el.name}`)
      }
    }

    // Take final screenshot
    const finalScreenshot = '/tmp/clay-test-final.png'
    await page.screenshot({ path: finalScreenshot, fullPage: true })
    console.log(`\nFinal screenshot: ${finalScreenshot}`)

    console.log('\n' + '='.repeat(60))
    console.log('TEST COMPLETE')
    console.log('='.repeat(60))
    console.log('\nBrowser will stay open for inspection.')
    console.log('Press Ctrl+C to close.')

    // Keep browser open for inspection
    await new Promise(() => {}) // Wait forever until Ctrl+C

  } catch (error) {
    console.error('\nTest failed:', (error as Error).message)
  } finally {
    // Don't close - let user inspect
    // if (browser) await browser.close()
  }
}

// Install playwright if needed and run
console.log('Checking Playwright installation...')
import('playwright').then(() => {
  runRealBrowserTest().catch(console.error)
}).catch(() => {
  console.log('Installing Playwright...')
  import('child_process').then(({ execSync }) => {
    execSync('npm install playwright', { stdio: 'inherit', cwd: process.cwd() })
    execSync('npx playwright install chromium', { stdio: 'inherit' })
    console.log('Playwright installed. Run the test again.')
  })
})

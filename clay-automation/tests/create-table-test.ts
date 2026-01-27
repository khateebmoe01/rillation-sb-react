// Test creating a table in Clay
import { chromium } from 'playwright'
import { SessionManager } from '../core/session-manager.js'

async function createTableTest(): Promise<void> {
  console.log('Create Table Test')
  console.log('='.repeat(60))

  const session = new SessionManager()
  const profilePath = session.getProfilePath()

  console.log(`Using profile: ${profilePath}`)
  console.log('')

  // Launch with existing profile
  const context = await chromium.launchPersistentContext(profilePath, {
    headless: false,
    viewport: { width: 1280, height: 800 },
  })

  const page = context.pages()[0] || await context.newPage()

  try {
    // Navigate to Clay home
    console.log('1. Navigating to Clay...')
    await page.goto('https://app.clay.com/workspaces/161745/home', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Take screenshot
    await page.screenshot({ path: '/tmp/clay-step1.png' })
    console.log('   Screenshot: /tmp/clay-step1.png')

    // Click the "+ New" button
    console.log('2. Looking for New button...')
    const newButton = page.locator('button:has-text("New"), [class*="new"], button:has-text("+ New")')

    if (await newButton.first().isVisible({ timeout: 5000 })) {
      console.log('   Found New button, clicking...')
      await newButton.first().click()
      await page.waitForTimeout(1000)
      await page.screenshot({ path: '/tmp/clay-step2.png' })
      console.log('   Screenshot: /tmp/clay-step2.png')
    } else {
      console.log('   New button not found, trying alternative...')
      // Try clicking on workspace first
      await page.click('text=Rillation Revenue')
      await page.waitForTimeout(2000)
    }

    // Look for table creation option
    console.log('3. Looking for table creation option...')
    await page.waitForTimeout(1000)

    // Check what options are available
    const createOptions = await page.locator('button, [role="menuitem"], [class*="option"]').allTextContents()
    console.log('   Available options:', createOptions.slice(0, 10).join(', '))

    // Try to find and click "Create table" or similar
    const tableOption = page.locator('text=/table/i, text=/blank/i, text=/empty/i, text=/start/i').first()
    if (await tableOption.isVisible({ timeout: 3000 })) {
      console.log('   Found table option, clicking...')
      await tableOption.click()
      await page.waitForTimeout(1000)
    }

    await page.screenshot({ path: '/tmp/clay-step3.png' })
    console.log('   Screenshot: /tmp/clay-step3.png')

    // Check if we need to enter a table name
    const nameInput = page.locator('input[placeholder*="name" i], input[type="text"]').first()
    if (await nameInput.isVisible({ timeout: 3000 })) {
      console.log('4. Entering table name...')
      const tableName = `Test Table ${new Date().toISOString().slice(0, 16)}`
      await nameInput.fill(tableName)
      console.log(`   Table name: ${tableName}`)
      await page.screenshot({ path: '/tmp/clay-step4.png' })
    }

    // Look for create/confirm button
    const createBtn = page.locator('button:has-text("Create"), button:has-text("Save"), button[type="submit"]').first()
    if (await createBtn.isVisible({ timeout: 3000 })) {
      console.log('5. Clicking Create button...')
      await createBtn.click()
      await page.waitForTimeout(3000)
    }

    // Final screenshot
    await page.screenshot({ path: '/tmp/clay-final.png' })
    console.log('   Final screenshot: /tmp/clay-final.png')

    // Get final URL
    const finalUrl = page.url()
    console.log(`\nFinal URL: ${finalUrl}`)

    console.log('\n' + '='.repeat(60))
    console.log('TEST COMPLETE - Check screenshots in /tmp/')
    console.log('='.repeat(60))

    // Keep browser open
    console.log('\nBrowser staying open for inspection. Press Ctrl+C to close.')
    await new Promise(() => {})

  } catch (error) {
    console.error('\nError:', (error as Error).message)
    await page.screenshot({ path: '/tmp/clay-error.png' })
    console.log('Error screenshot: /tmp/clay-error.png')
  }
}

createTableTest().catch(console.error)

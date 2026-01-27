// Test creating a Workbook (table) in Clay
import { chromium } from 'playwright'
import { SessionManager } from '../core/session-manager.js'

async function createWorkbookTest(): Promise<void> {
  console.log('Create Workbook Test')
  console.log('='.repeat(60))

  const session = new SessionManager()
  const profilePath = session.getProfilePath()
  const tableName = `Test Table ${new Date().toLocaleTimeString()}`

  console.log(`Using profile: ${profilePath}`)
  console.log(`Table name: ${tableName}`)
  console.log('')

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
    console.log('   Done')

    // Click the "+ New" button
    console.log('2. Clicking + New button...')
    await page.click('button:has-text("New")')
    await page.waitForTimeout(500)
    console.log('   Done')

    // Click "Workbook" option
    console.log('3. Clicking Workbook option...')
    await page.click('text=Workbook')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/clay-workbook-created.png' })
    console.log('   Done - Screenshot: /tmp/clay-workbook-created.png')

    // Check current URL - should be in a new workbook
    const url = page.url()
    console.log(`\n4. Current URL: ${url}`)

    // Check if we're in a workbook editor
    if (url.includes('/workbook/') || url.includes('/table/')) {
      console.log('   SUCCESS! Workbook created!')

      // Try to rename it
      console.log('\n5. Looking for title to rename...')

      // Look for editable title or input
      const titleElement = page.locator('input[placeholder*="Untitled"], [contenteditable="true"], h1, .title').first()
      if (await titleElement.isVisible({ timeout: 3000 })) {
        console.log('   Found title element, clicking...')
        await titleElement.click()
        await page.waitForTimeout(500)

        // Try to type the name
        await page.keyboard.selectAll()
        await page.keyboard.type(tableName)
        await page.keyboard.press('Enter')
        console.log(`   Renamed to: ${tableName}`)
      }
    }

    // Final screenshot
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/clay-final-workbook.png' })
    console.log('\n6. Final screenshot: /tmp/clay-final-workbook.png')

    console.log('\n' + '='.repeat(60))
    console.log('TEST COMPLETE!')
    console.log('='.repeat(60))
    console.log(`\nWorkbook URL: ${page.url()}`)

    // Keep browser open briefly then close
    console.log('\nClosing in 5 seconds...')
    await page.waitForTimeout(5000)
    await context.close()

  } catch (error) {
    console.error('\nError:', (error as Error).message)
    await page.screenshot({ path: '/tmp/clay-error.png' })
    console.log('Error screenshot: /tmp/clay-error.png')
    await context.close()
  }
}

createWorkbookTest().catch(console.error)

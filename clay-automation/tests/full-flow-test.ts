// Full flow test: Create table, import CSV, add enrichment
import { chromium } from 'playwright'
import { SessionManager } from '../core/session-manager.js'
import * as path from 'path'

const CSV_PATH = path.join(process.cwd(), 'clay-automation/tests/fixtures/sample-data.csv')

async function fullFlowTest(): Promise<void> {
  console.log('Full Flow Test: Table + CSV + Enrichment')
  console.log('='.repeat(60))
  console.log('')

  const session = new SessionManager()
  const profilePath = session.getProfilePath()
  const tableName = `Test ${new Date().toLocaleTimeString()}`

  const context = await chromium.launchPersistentContext(profilePath, {
    headless: false,
    viewport: { width: 1400, height: 900 },
  })

  const page = context.pages()[0] || await context.newPage()

  try {
    // Step 1: Navigate to Clay home
    console.log('STEP 1: Navigate to Clay')
    await page.goto('https://app.clay.com/workspaces/161745/home', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    console.log('   Done\n')

    // Step 2: Create new workbook
    console.log('STEP 2: Create new workbook')
    await page.click('button:has-text("New")')
    await page.waitForTimeout(500)
    await page.click('text=Workbook')
    await page.waitForTimeout(2000)
    console.log('   Workbook created')
    await page.screenshot({ path: '/tmp/clay-full-1.png' })

    // Step 3: Import CSV
    console.log('\nSTEP 3: Import CSV')
    console.log('   Clicking Import from CSV...')
    await page.click('text=Import from CSV')
    await page.waitForTimeout(1500)

    console.log('   Uploading file...')
    await page.locator('input[type="file"]').setInputFiles(CSV_PATH)
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/clay-full-2.png' })

    console.log('   Clicking Complete import...')
    await page.click('button:has-text("Complete import")')
    await page.waitForTimeout(3000)
    await page.screenshot({ path: '/tmp/clay-full-3.png' })
    console.log('   CSV imported!')

    // Step 4: Add enrichment column
    console.log('\nSTEP 4: Add enrichment column')

    // Click on "+ Add column" dropdown
    console.log('   Looking for Add column button...')
    const addColumnBtn = page.locator('button:has-text("Add column"), text=Add column, [class*="add-column"]')
    if (await addColumnBtn.first().isVisible({ timeout: 5000 })) {
      await addColumnBtn.first().click()
      await page.waitForTimeout(1000)
      await page.screenshot({ path: '/tmp/clay-full-4.png' })
      console.log('   Add column menu opened')
    }

    // Look for enrichment options
    console.log('   Looking for enrichment options...')
    await page.waitForTimeout(1000)

    // Try to find "Enrich person" or similar
    const enrichOptions = ['Find email', 'Enrich person', 'Find company', 'LinkedIn', 'Apollo']
    for (const option of enrichOptions) {
      const locator = page.locator(`text=${option}`).first()
      if (await locator.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`   Found: ${option}`)
        await locator.click()
        await page.waitForTimeout(2000)
        break
      }
    }

    await page.screenshot({ path: '/tmp/clay-full-5.png' })

    // Step 5: Configure enrichment (if modal appeared)
    console.log('\nSTEP 5: Check enrichment configuration')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/clay-full-final.png' })

    // Get final URL
    const finalUrl = page.url()
    console.log(`\nFinal URL: ${finalUrl}`)

    console.log('\n' + '='.repeat(60))
    console.log('FULL FLOW TEST COMPLETE')
    console.log('='.repeat(60))
    console.log('\nScreenshots saved to /tmp/clay-full-*.png')

    // Keep browser open for inspection
    console.log('\nBrowser staying open. Press Ctrl+C to close.')
    await new Promise(() => {})

  } catch (error) {
    console.error('\nError:', (error as Error).message)
    await page.screenshot({ path: '/tmp/clay-full-error.png' })
    console.log('Error screenshot: /tmp/clay-full-error.png')
  }
}

fullFlowTest().catch(console.error)

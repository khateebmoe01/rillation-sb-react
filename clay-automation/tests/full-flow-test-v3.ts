// Full flow test v3: Correct UI navigation
import { chromium, Page } from 'playwright'
import { SessionManager } from '../core/session-manager.js'
import * as path from 'path'

const CSV_PATH = path.join(process.cwd(), 'clay-automation/tests/fixtures/sample-data.csv')

async function fullFlowTestV3(): Promise<void> {
  console.log('Full Flow Test v3 - Correct Navigation')
  console.log('='.repeat(60))

  const session = new SessionManager()
  const profilePath = session.getProfilePath()

  const context = await chromium.launchPersistentContext(profilePath, {
    headless: false,
    viewport: { width: 1400, height: 900 },
  })

  const page = context.pages()[0] || await context.newPage()

  try {
    // Step 1: Navigate to Clay home
    console.log('\n[1] Navigate to Clay')
    await page.goto('https://app.clay.com/workspaces/161745/home', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    console.log('   Done')

    // Step 2: Create new workbook
    console.log('\n[2] Create new workbook')
    await page.click('button:has-text("New")')
    await page.waitForTimeout(500)
    await page.click('text=Workbook')
    await page.waitForTimeout(3000)
    console.log('   Workbook created (with default Custom Table)')
    await page.screenshot({ path: '/tmp/clay-v3-1-workbook.png' })

    // Step 3: Click Overview tab to see sidebar
    console.log('\n[3] Go to Overview to access sidebar')
    const overviewBtn = page.locator('button:has-text("Overview")').or(page.locator('text=Overview')).first()
    await overviewBtn.click()
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/clay-v3-2-overview.png' })
    console.log('   On Overview page with sidebar visible')

    // Step 4: Click Import from CSV
    console.log('\n[4] Import CSV')
    await page.click('text=Import from CSV')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/clay-v3-3-import-click.png' })

    // Upload CSV file
    console.log('   Uploading file...')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(CSV_PATH)
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/clay-v3-4-file-uploaded.png' })

    // Click Complete import
    console.log('   Completing import...')
    await page.click('button:has-text("Complete import")')
    await page.waitForTimeout(3000)
    await page.screenshot({ path: '/tmp/clay-v3-5-imported.png' })
    console.log('   CSV imported!')

    // Step 5: Now we should be in the new table - add enrichment
    console.log('\n[5] Add enrichment column')

    // Click Add column dropdown
    const addColBtn = page.locator('button:has-text("Add column")').or(page.locator('text=Add column')).first()
    if (await addColBtn.isVisible({ timeout: 5000 })) {
      await addColBtn.click()
      await page.waitForTimeout(1500)
      await page.screenshot({ path: '/tmp/clay-v3-6-add-column.png' })
      console.log('   Add column menu opened')

      // Look for enrichment - search for "Find" or "Enrich"
      console.log('   Looking for enrichment options...')

      // Try clicking "Find email" or similar
      const enrichOptions = page.locator('text=/find|enrich|email|linkedin|company/i')
      const count = await enrichOptions.count()
      console.log(`   Found ${count} enrichment-related options`)

      if (count > 0) {
        const firstOption = enrichOptions.first()
        const text = await firstOption.textContent()
        console.log(`   Clicking: ${text}`)
        await firstOption.click()
        await page.waitForTimeout(2000)
      }
    }

    await page.screenshot({ path: '/tmp/clay-v3-7-enrichment.png' })

    // Final screenshot
    await page.screenshot({ path: '/tmp/clay-v3-final.png' })
    console.log(`\n   Final URL: ${page.url()}`)

    console.log('\n' + '='.repeat(60))
    console.log('TEST COMPLETE!')
    console.log('='.repeat(60))
    console.log('\nScreenshots saved: /tmp/clay-v3-*.png')

    // Keep browser open briefly
    console.log('\nClosing in 10 seconds...')
    await page.waitForTimeout(10000)
    await context.close()

  } catch (error) {
    console.error('\n[ERROR]', (error as Error).message)
    await page.screenshot({ path: '/tmp/clay-v3-error.png' })
    await context.close()
  }
}

fullFlowTestV3().catch(console.error)

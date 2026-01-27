// Test adding an enrichment column in Clay
import { chromium } from 'playwright'
import { SessionManager } from '../core/session-manager.js'

const WORKBOOK_URL = 'https://app.clay.com/workspaces/161745/workbooks/wb_0t9hs88q3h7PZ4a4cmq'

async function addEnrichmentTest(): Promise<void> {
  console.log('Add Enrichment Column Test')
  console.log('='.repeat(60))
  console.log(`Workbook: ${WORKBOOK_URL}`)
  console.log('')

  const session = new SessionManager()
  const profilePath = session.getProfilePath()

  const context = await chromium.launchPersistentContext(profilePath, {
    headless: false,
    viewport: { width: 1280, height: 900 },
  })

  const page = context.pages()[0] || await context.newPage()

  try {
    // Navigate to workbook
    console.log('1. Navigating to workbook...')
    await page.goto(WORKBOOK_URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    console.log('   Done')

    // First, let's create a blank table if one doesn't exist
    console.log('2. Checking for existing table...')
    const hasTable = await page.locator('[class*="table"], [role="grid"]').isVisible({ timeout: 3000 }).catch(() => false)

    if (!hasTable) {
      console.log('   No table found, creating blank table...')
      await page.click('text=Blank table')
      await page.waitForTimeout(2000)
    }

    await page.screenshot({ path: '/tmp/clay-enrich-step1.png' })
    console.log('   Screenshot: /tmp/clay-enrich-step1.png')

    // Click "Find people" (Apollo-style enrichment)
    console.log('3. Clicking Find people (enrichment)...')
    await page.click('text=Find people')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/clay-enrich-step2.png' })
    console.log('   Screenshot: /tmp/clay-enrich-step2.png')

    // Check what options appear
    console.log('4. Exploring enrichment options...')
    await page.waitForTimeout(1000)

    // Take screenshot of the enrichment configuration
    await page.screenshot({ path: '/tmp/clay-enrich-step3.png' })
    console.log('   Screenshot: /tmp/clay-enrich-step3.png')

    // Look for any visible buttons or options
    const buttons = await page.locator('button').allTextContents()
    console.log('   Visible buttons:', buttons.filter(b => b.trim()).slice(0, 10).join(', '))

    // Try to find company enrichment option
    console.log('5. Looking for company enrichment...')
    const companyOption = page.locator('text=Find companies, text=Company, text=Enrich company')
    if (await companyOption.first().isVisible({ timeout: 3000 })) {
      await companyOption.first().click()
      await page.waitForTimeout(2000)
    }

    await page.screenshot({ path: '/tmp/clay-enrich-step4.png' })
    console.log('   Screenshot: /tmp/clay-enrich-step4.png')

    // Final screenshot
    await page.screenshot({ path: '/tmp/clay-enrich-final.png' })
    console.log('\n6. Final screenshot: /tmp/clay-enrich-final.png')

    console.log('\n' + '='.repeat(60))
    console.log('ENRICHMENT TEST COMPLETE')
    console.log('='.repeat(60))
    console.log(`URL: ${page.url()}`)

    // Keep open briefly
    await page.waitForTimeout(3000)
    await context.close()

  } catch (error) {
    console.error('\nError:', (error as Error).message)
    await page.screenshot({ path: '/tmp/clay-enrich-error.png' })
    await context.close()
  }
}

addEnrichmentTest().catch(console.error)

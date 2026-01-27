// Test importing CSV into Clay workbook
import { chromium } from 'playwright'
import { SessionManager } from '../core/session-manager.js'
import * as path from 'path'

const WORKBOOK_URL = 'https://app.clay.com/workspaces/161745/workbooks/wb_0t9hs88q3h7PZ4a4cmq'
const CSV_PATH = path.join(process.cwd(), 'clay-automation/tests/fixtures/sample-data.csv')

async function importCSVTest(): Promise<void> {
  console.log('Import CSV Test')
  console.log('='.repeat(60))
  console.log(`Workbook: ${WORKBOOK_URL}`)
  console.log(`CSV: ${CSV_PATH}`)
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

    // Click "Import from CSV" in sidebar
    console.log('2. Clicking Import from CSV...')
    await page.click('text=Import from CSV')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/clay-import-step1.png' })
    console.log('   Screenshot: /tmp/clay-import-step1.png')

    // Look for file upload area
    console.log('3. Looking for file upload...')

    // Try to find file input (might be hidden)
    const fileInput = page.locator('input[type="file"]')
    if (await fileInput.count() > 0) {
      console.log('   Found file input, uploading CSV...')
      await fileInput.setInputFiles(CSV_PATH)
      await page.waitForTimeout(2000)
    } else {
      // Try clicking browse/upload button
      console.log('   Looking for upload button...')
      const uploadBtn = page.locator('button:has-text("Browse"), button:has-text("Upload"), button:has-text("Choose")')
      if (await uploadBtn.isVisible({ timeout: 3000 })) {
        await uploadBtn.click()
        await page.waitForTimeout(1000)
        // Now try file input again
        await page.locator('input[type="file"]').setInputFiles(CSV_PATH)
      }
    }

    await page.screenshot({ path: '/tmp/clay-import-step2.png' })
    console.log('   Screenshot: /tmp/clay-import-step2.png')

    // Wait for preview/mapping
    console.log('4. Waiting for CSV preview...')
    await page.waitForTimeout(3000)
    await page.screenshot({ path: '/tmp/clay-import-step3.png' })
    console.log('   Screenshot: /tmp/clay-import-step3.png')

    // Click Import/Add button
    console.log('5. Looking for Import button...')
    const importBtn = page.locator('button:has-text("Import"), button:has-text("Add"), button:has-text("Create")')
    if (await importBtn.first().isVisible({ timeout: 5000 })) {
      console.log('   Clicking Import...')
      await importBtn.first().click()
      await page.waitForTimeout(3000)
    }

    // Final screenshot
    await page.screenshot({ path: '/tmp/clay-import-final.png' })
    console.log('   Final screenshot: /tmp/clay-import-final.png')

    console.log('\n' + '='.repeat(60))
    console.log('IMPORT TEST COMPLETE')
    console.log('='.repeat(60))
    console.log(`URL: ${page.url()}`)

    // Keep open briefly
    await page.waitForTimeout(3000)
    await context.close()

  } catch (error) {
    console.error('\nError:', (error as Error).message)
    await page.screenshot({ path: '/tmp/clay-import-error.png' })
    await context.close()
  }
}

importCSVTest().catch(console.error)

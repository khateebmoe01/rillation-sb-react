// Full flow test v2: Better handling of Clay UI
import { chromium, Page } from 'playwright'
import { SessionManager } from '../core/session-manager.js'
import * as path from 'path'

const CSV_PATH = path.join(process.cwd(), 'clay-automation/tests/fixtures/sample-data.csv')

async function waitAndClick(page: Page, selector: string, description: string): Promise<boolean> {
  console.log(`   ${description}...`)
  try {
    await page.waitForSelector(selector, { timeout: 5000 })
    await page.click(selector)
    await page.waitForTimeout(1000)
    return true
  } catch {
    console.log(`   [!] Could not find: ${selector}`)
    return false
  }
}

async function fullFlowTestV2(): Promise<void> {
  console.log('Full Flow Test v2')
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
    console.log('   Workbook created')

    const workbookUrl = page.url()
    console.log(`   URL: ${workbookUrl}`)
    await page.screenshot({ path: '/tmp/clay-v2-1-workbook.png' })

    // Step 3: Click Import from CSV in sidebar
    console.log('\n[3] Import CSV')

    // Make sure sidebar is visible - click Overview first
    const overviewTab = page.locator('text=Overview').first()
    if (await overviewTab.isVisible({ timeout: 2000 })) {
      // Good, we're in workbook view with sidebar
    }

    // Click Import from CSV
    console.log('   Clicking Import from CSV...')
    await page.click('text=Import from CSV')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/clay-v2-2-import-click.png' })

    // Now upload the file
    console.log('   Uploading CSV file...')
    const fileInput = page.locator('input[type="file"]')
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles(CSV_PATH)
      await page.waitForTimeout(2000)
      await page.screenshot({ path: '/tmp/clay-v2-3-file-uploaded.png' })

      // Click Complete import
      console.log('   Clicking Complete import...')
      const completeBtn = page.locator('button:has-text("Complete import")')
      if (await completeBtn.isVisible({ timeout: 5000 })) {
        await completeBtn.click()
        await page.waitForTimeout(3000)
        console.log('   CSV imported!')
      }
    } else {
      console.log('   [!] File input not found')
    }

    await page.screenshot({ path: '/tmp/clay-v2-4-after-import.png' })

    // Step 4: Add enrichment using Add column
    console.log('\n[4] Add enrichment column')

    // Look for the table and Add column button
    await page.waitForTimeout(2000)

    // Click on "+ Add column" in the table header
    const addColBtn = page.locator('button:has-text("Add column"), text=Add column').first()
    if (await addColBtn.isVisible({ timeout: 5000 })) {
      console.log('   Clicking Add column...')
      await addColBtn.click()
      await page.waitForTimeout(1500)
      await page.screenshot({ path: '/tmp/clay-v2-5-add-column.png' })

      // Look at what options are available
      const menuItems = await page.locator('[role="menuitem"], [role="option"], button').allTextContents()
      console.log('   Menu options:', menuItems.filter(m => m.trim()).slice(0, 15).join(', '))

      // Try to find enrichment options
      const enrichmentKeywords = ['Enrich', 'Find', 'Email', 'LinkedIn', 'Company', 'Person', 'Apollo', 'Clearbit']
      for (const keyword of enrichmentKeywords) {
        const option = page.locator(`text=/${keyword}/i`).first()
        if (await option.isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log(`   Found enrichment: ${keyword}`)
          // Don't click yet, just log
        }
      }
    }

    await page.screenshot({ path: '/tmp/clay-v2-6-menu-open.png' })

    // Step 5: Try using Actions button or searching for enrichments
    console.log('\n[5] Explore enrichment options')

    // Press Escape to close any menus
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Try the Actions button
    const actionsBtn = page.locator('button:has-text("Actions")')
    if (await actionsBtn.isVisible({ timeout: 2000 })) {
      console.log('   Clicking Actions...')
      await actionsBtn.click()
      await page.waitForTimeout(1500)
      await page.screenshot({ path: '/tmp/clay-v2-7-actions.png' })
    }

    // Final state
    console.log('\n[6] Final state')
    await page.screenshot({ path: '/tmp/clay-v2-final.png' })
    console.log(`   URL: ${page.url()}`)

    console.log('\n' + '='.repeat(60))
    console.log('TEST COMPLETE')
    console.log('='.repeat(60))
    console.log('\nScreenshots: /tmp/clay-v2-*.png')
    console.log('\nKeeping browser open for 30 seconds...')

    await page.waitForTimeout(30000)
    await context.close()

  } catch (error) {
    console.error('\nError:', (error as Error).message)
    await page.screenshot({ path: '/tmp/clay-v2-error.png' })
    await context.close()
  }
}

fullFlowTestV2().catch(console.error)

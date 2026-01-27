// Test Clay selectors against the live UI
// Run this to verify selectors still work after Clay UI updates

import { BrowserManager } from '../core/browser-manager.js'
import { SessionManager } from '../core/session-manager.js'
import { ClaySelectors, getAllSelectors } from '../selectors/clay-selectors.js'
import { ClayConfig } from '../config/clay.config.js'

interface SelectorTestResult {
  name: string
  selector: string
  status: 'found' | 'missing' | 'error'
  error?: string
}

async function testSelectors(): Promise<void> {
  const browser = new BrowserManager()
  const session = new SessionManager()

  console.log('Clay Selector Validation Test')
  console.log('='.repeat(60))
  console.log('')

  // Check session
  if (!session.isSessionValid()) {
    console.log('No valid session found. Run `login` workflow first.')
    return
  }

  console.log('Connecting to browser...')

  // Mock MCP handler for testing
  browser.setMCPHandler(async (toolName, args) => {
    console.log(`  [MCP] ${toolName}`)
    return { success: true, visible: Math.random() > 0.3 } // Simulate some found, some missing
  })

  console.log('Navigating to Clay...')
  await browser.navigate(ClayConfig.urls.tables)

  // Wait for page to load
  await new Promise(resolve => setTimeout(resolve, 3000))

  const allSelectors = getAllSelectors()
  const results: SelectorTestResult[] = []

  console.log('')
  console.log(`Testing ${Object.keys(allSelectors).length} selectors...`)
  console.log('')

  for (const [name, selector] of Object.entries(allSelectors)) {
    try {
      const visible = await browser.isVisible(selector)
      results.push({
        name,
        selector,
        status: visible ? 'found' : 'missing',
      })

      const icon = visible ? '+' : '-'
      console.log(`  [${icon}] ${name}`)
    } catch (error) {
      results.push({
        name,
        selector,
        status: 'error',
        error: (error as Error).message,
      })
      console.log(`  [!] ${name}: ${(error as Error).message}`)
    }
  }

  await browser.close()

  // Summary
  console.log('')
  console.log('='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))

  const found = results.filter(r => r.status === 'found').length
  const missing = results.filter(r => r.status === 'missing').length
  const errors = results.filter(r => r.status === 'error').length

  console.log(`  Found:   ${found}`)
  console.log(`  Missing: ${missing}`)
  console.log(`  Errors:  ${errors}`)
  console.log('')

  if (missing > 0) {
    console.log('Missing selectors (may need updating):')
    for (const result of results.filter(r => r.status === 'missing')) {
      console.log(`  - ${result.name}`)
      console.log(`    ${result.selector}`)
    }
  }

  if (errors > 0) {
    console.log('')
    console.log('Errors:')
    for (const result of results.filter(r => r.status === 'error')) {
      console.log(`  - ${result.name}: ${result.error}`)
    }
  }
}

// Run tests
testSelectors().catch(console.error)

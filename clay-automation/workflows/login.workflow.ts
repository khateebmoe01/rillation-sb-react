import type { WorkflowContext } from '../types/workflow.types.js'
import { ClaySelectors } from '../selectors/clay-selectors.js'
import { ClayConfig } from '../config/clay.config.js'
import { ClayAutomationError, ErrorCodes, sleep } from '../core/error-handler.js'
import { waitForPageReady, waitForAny } from '../selectors/selector-helpers.js'
import * as readline from 'readline'

export interface LoginResult {
  success: boolean
  email?: string
}

async function waitForUserInput(prompt: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(prompt, () => {
      rl.close()
      resolve()
    })
  })
}

export async function loginWorkflow(context: WorkflowContext): Promise<LoginResult> {
  const { browser, logger, session } = context

  logger.emit('status', 'Checking existing session...')

  // Check if we already have a valid session
  const existingSession = await session.loadSession()
  if (existingSession) {
    logger.emit('status', 'Found existing session, verifying...')

    // Navigate to dashboard to check if session is valid
    await browser.navigate(ClayConfig.urls.dashboard)
    await sleep(2000)

    const isAuth = await session.isAuthenticated({ url: () => browser.getUrl() })
    if (isAuth) {
      logger.emit('success', 'Existing session is valid!')
      return { success: true }
    }

    logger.emit('warning', 'Existing session expired, need to re-login')
    session.clearSession()
  }

  // Navigate to login page
  logger.emit('status', 'Navigating to Clay login page...')
  await browser.navigate(ClayConfig.urls.login)
  await waitForPageReady(browser)

  // Wait for either login form or dashboard (if already logged in)
  const landedOn = await waitForAny(browser, [
    ClaySelectors.login.emailInput,
    ClaySelectors.dashboard.workspaceList,
    ClaySelectors.tablesPage.container,
  ])

  if (landedOn && !landedOn.includes('email')) {
    // Already logged in!
    logger.emit('success', 'Already logged in (redirected to dashboard)')

    // Save session
    logger.emit('status', 'Saving session...')
    // Note: In a real implementation, we'd get cookies from the browser
    await session.saveSession([{ note: 'Session saved via Chrome profile persistence' }])

    return { success: true }
  }

  // Need manual login
  logger.emit('info', '='.repeat(60))
  logger.emit('info', 'MANUAL LOGIN REQUIRED')
  logger.emit('info', '='.repeat(60))
  logger.emit('info', 'A browser window should be open with Clay login page.')
  logger.emit('info', 'Please log in to Clay manually.')
  logger.emit('info', '')
  logger.emit('info', 'After logging in successfully, press ENTER here to continue...')
  logger.emit('info', '='.repeat(60))

  // Wait for user to complete login
  await waitForUserInput('\nPress ENTER after logging in to Clay: ')

  // Verify login was successful
  logger.emit('status', 'Verifying login...')
  await sleep(2000)

  const currentUrl = browser.getUrl()
  const isAuth = await session.isAuthenticated({ url: () => currentUrl })

  if (!isAuth) {
    // Check if still on login page
    const stillOnLogin = currentUrl.includes('/login') || currentUrl.includes('/signup')

    if (stillOnLogin) {
      throw new ClayAutomationError(
        'Login verification failed - still on login page',
        ErrorCodes.AUTH_FAILED,
        false
      )
    }

    // Try navigating to dashboard to confirm
    await browser.navigate(ClayConfig.urls.dashboard)
    await sleep(2000)

    const isAuthAfterNav = await session.isAuthenticated({ url: () => browser.getUrl() })
    if (!isAuthAfterNav) {
      throw new ClayAutomationError(
        'Login verification failed - could not access dashboard',
        ErrorCodes.AUTH_FAILED,
        false
      )
    }
  }

  // Save session
  logger.emit('status', 'Login successful! Saving session...')
  await session.saveSession([{ note: 'Session saved via Chrome profile persistence' }])

  logger.emit('success', 'Login workflow completed successfully!')
  logger.emit('info', 'Session saved - you won\'t need to log in again for 7 days.')

  return { success: true }
}

export default loginWorkflow

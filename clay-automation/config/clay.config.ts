// Clay.com configuration - URLs, timeouts, retry settings

export const ClayConfig = {
  urls: {
    base: 'https://app.clay.com',
    login: 'https://app.clay.com/login',
    dashboard: 'https://app.clay.com/workspaces',
    tables: 'https://app.clay.com/workspaces',
  },

  timeouts: {
    navigation: 30000,
    elementWait: 15000,
    networkIdle: 10000,
    shortWait: 2000,
    mediumWait: 5000,
    longWait: 15000,
    enrichmentRun: 300000, // 5 minutes for enrichment
    csvUpload: 120000, // 2 minutes for large CSV uploads
  },

  retries: {
    click: { maxRetries: 3, backoff: 'exponential' as const },
    type: { maxRetries: 3, backoff: 'linear' as const },
    navigation: { maxRetries: 2, backoff: 'exponential' as const },
    enrichment: { maxRetries: 1, backoff: 'linear' as const },
  },

  delays: {
    betweenActions: 500,  // Minimum delay between UI actions
    afterClick: 300,      // Wait after clicking
    afterType: 200,       // Wait after typing
    betweenRows: 100,     // Delay when processing rows
  },

  browser: {
    headless: false,
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },

  session: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    cookieFile: 'cookies.json',
  },
}

export default ClayConfig

import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env file
function loadEnvFile(): void {
  const envPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env'),
    path.resolve(process.cwd(), 'clay-automation', '.env'),
  ]

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8')
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=')
          const value = valueParts.join('=').replace(/^["']|["']$/g, '')
          if (key && value && !process.env[key]) {
            process.env[key] = value
          }
        }
      }
      console.log(`Loaded environment from ${envPath}`)
      return
    }
  }

  console.warn('No .env file found, using existing environment variables')
}

// Load env on import
loadEnvFile()

// Environment configuration
export const EnvConfig = {
  supabase: {
    url: process.env.VITE_SUPABASE_URL || '',
    anonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
  },

  clay: {
    profilePath: process.env.CLAY_PROFILE_PATH || path.join(process.cwd(), '.clay-browser-profile'),
    email: process.env.CLAY_EMAIL || '',
  },

  webapp: {
    port: parseInt(process.env.WEBAPP_PORT || '3001', 10),
  },

  options: {
    enableScreenshots: process.env.ENABLE_SCREENSHOTS !== 'false',
    headless: process.env.HEADLESS === 'true',
    dryRun: process.env.DRY_RUN === 'true',
  },
}

// Initialize Supabase client
export const supabase = createClient(
  EnvConfig.supabase.url,
  EnvConfig.supabase.anonKey
)

export default EnvConfig

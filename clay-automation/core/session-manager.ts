import * as fs from 'fs'
import * as path from 'path'
import { EnvConfig } from '../config/env.config.js'
import { ClayConfig } from '../config/clay.config.js'

interface SessionData {
  cookies: unknown[]
  savedAt: string
  clayEmail?: string
}

export class SessionManager {
  private profilePath: string
  private sessionFile: string

  constructor(profilePath?: string) {
    this.profilePath = profilePath || EnvConfig.clay.profilePath
    this.sessionFile = path.join(this.profilePath, ClayConfig.session.cookieFile)
  }

  ensureProfileDirectory(): void {
    if (!fs.existsSync(this.profilePath)) {
      fs.mkdirSync(this.profilePath, { recursive: true })
      console.log(`Created browser profile directory: ${this.profilePath}`)
    }
  }

  getProfilePath(): string {
    this.ensureProfileDirectory()
    return this.profilePath
  }

  async saveSession(cookies: unknown[], email?: string): Promise<void> {
    this.ensureProfileDirectory()

    const sessionData: SessionData = {
      cookies,
      savedAt: new Date().toISOString(),
      clayEmail: email,
    }

    fs.writeFileSync(this.sessionFile, JSON.stringify(sessionData, null, 2))
    console.log(`Session saved to ${this.sessionFile}`)
  }

  async loadSession(): Promise<unknown[] | null> {
    if (!fs.existsSync(this.sessionFile)) {
      console.log('No existing session found')
      return null
    }

    try {
      const content = fs.readFileSync(this.sessionFile, 'utf-8')
      const sessionData: SessionData = JSON.parse(content)

      // Check if session is expired
      const savedAt = new Date(sessionData.savedAt)
      const age = Date.now() - savedAt.getTime()

      if (age > ClayConfig.session.maxAge) {
        console.log('Session expired (>7 days old), need to re-login')
        return null
      }

      const daysOld = Math.floor(age / (1000 * 60 * 60 * 24))
      console.log(`Loaded session from ${daysOld} days ago`)

      return sessionData.cookies
    } catch (error) {
      console.error('Failed to load session:', error)
      return null
    }
  }

  isSessionValid(): boolean {
    if (!fs.existsSync(this.sessionFile)) {
      return false
    }

    try {
      const content = fs.readFileSync(this.sessionFile, 'utf-8')
      const sessionData: SessionData = JSON.parse(content)
      const savedAt = new Date(sessionData.savedAt)
      const age = Date.now() - savedAt.getTime()

      return age <= ClayConfig.session.maxAge
    } catch {
      return false
    }
  }

  async isAuthenticated(page: { url: () => string }): Promise<boolean> {
    const url = page.url()
    // Clay redirects to dashboard/workspaces after login
    const isLoggedIn =
      url.includes('clay.com/workspaces') ||
      url.includes('clay.com/tables') ||
      url.includes('clay.com/dashboard')

    const isOnLoginPage =
      url.includes('clay.com/login') || url.includes('clay.com/signup')

    return isLoggedIn && !isOnLoginPage
  }

  clearSession(): void {
    if (fs.existsSync(this.sessionFile)) {
      fs.unlinkSync(this.sessionFile)
      console.log('Session cleared')
    }
  }

  getSessionInfo(): { exists: boolean; age?: number; email?: string } | null {
    if (!fs.existsSync(this.sessionFile)) {
      return { exists: false }
    }

    try {
      const content = fs.readFileSync(this.sessionFile, 'utf-8')
      const sessionData: SessionData = JSON.parse(content)
      const savedAt = new Date(sessionData.savedAt)
      const age = Date.now() - savedAt.getTime()

      return {
        exists: true,
        age: Math.floor(age / (1000 * 60 * 60 * 24)), // days
        email: sessionData.clayEmail,
      }
    } catch {
      return { exists: false }
    }
  }
}

// Singleton instance
export const sessionManager = new SessionManager()

export default SessionManager

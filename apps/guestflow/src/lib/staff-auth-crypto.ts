import bcrypt from 'bcryptjs'
import { createHash, randomBytes } from 'crypto'
import { STAFF_SESSION_COOKIE } from '@/lib/staff-session-cookie'

export { STAFF_SESSION_COOKIE }
export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000
export const SESSION_TTL_SECONDS = Math.floor(SESSION_TTL_MS / 1000)
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
export const RATE_LIMIT_MAX_FAILURES = 5
export const SESSION_SLIDE_AFTER_MS = 60 * 60 * 1000

export function bcryptRounds(): number {
  const parsed = Number(process.env.STAFF_BCRYPT_ROUNDS)
  if (Number.isFinite(parsed) && parsed >= 4 && parsed <= 15) {
    return parsed
  }
  return 10
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, bcryptRounds())
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash)
}

export function looksLikePasswordHash(value: string): boolean {
  return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value)
}

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export { isWellFormedSessionToken } from '@/lib/staff-session-cookie'

export function sessionExpiryIso(fromMs = Date.now()): string {
  return new Date(fromMs + SESSION_TTL_MS).toISOString()
}

export function staffSessionCookieOptions() {
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  }
}

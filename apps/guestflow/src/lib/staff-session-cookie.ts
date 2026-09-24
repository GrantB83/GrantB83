export const STAFF_SESSION_COOKIE = 'guestflow_staff_session'

export function isWellFormedSessionToken(token: string | undefined | null): boolean {
  if (!token || typeof token !== 'string') return false
  return /^[A-Za-z0-9_-]{32,128}$/.test(token)
}

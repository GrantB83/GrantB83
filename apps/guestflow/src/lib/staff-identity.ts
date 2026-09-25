import type { NextRequest } from 'next/server'
import { actorStamp, getStaffSessionFromRequest, type StaffSession } from '@/lib/staff-session'

/**
 * Signed-in staff identity (#215). Falls back to legacy "Grant" when no session.
 */
export function getStaffIdentityFromSession(
  session: StaffSession | null | undefined
): { actor: string; email: string | null; source: 'staff-session' | 'legacy-staff' } {
  if (session?.email) {
    return { actor: actorStamp(session, 'Grant'), email: session.email, source: 'staff-session' }
  }
  const actor = process.env.STAFF_IDENTITY?.trim() || 'Grant'
  return { actor, email: null, source: 'legacy-staff' }
}

export async function getStaffIdentityFromRequest(
  request: NextRequest
): Promise<{ actor: string; email: string | null; source: 'staff-session' | 'legacy-staff' }> {
  const session = await getStaffSessionFromRequest(request).catch(() => null)
  return getStaffIdentityFromSession(session)
}

/** @deprecated Use getStaffIdentityFromRequest in API routes */
export function getStaffIdentity(): { actor: string; source: 'legacy-staff' } {
  const actor = process.env.STAFF_IDENTITY?.trim() || 'Grant'
  return { actor, source: 'legacy-staff' }
}

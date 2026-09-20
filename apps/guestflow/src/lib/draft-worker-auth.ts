import { NextRequest } from 'next/server'

function readPresentedSecret(request: NextRequest): string | null {
  const header = request.headers.get('x-draft-worker-secret')
  if (header && header.trim()) return header.trim()
  const auth = request.headers.get('authorization')
  const bearer = auth?.replace(/^Bearer\s+/i, '').trim()
  return bearer || null
}

export function isDraftWorkerAuthorized(
  request: NextRequest
): { ok: true } | { ok: false; status: number; error: string } {
  const expected = (process.env.DRAFT_WORKER_SECRET || '').trim()
  if (!expected) {
    return { ok: false, status: 401, error: 'DRAFT_WORKER_SECRET is not configured' }
  }

  const cron = (process.env.CRON_SECRET || '').trim()
  if (cron && expected === cron) {
    return { ok: false, status: 403, error: 'DRAFT_WORKER_SECRET must not equal CRON_SECRET' }
  }

  const presented = readPresentedSecret(request)
  if (!presented) {
    return { ok: false, status: 401, error: 'Missing draft worker secret' }
  }
  if (cron && presented === cron) {
    return { ok: false, status: 403, error: 'CRON_SECRET is not accepted for draft writes' }
  }
  if (presented !== expected) {
    return { ok: false, status: 401, error: 'Invalid draft worker secret' }
  }
  return { ok: true }
}

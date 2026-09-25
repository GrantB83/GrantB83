/**
 * GuestFlow Outbound Redirect — Decision L
 *
 * One shared ON/OFF setting in app_settings. Ships ON. OUTBOUND_MODE is
 * seed default only. Fail-closed: missing, unreadable, garbage, or any
 * DB error → ON (sinks). OFF → real recipients. Sinks stay env-only.
 */

import type { DbClient } from '@/lib/db'

export const OUTBOUND_REDIRECT_SETTING_KEY = 'outbound_redirect'

export const APP_SETTINGS_TABLE_SQL = `CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT NOT NULL
  )`

export interface OutboundRecipientResolution {
  to: string
  redirected: boolean
  intendedTo: string
  mode: 'redirect' | 'live'
}

export interface OutboundStatus {
  mode: 'redirect' | 'live'
  redirectStatus: 'on' | 'off'
}

export function seedOutboundRedirectValue(env = process.env): 'on' | 'off' {
  return env.OUTBOUND_MODE?.toLowerCase().trim() === 'live' ? 'off' : 'on'
}

/** Only the exact string "off" (any case) is OFF. Everything else is ON. */
export function parseOutboundRedirectOn(value: unknown): boolean {
  if (typeof value !== 'string') return true
  return value.trim().toLowerCase() !== 'off'
}

export async function ensureOutboundSettingsSchema(db: DbClient): Promise<void> {
  await db.exec(APP_SETTINGS_TABLE_SQL)
  const now = new Date().toISOString()
  await db
    .prepare(
      `INSERT OR IGNORE INTO app_settings (key, value, updated_at, updated_by)
       VALUES (?, ?, ?, 'seed')`
    )
    .run(OUTBOUND_REDIRECT_SETTING_KEY, seedOutboundRedirectValue(), now)
}

async function resolveDb(db?: DbClient): Promise<DbClient> {
  if (db) return db
  const { getDbAsync } = await import('@/lib/db')
  return getDbAsync()
}

/**
 * Live ON/OFF. Fail-closed to ON on any problem.
 */
export async function isOutboundRedirectOn(db?: DbClient): Promise<boolean> {
  try {
    const resolved = await resolveDb(db)
    await ensureOutboundSettingsSchema(resolved)
    const row = (await resolved
      .prepare(`SELECT value FROM app_settings WHERE key = ?`)
      .get(OUTBOUND_REDIRECT_SETTING_KEY)) as { value?: unknown } | undefined
    if (!row || row.value == null) return true
    return parseOutboundRedirectOn(row.value)
  } catch {
    return true
  }
}

export async function getOutboundStatus(db?: DbClient): Promise<OutboundStatus> {
  const on = await isOutboundRedirectOn(db)
  return on
    ? { mode: 'redirect', redirectStatus: 'on' }
    : { mode: 'live', redirectStatus: 'off' }
}

export async function resolveOutboundRecipient(input: {
  channel: 'whatsapp' | 'email'
  intendedTo: string
  db?: DbClient
}): Promise<OutboundRecipientResolution> {
  const { channel, intendedTo } = input

  if (!intendedTo || !intendedTo.trim()) {
    throw new Error('intendedTo is required')
  }

  if (channel !== 'whatsapp' && channel !== 'email') {
    throw new Error(`Invalid channel: ${channel}`)
  }

  const on = await isOutboundRedirectOn(input.db)

  if (!on) {
    return {
      to: intendedTo,
      redirected: false,
      intendedTo,
      mode: 'live',
    }
  }

  const sinkEnvKey = channel === 'whatsapp' ? 'OUTBOUND_REDIRECT_TO_WA' : 'OUTBOUND_REDIRECT_TO_EMAIL'
  const sink = process.env[sinkEnvKey]?.trim()

  if (!sink) {
    throw new Error(`Redirect enabled but ${sinkEnvKey} not set`)
  }

  return {
    to: sink,
    redirected: true,
    intendedTo,
    mode: 'redirect',
  }
}

export async function setOutboundRedirect(
  db: DbClient,
  nextOn: boolean,
  actorEmail: string
): Promise<{ old: 'on' | 'off'; next: 'on' | 'off' }> {
  await ensureOutboundSettingsSchema(db)
  const oldOn = await isOutboundRedirectOn(db)
  const old: 'on' | 'off' = oldOn ? 'on' : 'off'
  const next: 'on' | 'off' = nextOn ? 'on' : 'off'
  const now = new Date().toISOString()
  await db
    .prepare(
      `INSERT INTO app_settings (key, value, updated_at, updated_by)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`
    )
    .run(OUTBOUND_REDIRECT_SETTING_KEY, next, now, actorEmail)
  await db
    .prepare(`INSERT INTO staff_user_audit (actor, action, target) VALUES (?, ?, ?)`)
    .run(actorEmail, 'outbound_redirect_flip', `${old}->${next}`)
  return { old, next }
}

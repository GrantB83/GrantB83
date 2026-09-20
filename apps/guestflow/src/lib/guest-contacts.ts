import type { DbClient } from '@/lib/db'
import { ensurePhase0Schema } from '@/lib/phase0-schema'
import { normalizeEmail, normalizeZaE164 } from '@/lib/phone'

export const GUEST_CONTACT_RETENTION_YEARS = 5

export type GuestContactSource = 'nb' | 'inbound' | 'manual'

export interface UpsertGuestContactInput {
  tenantId: number
  phone?: string | null
  email?: string | null
  displayName?: string | null
  lastStayAt?: string | null
  lastSuite?: string | null
  source: GuestContactSource
  nbid?: string | null
}

export interface GuestContactRow {
  id: number
  tenant_id: number
  normalized_phone: string | null
  email: string | null
  display_name: string | null
  last_stay_at: string | null
  last_suite: string | null
  source: GuestContactSource
  nbid: string | null
  retention_years: number
  retention_delete_after: string | null
  last_activity_at: string | null
}

export function computeRetentionDeleteAfter(lastStayAt?: string | null): string | null {
  if (!lastStayAt) return null
  const stay = new Date(lastStayAt)
  if (Number.isNaN(stay.getTime())) return null
  stay.setFullYear(stay.getFullYear() + GUEST_CONTACT_RETENTION_YEARS)
  return stay.toISOString()
}

function pickNonEmpty(next: string | null | undefined, current: string | null | undefined): string | null {
  const n = next && String(next).trim() ? String(next).trim() : null
  const c = current && String(current).trim() ? String(current).trim() : null
  return n || c || null
}

export async function upsertGuestContact(
  db: DbClient,
  input: UpsertGuestContactInput
): Promise<GuestContactRow | null> {
  await ensurePhase0Schema(db)

  const phone = normalizeZaE164(input.phone)
  const email = normalizeEmail(input.email)
  const displayName = input.displayName?.trim() || null
  const lastStayAt = input.lastStayAt?.trim() || null
  const lastSuite = input.lastSuite?.trim() || null
  const nbid = input.nbid?.trim() || null
  const now = new Date().toISOString()
  const retentionDeleteAfter = computeRetentionDeleteAfter(lastStayAt)

  if (!phone && !email && !nbid && !displayName && !lastStayAt) {
    return null
  }

  let existing: GuestContactRow | undefined
  if (phone) {
    existing = (await db
      .prepare(
        `SELECT * FROM guest_contacts WHERE tenant_id = ? AND normalized_phone = ? LIMIT 1`
      )
      .get(input.tenantId, phone)) as GuestContactRow | undefined
  }
  if (!existing && email) {
    existing = (await db
      .prepare(`SELECT * FROM guest_contacts WHERE tenant_id = ? AND email = ? LIMIT 1`)
      .get(input.tenantId, email)) as GuestContactRow | undefined
  }
  if (!existing && nbid) {
    existing = (await db
      .prepare(`SELECT * FROM guest_contacts WHERE tenant_id = ? AND nbid = ? LIMIT 1`)
      .get(input.tenantId, nbid)) as GuestContactRow | undefined
  }

  if (existing) {
    const nextPhone = existing.normalized_phone || phone
    const nextEmail = pickNonEmpty(email, existing.email)
    const nextName = pickNonEmpty(displayName, existing.display_name)
    const nextStay = lastStayAt || existing.last_stay_at
    const nextSuite = pickNonEmpty(lastSuite, existing.last_suite)
    const nextNbid = pickNonEmpty(nbid, existing.nbid)
    const nextDelete = computeRetentionDeleteAfter(nextStay) || existing.retention_delete_after

    await db
      .prepare(
        `
        UPDATE guest_contacts
        SET normalized_phone = ?,
            email = ?,
            display_name = ?,
            last_stay_at = ?,
            last_suite = ?,
            source = ?,
            nbid = ?,
            retention_years = ?,
            retention_delete_after = ?,
            last_activity_at = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
      )
      .run(
        nextPhone,
        nextEmail,
        nextName,
        nextStay,
        nextSuite,
        input.source,
        nextNbid,
        GUEST_CONTACT_RETENTION_YEARS,
        nextDelete,
        now,
        existing.id
      )

    return (await db.prepare(`SELECT * FROM guest_contacts WHERE id = ?`).get(existing.id)) as GuestContactRow
  }

  const inserted = (await db
    .prepare(
      `
      INSERT INTO guest_contacts (
        tenant_id, normalized_phone, email, display_name,
        last_stay_at, last_suite, source, nbid,
        retention_years, retention_delete_after, last_activity_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      input.tenantId,
      phone,
      email,
      displayName,
      lastStayAt,
      lastSuite,
      input.source,
      nbid,
      GUEST_CONTACT_RETENTION_YEARS,
      retentionDeleteAfter,
      now
    )) as { lastInsertRowid?: number | bigint }

  const id = inserted.lastInsertRowid
  if (id == null) return null
  return (await db.prepare(`SELECT * FROM guest_contacts WHERE id = ?`).get(id)) as GuestContactRow
}

/**
 * L4 conflict matrix, mass-cancel guard, provenance writes.
 */

import type { DbClient } from '@/lib/db'
import { OPS_SETTINGS } from '@/lib/ops-settings'
import { softCancelDisappearedBookings, type ImportWindow, type ParsedBooking } from '@/lib/nightsbridge-upsert'
import { recordNbSyncRun } from '@/lib/sprint2-schema'

export type ProvenanceSource =
  | 'email'
  | 'report'
  | 'staff_verified'
  | 'guest_verified'
  | 'history'
  | 'notes'

export interface FieldSource {
  source: ProvenanceSource
  sourceRef?: string
  verified?: string | null
  at?: string | null
}

export type FieldSourceMap = Record<string, FieldSource>

export type WriteAction = 'write' | 'keep' | 'alt'

const VERIFIED = new Set(['staff_verified', 'guest_verified'])

export function applyFieldWrite(input: {
  field: string
  current: { value: unknown; source?: ProvenanceSource | string | null; at?: string | null; verified?: string | null }
  incoming: { value: unknown; source: ProvenanceSource; at?: string | null }
}): { action: WriteAction; reason: string } {
  const field = input.field
  const verified = input.current.verified || (VERIFIED.has(String(input.current.source || '')) ? String(input.current.source) : null)
  if (verified && (field === 'guest_phone' || field === 'guest_email' || field === 'guest_name' || field === 'phone' || field === 'email')) {
    if (String(input.current.value || '') && String(input.incoming.value) !== String(input.current.value)) {
      return { action: 'alt', reason: 'verified_frozen' }
    }
    return { action: 'keep', reason: 'verified_frozen' }
  }

  if (field === 'notes' || field === 'notes_email' || field === 'notes_report') {
    return { action: 'write', reason: 'notes_separate' }
  }

  if (['source', 'channel', 'amount', 'deposit', 'rate'].includes(field)) {
    if (input.incoming.source === 'email') return { action: 'write', reason: 'email_wins_amounts' }
    if (input.current.source === 'email' && input.incoming.source === 'report') {
      if (newer(input.incoming.at, input.current.at)) return { action: 'write', reason: 'newer_report' }
      return { action: 'keep', reason: 'email_wins_amounts' }
    }
  }

  if (['check_in', 'check_out', 'suite_or_unit', 'room', 'guest_name', 'adults', 'children'].includes(field)) {
    if (input.incoming.source === 'report') return { action: 'write', reason: 'report_wins' }
    if (input.incoming.source === 'email' && newer(input.incoming.at, input.current.at)) {
      return { action: 'write', reason: 'newer_email' }
    }
    if (input.incoming.source === 'email' && input.current.source === 'report' && !newer(input.incoming.at, input.current.at)) {
      return { action: 'keep', reason: 'report_wins' }
    }
  }

  if (field === 'status') {
    const incomingCancelled = String(input.incoming.value || '').toLowerCase() === 'cancelled'
    const currentCancelled = String(input.current.value || '').toLowerCase() === 'cancelled'
    // Cancellation always wins over an older NEW / active status (event-time exception).
    if (incomingCancelled && !currentCancelled) {
      return { action: 'write', reason: 'cancellation_wins' }
    }
    if (newer(input.incoming.at, input.current.at) || !input.current.at) return { action: 'write', reason: 'newest_wins' }
    return { action: 'keep', reason: 'older_event' }
  }

  if (['guest_phone', 'guest_email', 'phone', 'email'].includes(field)) {
    if (!input.current.value && input.incoming.value) return { action: 'write', reason: 'first_valid' }
    if (input.current.value && input.incoming.value && String(input.current.value) !== String(input.incoming.value)) {
      return { action: 'alt', reason: 'alt_contact' }
    }
  }

  if (!input.current.value && input.incoming.value) return { action: 'write', reason: 'empty' }
  return { action: 'keep', reason: 'unchanged_or_lower' }
}

function newer(incomingAt?: string | null, currentAt?: string | null): boolean {
  if (!incomingAt) return false
  if (!currentAt) return true
  return new Date(incomingAt).getTime() > new Date(currentAt).getTime()
}

export function shouldTripMassCancelGuard(existingInWindow: number, wouldCancel: number, ratio = OPS_SETTINGS.massCancelDropRatio): boolean {
  if (existingInWindow <= 0) return false
  return wouldCancel / existingInWindow > ratio
}

export async function guardedSoftCancel(
  db: DbClient,
  tenantId: number,
  importWindow: ImportWindow,
  batchId: string,
  parsedBookings: ParsedBooking[],
  startedAt: string
): Promise<{ cancelled: number; guarded: boolean }> {
  const existing = (await db
    .prepare(
      `SELECT id FROM bookings
       WHERE tenant_id = ? AND status != 'cancelled' AND check_in >= ? AND check_out <= ?`
    )
    .all(tenantId, importWindow.minDate, importWindow.maxDate)) as Array<{ id: number }>

  const preview = await countWouldCancel(db, tenantId, importWindow, parsedBookings)
  if (shouldTripMassCancelGuard(existing.length, preview)) {
    await recordNbSyncRun(db, {
      layer: 'batch',
      startedAt,
      ok: false,
      code: 'ROWDROP_GUARD',
      rows: parsedBookings.length,
      message: `wouldCancel=${preview} existing=${existing.length}`,
    })
    return { cancelled: 0, guarded: true }
  }

  const cancelled = await softCancelDisappearedBookings(db, tenantId, importWindow, batchId, parsedBookings)
  return { cancelled, guarded: false }
}

async function countWouldCancel(
  db: DbClient,
  tenantId: number,
  importWindow: ImportWindow,
  parsedBookings: ParsedBooking[]
): Promise<number> {
  const existing = (await db
    .prepare(
      `SELECT nightsbridge_booking_id, guest_name_norm, check_in, check_out, suite_or_unit_norm
       FROM bookings
       WHERE tenant_id = ? AND status != 'cancelled' AND check_in >= ? AND check_out <= ?`
    )
    .all(tenantId, importWindow.minDate, importWindow.maxDate)) as Array<{
    nightsbridge_booking_id: string | null
    guest_name_norm: string
    check_in: string
    check_out: string
    suite_or_unit_norm: string
  }>

  let would = 0
  for (const row of existing) {
    const exists = parsedBookings.some((parsed) => {
      if (row.nightsbridge_booking_id && parsed.bookingId) {
        return row.nightsbridge_booking_id === parsed.bookingId
      }
      return (
        parsed.guestName?.toLowerCase().trim() === row.guest_name_norm &&
        parsed.checkInDate === row.check_in &&
        parsed.checkOutDate === row.check_out &&
        parsed.suiteOrUnit?.toLowerCase().trim() === row.suite_or_unit_norm
      )
    })
    if (!exists) would += 1
  }
  return would
}

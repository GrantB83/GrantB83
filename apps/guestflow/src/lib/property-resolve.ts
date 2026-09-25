/**
 * Lockbox-only property resolver.
 * Cottage 278 vs Main House 279 comes ONLY from property_access_codes.lockbox.property.
 * Never infer property from suite-name substrings.
 */

import type { DbClient } from './db'
import { suiteMatches } from './access-codes'
import {
  ACCESS_CODE_PLACEHOLDER,
  PROPERTIES,
  type ResolvedAccessCodes,
} from './access-codes-schema'
import { resolveAccessCodes } from './access-codes'
import { CODES_UNRESOLVED_REASON } from './booking-filters'

export type PropertyKey = typeof PROPERTIES.COTTAGE | typeof PROPERTIES.MAIN_HOUSE

export const UNKNOWN_PROPERTY_LABEL = 'Property unknown – check suite'
export { CODES_UNRESOLVED_REASON }

export interface PropertyAccessLockboxRow {
  property: string
  suite: string
}

export function propertyDisplayName(key: PropertyKey | null): string {
  if (key === PROPERTIES.COTTAGE) {
    return process.env.PROPERTY_NAME_COTTAGE?.trim() || 'Cottage (278 Blue Crane)'
  }
  if (key === PROPERTIES.MAIN_HOUSE) {
    return process.env.PROPERTY_NAME_MAIN?.trim() || 'Main House (279 Blue Crane)'
  }
  return UNKNOWN_PROPERTY_LABEL
}

export function propertyFacingDetails(key: PropertyKey | null): {
  property: PropertyKey | null
  displayName: string
  address: string
  mapsUrl: string
  parkingInstructions: string
} {
  if (!key) {
    return {
      property: null,
      displayName: UNKNOWN_PROPERTY_LABEL,
      address: '',
      mapsUrl: '',
      parkingInstructions: '',
    }
  }
  const isCottage = key === PROPERTIES.COTTAGE
  return {
    property: key,
    displayName: isCottage
      ? (process.env.PROPERTY_NAME_COTTAGE || "The Browns' Cottage Suites")
      : (process.env.PROPERTY_NAME_MAIN || "The Browns' Luxury Suites"),
    address: isCottage
      ? (process.env.PROPERTY_ADDRESS_COTTAGE || '278 Blue Crane Drive, Dullstroom')
      : (process.env.PROPERTY_ADDRESS_MAIN || '279 Blue Crane Drive, Dullstroom'),
    mapsUrl: isCottage
      ? (process.env.PROPERTY_MAPS_URL_COTTAGE || 'https://maps.app.goo.gl/m8WeQe56Fd9AKqpa8')
      : (process.env.PROPERTY_MAPS_URL_MAIN || ''),
    parkingInstructions: isCottage
      ? (process.env.PROPERTY_PARKING_COTTAGE || 'Please ensure you do not obstruct access for other guests. You can park anywhere to the left of the entrance gate or further into the garden on the lawn.')
      : (process.env.PROPERTY_PARKING_MAIN || ''),
  }
}

function asPropertyKey(value: string | null | undefined): PropertyKey | null {
  const normalized = String(value || '').trim()
  if (normalized === PROPERTIES.COTTAGE || normalized === PROPERTIES.MAIN_HOUSE) {
    return normalized
  }
  return null
}

/**
 * Resolve Cottage vs Main House from lockbox rows for this suite.
 * Returns null when there is no row, no property, or more than one property.
 */
export async function resolvePropertyForSuite(
  db: DbClient,
  tenantId: number,
  suite?: string | null
): Promise<PropertyKey | null> {
  const target = String(suite || '').trim()
  if (!target) return null

  let rows: PropertyAccessLockboxRow[] = []
  try {
    rows = ((await db
      .prepare(
        `SELECT property, suite FROM property_access_codes
         WHERE tenant_id = ? AND code_type = 'lockbox' AND TRIM(suite) != ''`
      )
      .all(tenantId)) || []) as PropertyAccessLockboxRow[]
  } catch {
    return null
  }

  const properties = new Set<PropertyKey>()
  for (const row of rows) {
    if (!suiteMatches(row.suite, target)) continue
    const key = asPropertyKey(row.property)
    if (!key) continue
    properties.add(key)
  }

  if (properties.size !== 1) return null
  return [...properties][0]
}

export type ResolvedSuiteCodes =
  | { ok: true; property: PropertyKey; codes: ResolvedAccessCodes }
  | { ok: false; property: null; codes: null; reason: typeof CODES_UNRESOLVED_REASON }

/**
 * Resolve gate/lockbox/wifi only after a unique lockbox property is known.
 * Fail closed: no codes, reason = codes: property unresolved.
 */
export async function resolveAccessCodesForSuite(
  db: DbClient,
  tenantId: number,
  suite?: string | null
): Promise<ResolvedSuiteCodes> {
  const property = await resolvePropertyForSuite(db, tenantId, suite)
  if (!property) {
    return { ok: false, property: null, codes: null, reason: CODES_UNRESOLVED_REASON }
  }
  const codes = await resolveAccessCodes(db, tenantId, property, suite || undefined)
  return { ok: true, property, codes }
}

export async function countOwnerBlocksForDate(
  db: DbClient,
  tenantId: number,
  targetDate: string
): Promise<number> {
  try {
    const row = (await db
      .prepare(
        `SELECT COUNT(*) as count FROM bookings
         WHERE tenant_id = ?
           AND date(check_in) <= date(?)
           AND date(check_out) >= date(?)
           AND UPPER(TRIM(COALESCE(guest_name, ''))) = 'BLOCK'`
      )
      .get(tenantId, targetDate, targetDate)) as { count: number } | undefined
    return Number(row?.count || 0)
  } catch {
    return 0
  }
}

export async function attachResolvedPropertyNames<
  T extends { property_name?: string | null; suite_or_unit?: string | null; room_number?: string | null },
>(db: DbClient, tenantId: number, rows: T[]): Promise<T[]> {
  const resolved: T[] = []
  for (const row of rows) {
    const key = await resolvePropertyForSuite(db, tenantId, row.suite_or_unit || row.room_number)
    resolved.push({
      ...row,
      property_name: propertyDisplayName(key),
    })
  }
  return resolved
}

export function emptyCodesPlaceholder(): ResolvedAccessCodes {
  return {
    gateCode: ACCESS_CODE_PLACEHOLDER,
    doorCode: ACCESS_CODE_PLACEHOLDER,
    wifi: {
      network: ACCESS_CODE_PLACEHOLDER,
      password: ACCESS_CODE_PLACEHOLDER,
    },
  }
}

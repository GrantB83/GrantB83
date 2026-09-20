/**
 * Access Codes Resolution Logic
 *
 * DB-first with env fallback, fail-closed to [ASK STAFF].
 * Never invent codes. Redact live codes in logs/tests.
 *
 * Resolution flow:
 * 1. Query DB for specific property+type+suite
 * 2. If DB row exists → use code_value (even if empty → [ASK STAFF])
 * 3. If NO DB row exists → check global env vars (PROPERTY_GATE_CODE / PROPERTY_DOOR_CODE)
 * 4. If both empty → [ASK STAFF]
 */

import type { DbClient } from './db'
import {
  ACCESS_CODE_PLACEHOLDER,
  PROPERTIES,
  type PropertyAccessCode,
  type ResolvedAccessCodes,
} from './access-codes-schema'

/**
 * Get a single access code from DB for property+type+suite
 */
export async function getAccessCode(
  db: DbClient,
  tenantId: number,
  property: string,
  codeType: 'gate_pinpad' | 'lockbox',
  suite: string = ''
): Promise<string | null> {
  try {
    const row = await db
      .prepare(
        `SELECT code_value FROM property_access_codes 
         WHERE tenant_id = ? AND property = ? AND code_type = ? AND suite = ?`
      )
      .get(tenantId, property, codeType, suite) as PropertyAccessCode | undefined

    if (row) {
      // DB row exists → use code_value (even if empty)
      return row.code_value || null
    }

    // NO DB row → caller should check env fallback
    return null
  } catch (error) {
    // DB query failed → return null so caller can try env fallback
    console.error(`[access-codes] DB query failed for ${property}/${codeType}/${suite}:`, error)
    return null
  }
}

/**
 * Resolve all access codes for a property and optional suite
 * Returns { gateCode, doorCode, lockboxCode? }
 */
export async function resolveAccessCodes(
  db: DbClient,
  tenantId: number,
  property: string,
  suite?: string
): Promise<ResolvedAccessCodes> {
  // Resolve gate code
  let gateCode: string | null = await getAccessCode(db, tenantId, property, 'gate_pinpad', '')
  
  if (gateCode === null) {
    // NO DB row → check env fallback
    gateCode = process.env.PROPERTY_GATE_CODE?.trim() || null
  }

  // Resolve door code (currently same as gate for most properties)
  let doorCode: string | null = await getAccessCode(db, tenantId, property, 'gate_pinpad', '')
  
  if (doorCode === null) {
    doorCode = process.env.PROPERTY_DOOR_CODE?.trim() || process.env.PROPERTY_GATE_CODE?.trim() || null
  }

  // Resolve suite-specific lockbox code (if applicable)
  let lockboxCode: string | null = null
  if (suite) {
    lockboxCode = await getAccessCode(db, tenantId, property, 'lockbox', suite)
    if (lockboxCode === null) {
      // NO DB row for suite-specific lockbox → fail-closed (no env fallback for lockboxes)
      lockboxCode = ACCESS_CODE_PLACEHOLDER
    }
  }

  return {
    gateCode: gateCode || ACCESS_CODE_PLACEHOLDER,
    doorCode: doorCode || ACCESS_CODE_PLACEHOLDER,
    ...(lockboxCode !== null ? { lockboxCode } : {}),
  }
}

/**
 * Upsert an access code (staff edit)
 */
export async function upsertAccessCode(
  db: DbClient,
  tenantId: number,
  property: string,
  codeType: 'gate_pinpad' | 'lockbox',
  suite: string,
  codeValue: string,
  staffId: string
): Promise<{ success: boolean; updated_at: string; error?: string }> {
  try {
    const trimmedCode = codeValue.trim()
    
    if (!trimmedCode) {
      return {
        success: false,
        updated_at: '',
        error: 'Code value cannot be empty',
      }
    }

    const now = new Date().toISOString()

    // Upsert code
    await db
      .prepare(
        `INSERT INTO property_access_codes 
         (tenant_id, property, code_type, suite, code_value, last_updated_at, last_updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(tenant_id, property, code_type, suite) 
         DO UPDATE SET 
           code_value = excluded.code_value,
           last_updated_at = excluded.last_updated_at,
           last_updated_by = excluded.last_updated_by`
      )
      .run(tenantId, property, codeType, suite, trimmedCode, now, staffId)

    // Insert audit log entry (metadata only, no code value)
    await db
      .prepare(
        `INSERT INTO access_code_audit_log 
         (tenant_id, property, code_type, suite, action, changed_at, changed_by)
         VALUES (?, ?, ?, ?, 'update', ?, ?)`
      )
      .run(tenantId, property, codeType, suite, now, staffId)

    return {
      success: true,
      updated_at: now,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[access-codes] Upsert failed:', message)
    return {
      success: false,
      updated_at: '',
      error: message,
    }
  }
}

/**
 * Get audit log entries for last N days
 */
export async function getAuditLog(
  db: DbClient,
  tenantId: number,
  days: number = 90
): Promise<Array<{
  property: string
  code_type: string
  suite: string
  changed_at: string
  changed_by: string | null
  action: string
  notes: string | null
}>> {
  try {
    const rows = await db
      .prepare(
        `SELECT property, code_type, suite, changed_at, changed_by, action, notes
         FROM access_code_audit_log
         WHERE tenant_id = ? AND changed_at >= datetime('now', '-' || ? || ' days')
         ORDER BY changed_at DESC
         LIMIT 100`
      )
      .all(tenantId, days)

    return rows as any[]
  } catch (error) {
    console.error('[access-codes] Audit log query failed:', error)
    return []
  }
}

/**
 * Get all access codes for a tenant (staff UI)
 */
export async function getAllAccessCodes(
  db: DbClient,
  tenantId: number
): Promise<PropertyAccessCode[]> {
  try {
    const rows = await db
      .prepare(
        `SELECT id, tenant_id, property, code_type, suite, code_value, 
                last_updated_at, last_updated_by, created_at
         FROM property_access_codes
         WHERE tenant_id = ?
         ORDER BY property, code_type, suite`
      )
      .all(tenantId)

    return rows as PropertyAccessCode[]
  } catch (error) {
    console.error('[access-codes] Get all codes failed:', error)
    return []
  }
}

/**
 * Access Codes Source of Record - TypeScript Schema
 *
 * DB-first with env fallback, fail-closed to [ASK STAFF].
 * Never invent codes. Redact live codes in logs/tests.
 */

export interface PropertyAccessCode {
  id: number
  tenant_id: number
  property: string // 'cottage' | 'main-house'
  code_type: 'gate_pinpad' | 'lockbox'
  suite: string // '' (empty string) for gates, actual suite name for lockboxes
  code_value: string
  last_updated_at: string // ISO datetime
  last_updated_by: string | null
  created_at: string // ISO datetime
}

export interface AccessCodeAuditLog {
  id: number
  tenant_id: number
  property: string
  code_type: 'gate_pinpad' | 'lockbox'
  suite: string // '' for gates, suite name for lockboxes
  action: 'create' | 'update'
  changed_at: string // ISO datetime
  changed_by: string | null
  notes: string | null
}

export interface ResolvedAccessCodes {
  gateCode: string // DB value, env fallback, or '[ASK STAFF]'
  doorCode: string // DB value, env fallback, or '[ASK STAFF]'
  lockboxCode?: string // Suite-specific lockbox code (if applicable)
}

export interface AccessCodeUpsertRequest {
  property: string
  code_type: 'gate_pinpad' | 'lockbox'
  suite: string // '' for gates, actual suite name for lockboxes
  code: string
}

export interface AccessCodeUpsertResponse {
  success: boolean
  updated_at: string
  redacted_code: string // Always '****' for security
  error?: string
}

export interface AccessCodeAuditResponse {
  logs: Array<{
    property: string
    code_type: string
    suite: string
    changed_at: string
    changed_by: string | null
    action: string
    notes: string | null
  }>
  total: number
}

/**
 * Constants for access code resolution
 */
export const ACCESS_CODE_PLACEHOLDER = '[ASK STAFF]'
export const ACCESS_CODE_REDACTED = '****'

/**
 * Property identifiers matching booking.property field
 */
export const PROPERTIES = {
  COTTAGE: 'cottage',
  MAIN_HOUSE: 'main-house',
} as const

/**
 * Gate pinpad identifiers (for documentation)
 */
export const GATE_PINPADS = {
  COTTAGE_ENTRANCE: '278 Blue Crane', // Cottage entrance
  MAIN_HOUSE_ENTRANCE: '279 Blue Crane', // Main house entrance
} as const

/**
 * Access Codes Source of Record - TypeScript Schema
 *
 * DB-first with env fallback, fail-closed to [ASK STAFF].
 * Never invent codes. Redact live codes in logs/tests.
 *
 * Supported code_type values:
 * - 'gate_pinpad': Gate entry codes (suite='')
 * - 'lockbox': Suite-specific lockbox codes (suite=actual name)
 * - 'wifi_network': WiFi network name/SSID per property (suite='')
 * - 'wifi_password': WiFi password per property (suite='')
 */

export interface PropertyAccessCode {
  id: number
  tenant_id: number
  property: string // 'cottage' | 'main-house'
  code_type: 'gate_pinpad' | 'lockbox' | 'wifi_network' | 'wifi_password'
  suite: string // '' (empty string) for gates and WiFi, actual suite name for lockboxes
  code_value: string
  last_updated_at: string // ISO datetime
  last_updated_by: string | null
  created_at: string // ISO datetime
}

export interface AccessCodeAuditLog {
  id: number
  tenant_id: number
  property: string
  code_type: 'gate_pinpad' | 'lockbox' | 'wifi_network' | 'wifi_password'
  suite: string // '' for gates and WiFi, suite name for lockboxes
  action: 'create' | 'update'
  changed_at: string // ISO datetime
  changed_by: string | null
  notes: string | null
}

export interface ResolvedAccessCodes {
  gateCode: string // DB value, env fallback, or '[ASK STAFF]'
  doorCode: string // DB value, env fallback, or '[ASK STAFF]'
  lockboxCode?: string // Suite-specific lockbox code (if applicable)
  wifi: {
    network: string // DB value, env fallback, or '[ASK STAFF]'
    password: string // DB value, env fallback, or '[ASK STAFF]'
  }
}

export interface AccessCodeUpsertRequest {
  property: string
  code_type: 'gate_pinpad' | 'lockbox' | 'wifi_network' | 'wifi_password'
  suite: string // '' for gates and WiFi, actual suite name for lockboxes
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

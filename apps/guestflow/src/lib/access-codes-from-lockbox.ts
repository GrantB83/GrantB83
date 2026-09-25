import type { DbClient } from '@/lib/db'
import { resolveAccessCodes } from '@/lib/access-codes'
import { ACCESS_CODE_PLACEHOLDER, type ResolvedAccessCodes } from '@/lib/access-codes-schema'

export interface LockboxCodeResolution {
  propertyResolved: boolean
  property: 'cottage' | 'main-house' | null
  codes: ResolvedAccessCodes | null
  reason: string
}

/**
 * Normalize a suite label for exact comparison only.
 * Strips known prefixes so "Cottage Suites - Falcon" equals "Falcon".
 * Does NOT infer cottage vs main-house from the suite string.
 */
export function normalizeSuiteExact(suite: string): string {
  return String(suite || '')
    .toLowerCase()
    .replace(/^cottage\s+suites?\s*-?\s*/i, '')
    .replace(/^main\s+house\s*-?\s*/i, '')
    .trim()
}

function emptyCodes(): ResolvedAccessCodes {
  return {
    gateCode: ACCESS_CODE_PLACEHOLDER,
    doorCode: ACCESS_CODE_PLACEHOLDER,
    wifi: {
      network: ACCESS_CODE_PLACEHOLDER,
      password: ACCESS_CODE_PLACEHOLDER,
    },
  }
}

/**
 * Resolve access codes from the lockbox row's property field only.
 * If property is missing or ambiguous, return no codes.
 * Never match Cottage vs Main House on suite-name substrings.
 */
export async function resolveCodesFromLockboxProperty(
  db: DbClient,
  tenantId: number,
  suite: string | null | undefined
): Promise<LockboxCodeResolution> {
  const target = normalizeSuiteExact(suite || '')
  if (!target) {
    return {
      propertyResolved: false,
      property: null,
      codes: null,
      reason: 'codes: property unresolved (no suite)',
    }
  }

  const rows = ((await db
    .prepare(
      `SELECT property, suite, code_value
       FROM property_access_codes
       WHERE tenant_id = ? AND code_type = 'lockbox' AND suite <> ''`
    )
    .all(tenantId)) || []) as Array<{ property: string; suite: string; code_value: string }>

  const matches = rows.filter((row) => normalizeSuiteExact(row.suite) === target)
  if (matches.length === 0) {
    return {
      propertyResolved: false,
      property: null,
      codes: null,
      reason: 'codes: property unresolved (no lockbox row)',
    }
  }

  const properties = [...new Set(matches.map((row) => String(row.property || '').toLowerCase()))]
  if (properties.length !== 1 || (properties[0] !== 'cottage' && properties[0] !== 'main-house')) {
    return {
      propertyResolved: false,
      property: null,
      codes: null,
      reason: 'codes: property unresolved',
    }
  }

  const property = properties[0] as 'cottage' | 'main-house'
  const codes = await resolveAccessCodes(db, tenantId, property, suite || undefined)
  return {
    propertyResolved: true,
    property,
    codes,
    reason: '',
  }
}

export function codesOrEmpty(resolution: LockboxCodeResolution): ResolvedAccessCodes {
  return resolution.codes || emptyCodes()
}

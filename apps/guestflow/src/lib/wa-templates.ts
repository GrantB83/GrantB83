import type { DbClient } from '@/lib/db'
import { ensureSprint2WhatsappSchema } from '@/lib/sprint2-schema'
import { isWhatsAppApproved } from '@/lib/wa-templates-seed'
import { GRANT_REVIEW_URL } from '@/lib/wa-templates-seed'
import { resolveAccessCodesForSuite, type PropertyKey } from '@/lib/property-resolve'
import { ACCESS_CODE_PLACEHOLDER } from '@/lib/access-codes-schema'

export interface WaTemplateRow {
  id: number
  tenant_id: number
  name: string
  category: string
  language: string
  body: string
  variable_mapping: string
  content_sid: string | null
  approval_status: string
  whatsapp_approval_status: string
  last_synced_at: string | null
}

export function parseVariableMapping(raw: string | null | undefined): Record<string, string> {
  try {
    const parsed = JSON.parse(raw || '{}')
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {}
  } catch {
    return {}
  }
}

export function filterPickerTemplates(rows: WaTemplateRow[]): WaTemplateRow[] {
  return rows.filter((row) => isWhatsAppApproved(row.whatsapp_approval_status))
}

export async function listWaTemplates(
  db: DbClient,
  tenantId: number,
  pickerOnly = false
): Promise<WaTemplateRow[]> {
  await ensureSprint2WhatsappSchema(db, tenantId)
  const rows = ((await db
    .prepare(
      `SELECT id, tenant_id, name, category, language, body, variable_mapping,
              content_sid, approval_status, whatsapp_approval_status, last_synced_at
       FROM wa_templates
       WHERE tenant_id = ?
       ORDER BY id ASC`
    )
    .all(tenantId)) || []) as WaTemplateRow[]
  return pickerOnly ? filterPickerTemplates(rows) : rows
}

export async function getWaTemplateByName(
  db: DbClient,
  tenantId: number,
  name: string
): Promise<WaTemplateRow | null> {
  await ensureSprint2WhatsappSchema(db, tenantId)
  const row = (await db
    .prepare(
      `SELECT id, tenant_id, name, category, language, body, variable_mapping,
              content_sid, approval_status, whatsapp_approval_status, last_synced_at
       FROM wa_templates WHERE tenant_id = ? AND name = ?`
    )
    .get(tenantId, name)) as WaTemplateRow | undefined
  return row || null
}

export interface TemplateFillContext {
  guestName?: string | null
  suite?: string | null
  checkIn?: string | null
  checkOut?: string | null
  bookingId?: number | null
}

export interface FilledTemplate {
  name: string
  body: string
  variables: Record<string, string>
  rendered: string
  codesIncluded: boolean
  propertyResolved: boolean
  property: PropertyKey | null
  reason: string
}

function displayNameForProperty(property: 'cottage' | 'main-house' | null): string {
  if (property === 'cottage') {
    return process.env.PROPERTY_NAME_COTTAGE || "The Browns' Cottage Suites"
  }
  if (property === 'main-house') {
    return process.env.PROPERTY_NAME_MAIN || "The Browns' Luxury Suites"
  }
  return ''
}

function addressForProperty(property: 'cottage' | 'main-house' | null): string {
  if (property === 'cottage') {
    return process.env.PROPERTY_ADDRESS_COTTAGE || '278 Blue Crane Drive, Dullstroom'
  }
  if (property === 'main-house') {
    return process.env.PROPERTY_ADDRESS_MAIN || '279 Blue Crane Drive, Dullstroom'
  }
  return ''
}

function parkingForProperty(property: 'cottage' | 'main-house' | null): string {
  if (property === 'cottage') {
    return (
      process.env.PROPERTY_PARKING_COTTAGE ||
      'Park left of the entrance gate or further into the garden on the lawn. Do not obstruct other guests.'
    )
  }
  return process.env.PROPERTY_PARKING_MAIN || 'ask staff'
}

export async function fillTemplateVariables(
  db: DbClient,
  tenantId: number,
  template: WaTemplateRow,
  context: TemplateFillContext
): Promise<FilledTemplate> {
  const mapping = parseVariableMapping(template.variable_mapping)
  const needsCodes = Object.values(mapping).some((key) =>
    ['gate_code', 'lockbox_code', 'door_code', 'wifi_network', 'wifi_password'].includes(key)
  )
  const resolved = await resolveAccessCodesForSuite(db, tenantId, context.suite)
  const property = resolved.property
  const propertyResolved = resolved.ok
  const fieldValues: Record<string, string> = {
    guest_name: context.guestName || '',
    suite: context.suite || '',
    check_in: context.checkIn ? String(context.checkIn).slice(0, 10) : '',
    check_out: context.checkOut ? String(context.checkOut).slice(0, 10) : '',
    property_name: displayNameForProperty(property),
    property_address: addressForProperty(property),
    parking: parkingForProperty(property),
    review_url: GRANT_REVIEW_URL,
    gate_code: '',
    lockbox_code: '',
    door_code: '',
    wifi_network: '',
    wifi_password: '',
  }

  const codesIncluded = Boolean(propertyResolved && resolved.codes)
  if (codesIncluded && resolved.codes) {
    fieldValues.gate_code = resolved.codes.gateCode
    fieldValues.door_code = resolved.codes.doorCode
    fieldValues.lockbox_code = resolved.codes.lockboxCode || resolved.codes.doorCode
    fieldValues.wifi_network = resolved.codes.wifi.network
    fieldValues.wifi_password = resolved.codes.wifi.password
  } else if (needsCodes) {
    fieldValues.gate_code = ACCESS_CODE_PLACEHOLDER
    fieldValues.lockbox_code = ACCESS_CODE_PLACEHOLDER
    fieldValues.door_code = ACCESS_CODE_PLACEHOLDER
    fieldValues.wifi_network = ACCESS_CODE_PLACEHOLDER
    fieldValues.wifi_password = ACCESS_CODE_PLACEHOLDER
  }

  const variables: Record<string, string> = {}
  for (const [n, key] of Object.entries(mapping)) {
    variables[n] = fieldValues[key] ?? ''
  }

  const rendered = template.body.replace(/\{\{(\d+)\}\}/g, (_, n: string) => variables[n] ?? '')

  return {
    name: template.name,
    body: template.body,
    variables,
    rendered,
    codesIncluded: codesIncluded && needsCodes,
    propertyResolved,
    property,
    reason: resolved.ok ? '' : resolved.reason,
  }
}

export async function syncTemplateApprovalsReadonly(
  db: DbClient,
  tenantId: number
): Promise<{ updated: number; fetched: number; skipped: boolean; error?: string }> {
  await ensureSprint2WhatsappSchema(db, tenantId)
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!accountSid || !authToken) {
    return { updated: 0, fetched: 0, skipped: true }
  }

  const rows = await listWaTemplates(db, tenantId, false)
  const withSid = rows.filter((row) => row.content_sid)
  if (withSid.length === 0) {
    return { updated: 0, fetched: 0, skipped: false }
  }

  const auth = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
  let updated = 0
  const now = new Date().toISOString()

  for (const row of withSid) {
    try {
      const url = `https://content.twilio.com/v1/Content/${row.content_sid}/ApprovalRequests`
      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: auth },
      })
      if (!response.ok) continue
      const data = (await response.json()) as {
        whatsapp?: { status?: string }
        status?: string
      }
      const status = String(data.whatsapp?.status || data.status || '').toLowerCase() || 'unsubmitted'
      await db
        .prepare(
          `UPDATE wa_templates
           SET whatsapp_approval_status = ?, last_synced_at = ?
           WHERE id = ?`
        )
        .run(status, now, row.id)
      updated += 1
    } catch {
      // read-only best effort
    }
  }

  return { updated, fetched: withSid.length, skipped: false }
}

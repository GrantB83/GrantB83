import type { DbClient } from '@/lib/db'
import { ensureSprint2WhatsappSchema } from '@/lib/sprint2-schema'
import { getWaTemplateByName } from '@/lib/wa-templates'
import {
  GRANT_APPROVED_TEMPLATES,
  GRANT_REVIEW_URL,
  type GrantApprovedTemplateSeed,
  type WaTemplateCategory,
} from '@/lib/wa-templates-seed'

export const GRANT_GO_AHEAD_FLAG = '--i-have-grant-go-ahead'

export const EXPECTED_WA_TEMPLATE_NAMES = GRANT_APPROVED_TEMPLATES.map((t) => t.name)

export function hasGrantGoAhead(argv: string[] = process.argv): boolean {
  return argv.includes(GRANT_GO_AHEAD_FLAG)
}

export function validateGrantApprovedTemplates(
  templates: GrantApprovedTemplateSeed[] = GRANT_APPROVED_TEMPLATES
): { ok: true } | { ok: false; error: string } {
  if (templates.length !== 7) {
    return { ok: false, error: `Expected 7 Grant-approved templates, got ${templates.length}` }
  }

  const names = new Set<string>()
  for (const template of templates) {
    if (names.has(template.name)) {
      return { ok: false, error: `Duplicate template name: ${template.name}` }
    }
    names.add(template.name)
  }

  const review = templates.find((t) => t.name === 'browns_review_request')
  if (!review) {
    return { ok: false, error: 'Missing browns_review_request template' }
  }
  if (!review.body.includes(GRANT_REVIEW_URL)) {
    return {
      ok: false,
      error: `browns_review_request must include review URL exactly: ${GRANT_REVIEW_URL}`,
    }
  }

  return { ok: true }
}

const SAMPLE_BY_FIELD: Record<string, string> = {
  guest_name: 'Alex',
  property_name: "The Browns' Luxury Suites",
  check_in: '2026-10-01',
  check_out: '2026-10-03',
  suite: 'Firefly',
  property_address: '279 Blue Crane Drive, Dullstroom',
  parking: 'Park on the lawn near the entrance',
  gate_code: '1234',
  lockbox_code: '5678',
  wifi_network: 'BrownsGuest',
  wifi_password: 'guest-wifi-sample',
}

export function twilioWhatsappCategory(category: WaTemplateCategory): 'UTILITY' | 'MARKETING' {
  return category === 'marketing' ? 'MARKETING' : 'UTILITY'
}

export function buildTwilioContentCreatePayload(template: GrantApprovedTemplateSeed): {
  friendly_name: string
  language: string
  variables: Record<string, string>
  types: { 'twilio/text': { body: string } }
} {
  const variables: Record<string, string> = {}
  for (const [placeholder, fieldKey] of Object.entries(template.variableMapping)) {
    variables[placeholder] = SAMPLE_BY_FIELD[fieldKey] ?? fieldKey.replace(/_/g, ' ')
  }

  return {
    friendly_name: template.name,
    language: template.language,
    variables,
    types: {
      'twilio/text': {
        body: template.body,
      },
    },
  }
}

export interface TwilioAuth {
  accountSid: string
  authToken: string
}

export function twilioBasicAuthHeader(auth: TwilioAuth): string {
  return `Basic ${Buffer.from(`${auth.accountSid}:${auth.authToken}`).toString('base64')}`
}

export type FetchFn = typeof fetch

export interface SubmitTemplateResult {
  name: string
  contentSid: string
  whatsappStatus: string
  action: 'created' | 'synced'
}

async function parseTwilioError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: string; detail?: string }
    return data.message || data.detail || response.statusText
  } catch {
    return response.statusText
  }
}

export async function createTwilioContentResource(
  fetchImpl: FetchFn,
  auth: TwilioAuth,
  template: GrantApprovedTemplateSeed
): Promise<string> {
  const payload = buildTwilioContentCreatePayload(template)
  const response = await fetchImpl('https://content.twilio.com/v1/Content', {
    method: 'POST',
    headers: {
      Authorization: twilioBasicAuthHeader(auth),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(
      `Twilio Content create failed for ${template.name} (${response.status}): ${await parseTwilioError(response)}`
    )
  }

  const data = (await response.json()) as { sid?: string }
  const sid = data.sid?.trim()
  if (!sid) {
    throw new Error(`Twilio Content create for ${template.name} returned no sid`)
  }
  return sid
}

export async function submitWhatsappApprovalRequest(
  fetchImpl: FetchFn,
  auth: TwilioAuth,
  contentSid: string,
  template: GrantApprovedTemplateSeed
): Promise<string> {
  const response = await fetchImpl(
    `https://content.twilio.com/v1/Content/${contentSid}/ApprovalRequests/whatsapp`,
    {
      method: 'POST',
      headers: {
        Authorization: twilioBasicAuthHeader(auth),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: template.name,
        category: twilioWhatsappCategory(template.category),
      }),
    }
  )

  if (!response.ok) {
    throw new Error(
      `WhatsApp approval submit failed for ${template.name} (${response.status}): ${await parseTwilioError(response)}`
    )
  }

  const data = (await response.json()) as { status?: string; whatsapp?: { status?: string } }
  return String(data.whatsapp?.status || data.status || 'submitted').toLowerCase()
}

export async function fetchWhatsappApprovalStatus(
  fetchImpl: FetchFn,
  auth: TwilioAuth,
  contentSid: string
): Promise<string> {
  const response = await fetchImpl(
    `https://content.twilio.com/v1/Content/${contentSid}/ApprovalRequests`,
    {
      method: 'GET',
      headers: { Authorization: twilioBasicAuthHeader(auth) },
    }
  )

  if (!response.ok) {
    throw new Error(
      `Approval status fetch failed for ${contentSid} (${response.status}): ${await parseTwilioError(response)}`
    )
  }

  const data = (await response.json()) as {
    whatsapp?: { status?: string }
    status?: string
  }
  return String(data.whatsapp?.status || data.status || 'unknown').toLowerCase()
}

async function persistContentSid(
  db: DbClient,
  tenantId: number,
  name: string,
  contentSid: string,
  whatsappStatus: string
): Promise<void> {
  const now = new Date().toISOString()
  await db
    .prepare(
      `UPDATE wa_templates
       SET content_sid = ?, whatsapp_approval_status = ?, last_synced_at = ?
       WHERE tenant_id = ? AND name = ?`
    )
    .run(contentSid, whatsappStatus, now, tenantId, name)
}

export interface RunWaTemplateSubmitOptions {
  auth: TwilioAuth
  fetchImpl?: FetchFn
  db?: DbClient | null
  tenantId?: number
  persistToDatabase?: boolean
  templates?: GrantApprovedTemplateSeed[]
}

export async function runWaTemplateSubmit(
  options: RunWaTemplateSubmitOptions
): Promise<SubmitTemplateResult[]> {
  const fetchImpl = options.fetchImpl ?? fetch
  const templates = options.templates ?? GRANT_APPROVED_TEMPLATES
  const validation = validateGrantApprovedTemplates(templates)
  if (!validation.ok) {
    throw new Error(validation.error)
  }

  const tenantId = options.tenantId ?? 1
  const persist = Boolean(options.persistToDatabase && options.db)

  if (persist && options.db) {
    await ensureSprint2WhatsappSchema(options.db, tenantId)
  }

  const results: SubmitTemplateResult[] = []

  for (const template of templates) {
    let existingSid: string | null = null
    if (options.db) {
      const row = await getWaTemplateByName(options.db, tenantId, template.name)
      existingSid = row?.content_sid?.trim() || null
    }

    if (existingSid) {
      let status = await fetchWhatsappApprovalStatus(fetchImpl, options.auth, existingSid)
      if (status === 'unsubmitted') {
        status = await submitWhatsappApprovalRequest(
          fetchImpl,
          options.auth,
          existingSid,
          template
        )
      }
      if (persist && options.db) {
        await persistContentSid(options.db, tenantId, template.name, existingSid, status)
      }
      results.push({
        name: template.name,
        contentSid: existingSid,
        whatsappStatus: status,
        action: 'synced',
      })
      continue
    }

    const contentSid = await createTwilioContentResource(fetchImpl, options.auth, template)
    let whatsappStatus = await submitWhatsappApprovalRequest(
      fetchImpl,
      options.auth,
      contentSid,
      template
    )

    if (!whatsappStatus || whatsappStatus === 'submitted') {
      whatsappStatus = await fetchWhatsappApprovalStatus(fetchImpl, options.auth, contentSid)
    }

    if (persist && options.db) {
      await persistContentSid(options.db, tenantId, template.name, contentSid, whatsappStatus)
    }

    results.push({
      name: template.name,
      contentSid,
      whatsappStatus,
      action: 'created',
    })
  }

  return results
}

export function formatSubmitResultLine(result: SubmitTemplateResult): string {
  return `${result.name} → ${result.contentSid} (${result.whatsappStatus}) [${result.action}]`
}

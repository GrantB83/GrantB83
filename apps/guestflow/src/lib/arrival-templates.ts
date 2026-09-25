/**
 * Deterministic arrival-draft fills. No LLM.
 * Staff may edit the resulting body before Approve&Send.
 */

import {
  ACCESS_CODES_BLOCK_END,
  ACCESS_CODES_BLOCK_START,
  CHECK_IN_TIME_LINE,
  CODE_MISSING_PLACEHOLDER,
  type ArrivalStageId,
} from './arrival-drafts-config'
import { CODES_UNRESOLVED_REASON } from './booking-filters'

const ARRIVAL_DRAFT_BODIES: Record<
  string,
  { body: string; variables: string[] }
> = {
  browns_pre_arrival_welcome: {
    body: `Hi {{guest_first_name}}, we look forward to welcoming you to The Browns.

Stay: {{check_in}} to {{check_out}}
Suite: {{suite}}
Guest portal: {{portal_url}}

Please reply with your estimated arrival time so we can be ready.`,
    variables: ['guest_first_name', 'check_in', 'check_out', 'suite', 'portal_url'],
  },
  browns_checkin_instructions: {
    body: `Check-in for {{suite}} is {{check_in_time}} on {{check_in}}.

Address / directions: {{directions}}
Guest portal: {{portal_url}}

Housekeepers at 279 Blue Crane Drive can show you in until 17:00. After 17:00 use the access-code message.`,
    variables: ['suite', 'check_in_time', 'check_in', 'directions', 'portal_url'],
  },
  browns_access_codes: {
    body: `Access codes for {{suite}}:

{{access_codes_block}}`,
    variables: ['suite', 'access_codes_block'],
  },
  browns_day_of_reminder: {
    body: `Looking forward to seeing you today at {{suite}}.

Check-in: {{check_in_time}}
Directions / portal: {{portal_url}}

Please reply if you are running late.`,
    variables: ['suite', 'check_in_time', 'portal_url'],
  },
}

export function fillNamedTemplate(body: string, vars: Record<string, string>): string {
  let result = body
  for (const [key, value] of Object.entries(vars)) {
    const safe = value == null ? '' : String(value)
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), safe)
  }
  return result
}

function templateBody(name: string): string {
  return ARRIVAL_DRAFT_BODIES[name]?.body || ''
}

export interface ArrivalFillFields {
  guestName: string
  checkIn: string
  checkOut: string
  suite: string
  portalUrl: string
  directions: string
  accessCodesBlock: string
}

export function guestFirstName(guestName: string): string {
  const trimmed = String(guestName || '').trim()
  if (!trimmed) return 'there'
  return trimmed.split(/\s+/)[0]
}

export function formatStayDate(isoDate: string): string {
  const match = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return isoDate || ''
  const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(utc)
}

export function wrapAccessCodesBlock(inner: string): string {
  return `${ACCESS_CODES_BLOCK_START}\n${inner.trim()}\n${ACCESS_CODES_BLOCK_END}`
}

export function unresolvedCodesBlock(): string {
  return wrapAccessCodesBlock(`${CODES_UNRESOLVED_REASON}\n${CODE_MISSING_PLACEHOLDER}`)
}

export function resolvedCodesBlock(codes: {
  gateCode?: string | null
  doorCode?: string | null
  lockboxCode?: string | null
}): string {
  const gate = codes.gateCode?.trim() || CODE_MISSING_PLACEHOLDER
  const door = codes.doorCode?.trim() || CODE_MISSING_PLACEHOLDER
  const lockbox = codes.lockboxCode?.trim() || CODE_MISSING_PLACEHOLDER
  return wrapAccessCodesBlock(
    `Gate: ${gate}\nDoor: ${door}\nLockbox: ${lockbox}`
  )
}

export function replaceAccessCodesBlock(body: string, nextBlock: string): string {
  const start = body.indexOf(ACCESS_CODES_BLOCK_START)
  const end = body.indexOf(ACCESS_CODES_BLOCK_END)
  if (start === -1 || end === -1 || end < start) {
    return `${body.trim()}\n\n${nextBlock}`.trim()
  }
  const after = end + ACCESS_CODES_BLOCK_END.length
  return `${body.slice(0, start)}${nextBlock}${body.slice(after)}`
}

export function fillArrivalStageBody(
  stage: ArrivalStageId,
  fields: ArrivalFillFields
): { body: string; templateName: string } {
  const vars: Record<string, string> = {
    guest_first_name: guestFirstName(fields.guestName),
    guest_name: fields.guestName,
    check_in: formatStayDate(fields.checkIn),
    check_out: formatStayDate(fields.checkOut),
    suite: fields.suite || 'your suite',
    portal_url: fields.portalUrl || 'ask staff for the guest portal link',
    directions: fields.directions || fields.portalUrl || 'see your guest portal',
    check_in_time: CHECK_IN_TIME_LINE,
    access_codes_block: fields.accessCodesBlock,
  }

  if (stage === 't-3') {
    return {
      templateName: 'browns_pre_arrival_welcome',
      body: fillNamedTemplate(templateBody('browns_pre_arrival_welcome'), vars),
    }
  }

  if (stage === 't-1') {
    const body = [
      fillNamedTemplate(templateBody('browns_checkin_instructions'), vars),
      fillNamedTemplate(templateBody('browns_access_codes'), vars),
    ]
      .filter(Boolean)
      .join('\n\n')
    return { templateName: 'browns_checkin_instructions+browns_access_codes', body }
  }

  return {
    templateName: 'browns_day_of_reminder',
    body: fillNamedTemplate(templateBody('browns_day_of_reminder'), vars),
  }
}

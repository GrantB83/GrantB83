/**
 * Internal staff alert mail. Not a guest send — bypasses outbound redirect.
 * Bodies: first name + booking ref + staff link only. Never codes or payment text.
 */

import { sendEmail, type SendEmailResult } from '@/lib/email'

const FORBIDDEN =
  /\b(gate\s*code|door\s*code|lockbox|wifi\s*password|access\s*code|cvv|pan\b|card\s*number|deposit|payout|credit\s*card)\b|ZAR\s*\d/i

export interface StaffAlertBodyInput {
  kind: string
  guestFirstName?: string | null
  bookingRef?: string | null
  staffLink?: string | null
  extraLine?: string | null
}

export function guestFirstName(fullName: string | null | undefined): string {
  const token = String(fullName || '').trim().split(/\s+/)[0] || ''
  return token
}

export function sanitizeAlertText(text: string): string {
  return text
    .split('\n')
    .map((line) => (FORBIDDEN.test(line) ? '' : line))
    .filter((line) => line.trim().length > 0)
    .join('\n')
}

export function composeStaffAlertText(input: StaffAlertBodyInput): { subject: string; text: string } {
  const name = guestFirstName(input.guestFirstName) || 'Guest'
  const ref = String(input.bookingRef || '').trim() || 'unknown'
  const link = String(input.staffLink || '').trim()
  const labels: Record<string, string> = {
    unanswered: 'Unanswered guest message',
    unanswered_digest: 'Overnight unanswered guest messages',
    nb_missed: 'Nightsbridge import missed',
    nb_batch: 'Nightsbridge import failed',
    failed_send: 'Approve & Send failed',
    site_down: 'GuestFlow site down',
    site_recovery: 'GuestFlow site recovered',
    nb_parse_failed: 'Nightsbridge email could not be parsed',
  }
  const subject = labels[input.kind] || 'GuestFlow staff alert'
  const lines = [subject, '', `Guest: ${name}`, `Booking: ${ref}`]
  if (link) lines.push(`Open: ${link}`)
  if (input.extraLine && !FORBIDDEN.test(input.extraLine)) {
    lines.push(input.extraLine)
  }
  return { subject, text: sanitizeAlertText(lines.join('\n')) }
}

export function alertBodyIsSafe(text: string): boolean {
  return !FORBIDDEN.test(text)
}

export async function sendStaffAlertEmail(input: {
  to: string
  kind: string
  guestFirstName?: string | null
  bookingRef?: string | null
  staffLink?: string | null
  extraLine?: string | null
}): Promise<SendEmailResult> {
  const composed = composeStaffAlertText(input)
  if (!alertBodyIsSafe(composed.text)) {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      error: 'Alert body failed safety check',
    }
  }
  return sendEmail({
    to: input.to,
    subject: composed.subject,
    text: composed.text,
    skipRedirect: true,
  })
}

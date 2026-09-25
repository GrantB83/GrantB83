#!/usr/bin/env npx tsx
/**
 * Submit Grant-approved WhatsApp templates via the Twilio Content API.
 *
 * Usage:
 *   npx tsx scripts/submit-wa-templates.ts --i-have-grant-go-ahead
 *
 * Without the flag: exit 1, no network.
 * Creates Content (twilio/text) then POSTs WhatsApp ApprovalRequests.
 * Does not invent ContentSids — prints whatever Twilio returns.
 */

import { GRANT_APPROVED_TEMPLATES } from '../src/lib/wa-templates-seed'

const FLAG = '--i-have-grant-go-ahead'

type CreateResult = {
  name: string
  contentSid?: string
  approvalStatus?: string
  rejectionReason?: string
  error?: string
}

function authHeader(sid: string, token: string): string {
  return 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64')
}

function sampleVariables(mapping: Record<string, string>): Record<string, string> {
  const samples: Record<string, string> = {
    guest_name: 'Alex',
    property_name: 'The Cottages',
    check_in: '2026-10-01',
    check_out: '2026-10-03',
    suite: 'Falcon',
    property_address: '278 Blue Crane Drive, Dullstroom',
    parking: 'Park beside the cottage',
    gate_code: '1234',
    lockbox_code: '5678',
    wifi_network: 'BrownsGuest',
    wifi_password: 'example',
  }
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(mapping)) {
    out[k] = samples[v] || 'sample'
  }
  return out
}

async function createContent(
  sid: string,
  token: string,
  name: string,
  language: string,
  body: string,
  variables: Record<string, string>,
): Promise<{ sid: string }> {
  const res = await fetch('https://content.twilio.com/v1/Content', {
    method: 'POST',
    headers: {
      Authorization: authHeader(sid, token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      friendly_name: name,
      language,
      variables,
      types: {
        'twilio/text': { body },
      },
    }),
  })
  const json = (await res.json()) as { sid?: string; message?: string; code?: number }
  if (!res.ok || !json.sid) {
    throw new Error(`Content create failed (${res.status}): ${json.message || JSON.stringify(json)}`)
  }
  return { sid: json.sid }
}

async function submitWhatsAppApproval(
  sid: string,
  token: string,
  contentSid: string,
  name: string,
  category: 'utility' | 'marketing',
): Promise<{ status?: string; rejection_reason?: string }> {
  const res = await fetch(
    `https://content.twilio.com/v1/Content/${contentSid}/ApprovalRequests/whatsapp`,
    {
      method: 'POST',
      headers: {
        Authorization: authHeader(sid, token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        category: category.toUpperCase(),
      }),
    },
  )
  const json = (await res.json()) as {
    status?: string
    rejection_reason?: string
    whatsapp?: { status?: string; rejection_reason?: string }
    message?: string
  }
  if (!res.ok) {
    throw new Error(`Approval submit failed (${res.status}): ${json.message || JSON.stringify(json)}`)
  }
  return {
    status: json.status || json.whatsapp?.status,
    rejection_reason: json.rejection_reason || json.whatsapp?.rejection_reason,
  }
}

async function fetchApproval(
  sid: string,
  token: string,
  contentSid: string,
): Promise<{ status?: string; rejection_reason?: string }> {
  const res = await fetch(
    `https://content.twilio.com/v1/Content/${contentSid}/ApprovalRequests`,
    {
      headers: { Authorization: authHeader(sid, token) },
    },
  )
  const json = (await res.json()) as {
    whatsapp?: { status?: string; rejection_reason?: string }
    message?: string
  }
  if (!res.ok) {
    throw new Error(`Approval fetch failed (${res.status}): ${json.message || JSON.stringify(json)}`)
  }
  return {
    status: json.whatsapp?.status,
    rejection_reason: json.whatsapp?.rejection_reason,
  }
}

async function findExistingByFriendlyName(
  sid: string,
  token: string,
  name: string,
): Promise<string | undefined> {
  const res = await fetch('https://content.twilio.com/v1/Content?PageSize=50', {
    headers: { Authorization: authHeader(sid, token) },
  })
  const json = (await res.json()) as {
    contents?: Array<{ sid: string; friendly_name?: string }>
  }
  const hit = (json.contents || []).find((c) => c.friendly_name === name)
  return hit?.sid
}

async function main() {
  if (!process.argv.includes(FLAG)) {
    console.error('Refusing to submit WhatsApp templates.')
    console.error(`Pass ${FLAG} only after Grant's final go-ahead.`)
    process.exit(1)
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!accountSid || !authToken) {
    console.error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required.')
    process.exit(1)
  }

  console.log(`Submitting ${GRANT_APPROVED_TEMPLATES.length} Grant-approved templates…`)
  const results: CreateResult[] = []
  let failed = 0

  for (const tpl of GRANT_APPROVED_TEMPLATES) {
    const row: CreateResult = { name: tpl.name }
    try {
      let contentSid = await findExistingByFriendlyName(accountSid, authToken, tpl.name)
      if (contentSid) {
        console.log(`  ${tpl.name}: reuse existing ContentSid ${contentSid}`)
      } else {
        const created = await createContent(
          accountSid,
          authToken,
          tpl.name,
          tpl.language,
          tpl.body,
          sampleVariables(tpl.variableMapping),
        )
        contentSid = created.sid
        console.log(`  ${tpl.name}: created ContentSid ${contentSid}`)
      }
      row.contentSid = contentSid

      try {
        const approval = await submitWhatsAppApproval(
          accountSid,
          authToken,
          contentSid,
          tpl.name,
          tpl.category,
        )
        row.approvalStatus = approval.status || 'submitted'
        row.rejectionReason = approval.rejection_reason
      } catch (err) {
        // Already submitted is OK — fetch status
        const msg = err instanceof Error ? err.message : String(err)
        if (/already|exist|duplicate/i.test(msg)) {
          const fetched = await fetchApproval(accountSid, authToken, contentSid)
          row.approvalStatus = fetched.status || 'already_submitted'
          row.rejectionReason = fetched.rejection_reason
        } else {
          // Still fetch current status for reporting
          try {
            const fetched = await fetchApproval(accountSid, authToken, contentSid)
            row.approvalStatus = fetched.status || `error: ${msg}`
            row.rejectionReason = fetched.rejection_reason
          } catch {
            row.error = msg
            failed += 1
          }
        }
      }

      if (!row.error) {
        const fetched = await fetchApproval(accountSid, authToken, contentSid)
        row.approvalStatus = fetched.status || row.approvalStatus
        row.rejectionReason = fetched.rejection_reason || row.rejectionReason
      }
      console.log(
        `  ${tpl.name}: ContentSid=${row.contentSid} status=${row.approvalStatus || 'unknown'}${
          row.rejectionReason ? ` rejection=${row.rejectionReason}` : ''
        }${row.error ? ` ERROR=${row.error}` : ''}`,
      )
    } catch (err) {
      row.error = err instanceof Error ? err.message : String(err)
      failed += 1
      console.error(`  ${tpl.name}: FAILED ${row.error}`)
    }
    results.push(row)
  }

  console.log('\n=== SUMMARY ===')
  for (const r of results) {
    console.log(
      `${r.name}\t${r.contentSid || 'NO_SID'}\t${r.approvalStatus || 'n/a'}\t${r.error || r.rejectionReason || 'ok'}`,
    )
  }

  if (failed > 0) {
    console.error(`Fail-closed: ${failed} template(s) failed.`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

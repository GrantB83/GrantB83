import { spawnSync } from 'child_process'
import path from 'path'
import { describe, expect, it, vi } from 'vitest'
import {
  GRANT_REVIEW_URL,
  GRANT_APPROVED_TEMPLATES,
} from '@/lib/wa-templates-seed'
import {
  buildTwilioContentCreatePayload,
  GRANT_GO_AHEAD_FLAG,
  hasGrantGoAhead,
  runWaTemplateSubmit,
  validateGrantApprovedTemplates,
  EXPECTED_WA_TEMPLATE_NAMES,
} from '@/lib/wa-template-twilio-submit'

const guestflowRoot = path.resolve(__dirname, '..')
const scriptPath = path.join(guestflowRoot, 'scripts/submit-wa-templates.ts')

describe('submit-wa-templates flag gate', () => {
  it('hasGrantGoAhead is false without the flag', () => {
    expect(hasGrantGoAhead(['node', 'script.ts'])).toBe(false)
    expect(hasGrantGoAhead(['node', 'script.ts', GRANT_GO_AHEAD_FLAG])).toBe(true)
  })

  it('exits 1 without go-ahead flag and does not require Twilio env', () => {
    const env = { ...process.env }
    delete env.TWILIO_ACCOUNT_SID
    delete env.TWILIO_AUTH_TOKEN

    const result = spawnSync('npx', ['tsx', scriptPath], {
      cwd: guestflowRoot,
      env,
      encoding: 'utf8',
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toMatch(/Refusing to submit/)
  })

  it('exits 1 with go-ahead flag when Twilio creds are missing', () => {
    const env = { ...process.env }
    delete env.TWILIO_ACCOUNT_SID
    delete env.TWILIO_AUTH_TOKEN

    const result = spawnSync('npx', ['tsx', scriptPath, GRANT_GO_AHEAD_FLAG], {
      cwd: guestflowRoot,
      env,
      encoding: 'utf8',
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toMatch(/TWILIO_ACCOUNT_SID/)
  })
})

describe('Grant-approved WA template catalogue (dry parse)', () => {
  it('validates exactly seven templates with the static review URL on #7', () => {
    expect(validateGrantApprovedTemplates()).toEqual({ ok: true })
    expect(GRANT_APPROVED_TEMPLATES).toHaveLength(7)
    expect(EXPECTED_WA_TEMPLATE_NAMES[6]).toBe('browns_review_request')

    const review = GRANT_APPROVED_TEMPLATES.find((t) => t.name === 'browns_review_request')
    expect(review?.body).toContain(GRANT_REVIEW_URL)
    expect(review?.body).toBe(
      `Hi {{1}}, if you enjoyed your stay you can leave a review here: ${GRANT_REVIEW_URL} Reply STOP to opt out.`
    )
  })

  it('builds Twilio Content payloads with numeric variable samples', () => {
    const payload = buildTwilioContentCreatePayload(GRANT_APPROVED_TEMPLATES[0])
    expect(payload.friendly_name).toBe('browns_pre_arrival_welcome')
    expect(payload.types['twilio/text'].body).toContain('{{1}}')
    expect(payload.variables['1']).toBeTruthy()
  })
})

vi.mock('@/lib/wa-templates', () => ({
  getWaTemplateByName: vi.fn(),
}))

import { getWaTemplateByName } from '@/lib/wa-templates'

describe('runWaTemplateSubmit idempotency', () => {
  it('skips Twilio create when content_sid is already stored', async () => {
    vi.mocked(getWaTemplateByName).mockImplementation(async (_db, _tenantId, name) => ({
      id: 1,
      tenant_id: 1,
      name,
      category: 'utility',
      language: 'en',
      body: '',
      variable_mapping: '{}',
      content_sid: 'HXexistingaaaaaaaaaaaaaaaaaaaaaaaa',
      approval_status: 'approved_by_grant_unsubmitted',
      whatsapp_approval_status: 'pending',
      last_synced_at: null,
    }))

    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('/ApprovalRequests') && !url.includes('whatsapp')) {
        return new Response(JSON.stringify({ whatsapp: { status: 'pending' } }), {
          status: 200,
        })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    const results = await runWaTemplateSubmit({
      auth: { accountSid: 'AC_test', authToken: 'secret' },
      fetchImpl: fetchImpl as typeof fetch,
      db: {} as never,
      tenantId: 1,
      persistToDatabase: false,
    })

    expect(fetchImpl).toHaveBeenCalledTimes(7)
    expect(results).toHaveLength(7)
    expect(results.every((r) => r.action === 'synced')).toBe(true)
  })
})

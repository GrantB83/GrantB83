import { describe, expect, it } from 'vitest'
import { filterPickerTemplates, type WaTemplateRow } from '@/lib/wa-templates'
import { isWhatsAppApproved, GRANT_APPROVED_TEMPLATES } from '@/lib/wa-templates-seed'

function row(name: string, whatsapp: string): WaTemplateRow {
  return {
    id: 1,
    tenant_id: 1,
    name,
    category: 'utility',
    language: 'en',
    body: 'Hi {{1}}',
    variable_mapping: '{"1":"guest_name"}',
    content_sid: null,
    approval_status: 'approved_by_grant_unsubmitted',
    whatsapp_approval_status: whatsapp,
    last_synced_at: null,
  }
}

describe('WhatsApp template picker filter', () => {
  it('seeds all 7 Grant-approved names and hides them until WhatsApp approved', () => {
    expect(GRANT_APPROVED_TEMPLATES).toHaveLength(7)
    expect(GRANT_APPROVED_TEMPLATES.map((item) => item.name)).toContain('browns_review_request')
    const seeded = GRANT_APPROVED_TEMPLATES.map((item) => row(item.name, 'unsubmitted'))
    expect(filterPickerTemplates(seeded)).toEqual([])
    expect(isWhatsAppApproved('approved_by_grant_unsubmitted')).toBe(false)
  })

  it('shows only WhatsApp-approved templates', () => {
    const rows = [
      row('browns_pre_arrival_welcome', 'unsubmitted'),
      row('browns_checkin_instructions', 'approved'),
      row('browns_access_codes', 'pending'),
    ]
    expect(filterPickerTemplates(rows).map((item) => item.name)).toEqual([
      'browns_checkin_instructions',
    ])
  })
})

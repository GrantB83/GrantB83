export type WaTemplateCategory = 'utility' | 'marketing'

export interface GrantApprovedTemplateSeed {
  name: string
  category: WaTemplateCategory
  language: 'en'
  body: string
  variableMapping: Record<string, string>
}

/**
 * Grant-APPROVED 24 Sep 2026 (tracker). Bodies assembled from in-repo
 * guest-facing copy because the attached tracker had names/categories/URL only.
 * See specs/019-sprint2-whatsapp/seed-sources.md.
 */
export const GRANT_REVIEW_URL = 'https://g.page/r/CZafj2WHDxDjEBM/review'

export const GRANT_APPROVED_TEMPLATES: GrantApprovedTemplateSeed[] = [
  {
    name: 'browns_pre_arrival_welcome',
    category: 'utility',
    language: 'en',
    body: 'Hi {{1}}, we are excited to welcome you to {{2}}. Check-in is from 14:00 on {{3}}. Your suite is {{4}}. Address: {{5}}. Reply here if you need anything.',
    variableMapping: {
      '1': 'guest_name',
      '2': 'property_name',
      '3': 'check_in',
      '4': 'suite',
      '5': 'property_address',
    },
  },
  {
    name: 'browns_checkin_instructions',
    category: 'utility',
    language: 'en',
    body: 'Hi {{1}}, check-in at {{2}} is from 14:00. Address: {{3}}. Once the gate has opened please drive through. Do not wait in the gate. Housekeepers are at 279 Blue Crane Drive until 17:00 and will show you to your room. After 17:00 we send self check-in details. Parking: {{4}}. Thank you.',
    variableMapping: {
      '1': 'guest_name',
      '2': 'property_name',
      '3': 'property_address',
      '4': 'parking',
    },
  },
  {
    name: 'browns_access_codes',
    category: 'utility',
    language: 'en',
    body: 'Hi {{1}}, access for {{2}} at {{3}}: gate {{4}}, lockbox {{5}}, WiFi {{6}} / {{7}}. If a field says ask staff, contact stay@thebrowns.co.za.',
    variableMapping: {
      '1': 'guest_name',
      '2': 'suite',
      '3': 'property_name',
      '4': 'gate_code',
      '5': 'lockbox_code',
      '6': 'wifi_network',
      '7': 'wifi_password',
    },
  },
  {
    name: 'browns_mid_stay_checkin',
    category: 'utility',
    language: 'en',
    body: 'Hi {{1}}, we hope you are enjoying your stay at {{2}}. If you need local recommendations, amenities, or extra towels, reply here and we will help.',
    variableMapping: {
      '1': 'guest_name',
      '2': 'property_name',
    },
  },
  {
    name: 'browns_checkout_reminder',
    category: 'utility',
    language: 'en',
    body: 'Hi {{1}}, a reminder that check-out is by 10:00 on {{2}}. Please leave the suite as briefed. Travel safely.',
    variableMapping: {
      '1': 'guest_name',
      '2': 'check_out',
    },
  },
  {
    name: 'browns_post_stay_thank_you',
    category: 'marketing',
    language: 'en',
    body: 'Hi {{1}}, thank you for staying at The Browns. We hope you enjoyed Dullstroom. Reply STOP to opt out.',
    variableMapping: {
      '1': 'guest_name',
    },
  },
  {
    name: 'browns_review_request',
    category: 'marketing',
    language: 'en',
    body: `Hi {{1}}, if you enjoyed your stay you can leave a review here: ${GRANT_REVIEW_URL} Reply STOP to opt out.`,
    variableMapping: {
      '1': 'guest_name',
    },
  },
]

export const WHATSAPP_APPROVED_STATUSES = new Set(['approved'])

export function isWhatsAppApproved(status?: string | null): boolean {
  return WHATSAPP_APPROVED_STATUSES.has(String(status || '').toLowerCase())
}

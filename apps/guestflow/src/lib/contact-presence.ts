/**
 * Guest contact presence for arrival drafts (#219-aligned validation).
 */

import { validateContactInput } from '@/lib/contact-apply'

export type ContactPresence = {
  phone: string | null
  email: string | null
  hasContact: boolean
  channel: 'whatsapp' | 'email' | null
}

export function hasGuestContact(input: { phone?: string | null; email?: string | null }): boolean {
  const validated = validateContactInput({ ...input, requireOne: false })
  return Boolean(validated.phone || validated.email)
}

export function resolveContactPresence(input: {
  phone?: string | null
  email?: string | null
}): ContactPresence {
  const validated = validateContactInput({ ...input, requireOne: false })
  const phone = validated.phone
  const email = validated.email
  if (phone) {
    return { phone, email, hasContact: true, channel: 'whatsapp' }
  }
  if (email) {
    return { phone: null, email, hasContact: true, channel: 'email' }
  }
  return { phone: null, email: null, hasContact: false, channel: null }
}

/**
 * WhatsApp Web Inbound Allowlist Gate
 * 
 * Fail-closed: Only accept messages from known guests.
 * Three-tier allowlist: guest_contacts → bookings → open Twilio threads
 */

import type { DbClient } from '@/lib/db'
import { normalizeZaE164 } from '@/lib/phone'

export interface AllowlistCheckResult {
  allowed: boolean
  source?: 'guest_contacts' | 'booking' | 'twilio_thread'
  existingTwilioThreadId?: number
}

/**
 * Check if sender is in allowlist (guest_contacts, bookings, or open Twilio thread)
 * Returns allowed=true + source if match found
 * Returns allowed=false if unknown sender (route to triage)
 */
export async function checkWhatsAppWebAllowlist(
  db: DbClient,
  tenantId: number,
  fromNumber: string
): Promise<AllowlistCheckResult> {
  const normalized = normalizeZaE164(fromNumber)
  
  if (!normalized) {
    return { allowed: false }
  }

  // Tier 1: Check guest_contacts
  const guestContact = await db.prepare(`
    SELECT id FROM guest_contacts 
    WHERE tenant_id = ? AND normalized_phone = ?
    LIMIT 1
  `).get(tenantId, normalized) as any

  if (guestContact) {
    return { allowed: true, source: 'guest_contacts' }
  }

  // Tier 2: Check bookings (active bookings only)
  // NOTE: NightsBridge phones often not E.164, so we normalize before compare
  const bookings = await db.prepare(`
    SELECT id, guest_phone FROM bookings
    WHERE tenant_id = ? AND status != 'cancelled' AND guest_phone IS NOT NULL
  `).all(tenantId) as any[]

  for (const booking of bookings) {
    const bookingPhone = normalizeZaE164(booking.guest_phone)
    if (bookingPhone && bookingPhone === normalized) {
      return { allowed: true, source: 'booking' }
    }
  }
  // No booking match after normalization

  // Tier 3: Check for open Twilio thread (for deduplication)
  const twilioThread = await db.prepare(`
    SELECT id FROM inbound_threads
    WHERE from_number = ? AND source = 'twilio_whatsapp' AND status != 'closed'
    ORDER BY last_message_at DESC
    LIMIT 1
  `).get(normalized) as any

  if (twilioThread) {
    return { 
      allowed: true, 
      source: 'twilio_thread',
      existingTwilioThreadId: twilioThread.id
    }
  }

  // Unknown sender - not in allowlist
  return { allowed: false }
}

/**
 * Create triage ticket for unknown WhatsApp Web sender
 */
export async function createTriageTicket(
  db: DbClient,
  tenantId: number,
  fromNumber: string,
  externalMessageId: string,
  timestamp: string,
  metadata: Record<string, any>
): Promise<number> {
  const normalized = normalizeZaE164(fromNumber) || fromNumber

  const description = `Unknown WhatsApp Web sender - awaiting staff approval

Phone: ${normalized}
Message ID: ${externalMessageId}
Timestamp: ${timestamp}
Observed On: ${metadata.observedOn || 'unknown'}

⚠️ Retention: 0 (no persistent guest record until approved)`

  const result = await db.prepare(`
    INSERT INTO guest_tickets (
      tenant_id, guest_name, guest_phone,
      category, priority, status, subject, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    tenantId,
    'Unknown Sender',
    normalized,
    'unknown_whatsapp_web',
    'medium',
    'new',
    `WhatsApp Web Unknown - ${normalized}`,
    description
  )

  return Number(result.lastInsertRowid)
}

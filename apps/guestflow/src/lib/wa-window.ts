/**
 * Delivery-status / resend ports wired to Sprint 2 WhatsApp care window + templates (#218).
 */

import type { DbClient } from '@/lib/db'
import { getCareWindowForThread } from '@/lib/whatsapp-care-window'
import { listWaTemplates } from '@/lib/wa-templates'

export type WindowState = {
  open: boolean
  closesAt?: string | null
}

export type ApprovedTemplate = {
  name: string
  language?: string
}

export async function getWindowState(db: DbClient, threadId: number): Promise<WindowState> {
  const care = await getCareWindowForThread(db, threadId)
  return {
    open: care.state !== 'closed',
    closesAt: care.windowExpiresAt,
  }
}

export async function findApprovedTemplateFor(
  db: DbClient,
  input: {
    threadId: number
    tenantId?: number
    purpose?: string
    body?: string
  }
): Promise<ApprovedTemplate | null> {
  const templates = await listWaTemplates(db, input.tenantId ?? 1, true)
  if (templates.length === 0) return null

  const body = (input.body || '').trim().toLowerCase()
  if (body) {
    const byRendered = templates.find((row) => row.body.trim().toLowerCase() === body)
    if (byRendered) {
      return { name: byRendered.name, language: byRendered.language }
    }
  }

  const preferred =
    templates.find((row) => row.name === 'browns_pre_arrival_welcome') ||
    templates.find((row) => row.category === 'utility') ||
    templates[0]

  return preferred ? { name: preferred.name, language: preferred.language } : null
}

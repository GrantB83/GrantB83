import type { DbClient } from '@/lib/db'
import { ensureSprint2WhatsappSchema } from '@/lib/sprint2-schema'
import type { KnowledgeProperty, KnowledgeSection } from '@/lib/property-knowledge-seed'

export const KNOWLEDGE_PROPERTIES: KnowledgeProperty[] = ['shared', 'cottage', 'main-house']
export const KNOWLEDGE_SECTIONS: KnowledgeSection[] = [
  'local_recommendations',
  'amenities',
  'house_rules',
  'checkin_checkout',
  'contact_escalation',
]

export interface PropertyKnowledgeRow {
  id: number
  tenant_id: number
  property: string
  section: string
  key: string
  value: string
  source: string
  last_updated_at: string | null
  last_updated_by: string | null
}

export const NO_FACT_OUTSIDE_KB_INSTRUCTION =
  "Drafts MUST NOT state facts that are not in this knowledge base. For anything missing or marked ask staff, tell the guest to ask staff."

export async function listPropertyKnowledge(
  db: DbClient,
  tenantId: number
): Promise<PropertyKnowledgeRow[]> {
  await ensureSprint2WhatsappSchema(db, tenantId)
  return ((await db
    .prepare(
      `SELECT id, tenant_id, property, section, key, value, source, last_updated_at, last_updated_by
       FROM property_knowledge
       WHERE tenant_id = ?
       ORDER BY property, section, key`
    )
    .all(tenantId)) || []) as PropertyKnowledgeRow[]
}

export async function upsertPropertyKnowledge(
  db: DbClient,
  tenantId: number,
  input: { property: string; section: string; key: string; value: string; staffId?: string }
): Promise<{ success: boolean; error?: string }> {
  if (!KNOWLEDGE_PROPERTIES.includes(input.property as KnowledgeProperty)) {
    return { success: false, error: 'Unknown property' }
  }
  if (!KNOWLEDGE_SECTIONS.includes(input.section as KnowledgeSection)) {
    return { success: false, error: 'Unknown section' }
  }
  if (!input.key.trim()) {
    return { success: false, error: 'key is required' }
  }
  await ensureSprint2WhatsappSchema(db, tenantId)
  const now = new Date().toISOString()
  await db
    .prepare(
      `INSERT INTO property_knowledge (
         tenant_id, property, section, key, value, source, last_updated_at, last_updated_by
       ) VALUES (?, ?, ?, ?, ?, 'staff', ?, ?)
       ON CONFLICT(tenant_id, property, section, key)
       DO UPDATE SET
         value = excluded.value,
         source = 'staff',
         last_updated_at = excluded.last_updated_at,
         last_updated_by = excluded.last_updated_by`
    )
    .run(
      tenantId,
      input.property,
      input.section,
      input.key.trim(),
      input.value,
      now,
      input.staffId || 'staff'
    )
  return { success: true }
}

export function formatKnowledgeForPrompt(rows: PropertyKnowledgeRow[]): string {
  const lines = [NO_FACT_OUTSIDE_KB_INSTRUCTION, '', 'Knowledge base:']
  for (const row of rows) {
    const value = row.value?.trim() || 'ask staff'
    lines.push(`- [${row.property} / ${row.section} / ${row.key}] ${value}`)
  }
  if (rows.length === 0) {
    lines.push('- (empty — ask staff for every factual question)')
  }
  return lines.join('\n')
}

export async function formatPropertyKnowledgeForPrompt(
  db: DbClient,
  tenantId: number
): Promise<string> {
  const rows = await listPropertyKnowledge(db, tenantId)
  return formatKnowledgeForPrompt(rows)
}

export function buildDraftPrompt(
  promptTemplate: string,
  context: {
    fromNumber: string
    guestName: string | null
    intent: string | null
    confidence: number | null
    messageText: string
    propertyKnowledge: string
  }
): string {
  return promptTemplate
    .replace('{from_number}', context.fromNumber)
    .replace('{guest_name}', context.guestName || 'Guest')
    .replace('{intent}', context.intent || 'general_question')
    .replace('{confidence}', String(context.confidence || 0))
    .replace('{message_text}', context.messageText)
    .replace('{property_knowledge}', context.propertyKnowledge)
}

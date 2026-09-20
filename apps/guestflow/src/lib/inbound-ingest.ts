import type { DbClient } from '@/lib/db'
import { classifyMessage, generateDraftReply } from '@/lib/inbound-classifier'

export interface IngestPayload {
  from: string
  text: string
  timestamp: string
  source: string
  subject?: string
  mediaRefs?: string[]
  externalMessageId?: string
}

export interface IngestResult {
  success: true
  duplicate?: boolean
  messageId: number | bigint
  threadId: number
  classification?: {
    intent: string
    confidence: number
    extractedData: Record<string, unknown>
    missingFields: string[]
  }
  draftReply?: {
    text: string
    requiresApproval: boolean
    missingInfo: string[]
  } | null
  queuedForApproval: boolean
  status: string
}

export async function ingestInboundMessage(
  db: DbClient,
  tenantId: number,
  payload: IngestPayload
): Promise<IngestResult> {
  if (payload.externalMessageId) {
    const existing = (await db
      .prepare(
        `
      SELECT id, thread_id FROM inbound_messages
      WHERE external_message_id = ?
      LIMIT 1
    `
      )
      .get(payload.externalMessageId)) as { id: number; thread_id: number } | undefined

    if (existing) {
      return {
        success: true,
        duplicate: true,
        messageId: existing.id,
        threadId: existing.thread_id,
        queuedForApproval: false,
        status: 'duplicate',
      }
    }
  }

  let thread = (await db
    .prepare(
      `
    SELECT * FROM inbound_threads
    WHERE from_number = ? AND source = ?
    ORDER BY last_message_at DESC
    LIMIT 1
  `
    )
    .get(payload.from, payload.source)) as any

  const metadata = {
    ...(thread?.metadata
      ? (() => {
          try {
            return JSON.parse(thread.metadata)
          } catch {
            return {}
          }
        })()
      : {}),
    ...(payload.subject ? { subject: payload.subject } : {}),
  }

  if (!thread) {
    const threadInsert = await db
      .prepare(
        `
      INSERT INTO inbound_threads (
        tenant_id, source, from_number, status,
        first_message_at, last_message_at, metadata
      ) VALUES (?, ?, ?, 'new', ?, ?, ?)
    `
      )
      .run(
        tenantId,
        payload.source,
        payload.from,
        payload.timestamp,
        payload.timestamp,
        JSON.stringify(metadata)
      )

    thread = await db
      .prepare('SELECT * FROM inbound_threads WHERE id = ?')
      .get(threadInsert.lastInsertRowid)
  } else {
    await db
      .prepare(
        `
      UPDATE inbound_threads
      SET last_message_at = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
      )
      .run(payload.timestamp, JSON.stringify(metadata), thread.id)
  }

  const messageInsert = await db
    .prepare(
      `
    INSERT INTO inbound_messages (
      thread_id, tenant_id, direction, from_number,
      message_text, media_refs, message_timestamp, external_message_id
    ) VALUES (?, ?, 'inbound', ?, ?, ?, ?, ?)
  `
    )
    .run(
      thread.id,
      tenantId,
      payload.from,
      payload.text,
      payload.mediaRefs ? JSON.stringify(payload.mediaRefs) : null,
      payload.timestamp,
      payload.externalMessageId || null
    )

  const messageId = messageInsert.lastInsertRowid
  const classification = classifyMessage({
    messageText: payload.text,
    fromNumber: payload.from,
    threadHistory: [],
  })

  try {
    await db
      .prepare(
        `
      INSERT INTO message_classifications (
        message_id, thread_id, intent, confidence,
        extracted_data, missing_fields
      ) VALUES (?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        messageId,
        thread.id,
        classification.intent,
        classification.confidence,
        JSON.stringify(classification.extractedData),
        JSON.stringify(classification.missingFields)
      )
  } catch {
    // classification table may be missing in older local fixtures
  }

  await db
    .prepare(
      `
    UPDATE inbound_messages
    SET is_classified = 1, classification_result = ?
    WHERE id = ?
  `
    )
    .run(JSON.stringify(classification), messageId)

  if (classification.confidence >= 0.6) {
    await db
      .prepare(
        `
      UPDATE inbound_threads
      SET intent = ?, confidence = ?, status = ?,
          guest_name = ?
      WHERE id = ?
    `
      )
      .run(
        classification.intent,
        classification.confidence,
        classification.intent === 'spam' ? 'closed' : 'classified',
        classification.extractedData.guestName || null,
        thread.id
      )
  }

  let draftReply = null
  if (classification.intent !== 'spam') {
    const { draft, requiresApproval, missingInfo } = generateDraftReply(
      classification,
      'The Browns Luxury Guest Suites (Dullstroom)'
    )

    await db
      .prepare(
        `
      UPDATE inbound_messages
      SET draft_reply = ?
      WHERE id = ?
    `
      )
      .run(draft, messageId)

    try {
      await db
        .prepare(
          `
        UPDATE inbound_messages
        SET status = 'drafted'
        WHERE id = ?
      `
        )
        .run(messageId)
    } catch {
      // older thread-only schemas have no inbound_messages.status
    }

    draftReply = { text: draft, requiresApproval, missingInfo }

    if (classification.confidence >= 0.6) {
      await db
        .prepare(
          `
        UPDATE inbound_threads
        SET status = 'drafted'
        WHERE id = ?
      `
        )
        .run(thread.id)
    }
  }

  const refreshed = (await db
    .prepare('SELECT status FROM inbound_threads WHERE id = ?')
    .get(thread.id)) as { status: string } | undefined

  return {
    success: true,
    messageId,
    threadId: thread.id,
    classification: {
      intent: classification.intent,
      confidence: classification.confidence,
      extractedData: classification.extractedData as Record<string, unknown>,
      missingFields: classification.missingFields,
    },
    draftReply,
    queuedForApproval: refreshed?.status === 'drafted',
    status: refreshed?.status || thread.status,
  }
}

export function verifySharedSecret(
  request: { headers: { get(name: string): string | null } },
  secrets: Array<string | undefined>,
  headerNames: string[] = ['x-webhook-secret', 'x-bridge-secret']
): boolean {
  const configured = secrets.find((value) => Boolean(value && value.length > 0))
  if (!configured) {
    return process.env.NODE_ENV !== 'production'
  }

  const authHeader = request.headers.get('authorization')
  const bearer = authHeader?.replace(/^Bearer\s+/i, '')
  if (bearer && bearer === configured) return true

  for (const name of headerNames) {
    const value = request.headers.get(name)
    if (value && value === configured) return true
  }

  return false
}

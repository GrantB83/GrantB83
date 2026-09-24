import type { DbClient } from '@/lib/db'
import { classifyMessage, generateDraftReply } from '@/lib/inbound-classifier'
import { enqueueDraftJob } from '@/lib/draft-jobs'
import { isSpamOrMarketing } from '@/lib/umi-spam'
import { ensureUmiSchema } from '@/lib/umi-schema'
import { markThreadPendingDraft, resolveUmiThread } from '@/lib/umi-threads'
import { mapSourceToChannel } from '@/lib/umi-channels'

export interface IngestPayload {
  from: string
  text: string
  timestamp: string
  source: string
  subject?: string
  mediaRefs?: string[]
  externalMessageId?: string
  senderAddress?: string
  sourceTag?: string
  preferredThreadId?: number
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
  spam?: boolean
  channel?: string
}

function emailTaggedBody(payload: IngestPayload): { text: string; sourceTag?: string; senderAddress?: string } {
  const channel = mapSourceToChannel(payload.source)
  if (channel !== 'email') {
    return { text: payload.text, sourceTag: payload.sourceTag, senderAddress: payload.senderAddress }
  }
  const sender = payload.senderAddress || payload.from
  return {
    text: payload.text,
    sourceTag: payload.sourceTag || 'email',
    senderAddress: sender,
  }
}

export async function ingestInboundMessage(
  db: DbClient,
  tenantId: number,
  payload: IngestPayload
): Promise<IngestResult> {
  await ensureUmiSchema(db)
  const tagged = emailTaggedBody(payload)
  const bodyUnavailable = !payload.text || payload.text === '[body unavailable]' || payload.text === '[metadata-only]'
  const storedText = payload.text?.trim()
    ? payload.text
    : '[body unavailable]'

  const resolved = await resolveUmiThread(db, tenantId, {
    from: payload.from,
    source: payload.source,
    timestamp: payload.timestamp,
    text: storedText,
    externalMessageId: payload.externalMessageId,
    preferredThreadId: payload.preferredThreadId,
  })

  if (resolved.duplicate) {
    return {
      success: true,
      duplicate: true,
      messageId: resolved.duplicate.id,
      threadId: resolved.duplicate.thread_id,
      queuedForApproval: false,
      status: 'duplicate',
      channel: resolved.channel,
    }
  }

  const thread = resolved.thread
  const metadata = {
    ...(thread.metadata
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

  await db
    .prepare(
      `UPDATE inbound_threads
       SET metadata = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .run(JSON.stringify(metadata), thread.id)

  const spam = isSpamOrMarketing(storedText)
  const messageInsert = await db
    .prepare(
      `INSERT INTO inbound_messages (
        thread_id, tenant_id, direction, from_number,
        message_text, media_refs, message_timestamp, external_message_id,
        channel, sender_address, source_tag, dedup_key, is_spam, body_unavailable
      ) VALUES (?, ?, 'inbound', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      thread.id,
      tenantId,
      payload.from,
      storedText,
      payload.mediaRefs ? JSON.stringify(payload.mediaRefs) : null,
      payload.timestamp,
      payload.externalMessageId || null,
      resolved.channel,
      tagged.senderAddress || null,
      tagged.sourceTag || null,
      resolved.dedupKey,
      spam.spam ? 1 : 0,
      bodyUnavailable ? 1 : 0
    )

  const messageId = messageInsert.lastInsertRowid
  const classification = classifyMessage({
    messageText: storedText,
    fromNumber: payload.from,
    threadHistory: [],
  })

  try {
    await db
      .prepare(
        `INSERT INTO message_classifications (
          message_id, thread_id, intent, confidence,
          extracted_data, missing_fields
        ) VALUES (?, ?, ?, ?, ?, ?)`
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
      `UPDATE inbound_messages
       SET is_classified = 1, classification_result = ?
       WHERE id = ?`
    )
    .run(JSON.stringify(classification), messageId)

  const treatAsSpam = spam.spam || classification.intent === 'spam'
  if (treatAsSpam) {
    await db
      .prepare(
        `UPDATE inbound_messages SET is_spam = 1, status = 'spam' WHERE id = ?`
      )
      .run(messageId)
    if (classification.intent === 'spam') {
      await db
        .prepare(
          `UPDATE inbound_threads SET intent = 'spam', status = 'classified' WHERE id = ?`
        )
        .run(thread.id)
    }
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
      draftReply: null,
      queuedForApproval: false,
      status: 'spam',
      spam: true,
      channel: resolved.channel,
    }
  }

  if (classification.confidence >= 0.6) {
    await db
      .prepare(
        `UPDATE inbound_threads
         SET intent = ?, confidence = ?, status = ?, guest_name = COALESCE(?, guest_name)
         WHERE id = ?`
      )
      .run(
        classification.intent,
        classification.confidence,
        'classified',
        classification.extractedData.guestName || null,
        thread.id
      )
  }

  const { draft, requiresApproval, missingInfo } = generateDraftReply(
    classification,
    'The Browns Luxury Guest Suites (Dullstroom)'
  )

  await db
    .prepare(
      `UPDATE inbound_messages
       SET draft_reply = ?, draft_source = 'heuristic', status = 'drafted'
       WHERE id = ?`
    )
    .run(draft, messageId)

  await markThreadPendingDraft(db, thread.id)

  try {
    await enqueueDraftJob(db, {
      tenantId,
      threadId: thread.id,
      messageId: Number(messageId),
      intent: classification.intent,
    })
  } catch (error) {
    console.warn('[inbound-ingest] draft_jobs enqueue skipped:', error)
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
    draftReply: { text: draft, requiresApproval, missingInfo },
    queuedForApproval: refreshed?.status === 'drafted',
    status: refreshed?.status || thread.status,
    spam: false,
    channel: resolved.channel,
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

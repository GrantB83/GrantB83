import type { DbClient } from '@/lib/db'
import { classifyMessage, generateDraftReply } from '@/lib/inbound-classifier'
import { enqueueDraftJob } from '@/lib/draft-jobs'
import { isSpamOrMarketing } from '@/lib/umi-spam'
import { ensureUmiSchema } from '@/lib/umi-schema'
import {
  applySourceDisplayName,
  deleteSentinelMessage,
  findRealDuplicateMessage,
  findThreadForSourceName,
  findWaWebSentinelForReplace,
  markThreadPendingDraft,
  resolveUmiThread,
} from '@/lib/umi-threads'
import { mapSourceToChannel } from '@/lib/umi-channels'
import { computeDedupKey } from '@/lib/umi-dedup'
import { extractWaWebDisplayName, isWaWebSentinelBody } from '@/lib/wa-web-body'

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
  displayName?: string | null
  contactName?: string | null
  pushName?: string | null
  notifyName?: string | null
  chatTitle?: string | null
  name?: string | null
  metadata?: Record<string, unknown> | null
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
  skipped?: boolean
  replaced?: boolean
  skipReason?: string
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
  const channel = mapSourceToChannel(payload.source)
  const isWaWeb = channel === 'whatsapp_web' || payload.source === 'whatsapp_web'
  const displayName = extractWaWebDisplayName(payload)
  const rawText = String(payload.text || '')
  const sentinelIncoming = isWaWeb && isWaWebSentinelBody(rawText)

  if (isWaWeb && sentinelIncoming) {
    const existing = await findThreadForSourceName(db, tenantId, payload.from, payload.preferredThreadId)
    if (existing && displayName) {
      await applySourceDisplayName(db, existing.id, displayName, payload.from)
    }
    return {
      success: true,
      skipped: true,
      skipReason: 'empty_or_sentinel_body',
      messageId: 0,
      threadId: existing?.id || 0,
      queuedForApproval: false,
      status: 'skipped',
      channel,
    }
  }

  const storedText = isWaWeb
    ? rawText.trim()
    : payload.text?.trim()
      ? payload.text
      : '[body unavailable]'
  const bodyUnavailable = isWaWeb
    ? false
    : !payload.text || payload.text === '[body unavailable]' || payload.text === '[metadata-only]'
  const realDedupKey = computeDedupKey(payload.from, storedText, payload.timestamp)

  if (isWaWeb) {
    const realDup = await findRealDuplicateMessage(db, {
      externalMessageId: payload.externalMessageId,
      dedupKey: realDedupKey,
    })
    const sentinel = await findWaWebSentinelForReplace(db, {
      externalMessageId: payload.externalMessageId,
      from: payload.from,
      timestamp: payload.timestamp,
    })

    if (realDup) {
      if (sentinel && sentinel.id !== realDup.id) {
        await deleteSentinelMessage(db, sentinel.id)
      }
      if (displayName) {
        await applySourceDisplayName(db, realDup.thread_id, displayName, payload.from)
      }
      return {
        success: true,
        duplicate: true,
        messageId: realDup.id,
        threadId: realDup.thread_id,
        queuedForApproval: false,
        status: 'duplicate',
        channel,
      }
    }

    if (sentinel) {
      await db
        .prepare(
          `UPDATE inbound_messages
           SET message_text = ?,
               dedup_key = ?,
               body_unavailable = 0,
               external_message_id = COALESCE(external_message_id, ?),
               is_spam = 0
           WHERE id = ?`
        )
        .run(storedText, realDedupKey, payload.externalMessageId || null, sentinel.id)
      await db
        .prepare(
          `UPDATE inbound_threads
           SET last_message_at = ?,
               last_inbound_at = ?,
               last_channel = ?,
               last_inbound_channel = ?,
               pending_reply = 1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`
        )
        .run(payload.timestamp, payload.timestamp, channel, channel, sentinel.thread_id)
      if (displayName) {
        await applySourceDisplayName(db, sentinel.thread_id, displayName, payload.from)
      }
      return finishInboundAfterPersist(db, tenantId, payload, {
        messageId: sentinel.id,
        threadId: sentinel.thread_id,
        storedText,
        channel,
        replaced: true,
      })
    }
  }

  const resolved = await resolveUmiThread(db, tenantId, {
    from: payload.from,
    source: payload.source,
    timestamp: payload.timestamp,
    text: storedText,
    externalMessageId: payload.externalMessageId,
    preferredThreadId: payload.preferredThreadId,
    displayName,
  })

  if (resolved.duplicate) {
    if (displayName) {
      await applySourceDisplayName(db, resolved.duplicate.thread_id, displayName, payload.from)
    }
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

  if (displayName) {
    await applySourceDisplayName(db, thread.id, displayName, payload.from)
  }

  return finishInboundAfterPersist(db, tenantId, payload, {
    messageId: messageInsert.lastInsertRowid,
    threadId: thread.id,
    storedText,
    channel: resolved.channel,
    threadStatus: thread.status,
  })
}

async function finishInboundAfterPersist(
  db: DbClient,
  tenantId: number,
  payload: IngestPayload,
  persisted: {
    messageId: number | bigint
    threadId: number
    storedText: string
    channel: string
    replaced?: boolean
    threadStatus?: string
  }
): Promise<IngestResult> {
  const messageId = persisted.messageId
  const classification = classifyMessage({
    messageText: persisted.storedText,
    fromNumber: payload.from,
    threadHistory: [],
  })
  const spam = isSpamOrMarketing(persisted.storedText)

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
        persisted.threadId,
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
      try {
        await db
          .prepare(`UPDATE inbound_threads SET intent = 'spam', status = 'classified' WHERE id = ?`)
          .run(persisted.threadId)
      } catch {
        await db.prepare(`UPDATE inbound_threads SET status = 'classified' WHERE id = ?`).run(persisted.threadId)
      }
    }
    return {
      success: true,
      replaced: persisted.replaced,
      messageId,
      threadId: persisted.threadId,
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
      channel: persisted.channel,
    }
  }

  if (classification.confidence >= 0.6) {
    try {
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
          persisted.threadId
        )
    } catch {
      await db
        .prepare(`UPDATE inbound_threads SET status = ?, guest_name = COALESCE(?, guest_name) WHERE id = ?`)
        .run('classified', classification.extractedData.guestName || null, persisted.threadId)
    }
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

  await markThreadPendingDraft(db, persisted.threadId)

  try {
    await enqueueDraftJob(db, {
      tenantId,
      threadId: persisted.threadId,
      messageId: Number(messageId),
      intent: classification.intent,
    })
  } catch (error) {
    console.warn('[inbound-ingest] draft_jobs enqueue skipped:', error)
  }

  const refreshed = (await db
    .prepare('SELECT status FROM inbound_threads WHERE id = ?')
    .get(persisted.threadId)) as { status: string } | undefined

  return {
    success: true,
    replaced: persisted.replaced,
    messageId,
    threadId: persisted.threadId,
    classification: {
      intent: classification.intent,
      confidence: classification.confidence,
      extractedData: classification.extractedData as Record<string, unknown>,
      missingFields: classification.missingFields,
    },
    draftReply: { text: draft, requiresApproval, missingInfo },
    queuedForApproval: refreshed?.status === 'drafted',
    status: refreshed?.status || persisted.threadStatus || 'drafted',
    spam: false,
    channel: persisted.channel,
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

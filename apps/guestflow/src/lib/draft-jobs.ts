import type { DbClient } from '@/lib/db'
import { ensurePhase0Schema } from '@/lib/phase0-schema'

export type DraftJobStatus = 'pending' | 'claimed' | 'done' | 'failed'

export interface DraftJobRow {
  id: number
  tenant_id: number
  thread_id: number
  message_id: number
  intent: string | null
  status: DraftJobStatus
  attempts: number
  error: string | null
}

export interface EnqueueDraftJobInput {
  tenantId: number
  threadId: number
  messageId: number
  intent?: string | null
}

export async function enqueueDraftJob(
  db: DbClient,
  input: EnqueueDraftJobInput
): Promise<{ job: DraftJobRow; existing: boolean } | null> {
  await ensurePhase0Schema(db)

  const open = (await db
    .prepare(
      `
      SELECT * FROM draft_jobs
      WHERE message_id = ? AND status IN ('pending', 'claimed')
      LIMIT 1
    `
    )
    .get(input.messageId)) as DraftJobRow | undefined

  if (open) {
    return { job: open, existing: true }
  }

  try {
    const inserted = (await db
      .prepare(
        `
        INSERT INTO draft_jobs (tenant_id, thread_id, message_id, intent, status)
        VALUES (?, ?, ?, ?, 'pending')
      `
      )
      .run(input.tenantId, input.threadId, input.messageId, input.intent || null)) as {
      lastInsertRowid?: number | bigint
    }

    const job = (await db
      .prepare(`SELECT * FROM draft_jobs WHERE id = ?`)
      .get(inserted.lastInsertRowid)) as DraftJobRow | undefined

    return job ? { job, existing: false } : null
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/unique/i.test(message)) {
      const again = (await db
        .prepare(
          `SELECT * FROM draft_jobs WHERE message_id = ? AND status IN ('pending', 'claimed') LIMIT 1`
        )
        .get(input.messageId)) as DraftJobRow | undefined
      return again ? { job: again, existing: true } : null
    }
    throw error
  }
}

import crypto from 'crypto'
import type { DbClient } from '@/lib/db'

export const SEND_JOBS_DDL = `
  CREATE TABLE IF NOT EXISTS send_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT NOT NULL CHECK(channel IN ('whatsapp_web', 'email')),
    status TEXT NOT NULL DEFAULT 'queued'
      CHECK(status IN ('pending', 'queued', 'claimed', 'sent', 'failed', 'blocked')),
    thread_id INTEGER NOT NULL,
    to_address TEXT NOT NULL,
    body_text TEXT NOT NULL,
    subject TEXT,
    claim_token TEXT,
    claimed_at DATETIME,
    completed_at DATETIME,
    error_code TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_send_jobs_status_created
    ON send_jobs(status, created_at);

  CREATE INDEX IF NOT EXISTS idx_send_jobs_thread
    ON send_jobs(thread_id);

  CREATE INDEX IF NOT EXISTS idx_send_jobs_claim_token
    ON send_jobs(claim_token);
`

export type SendJobChannel = 'whatsapp_web' | 'email'
export type SendJobStatus = 'pending' | 'queued' | 'claimed' | 'sent' | 'failed' | 'blocked'
export type SendJobTerminalStatus = 'sent' | 'failed' | 'blocked'

export interface SendJobRow {
  id: number
  channel: SendJobChannel
  status: SendJobStatus
  thread_id: number
  to_address: string
  body_text: string
  subject: string | null
  claim_token: string | null
  claimed_at: string | null
  completed_at: string | null
  error_code: string | null
  metadata: string | null
  created_at: string
  updated_at: string
}

export interface CreateQueuedJobInput {
  channel: SendJobChannel
  threadId: number
  toAddress: string
  bodyText: string
  subject?: string | null
}

export async function ensureSendJobsTable(db: DbClient): Promise<void> {
  await db.exec(SEND_JOBS_DDL)
}

export async function createQueuedJob(
  db: DbClient,
  input: CreateQueuedJobInput
): Promise<SendJobRow> {
  await ensureSendJobsTable(db)

  if (!input.bodyText?.trim()) {
    throw new Error('Job body_text is required')
  }
  if (!input.toAddress?.trim()) {
    throw new Error('Job to_address is required')
  }

  // OUTBOUND REDIRECT: Resolve recipient (may redirect to test sink or throw if misconfigured)
  let effectiveToAddress = input.toAddress.trim()
  let metadata: any = {}

  try {
    const { resolveOutboundRecipient } = await import('./outbound-redirect')
    
    // Map channel to resolver channel ('whatsapp_web' → 'whatsapp' for resolver)
    const resolverChannel = input.channel === 'whatsapp_web' ? 'whatsapp' : input.channel
    
    const resolution = resolveOutboundRecipient({
      channel: resolverChannel,
      intendedTo: input.toAddress.trim()
    })
    
    // Override to_address with resolved recipient
    effectiveToAddress = resolution.to
    
    // Build metadata JSON with redirect audit fields
    metadata = {
      intended_to: resolution.intendedTo,
      redirect_enabled: resolution.redirected,
      mode: resolution.mode
    }
    
    // Log redirect metadata for audit
    if (resolution.redirected) {
      console.log(`[OUTBOUND REDIRECT] Job ${input.channel} queued with redirect: intended=${resolution.intendedTo} → actual=${resolution.to} mode=${resolution.mode}`)
    }
  } catch (resolverError) {
    // Resolver threw (missing sink or live mode without CLEAR)
    // Propagate error to caller (API route will return 503)
    throw resolverError
  }

  const inserted = await db
    .prepare(
      `
      INSERT INTO send_jobs (channel, status, thread_id, to_address, body_text, subject, metadata)
      VALUES (?, 'queued', ?, ?, ?, ?, ?)
    `
    )
    .run(
      input.channel,
      input.threadId,
      effectiveToAddress,
      input.bodyText,
      input.subject ?? null,
      JSON.stringify(metadata)
    )

  const row = await getJob(db, Number(inserted.lastInsertRowid))
  if (!row) throw new Error('Failed to load created send job')
  return row
}

export async function getJob(db: DbClient, id: number): Promise<SendJobRow | undefined> {
  await ensureSendJobsTable(db)
  return (await db.prepare(`SELECT * FROM send_jobs WHERE id = ?`).get(id)) as
    | SendJobRow
    | undefined
}

export async function listJobs(
  db: DbClient,
  status: SendJobStatus = 'queued',
  limit = 10
): Promise<SendJobRow[]> {
  await ensureSendJobsTable(db)
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50)
  return (await db
    .prepare(
      `
      SELECT * FROM send_jobs
      WHERE status = ?
      ORDER BY created_at ASC
      LIMIT ?
    `
    )
    .all(status, safeLimit)) as SendJobRow[]
}

export async function claimJob(db: DbClient, id: number): Promise<SendJobRow | null> {
  await ensureSendJobsTable(db)
  const existing = await getJob(db, id)
  if (!existing) return null
  if (existing.status !== 'queued') {
    const err = new Error('Job is not queued') as Error & { code?: string }
    err.code = 'not_queued'
    throw err
  }

  const claimToken = crypto.randomBytes(16).toString('hex')
  const now = new Date().toISOString()
  const result = await db
    .prepare(
      `
      UPDATE send_jobs
      SET status = 'claimed',
          claim_token = ?,
          claimed_at = ?,
          updated_at = ?
      WHERE id = ? AND status = 'queued'
    `
    )
    .run(claimToken, now, now, id)

  if (!result?.changes) {
    const err = new Error('Job is not queued') as Error & { code?: string }
    err.code = 'not_queued'
    throw err
  }

  return (await getJob(db, id)) || null
}

export async function completeJob(
  db: DbClient,
  id: number,
  status: SendJobTerminalStatus,
  errorCode?: string | null
): Promise<SendJobRow | null> {
  await ensureSendJobsTable(db)
  const existing = await getJob(db, id)
  if (!existing) return null

  if (existing.status === 'sent' && status === 'sent') {
    return existing
  }

  if (existing.status === 'sent' || existing.status === 'failed' || existing.status === 'blocked') {
    const err = new Error('Job already completed') as Error & { code?: string }
    err.code = 'already_complete'
    throw err
  }

  if (existing.status !== 'queued' && existing.status !== 'claimed') {
    const err = new Error('Job cannot be completed from current status') as Error & { code?: string }
    err.code = 'invalid_status'
    throw err
  }

  const now = new Date().toISOString()
  await db
    .prepare(
      `
      UPDATE send_jobs
      SET status = ?,
          error_code = ?,
          completed_at = ?,
          updated_at = ?
      WHERE id = ?
    `
    )
    .run(status, errorCode || null, now, now, id)

  return (await getJob(db, id)) || null
}

export function publicJob(job: SendJobRow) {
  return {
    id: job.id,
    channel: job.channel,
    status: job.status,
    threadId: job.thread_id,
    to: job.to_address,
    body: job.body_text,
    subject: job.subject,
    claimToken: job.claim_token,
    errorCode: job.error_code,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
    claimedAt: job.claimed_at,
    completedAt: job.completed_at,
  }
}

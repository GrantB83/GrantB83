import type { DbClient } from '@/lib/db'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Phase 1 batch worker logic for LLM draft generation.
 * 
 * Batch contract:
 * - Claim ≥5 pending jobs OR every 20 min
 * - Window: 07:00–21:00 Africa/Johannesburg
 * - One worker in flight at a time
 * - Soft cap: ≤6 batches/day
 */

export interface BatchWorkerConfig {
  guestflowApiUrl: string
  draftWorkerSecret: string
  llmProvider: 'openai' | 'anthropic' // extensible for Cursor Ultra
  llmApiKey?: string
  minJobsForBatch?: number // default 5
  maxWaitMinutes?: number // default 20
  softCapPerDay?: number // default 6
  dryRun?: boolean
}

export interface ClaimedJob {
  id: number
  tenant_id: number
  thread_id: number
  message_id: number
  intent: string | null
}

export interface ProcessResult {
  jobId: number
  messageId: number
  success: boolean
  error?: string
  draftGenerated?: string
}

export interface BatchRunResult {
  batchId: string
  startedAt: Date
  completedAt: Date
  jobsClaimed: number
  jobsProcessed: number
  jobsSucceeded: number
  jobsFailed: number
  results: ProcessResult[]
  skippedReason?: string
}

/**
 * Check if current time is within the batch window (07:00–21:00 SAST).
 */
export function isWithinBatchWindow(): boolean {
  const now = new Date()
  const sastFormatter = new Intl.DateTimeFormat('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    hour: '2-digit',
    hour12: false
  })
  const sastHour = parseInt(sastFormatter.format(now), 10)
  return sastHour >= 7 && sastHour < 21
}

/**
 * Get today's batch count from the database.
 */
export async function getTodayBatchCount(db: DbClient): Promise<number> {
  const today = new Date()
  const sastDateFormatter = new Intl.DateTimeFormat('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const sastToday = sastDateFormatter.format(today).split('/').reverse().join('-') // YYYY-MM-DD

  try {
    const result = (await db
      .prepare(
        `
      SELECT COUNT(*) as count
      FROM draft_jobs
      WHERE status = 'done'
        AND DATE(updated_at) = ?
    `
      )
      .get(sastToday)) as { count: number } | undefined

    return result?.count || 0
  } catch {
    return 0
  }
}

/**
 * Check if another worker is in flight by looking for claimed jobs older than 5 minutes.
 */
export async function isWorkerInFlight(db: DbClient): Promise<boolean> {
  try {
    const result = (await db
      .prepare(
        `
      SELECT COUNT(*) as count
      FROM draft_jobs
      WHERE status = 'claimed'
        AND datetime(updated_at, '+5 minutes') > datetime('now')
    `
      )
      .get()) as { count: number } | undefined

    return (result?.count || 0) > 0
  } catch {
    return false
  }
}

/**
 * Claim pending draft jobs for processing.
 */
export async function claimPendingJobs(
  db: DbClient,
  minJobs: number = 5
): Promise<ClaimedJob[]> {
  const pending = (await db
    .prepare(
      `
    SELECT * FROM draft_jobs
    WHERE status = 'pending'
    ORDER BY created_at ASC
  `
    )
    .all()) as ClaimedJob[]

  if (pending.length < minJobs) {
    return []
  }

  const jobIds = pending.map((j) => j.id)

  // Claim all pending jobs atomically
  await db
    .prepare(
      `
    UPDATE draft_jobs
    SET status = 'claimed', updated_at = CURRENT_TIMESTAMP
    WHERE id IN (${jobIds.map(() => '?').join(',')})
  `
    )
    .run(...jobIds)

  return pending
}

/**
 * Fetch message context for LLM prompt.
 */
export async function fetchMessageContext(
  db: DbClient,
  messageId: number
): Promise<{
  fromNumber: string
  messageText: string
  guestName: string | null
  intent: string | null
  confidence: number | null
}> {
  const message = (await db
    .prepare(
      `
    SELECT m.from_number, m.message_text, t.guest_name, 
           c.intent, c.confidence
    FROM inbound_messages m
    JOIN inbound_threads t ON m.thread_id = t.id
    LEFT JOIN message_classifications c ON m.id = c.message_id
    WHERE m.id = ?
  `
    )
    .get(messageId)) as any

  return {
    fromNumber: message.from_number || 'unknown',
    messageText: message.message_text || '',
    guestName: message.guest_name || null,
    intent: message.intent || null,
    confidence: message.confidence || null
  }
}

/**
 * Generate draft using LLM (placeholder - expects Cursor Ultra environment).
 */
export async function generateDraftWithLLM(
  context: {
    fromNumber: string
    messageText: string
    guestName: string | null
    intent: string | null
    confidence: number | null
  },
  config: BatchWorkerConfig
): Promise<string> {
  // Load prompt template
  const promptPath = join(process.cwd(), 'prompts', 'DRAFT_PROMPT.md')
  const promptTemplate = readFileSync(promptPath, 'utf-8')

  // Replace template variables
  const prompt = promptTemplate
    .replace('{from_number}', context.fromNumber)
    .replace('{guest_name}', context.guestName || 'Guest')
    .replace('{intent}', context.intent || 'general_question')
    .replace('{confidence}', String(context.confidence || 0))
    .replace('{message_text}', context.messageText)

  // In a real Cursor Ultra CA, this would call the LLM provider
  // For now, return a placeholder that instructs to use Cursor Ultra
  if (config.dryRun) {
    return `[DRY RUN] Draft for message: "${context.messageText.substring(0, 50)}..."`
  }

  // Placeholder: In Cursor Ultra CA, use the available LLM provider
  // Example (not functional here):
  // const response = await callLLM(prompt, config.llmProvider, config.llmApiKey)
  // return response.text

  throw new Error(
    'LLM generation requires Cursor Ultra environment. Use this module in a Cursor Cloud Agent.'
  )
}

/**
 * Upsert draft via authenticated API.
 */
export async function upsertDraft(
  threadId: number,
  messageId: number,
  draftReply: string,
  config: BatchWorkerConfig
): Promise<void> {
  const response = await fetch(`${config.guestflowApiUrl}/api/drafts/upsert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Draft-Worker-Secret': config.draftWorkerSecret
    },
    body: JSON.stringify({
      threadId,
      messageId,
      draftReply,
      draftSource: 'llm'
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Upsert failed (${response.status}): ${error}`)
  }
}

/**
 * Process a single claimed job.
 */
export async function processJob(
  db: DbClient,
  job: ClaimedJob,
  config: BatchWorkerConfig
): Promise<ProcessResult> {
  try {
    // Fetch message context
    const context = await fetchMessageContext(db, job.message_id)

    // Generate draft with LLM
    const draftReply = await generateDraftWithLLM(context, config)

    // Upsert draft via API
    if (!config.dryRun) {
      await upsertDraft(job.thread_id, job.message_id, draftReply, config)
    }

    // Mark job as done
    await db
      .prepare(
        `
      UPDATE draft_jobs
      SET status = 'done', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
      )
      .run(job.id)

    return {
      jobId: job.id,
      messageId: job.message_id,
      success: true,
      draftGenerated: draftReply
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)

    // Mark job as failed
    await db
      .prepare(
        `
      UPDATE draft_jobs
      SET status = 'failed', error = ?, attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
      )
      .run(errorMsg, job.id)

    return {
      jobId: job.id,
      messageId: job.message_id,
      success: false,
      error: errorMsg
    }
  }
}

/**
 * Run a batch of draft jobs.
 */
export async function runBatch(
  db: DbClient,
  config: BatchWorkerConfig
): Promise<BatchRunResult> {
  const batchId = `batch-${Date.now()}`
  const startedAt = new Date()

  // Check window
  if (!isWithinBatchWindow()) {
    return {
      batchId,
      startedAt,
      completedAt: new Date(),
      jobsClaimed: 0,
      jobsProcessed: 0,
      jobsSucceeded: 0,
      jobsFailed: 0,
      results: [],
      skippedReason: 'Outside batch window (07:00–21:00 SAST)'
    }
  }

  // Check soft cap
  const todayCount = await getTodayBatchCount(db)
  const softCap = config.softCapPerDay || 6
  if (todayCount >= softCap) {
    return {
      batchId,
      startedAt,
      completedAt: new Date(),
      jobsClaimed: 0,
      jobsProcessed: 0,
      jobsSucceeded: 0,
      jobsFailed: 0,
      results: [],
      skippedReason: `Soft cap reached (${todayCount}/${softCap} batches today)`
    }
  }

  // Check one-in-flight
  if (await isWorkerInFlight(db)) {
    return {
      batchId,
      startedAt,
      completedAt: new Date(),
      jobsClaimed: 0,
      jobsProcessed: 0,
      jobsSucceeded: 0,
      jobsFailed: 0,
      results: [],
      skippedReason: 'Another worker is in flight'
    }
  }

  // Claim jobs
  const minJobs = config.minJobsForBatch || 5
  const jobs = await claimPendingJobs(db, minJobs)

  if (jobs.length === 0) {
    return {
      batchId,
      startedAt,
      completedAt: new Date(),
      jobsClaimed: 0,
      jobsProcessed: 0,
      jobsSucceeded: 0,
      jobsFailed: 0,
      results: [],
      skippedReason: `Insufficient pending jobs (need ≥${minJobs})`
    }
  }

  // Process jobs
  const results: ProcessResult[] = []
  for (const job of jobs) {
    const result = await processJob(db, job, config)
    results.push(result)
  }

  const succeeded = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length

  return {
    batchId,
    startedAt,
    completedAt: new Date(),
    jobsClaimed: jobs.length,
    jobsProcessed: results.length,
    jobsSucceeded: succeeded,
    jobsFailed: failed,
    results
  }
}

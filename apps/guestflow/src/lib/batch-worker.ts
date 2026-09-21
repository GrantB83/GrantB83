import type { DbClient } from '@/lib/db'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Phase 1 batch worker logic for Cursor Ultra draft generation.
 * 
 * Batch contract:
 * - Claim ≥5 pending jobs OR every 20 min
 * - Window: 07:00–21:00 Africa/Johannesburg
 * - One worker in flight at a time
 * - Soft cap: ≤6 batches/day
 * 
 * Design: Cursor Ultra Cloud Agent generates drafts directly using its own model,
 * then upserts via authenticated API. No external LLM API calls (OpenAI removed).
 */

export interface BatchWorkerConfig {
  guestflowApiUrl: string
  draftWorkerSecret: string
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
  created_at: string
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
 * Record a batch run in the database for soft-cap tracking.
 */
export async function recordBatchRun(
  db: DbClient,
  batchId: string,
  jobsCount: number
): Promise<void> {
  try {
    await db
      .prepare(
        `
      INSERT INTO batch_runs (batch_id, jobs_count, created_at)
      VALUES (?, ?, datetime('now'))
    `
      )
      .run(batchId, jobsCount)
  } catch (error) {
    // Table may not exist in test DBs - create it
    await db.exec(`
      CREATE TABLE IF NOT EXISTS batch_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id TEXT NOT NULL,
        jobs_count INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await db
      .prepare(
        `
      INSERT INTO batch_runs (batch_id, jobs_count, created_at)
      VALUES (?, ?, datetime('now'))
    `
      )
      .run(batchId, jobsCount)
  }
}

/**
 * Get today's batch count (number of batch runs, not jobs) from the database.
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
    // Ensure table exists
    await db.exec(`
      CREATE TABLE IF NOT EXISTS batch_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id TEXT NOT NULL,
        jobs_count INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    const result = (await db
      .prepare(
        `
      SELECT COUNT(*) as count
      FROM batch_runs
      WHERE DATE(created_at) = ?
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
 * Claims if ≥minJobs exist OR oldest pending job is ≥maxWaitMinutes old.
 */
export async function claimPendingJobs(
  db: DbClient,
  minJobs: number = 5,
  maxWaitMinutes: number = 20
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

  if (pending.length === 0) {
    return []
  }

  // Check if we should claim: either ≥minJobs OR oldest job ≥maxWaitMinutes old
  let shouldClaim = pending.length >= minJobs

  if (!shouldClaim && pending.length > 0) {
    // Check oldest job age in Africa/Johannesburg timezone
    const oldestJob = pending[0]
    const oldestCreated = new Date(oldestJob.created_at as any)
    const now = new Date()
    const ageMinutes = (now.getTime() - oldestCreated.getTime()) / (1000 * 60)

    if (ageMinutes >= maxWaitMinutes) {
      shouldClaim = true
    }
  }

  if (!shouldClaim) {
    return []
  }

  // Claim up to 20 jobs max (soft limit)
  const jobsToClaim = pending.slice(0, 20)
  const jobIds = jobsToClaim.map((j) => j.id)

  // Claim jobs atomically
  await db
    .prepare(
      `
    UPDATE draft_jobs
    SET status = 'claimed', updated_at = CURRENT_TIMESTAMP
    WHERE id IN (${jobIds.map(() => '?').join(',')})
  `
    )
    .run(...jobIds)

  return jobsToClaim
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
 * Load prompt template and prepare context for Cursor Ultra CA to generate draft.
 * 
 * DESIGN: This function returns the formatted prompt. The Cursor Ultra Cloud Agent
 * calling this worker IS the LLM - it generates the draft directly using its own
 * model context, not by making HTTP calls to OpenAI or other external APIs.
 * 
 * The CA reads this prompt, generates the draft reply itself, and the processJob
 * function receives that generated draft to upsert via the API.
 */
export async function loadPromptForDraft(
  context: {
    fromNumber: string
    messageText: string
    guestName: string | null
    intent: string | null
    confidence: number | null
  },
  config: BatchWorkerConfig
): Promise<string> {
  if (config.dryRun) {
    return `[DRY RUN] Draft for message: "${context.messageText.substring(0, 50)}..."`
  }

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

  return prompt
}

/**
 * Generate draft using Cursor Ultra Cloud Agent's own model.
 * 
 * This is a placeholder that will be called by the Cursor Ultra CA.
 * The CA implements the actual draft generation logic using its model context.
 * 
 * For manual/scripted testing: returns an error instructing to use Cursor Ultra CA.
 */
export async function generateDraftWithCursorUltra(
  context: {
    fromNumber: string
    messageText: string
    guestName: string | null
    intent: string | null
    confidence: number | null
  },
  config: BatchWorkerConfig
): Promise<string> {
  if (config.dryRun) {
    return `[DRY RUN] Draft for message: "${context.messageText.substring(0, 50)}..."`
  }

  // Fail closed: This worker must be run BY a Cursor Ultra Cloud Agent,
  // not as a standalone script with API keys.
  throw new Error(
    'Draft generation requires Cursor Ultra Cloud Agent. ' +
    'This worker must be launched by Coding/Grok as a Cursor Ultra CA task. ' +
    'The CA generates drafts using its own model context, not external API calls. ' +
    'See docs/PHASE1-BATCH-DRAFTS.md for launch instructions.'
  )
}

/**
 * Upsert draft via authenticated API and update thread/message status.
 */
export async function upsertDraft(
  db: DbClient,
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

  // Message status and thread status are both set by the /api/drafts/upsert route
  // No additional updates needed here
}

/**
 * Process a single claimed job.
 * 
 * IMPLEMENTATION NOTE: When run by a Cursor Ultra Cloud Agent, replace the
 * generateDraftWithCursorUltra call with the CA's own draft generation logic.
 * The CA has the prompt context and generates the reply directly using its model.
 * 
 * For standalone script execution, this will fail closed with instructions.
 */
export async function processJob(
  db: DbClient,
  job: ClaimedJob,
  config: BatchWorkerConfig,
  draftGenerator?: (context: any, config: BatchWorkerConfig) => Promise<string>
): Promise<ProcessResult> {
  try {
    // Fetch message context
    const context = await fetchMessageContext(db, job.message_id)

    // Generate draft with Cursor Ultra CA (or provided generator for testing)
    const generator = draftGenerator || generateDraftWithCursorUltra
    const draftReply = await generator(context, config)

    // Upsert draft via API and update thread status
    if (!config.dryRun) {
      await upsertDraft(db, job.thread_id, job.message_id, draftReply, config)
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
/**
 * Run a batch of draft jobs.
 * 
 * Optional draftGenerator allows Cursor Ultra CA or tests to provide draft generation logic.
 * Without it, fails closed with instructions to use Cursor Ultra CA.
 */
export async function runBatch(
  db: DbClient,
  config: BatchWorkerConfig,
  draftGenerator?: (context: any, config: BatchWorkerConfig) => Promise<string>
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

  // Claim jobs (≥minJobs OR oldest ≥maxWaitMinutes)
  const minJobs = config.minJobsForBatch || 5
  const maxWaitMinutes = config.maxWaitMinutes || 20
  const jobs = await claimPendingJobs(db, minJobs, maxWaitMinutes)

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
      skippedReason: `No jobs ready (need ≥${minJobs} or oldest ≥${maxWaitMinutes}min)`
    }
  }

  // Record batch run for soft-cap tracking
  await recordBatchRun(db, batchId, jobs.length)

  // Process jobs
  const results: ProcessResult[] = []
  for (const job of jobs) {
    const result = await processJob(db, job, config, draftGenerator)
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

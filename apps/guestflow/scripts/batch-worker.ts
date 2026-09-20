#!/usr/bin/env tsx
/**
 * GuestFlow Phase 1 Batch Draft Worker
 * 
 * Usage:
 *   npm run batch-worker
 *   npm run batch-worker -- --dry-run
 * 
 * Environment variables:
 *   GUESTFLOW_API_URL - GuestFlow API base URL (required)
 *   DRAFT_WORKER_SECRET - Draft worker authentication secret (required)
 *   TURSO_DATABASE_URL or DATABASE_URL - Database URL (required)
 *   TURSO_AUTH_TOKEN - Database auth token (required if using Turso)
 * 
 * Batch contract:
 *   - Claims ≥5 pending jobs OR all if 20 min elapsed
 *   - Window: 07:00–21:00 Africa/Johannesburg
 *   - One worker in flight at a time
 *   - Soft cap: ≤6 batches/day
 */

import { getDbAsync } from '../src/lib/db'
import { runBatch, type BatchWorkerConfig } from '../src/lib/batch-worker'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

async function main() {
  // Validate environment
  const apiUrl = process.env.GUESTFLOW_API_URL
  const secret = process.env.DRAFT_WORKER_SECRET
  const dbUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL

  if (!apiUrl) {
    console.error('❌ GUESTFLOW_API_URL is required')
    process.exit(1)
  }
  if (!secret) {
    console.error('❌ DRAFT_WORKER_SECRET is required')
    process.exit(1)
  }
  if (!dbUrl) {
    console.error('❌ TURSO_DATABASE_URL or DATABASE_URL is required')
    process.exit(1)
  }

  // Get database client (uses getDbAsync which handles Turso or SQLite)
  const db = await getDbAsync()

  // Configure batch worker
  const config: BatchWorkerConfig = {
    guestflowApiUrl: apiUrl,
    draftWorkerSecret: secret,
    llmProvider: 'openai', // Default; override via Cursor Ultra
    dryRun
  }

  console.log('🚀 GuestFlow Phase 1 Batch Worker')
  console.log('=====================================')
  console.log(`API URL: ${apiUrl}`)
  console.log(`Dry Run: ${dryRun ? 'YES' : 'NO'}`)
  console.log('')

  // Run batch
  try {
    const result = await runBatch(db, config)

    console.log(`Batch ID: ${result.batchId}`)
    console.log(`Started: ${result.startedAt.toISOString()}`)
    console.log(`Completed: ${result.completedAt.toISOString()}`)
    console.log('')

    if (result.skippedReason) {
      console.log(`⏭️  Skipped: ${result.skippedReason}`)
      process.exit(0)
    }

    console.log(`📊 Results:`)
    console.log(`  Jobs Claimed: ${result.jobsClaimed}`)
    console.log(`  Jobs Processed: ${result.jobsProcessed}`)
    console.log(`  ✅ Succeeded: ${result.jobsSucceeded}`)
    console.log(`  ❌ Failed: ${result.jobsFailed}`)
    console.log('')

    if (result.results.length > 0) {
      console.log('📝 Details:')
      for (const r of result.results) {
        const icon = r.success ? '✅' : '❌'
        console.log(
          `  ${icon} Job ${r.jobId} (msg ${r.messageId}): ${r.success ? 'Success' : r.error}`
        )
      }
    }

    process.exit(result.jobsFailed > 0 ? 1 : 0)
  } catch (error) {
    console.error('❌ Batch worker failed:', error)
    process.exit(1)
  }
}

main()

#!/usr/bin/env tsx
/**
 * GuestFlow Phase 1 Batch Draft Worker (Cursor Ultra Only)
 *
 * Usage:
 *   npm run batch-worker
 *   npm run batch-worker -- --dry-run
 *   npm run batch-worker -- --drafts-file ./drafts.json
 *
 * Environment variables (names only — never commit values):
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
 *
 * CURSOR ULTRA ONLY: This worker must be run BY a Cursor Ultra Cloud Agent
 * (or given --drafts-file / --dry-run). No OPENAI_API_KEY. Refuse the batch
 * if the Ultra path is unavailable.
 */

import { readFileSync } from 'fs'
import { getDbAsync } from '../src/lib/db'
import { runBatch, ULTRA_PATH_UNAVAILABLE, type BatchWorkerConfig } from '../src/lib/batch-worker'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

function readFlag(name: string): string | undefined {
  const idx = args.indexOf(name)
  if (idx === -1) return undefined
  return args[idx + 1]
}

function loadDraftsFile(path: string): Record<number, string> {
  const raw = readFileSync(path, 'utf-8')
  const parsed = JSON.parse(raw) as Record<string, string>
  const map: Record<number, string> = {}
  for (const [key, value] of Object.entries(parsed)) {
    const id = Number(key)
    if (!Number.isFinite(id) || typeof value !== 'string' || !value.trim()) {
      throw new Error(`Invalid drafts-file entry for "${key}"`)
    }
    map[id] = value
  }
  if (Object.keys(map).length === 0) {
    throw new Error('drafts-file must contain at least one messageId → draft map')
  }
  return map
}

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

  const draftsPath = readFlag('--drafts-file')
  let draftsByMessageId: Record<number, string> | undefined
  if (draftsPath) {
    try {
      draftsByMessageId = loadDraftsFile(draftsPath)
    } catch (error) {
      console.error('❌ Failed to read --drafts-file:', error)
      process.exit(1)
    }
  }

  // Get database client (uses getDbAsync which handles Turso or SQLite)
  const db = await getDbAsync()

  const config: BatchWorkerConfig = {
    guestflowApiUrl: apiUrl,
    draftWorkerSecret: secret,
    dryRun,
    draftsByMessageId
  }

  console.log('🚀 GuestFlow Phase 1 Batch Worker (Cursor Ultra Only)')
  console.log('=====================================================')
  console.log(`API URL: ${apiUrl}`)
  console.log(`Dry Run: ${dryRun ? 'YES' : 'NO'}`)
  console.log('Provider: Cursor Ultra Cloud Agent (no external API)')
  console.log(`Drafts file: ${draftsPath || '(none)'}`)
  console.log('')

  try {
    const result = await runBatch(db, config)

    console.log(`Batch ID: ${result.batchId}`)
    console.log(`Started: ${result.startedAt.toISOString()}`)
    console.log(`Completed: ${result.completedAt.toISOString()}`)
    console.log('')

    if (result.skippedReason) {
      const refusedUltra = result.skippedReason.includes('Cursor Ultra')
      console.log(`⏭️  Skipped: ${result.skippedReason}`)
      if (refusedUltra) {
        console.error(ULTRA_PATH_UNAVAILABLE)
        process.exit(1)
      }
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

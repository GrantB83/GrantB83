/**
 * One-time UMI empty-thread hygiene.
 *
 * Default dry-run:
 *   - lists empty auto-created booking threads (source=nb, zero messages)
 *   - counts zero-message threads with pending_reply / false needs-attention
 * Never deletes threads. Never prints guest names, phones, or message bodies.
 * --apply: sets pending_reply=0 on zero-message threads only.
 * Refuses remote Turso. Not run on deploy.
 *
 * Usage:
 *   node scripts/cleanup-umi-empty-threads.js
 *   node scripts/cleanup-umi-empty-threads.js --apply
 */

const path = require('path')

const APPLY = process.argv.includes('--apply')
const dbUrl = process.env.DATABASE_URL || path.join(__dirname, '../data/guestflow.db')
const isRemote = /^libsql:\/\//i.test(dbUrl) || /^https?:\/\//i.test(dbUrl)

async function main() {
  console.log('cleanup-umi-empty-threads:', APPLY ? 'apply (local only)' : 'dry-run')
  if (isRemote) {
    console.log('refusing remote Turso URL (no Production writes)')
    process.exit(APPLY ? 1 : 0)
  }

  const Database = require('better-sqlite3')
  const file = String(dbUrl).replace(/^file:/, '')
  const db = new Database(file, { fileMustExist: false })
  try {
    const threadsExist = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='inbound_threads'`)
      .get()
    if (!threadsExist) {
      console.log('inbound_threads missing; nothing to list')
      return
    }

    const emptyAuto = db
      .prepare(
        `SELECT t.id, t.source, t.thread_kind, t.pending_reply
         FROM inbound_threads t
         LEFT JOIN inbound_messages m ON m.thread_id = t.id
         WHERE COALESCE(t.source, '') = 'nb'
           AND COALESCE(t.thread_kind, '') = 'booking'
         GROUP BY t.id
         HAVING COUNT(m.id) = 0`
      )
      .all()

    const falseFlags = db
      .prepare(
        `SELECT t.id
         FROM inbound_threads t
         LEFT JOIN inbound_messages m ON m.thread_id = t.id
         WHERE COALESCE(t.pending_reply, 0) = 1
         GROUP BY t.id
         HAVING COUNT(m.id) = 0`
      )
      .all()

    console.log('empty_auto_created_threads:', emptyAuto.length)
    for (const row of emptyAuto) {
      console.log(
        `  thread_id=${row.id} source=${row.source} kind=${row.thread_kind} pending_reply=${row.pending_reply}`
      )
    }
    console.log('zero_message_pending_reply:', falseFlags.length)
    console.log('delete: never (list only)')

    if (!APPLY) {
      console.log('dry-run: no updates')
      return
    }

    const result = db
      .prepare(
        `UPDATE inbound_threads
         SET pending_reply = 0, updated_at = CURRENT_TIMESTAMP
         WHERE id IN (
           SELECT t.id
           FROM inbound_threads t
           LEFT JOIN inbound_messages m ON m.thread_id = t.id
           GROUP BY t.id
           HAVING COUNT(m.id) = 0
         )
         AND COALESCE(pending_reply, 0) = 1`
      )
      .run()
    console.log('cleared_pending_reply:', result.changes || 0)
  } finally {
    db.close()
  }
}

main().catch((error) => {
  console.error('cleanup-umi-empty-threads failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})

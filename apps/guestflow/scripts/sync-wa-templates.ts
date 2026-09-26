#!/usr/bin/env npx tsx
/**
 * Read-only sync: Twilio Content + ApprovalRequests → Turso wa_templates.
 *
 * Usage:
 *   npx tsx scripts/sync-wa-templates.ts
 *   npx tsx scripts/sync-wa-templates.ts --dry-run
 *
 * Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and Turso/SQLite via GuestFlow db env.
 * Does not POST to Twilio. Safe to run on GFM Prod after merge (Grant manual step).
 */

import { getDbAsync, getDefaultTenantIdAsync } from '../src/lib/db'
import { syncWaTemplatesFromTwilio } from '../src/lib/wa-templates-twilio-sync'
import { listWaTemplates } from '../src/lib/wa-templates'

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const db = await getDbAsync()
  const tenantId = await getDefaultTenantIdAsync()

  if (dryRun) {
    const rows = await listWaTemplates(db, tenantId, false)
    console.log('DRY RUN — current wa_templates (no Twilio calls):')
    for (const row of rows) {
      console.log(
        [row.name, row.content_sid || '-', row.whatsapp_approval_status, row.last_synced_at || '-'].join(
          '\t'
        )
      )
    }
    process.exit(0)
  }

  const result = await syncWaTemplatesFromTwilio(db, tenantId)
  console.log(JSON.stringify(result, null, 2))
  const after = await listWaTemplates(db, tenantId, false)
  console.log('\nAfter sync:')
  for (const row of after) {
    console.log(
      [row.name, row.content_sid || '-', row.whatsapp_approval_status, row.last_synced_at || '-'].join(
        '\t'
      )
    )
  }
  if (result.skipped && result.error) {
    process.exit(2)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

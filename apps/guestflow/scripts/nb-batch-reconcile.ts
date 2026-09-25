/**
 * L4 Playwright A&D download → POST /api/cron/nightsbridge-ingest.
 * Included, not run in this PR. Needs NB_USER, NB_PASS, CRON_SECRET, GF_INGEST_URL.
 * No HTML scraping. Download the xlsx only.
 */
export async function main(): Promise<void> {
  const user = process.env.NB_USER
  const pass = process.env.NB_PASS
  const secret = process.env.CRON_SECRET
  const url = process.env.GF_INGEST_URL
  if (!user || !pass || !secret || !url) {
    console.log('nb-batch-reconcile: missing NB_USER / NB_PASS / CRON_SECRET / GF_INGEST_URL — not running')
    return
  }
  console.log('nb-batch-reconcile: secrets present but this script is a stub in Sprint 2.')
  console.log('Wire Playwright login + Reports → Arrivals & Departures xlsx after owner samples.')
}

if (process.argv[1] && process.argv[1].includes('nb-batch-reconcile')) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}

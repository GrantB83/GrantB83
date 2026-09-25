/**
 * Submit Grant-approved WhatsApp templates via the Twilio Content API.
 *
 * Usage (Grant go-ahead only):
 *   npm run wa:submit-templates -- --i-have-grant-go-ahead
 *
 * Without --i-have-grant-go-ahead this process exits 1 and makes no network calls.
 */

import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'
import {
  GRANT_GO_AHEAD_FLAG,
  formatSubmitResultLine,
  hasGrantGoAhead,
  runWaTemplateSubmit,
  validateGrantApprovedTemplates,
} from '@/lib/wa-template-twilio-submit'

async function main(): Promise<void> {
  if (!hasGrantGoAhead()) {
    console.error('Refusing to submit WhatsApp templates.')
    console.error(`Pass ${GRANT_GO_AHEAD_FLAG} only after Grant's final go-ahead.`)
    process.exit(1)
  }

  const validation = validateGrantApprovedTemplates()
  if (!validation.ok) {
    console.error(validation.error)
    process.exit(1)
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim()
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim()
  if (!accountSid || !authToken) {
    console.error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required.')
    process.exit(1)
  }

  const persistToDatabase = Boolean(process.env.DATABASE_URL?.trim())
  let db = null
  let tenantId = 1

  if (persistToDatabase) {
    try {
      db = await getDbAsync()
      tenantId = await getDefaultTenantIdAsync()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`Failed to open DATABASE_URL store: ${message}`)
      process.exit(1)
    }
  }

  try {
    const results = await runWaTemplateSubmit({
      auth: { accountSid, authToken },
      db,
      tenantId,
      persistToDatabase,
    })

    for (const result of results) {
      console.log(formatSubmitResultLine(result))
    }

    if (!persistToDatabase) {
      console.error(
        'DATABASE_URL not set — persist ContentSid values above to wa_templates.content_sid (Turso or migrate).'
      )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exit(1)
  }
}

main()

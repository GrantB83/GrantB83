/**
 * Submit Grant-approved WhatsApp templates via the Twilio Content API.
 *
 * DO NOT RUN in this package. Grant must give final go-ahead first.
 *
 * Usage (later, after Grant):
 *   npx tsx scripts/submit-wa-templates.ts --i-have-grant-go-ahead
 *
 * Without the flag this process exits 1 and makes no network calls.
 */

const FLAG = '--i-have-grant-go-ahead'

function main() {
  if (!process.argv.includes(FLAG)) {
    console.error('Refusing to submit WhatsApp templates.')
    console.error(`Pass ${FLAG} only after Grant's final go-ahead.`)
    console.error('This script was not run by the Sprint 2 WhatsApp package.')
    process.exit(1)
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!accountSid || !authToken) {
    console.error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required.')
    process.exit(1)
  }

  console.error(
    'Grant go-ahead flag present. This environment still must not submit from the Sprint 2 PR agent.'
  )
  console.error('Stop here unless a human is running this after final go-ahead.')
  process.exit(2)
}

main()

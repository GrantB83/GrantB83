#!/usr/bin/env node

/**
 * Nightsbridge Upload CLI
 * 
 * Quick command-line tool for SA Ops to upload arr_and_dep.xlsx to GuestFlow.
 * 
 * Usage:
 *   npm run nightsbridge:upload -- --file arr_and_dep.xlsx --secret <CRON_SECRET>
 *   npm run nightsbridge:upload -- --file arr_and_dep.xlsx --secret <CRON_SECRET> --date 2026-09-20
 * 
 * Environment:
 *   GUESTFLOW_URL - GuestFlow API URL (default: https://guestflow.thebrowns.co.za)
 *   CRON_SECRET - Can be set via env instead of --secret flag
 */

import { readFileSync } from 'fs'
import { basename } from 'path'

interface CliArgs {
  file?: string
  secret?: string
  date?: string
  url?: string
  help?: boolean
}

function parseArgs(): CliArgs {
  const args: CliArgs = {}
  const argv = process.argv.slice(2)

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = argv[i + 1]

    if (arg === '--file' && next) {
      args.file = next
      i++
    } else if (arg === '--secret' && next) {
      args.secret = next
      i++
    } else if (arg === '--date' && next) {
      args.date = next
      i++
    } else if (arg === '--url' && next) {
      args.url = next
      i++
    } else if (arg === '--help' || arg === '-h') {
      args.help = true
    }
  }

  return args
}

function showHelp() {
  console.log(`
Nightsbridge Upload CLI

Upload arr_and_dep.xlsx to GuestFlow autonomous ingest endpoint.

USAGE:
  npm run nightsbridge:upload -- --file <path> --secret <secret> [options]

OPTIONS:
  --file <path>       Path to arr_and_dep.xlsx file (required)
  --secret <secret>   CRON_SECRET for authentication (required, or set CRON_SECRET env var)
  --date <YYYY-MM-DD> Target date for status derivation (default: today)
  --url <url>         GuestFlow API URL (default: https://guestflow.thebrowns.co.za)
  --help, -h          Show this help message

ENVIRONMENT:
  GUESTFLOW_URL       Override default API URL
  CRON_SECRET         Use instead of --secret flag

EXAMPLES:
  # Upload today's bookings
  npm run nightsbridge:upload -- --file arr_and_dep.xlsx --secret abc123

  # Upload for specific date
  npm run nightsbridge:upload -- --file arr_and_dep.xlsx --secret abc123 --date 2026-09-20

  # Using environment variable for secret
  export CRON_SECRET=abc123
  npm run nightsbridge:upload -- --file arr_and_dep.xlsx

  # Upload to localhost for testing
  npm run nightsbridge:upload -- --file arr_and_dep.xlsx --secret abc123 --url http://localhost:3000
`)
}

async function uploadFile(filePath: string, secret: string, baseUrl: string, date?: string) {
  try {
    console.log('📂 Reading file:', filePath)
    const fileBuffer = readFileSync(filePath)
    const fileName = basename(filePath)

    console.log(`✅ File loaded: ${fileName} (${(fileBuffer.length / 1024).toFixed(1)} KB)`)

    const url = new URL('/api/cron/nightsbridge-ingest', baseUrl)
    if (date) {
      url.searchParams.set('date', date)
    }

    console.log('🚀 Uploading to:', url.toString())

    const formData = new FormData()
    const blob = new Blob([fileBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    formData.append('file', blob, fileName)

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'x-cron-secret': secret
      },
      body: formData
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Upload failed')
      console.error('Status:', response.status, response.statusText)
      console.error('Error:', data.error || 'Unknown error')
      if (data.message) {
        console.error('Message:', data.message)
      }
      process.exit(1)
    }

    console.log('✅ Upload successful!')
    console.log('')
    console.log('Results:')
    console.log('  Target Date:', data.targetDate)
    console.log('  Bookings Parsed:', data.parsed)
    console.log('  Bookings Inserted:', data.inserted)
    
    if (data.errors && data.errors.length > 0) {
      console.log('')
      console.log('⚠️  Errors:', data.errors.length)
      data.errors.forEach((err: string) => console.log('  -', err))
    }

    if (data.missingFields && data.missingFields.length > 0) {
      console.log('')
      console.log('⚠️  Missing Fields:', data.missingFields.length)
      data.missingFields.slice(0, 5).forEach((mf: any) => {
        console.log(`  - ${mf.guest}: ${mf.field}`)
      })
      if (data.missingFields.length > 5) {
        console.log(`  ... and ${data.missingFields.length - 5} more`)
      }
    }

    console.log('')
    console.log('✅ Bookings are now available in GuestFlow')
    console.log('   View at: /ops/bookings')
    console.log('   Generate packs: /ops/daily-brief, /ops/welcome-drafts, etc.')

  } catch (error: any) {
    console.error('❌ Upload failed:', error.message)
    if (error.cause) {
      console.error('Cause:', error.cause)
    }
    process.exit(1)
  }
}

async function main() {
  const args = parseArgs()

  if (args.help) {
    showHelp()
    process.exit(0)
  }

  const filePath = args.file
  const secret = args.secret || process.env.CRON_SECRET
  const baseUrl = args.url || process.env.GUESTFLOW_URL || 'https://guestflow.thebrowns.co.za'
  const date = args.date

  if (!filePath) {
    console.error('❌ Error: --file is required')
    console.error('Run with --help for usage information')
    process.exit(1)
  }

  if (!secret) {
    console.error('❌ Error: --secret is required or set CRON_SECRET environment variable')
    console.error('Run with --help for usage information')
    process.exit(1)
  }

  await uploadFile(filePath, secret, baseUrl, date)
}

main()

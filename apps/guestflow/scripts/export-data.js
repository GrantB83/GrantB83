#!/usr/bin/env node
/**
 * GuestFlow Data Export Script
 * 
 * Exports SQLite data to JSON for backup purposes.
 * Usage:
 *   node scripts/export-data.js [output-file.json]
 * 
 * If no output file specified, outputs to stdout.
 * 
 * ⚠️ IMPORTANT: This is for OFFLINE backup only
 * - Vercel has ephemeral filesystem (data lost on redeploy)
 * - For production backups, use Turso CLI: `turso db shell browns-guestflow .dump`
 * - For local development, this exports from data/guestflow.db
 */

const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

// Database path
const dbPath = path.join(__dirname, '..', 'data', 'guestflow.db')

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.error('❌ Error: Database not found at', dbPath)
  console.error('   Run: npm run db:init')
  process.exit(1)
}

// Open database
const db = new Database(dbPath, { readonly: true })

// Tables to export
const tables = [
  'tenants',
  'properties',
  'rate_cards',
  'inquiries',
  'bookings',
  'waitlist',
  'invite_codes',
  'lead_notes'
]

// Export data
const exportData = {
  exported_at: new Date().toISOString(),
  database: 'guestflow',
  version: '1.0',
  tables: {}
}

console.error('📦 Exporting GuestFlow data...\n')

for (const table of tables) {
  try {
    const rows = db.prepare(`SELECT * FROM ${table}`).all()
    exportData.tables[table] = rows
    console.error(`   ✓ ${table}: ${rows.length} rows`)
  } catch (err) {
    console.error(`   ⚠ ${table}: table not found or error (${err.message})`)
    exportData.tables[table] = []
  }
}

console.error('')

// Get summary stats
const stats = {
  tenants: exportData.tables.tenants.length,
  properties: exportData.tables.properties.length,
  rate_cards: exportData.tables.rate_cards.length,
  inquiries: exportData.tables.inquiries.length,
  bookings: exportData.tables.bookings.length,
  waitlist: exportData.tables.waitlist.length,
  invite_codes: exportData.tables.invite_codes.length
}

exportData.summary = stats

console.error('📊 Summary:')
console.error(`   Tenants: ${stats.tenants}`)
console.error(`   Properties: ${stats.properties}`)
console.error(`   Rate Cards: ${stats.rate_cards}`)
console.error(`   Inquiries: ${stats.inquiries}`)
console.error(`   Bookings: ${stats.bookings}`)
console.error(`   Waitlist: ${stats.waitlist}`)
console.error(`   Invite Codes: ${stats.invite_codes}`)
console.error('')

// Close database
db.close()

// Output JSON
const jsonOutput = JSON.stringify(exportData, null, 2)

if (process.argv[2]) {
  // Write to file
  const outputFile = process.argv[2]
  fs.writeFileSync(outputFile, jsonOutput, 'utf8')
  console.error(`✅ Export saved to: ${outputFile}`)
} else {
  // Write to stdout
  console.log(jsonOutput)
}

console.error(`\n💡 Backup Tips:`)
console.error(`   • Local: Run this script regularly and commit JSON to private repo`)
console.error(`   • Vercel: Filesystem is ephemeral - data lost on redeploy`)
console.error(`   • Turso: Use CLI for production: turso db shell browns-guestflow .dump`)
console.error(`   • Never commit actual guest data to public repos`)

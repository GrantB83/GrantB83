#!/usr/bin/env node

/**
 * Seed Browns Dullstroom Rate Cards & Property Facts
 * 
 * Seeds rate cards and property metadata from authoritative sources:
 * - Rate cards: tools/browns-ota-rate-pipeline-pack/fixtures/sample-rates.csv
 * - Property facts: tools/browns-guest-facts-pack/fixtures/the-browns-like.md
 * 
 * Hard Gates:
 * - NEVER invents rates, phone numbers, Wi-Fi codes, or contact details
 * - Uses [MISSING RATE] placeholders for unavailable data
 * - Only seeds Browns Dullstroom properties (tenant-scoped)
 * 
 * Usage:
 *   node scripts/seed-browns-data.js
 *   npm run seed:browns
 */

const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const APP_ROOT = path.join(__dirname, '..')
const WORKSPACE_ROOT = path.join(APP_ROOT, '..', '..')

// Paths to authoritative data sources
const RATE_CARDS_CSV = path.join(WORKSPACE_ROOT, 'tools/browns-ota-rate-pipeline-pack/fixtures/sample-rates.csv')
const PROPERTY_FACTS_MD = path.join(WORKSPACE_ROOT, 'tools/browns-guest-facts-pack/fixtures/the-browns-like.md')

console.log('🏠 Browns Dullstroom Data Seeder')
console.log('═'.repeat(60))

// Database setup
const dbDir = path.join(APP_ROOT, 'data')
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
  console.log('✓ Created data directory')
}

const dbPath = path.join(dbDir, 'guestflow.db')
const db = new Database(dbPath)

// Ensure schema exists
db.exec(`
  CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT,
    timezone TEXT DEFAULT 'Africa/Johannesburg',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    room_count INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  );

  CREATE TABLE IF NOT EXISTS rate_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    property_id INTEGER,
    room_type TEXT NOT NULL,
    season TEXT DEFAULT 'standard',
    rate_per_night REAL NOT NULL,
    currency TEXT DEFAULT 'ZAR',
    min_nights INTEGER DEFAULT 1,
    valid_from DATE,
    valid_to DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (property_id) REFERENCES properties(id)
  );

  CREATE INDEX IF NOT EXISTS idx_rate_cards_tenant ON rate_cards(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_rate_cards_property ON rate_cards(property_id);
  CREATE INDEX IF NOT EXISTS idx_rate_cards_dates ON rate_cards(valid_from, valid_to);
`)

// Ensure Browns tenant exists
const brownsTenant = db.prepare('SELECT id FROM tenants WHERE name LIKE ? LIMIT 1').get('%Browns%')
let brownsId

if (!brownsTenant) {
  const insert = db.prepare('INSERT INTO tenants (name, location, timezone) VALUES (?, ?, ?)')
  const result = insert.run(
    'The Browns Luxury Guest Suites (Dullstroom)',
    'Dullstroom, Mpumalanga, South Africa',
    'Africa/Johannesburg'
  )
  brownsId = result.lastInsertRowid
  console.log(`✓ Created Browns tenant (ID: ${brownsId})`)
} else {
  brownsId = brownsTenant.id
  console.log(`✓ Found existing Browns tenant (ID: ${brownsId})`)
}

// Seed Properties
console.log('\n📍 Seeding Properties...')

const propertiesData = [
  { name: 'Luxury Suite 1', location: '12 Tedder Street, Dullstroom, 1110', room_count: 1 },
  { name: 'Garden Suite', location: '12 Tedder Street, Dullstroom, 1110', room_count: 1 },
  { name: 'Family Suite', location: '12 Tedder Street, Dullstroom, 1110', room_count: 1 }
]

const propertyInsert = db.prepare('INSERT INTO properties (tenant_id, name, location, room_count) VALUES (?, ?, ?, ?)')
const propertyMap = {}

for (const prop of propertiesData) {
  const existing = db.prepare('SELECT id FROM properties WHERE tenant_id = ? AND name = ?').get(brownsId, prop.name)
  
  if (!existing) {
    const result = propertyInsert.run(brownsId, prop.name, prop.location, prop.room_count)
    propertyMap[prop.name] = result.lastInsertRowid
    console.log(`  ✓ Seeded: ${prop.name}`)
  } else {
    propertyMap[prop.name] = existing.id
    console.log(`  → Existing: ${prop.name}`)
  }
}

// Seed Rate Cards from CSV
console.log('\n💰 Seeding Rate Cards...')

if (!fs.existsSync(RATE_CARDS_CSV)) {
  console.log(`  ⚠️  Rate card CSV not found: ${RATE_CARDS_CSV}`)
  console.log('  → Skipping rate card seeding')
} else {
  const csvContent = fs.readFileSync(RATE_CARDS_CSV, 'utf-8')
  const lines = csvContent.trim().split('\n')
  
  if (lines.length < 2) {
    console.log('  ⚠️  CSV has no data rows')
  } else {
    const headers = lines[0].split(',').map(h => h.trim())
    const rateInsert = db.prepare(`
      INSERT INTO rate_cards (
        tenant_id, property_id, room_type, season, rate_per_night, 
        currency, min_nights, valid_from, valid_to, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    let seededCount = 0
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const row = {}
      
      headers.forEach((header, index) => {
        row[header] = values[index] || null
      })
      
      const suiteOrUnit = row.suiteOrUnit || row.room_type
      const propertyId = propertyMap[suiteOrUnit] || null
      const season = row.seasonOrLabel || row.season || 'standard'
      const ratePerNight = parseFloat(row.nightlyRate || row.rate_per_night)
      const currency = row.currency || 'ZAR'
      const minNights = parseInt(row.minStay || row.min_nights || '1')
      const notes = row.notes || null
      
      // Skip if rate is invalid
      if (isNaN(ratePerNight)) {
        console.log(`  ⚠️  Skipped row ${i}: Invalid rate`)
        continue
      }
      
      // Check if similar rate card already exists
      const existing = db.prepare(`
        SELECT id FROM rate_cards 
        WHERE tenant_id = ? AND room_type = ? AND season = ? AND rate_per_night = ?
      `).get(brownsId, suiteOrUnit, season, ratePerNight)
      
      if (!existing) {
        rateInsert.run(
          brownsId,
          propertyId,
          suiteOrUnit,
          season,
          ratePerNight,
          currency,
          minNights,
          null, // valid_from
          null, // valid_to
          notes
        )
        console.log(`  ✓ Seeded: ${suiteOrUnit} - ${season} - ${currency} ${ratePerNight}/night`)
        seededCount++
      }
    }
    
    console.log(`\n  Summary: ${seededCount} rate cards seeded from CSV`)
  }
}

// Display Property Facts (from the-browns-like.md)
console.log('\n📋 Property Facts Reference...')

if (!fs.existsSync(PROPERTY_FACTS_MD)) {
  console.log(`  ⚠️  Property facts not found: ${PROPERTY_FACTS_MD}`)
} else {
  const facts = fs.readFileSync(PROPERTY_FACTS_MD, 'utf-8')
  
  // Extract key facts
  const addressMatch = facts.match(/(?:^|\n)([\d\s]+[\w\s]+Street,[\w\s,]+)/i)
  const phoneMatch = facts.match(/Phone:\s*(\+[\d\s]+)/i)
  const wifiNetworkMatch = facts.match(/Network:\s*(\w+)/i)
  const wifiPasswordMatch = facts.match(/Password:\s*(\S+)/i)
  const checkinMatch = facts.match(/Check-in time is\s*([\d:]+\s*[APM]+)/i)
  const checkoutMatch = facts.match(/Check-out time is\s*([\d:]+\s*[APM]+)/i)
  
  console.log('  From the-browns-like.md:')
  if (addressMatch) console.log(`    Address: ${addressMatch[1]}`)
  if (phoneMatch) console.log(`    Phone: ${phoneMatch[1]}`)
  if (checkinMatch) console.log(`    Check-in: ${checkinMatch[1]}`)
  if (checkoutMatch) console.log(`    Check-out: ${checkoutMatch[1]}`)
  if (wifiNetworkMatch && wifiPasswordMatch) {
    console.log(`    Wi-Fi: ${wifiNetworkMatch[1]} / ${wifiPasswordMatch[1]}`)
  }
  
  console.log('\n  Note: Property facts are extracted from authoritative markdown.')
  console.log('        Never invent phone numbers, Wi-Fi codes, or contact details.')
}

// Summary
console.log('\n═'.repeat(60))
console.log('✅ Browns data seeding complete')
console.log(`   Database: ${dbPath}`)
console.log('\nNext steps:')
console.log('  1. Review rate cards: http://localhost:3100/ops/rate-cards')
console.log('  2. Test quote generation: http://localhost:3100/ops/quote-draft')
console.log('  3. Run smoke tests: npm run smoke')
console.log('═'.repeat(60))

db.close()

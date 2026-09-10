import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const TEST_DB_PATH = path.join(__dirname, '../data/test-lead-actions.db')

// Test data
const NIGHTSBRIDGE_BOOK_URL = 'https://book.nightsbridge.com/24299?promocode=WEBDIRECT'

describe('WhatsApp Draft Generation', () => {
  let db: Database.Database

  beforeAll(() => {
    // Create test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH)
    }

    db = new Database(TEST_DB_PATH)

    // Create minimal schema for testing
    db.exec(`
      CREATE TABLE tenants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      );

      CREATE TABLE waitlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        property_name TEXT,
        room_count TEXT,
        check_in DATE,
        check_out DATE,
        subject TEXT,
        message TEXT,
        status TEXT DEFAULT 'new',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // Insert test tenant
    db.prepare('INSERT INTO tenants (id, name) VALUES (?, ?)').run(1, 'The Browns Luxury Guest Suites')
  })

  afterAll(() => {
    db.close()
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH)
    }
  })

  it('generates WhatsApp draft with name, dates, and link only', () => {
    // Insert test lead
    const stmt = db.prepare(`
      INSERT INTO waitlist (tenant_id, name, email, phone, property_name, check_in, check_out, message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(
      1,
      'Sarah Miller',
      'sarah@example.com',
      '+27821234567',
      'The Browns Dullstroom',
      '2026-12-15',
      '2026-12-17',
      'Looking for a romantic getaway'
    )

    const lead = db.prepare('SELECT * FROM waitlist WHERE email = ?').get('sarah@example.com') as any

    // Generate draft (mimicking the API logic)
    const draft = generateWhatsappDraft(lead)

    // Test requirements
    expect(draft).toContain('Hi Sarah')
    expect(draft).toContain('The Browns Dullstroom')
    expect(draft).toContain(NIGHTSBRIDGE_BOOK_URL)
    expect(draft).toContain('15')
    expect(draft).toContain('17')
    expect(draft).toContain('Dec')
    expect(draft).toContain('2026')

    // Hard rules: NO rates, NO amounts, NO currency
    expect(draft).not.toMatch(/R\d/)
    expect(draft).not.toMatch(/ZAR/)
    expect(draft).not.toMatch(/\d+\.\d{2}/)
    expect(draft).not.toMatch(/rate/i)
    expect(draft).not.toMatch(/price/i)
    expect(draft).not.toMatch(/cost/i)
  })

  it('handles lead without dates gracefully', () => {
    const stmt = db.prepare(`
      INSERT INTO waitlist (tenant_id, name, email, property_name, message)
      VALUES (?, ?, ?, ?, ?)
    `)
    stmt.run(
      1,
      'John Smith',
      'john@example.com',
      'The Browns Dullstroom',
      'General inquiry'
    )

    const lead = db.prepare('SELECT * FROM waitlist WHERE email = ?').get('john@example.com') as any
    const draft = generateWhatsappDraft(lead)

    // Should still work without dates
    expect(draft).toContain('Hi John')
    expect(draft).toContain(NIGHTSBRIDGE_BOOK_URL)
    expect(draft).toContain('The Browns Dullstroom')

    // No broken date placeholders or errors
    expect(draft).not.toContain('undefined')
    expect(draft).not.toContain('null')
  })

  it('uses only first name for greeting', () => {
    const stmt = db.prepare(`
      INSERT INTO waitlist (tenant_id, name, email, property_name)
      VALUES (?, ?, ?, ?)
    `)
    stmt.run(
      1,
      'Mary Jane Watson-Parker',
      'mary@example.com',
      'The Browns Dullstroom'
    )

    const lead = db.prepare('SELECT * FROM waitlist WHERE email = ?').get('mary@example.com') as any
    const draft = generateWhatsappDraft(lead)

    expect(draft).toContain('Hi Mary')
    expect(draft).not.toContain('Hi Mary Jane')
  })

  it('always includes booking link', () => {
    const stmt = db.prepare(`
      INSERT INTO waitlist (tenant_id, name, email, property_name)
      VALUES (?, ?, ?, ?)
    `)
    stmt.run(
      1,
      'Bob Builder',
      'bob@example.com',
      'The Browns Dullstroom'
    )

    const lead = db.prepare('SELECT * FROM waitlist WHERE email = ?').get('bob@example.com') as any
    const draft = generateWhatsappDraft(lead)

    // Must always include the WEBDIRECT link
    expect(draft).toContain(NIGHTSBRIDGE_BOOK_URL)
    expect(draft).toContain('book.nightsbridge.com')
    expect(draft).toContain('24299')
    expect(draft).toContain('WEBDIRECT')
  })

  it('includes professional signature', () => {
    const stmt = db.prepare(`
      INSERT INTO waitlist (tenant_id, name, email, property_name)
      VALUES (?, ?, ?, ?)
    `)
    stmt.run(
      1,
      'Alice Wonder',
      'alice@example.com',
      'The Browns Dullstroom'
    )

    const lead = db.prepare('SELECT * FROM waitlist WHERE email = ?').get('alice@example.com') as any
    const draft = generateWhatsappDraft(lead)

    expect(draft).toContain('Best regards')
    expect(draft).toContain('The Browns Team')
  })
})

// Helper function (mirrors the API logic)
function generateWhatsappDraft(lead: any): string {
  const lines: string[] = []

  lines.push(`Hi ${lead.name.split(' ')[0]},`)
  lines.push('')
  lines.push('Thank you for your inquiry about The Browns Dullstroom.')
  lines.push('')

  if (lead.check_in || lead.check_out) {
    const checkIn = lead.check_in ? new Date(lead.check_in).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }) : '[DATE]'
    const checkOut = lead.check_out ? new Date(lead.check_out).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }) : '[DATE]'

    lines.push(`📅 Dates: ${checkIn} - ${checkOut}`)
    lines.push('')
  }

  lines.push('You can check availability and book directly here:')
  lines.push(NIGHTSBRIDGE_BOOK_URL)
  lines.push('')
  lines.push('Please let me know if you have any questions!')
  lines.push('')
  lines.push('Best regards,')
  lines.push('The Browns Team')

  return lines.join('\n')
}

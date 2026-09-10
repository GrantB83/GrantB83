#!/usr/bin/env node

/**
 * Phase: Lead Action Enhancements
 * Migration: Add check_in, check_out, and message fields to waitlist table
 * 
 * Adds columns needed for storing inquiry dates and message content from contact form
 */

const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const dbDir = path.join(process.cwd(), 'data')
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const dbPath = path.join(dbDir, 'guestflow.db')
const db = new Database(dbPath)

console.log('🔄 Migrating waitlist table to add inquiry date fields...')

try {
  // Check if columns already exist
  const tableInfo = db.prepare("PRAGMA table_info(waitlist)").all()
  const columnNames = tableInfo.map(col => col.name)
  
  if (!columnNames.includes('check_in')) {
    db.prepare('ALTER TABLE waitlist ADD COLUMN check_in DATE').run()
    console.log('✅ Added check_in column')
  } else {
    console.log('⏭️  check_in column already exists')
  }
  
  if (!columnNames.includes('check_out')) {
    db.prepare('ALTER TABLE waitlist ADD COLUMN check_out DATE').run()
    console.log('✅ Added check_out column')
  } else {
    console.log('⏭️  check_out column already exists')
  }
  
  if (!columnNames.includes('message')) {
    db.prepare('ALTER TABLE waitlist ADD COLUMN message TEXT').run()
    console.log('✅ Added message column')
  } else {
    console.log('⏭️  message column already exists')
  }
  
  if (!columnNames.includes('subject')) {
    db.prepare('ALTER TABLE waitlist ADD COLUMN subject TEXT').run()
    console.log('✅ Added subject column')
  } else {
    console.log('⏭️  subject column already exists')
  }
  
  console.log('✅ Migration complete!')
  
} catch (error) {
  console.error('❌ Migration failed:', error)
  process.exit(1)
} finally {
  db.close()
}

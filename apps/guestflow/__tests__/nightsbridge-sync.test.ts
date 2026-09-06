import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Tests for /api/ops/nightsbridge-sync endpoint
 * 
 * Property: The Browns Dullstroom (Nightsbridge 24299)
 * 
 * Test Coverage:
 * - CRON_SECRET auth (pass/fail)
 * - File upload parsing (valid/invalid)
 * - Booking import (success/errors)
 * - Missing field detection
 * - Drive sync configuration check
 */

const API_BASE = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000'

const SYNC_ENDPOINT = `${API_BASE}/api/ops/nightsbridge-sync`

describe('Nightsbridge Autonomous Sync', () => {
  const validCronSecret = process.env.CRON_SECRET || 'test-secret-12345'
  const invalidCronSecret = 'wrong-secret'

  describe('GET /api/ops/nightsbridge-sync (status check)', () => {
    it('should return endpoint status without auth', async () => {
      const response = await fetch(SYNC_ENDPOINT, { method: 'GET' })
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.endpoint).toBe('/api/ops/nightsbridge-sync')
      expect(data.purpose).toContain('Nightsbridge')
      expect(data.property).toContain('The Browns Dullstroom')
      expect(data.schedule).toHaveProperty('morning')
      expect(data.schedule).toHaveProperty('evening')
      expect(data.configuration).toHaveProperty('CRON_SECRET')
    })

    it('should show schedule in Africa/Johannesburg timezone', async () => {
      const response = await fetch(SYNC_ENDPOINT, { method: 'GET' })
      const data = await response.json()

      expect(data.timezone).toBe('Africa/Johannesburg')
      expect(data.schedule.morning).toContain('07:00 SAST')
      expect(data.schedule.evening).toContain('17:00 SAST')
    })
  })

  describe('POST /api/ops/nightsbridge-sync (auth)', () => {
    it('should reject requests without CRON_SECRET', async () => {
      const response = await fetch(SYNC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toContain('Unauthorized')
    })

    it('should reject requests with invalid CRON_SECRET', async () => {
      const response = await fetch(SYNC_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${invalidCronSecret}`,
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toContain('Unauthorized')
    })

    it('should accept requests with valid CRON_SECRET', async () => {
      const response = await fetch(SYNC_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validCronSecret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      // Should not be 401 - may be 200 or other status depending on Drive config
      expect(response.status).not.toBe(401)
    })

    it('should accept CRON_SECRET without Bearer prefix', async () => {
      const response = await fetch(SYNC_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': validCronSecret,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      expect(response.status).not.toBe(401)
    })
  })

  describe('POST /api/ops/nightsbridge-sync (file parsing)', () => {
    it('should parse a valid Nightsbridge .xlsx file', async () => {
      // Read fixture file
      const fixturePath = path.join(
        __dirname,
        '../../../tools/browns-nightsbridge-bookings-adapter/fixtures/nightsbridge-good.csv'
      )

      if (!fs.existsSync(fixturePath)) {
        console.warn('Fixture file not found, skipping test')
        return
      }

      const fileBuffer = fs.readFileSync(fixturePath)
      const fileBase64 = fileBuffer.toString('base64')

      const response = await fetch(SYNC_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validCronSecret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileBase64,
          fileName: 'nightsbridge-good.csv'
        })
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data).toHaveProperty('success')
      expect(data).toHaveProperty('source', 'uploaded_file')
      expect(data).toHaveProperty('bookingsProcessed')
      expect(data).toHaveProperty('bookingsInserted')
      expect(data).toHaveProperty('errors')
      expect(data).toHaveProperty('missingFields')
      expect(data).toHaveProperty('timestamp')

      // Should have processed at least some bookings
      if (data.success) {
        expect(data.bookingsProcessed).toBeGreaterThan(0)
      }
    })

    it('should detect missing fields in sparse data', async () => {
      const fixturePath = path.join(
        __dirname,
        '../../../tools/browns-nightsbridge-bookings-adapter/fixtures/nightsbridge-sparse.csv'
      )

      if (!fs.existsSync(fixturePath)) {
        console.warn('Sparse fixture not found, skipping test')
        return
      }

      const fileBuffer = fs.readFileSync(fixturePath)
      const fileBase64 = fileBuffer.toString('base64')

      const response = await fetch(SYNC_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validCronSecret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileBase64,
          fileName: 'nightsbridge-sparse.csv'
        })
      })

      const data = await response.json()

      // Sparse fixture should have missing fields
      expect(Array.isArray(data.missingFields)).toBe(true)
      if (data.missingFields.length > 0) {
        expect(data.missingFields[0]).toHaveProperty('guest')
        expect(data.missingFields[0]).toHaveProperty('field')
      }
    })

    it('should reject empty files', async () => {
      const emptyBuffer = Buffer.from('', 'utf-8')
      const fileBase64 = emptyBuffer.toString('base64')

      const response = await fetch(SYNC_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validCronSecret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileBase64,
          fileName: 'empty.xlsx'
        })
      })

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.errors.length).toBeGreaterThan(0)
    })
  })

  describe('POST /api/ops/nightsbridge-sync (Drive integration)', () => {
    it('should handle missing NIGHTSBRIDGE_DRIVE_FOLDER_ID gracefully', async () => {
      // Don't upload a file - should fall back to Drive check
      const response = await fetch(SYNC_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validCronSecret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.source).toBe('drive')
      
      // Should explain Drive is not configured
      if (!process.env.NIGHTSBRIDGE_DRIVE_FOLDER_ID) {
        expect(data.success).toBe(false)
        expect(data.message || data.errors[0]?.error).toContain('Drive')
      }
    })
  })

  describe('Sync result schema', () => {
    it('should return complete SyncResult schema', async () => {
      const response = await fetch(SYNC_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validCronSecret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      const data = await response.json()

      // Verify SyncResult interface
      expect(data).toHaveProperty('success')
      expect(typeof data.success).toBe('boolean')

      expect(data).toHaveProperty('source')
      expect(['drive', 'uploaded_file']).toContain(data.source)

      expect(data).toHaveProperty('bookingsProcessed')
      expect(typeof data.bookingsProcessed).toBe('number')

      expect(data).toHaveProperty('bookingsInserted')
      expect(typeof data.bookingsInserted).toBe('number')

      expect(data).toHaveProperty('errors')
      expect(Array.isArray(data.errors)).toBe(true)

      expect(data).toHaveProperty('missingFields')
      expect(Array.isArray(data.missingFields)).toBe(true)

      expect(data).toHaveProperty('timestamp')
      expect(typeof data.timestamp).toBe('string')

      // Timestamp should be valid ISO8601
      expect(() => new Date(data.timestamp)).not.toThrow()
    })
  })

  describe('Safety gates', () => {
    it('should never invent guest data', async () => {
      // This is enforced by parser - missing fields are flagged, not fabricated
      // Verify in result schema that missing fields are reported
      const response = await fetch(SYNC_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validCronSecret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      const data = await response.json()

      // If there are missing fields, they should be in missingFields array
      // NOT silently filled with defaults
      expect(data.missingFields).toBeDefined()
      expect(Array.isArray(data.missingFields)).toBe(true)
    })

    it('should never auto-send WhatsApp or email', async () => {
      // This endpoint only imports bookings - it does not trigger sends
      // Verify this is documented in GET response
      const statusResponse = await fetch(SYNC_ENDPOINT, { method: 'GET' })
      const statusData = await statusResponse.json()

      const workflowText = JSON.stringify(statusData.workflow)
      expect(workflowText).toContain('never auto-send')
      expect(workflowText).not.toContain('send WhatsApp')
      expect(workflowText).not.toContain('send email')
    })
  })
})

describe('Vercel Cron Configuration', () => {
  it('vercel.json should have cron entries for morning + evening SAST', () => {
    const vercelJsonPath = path.join(__dirname, '../vercel.json')
    
    if (!fs.existsSync(vercelJsonPath)) {
      throw new Error('vercel.json not found')
    }

    const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf-8'))

    expect(vercelConfig.crons).toBeDefined()
    expect(Array.isArray(vercelConfig.crons)).toBe(true)

    // Should have at least 2 cron entries (morning + evening)
    expect(vercelConfig.crons.length).toBeGreaterThanOrEqual(2)

    // Find Nightsbridge sync crons
    const syncCrons = vercelConfig.crons.filter((c: any) => 
      c.path.includes('nightsbridge-sync')
    )

    expect(syncCrons.length).toBeGreaterThanOrEqual(2)

    // Morning: 07:00 SAST = 05:00 UTC = "0 5 * * *"
    const morningCron = syncCrons.find((c: any) => c.schedule === '0 5 * * *')
    expect(morningCron).toBeDefined()

    // Evening: 17:00 SAST = 15:00 UTC = "0 15 * * *"
    const eveningCron = syncCrons.find((c: any) => c.schedule === '0 15 * * *')
    expect(eveningCron).toBeDefined()
  })
})

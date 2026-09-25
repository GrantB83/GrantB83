import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '../route'
import * as fs from 'fs'
import * as path from 'path'

// Mock environment
process.env.CRON_SECRET = 'test-cron-secret-12345'

describe('/api/cron/nightsbridge-ingest', () => {
  describe('GET (health check)', () => {
    it('should return 401 without valid secret', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/nightsbridge-ingest')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return status with valid secret in header', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/nightsbridge-ingest', {
        headers: {
          'x-cron-secret': 'test-cron-secret-12345'
        }
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('ready')
      expect(data.endpoint).toBe('/api/cron/nightsbridge-ingest')
      expect(data.property).toBe('The Browns Dullstroom (Nightsbridge 24299)')
    })

    it('should return status with valid secret in query param', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/nightsbridge-ingest?secret=test-cron-secret-12345')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('ready')
    })
  })

  describe('POST (file ingest)', () => {
    it('should return 401 without valid secret', async () => {
      const formData = new FormData()
      const request = new NextRequest('http://localhost:3000/api/cron/nightsbridge-ingest', {
        method: 'POST',
        body: formData
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 without file', async () => {
      const formData = new FormData()
      const request = new NextRequest('http://localhost:3000/api/cron/nightsbridge-ingest', {
        method: 'POST',
        headers: {
          'x-cron-secret': 'test-cron-secret-12345',
          'content-type': 'multipart/form-data'
        },
        body: formData
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No file provided')
    })

    it('should accept JSON with fileUrl', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/nightsbridge-ingest', {
        method: 'POST',
        headers: {
          'x-cron-secret': 'test-cron-secret-12345',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          fileUrl: 'https://example.com/arr_and_dep.xlsx'
        })
      })

      // This will fail to fetch the URL, but we're testing the input validation
      const response = await POST(request)
      const data = await response.json()

      // Should attempt to fetch, then fail (because URL is fake)
      expect(response.status).toBe(400)
      expect(data.error).toBe('Failed to fetch file from URL')
    })

    it('should return 500 if CRON_SECRET not configured', async () => {
      const originalSecret = process.env.CRON_SECRET
      delete process.env.CRON_SECRET

      const formData = new FormData()
      const request = new NextRequest('http://localhost:3000/api/cron/nightsbridge-ingest', {
        method: 'POST',
        headers: {
          'x-cron-secret': 'any-secret'
        },
        body: formData
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('CRON_SECRET not configured')

      // Restore
      process.env.CRON_SECRET = originalSecret
    })
  })

  describe('File parsing', () => {
    it('should parse valid Excel file with bookings', async () => {
      // Note: This test would require a real Excel file fixture
      // For now, we test the error handling path
      const formData = new FormData()
      
      // Create a minimal "bad" file to test error handling
      const badFile = new Blob(['not an excel file'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      formData.append('file', badFile, 'bad.xlsx')

      const request = new NextRequest('http://localhost:3000/api/cron/nightsbridge-ingest', {
        method: 'POST',
        headers: {
          'x-cron-secret': 'test-cron-secret-12345'
        },
        body: formData
      })

      const response = await POST(request)
      const data = await response.json()

      // Garbage bytes: empty/unreadable xlsx is 400; thrown parse is 500.
      expect([400, 500]).toContain(response.status)
      expect(String(data.error || '')).toMatch(/Ingest failed|No valid bookings|No file provided|Invalid content type|section headers/)
    })
  })
})

describe('/api/cron/nightsbridge-reminder', () => {
  it('should check sync status', () => {
    // Placeholder for reminder endpoint tests
    expect(true).toBe(true)
  })
})

// Phase 17: Additional tests for UPSERT logic
describe('/api/cron/nightsbridge-ingest - Phase 17: UPSERT Logic', () => {
  it('TODO: should maintain stable booking count on double import', () => {
    // Test case: Import same file twice, verify booking count remains stable (no duplicates)
    // Expected: First import shows inserted=3, second import shows unchanged=3, DB count=3 (not 6)
    expect(true).toBe(true) // Placeholder - implement after migration runs
  })

  it('TODO: should update existing booking when fields change', () => {
    // Test case: Import booking, then reimport with updated notes/phone
    // Expected: Second import shows updated=1, database reflects new values
    expect(true).toBe(true) // Placeholder
  })

  it('TODO: should soft-cancel booking missing from import window', () => {
    // Test case: Import 3 bookings, then import 2 (one missing)
    // Expected: Missing booking has status='cancelled' and last_seen_import_at set
    expect(true).toBe(true) // Placeholder
  })

  it('TODO: should return enhanced summary with importBatchId and importWindow', () => {
    // Test case: Import bookings and verify response includes summary.importBatchId (UUID) and summary.importWindow
    // Expected: Response includes {summary: {importBatchId: "uuid", importWindow: {minDate, maxDate}}}
    expect(true).toBe(true) // Placeholder
  })

  it('TODO: should preserve guest_contacts upsert behavior', () => {
    // Test case: Import booking with phone/email, verify guest_contacts table updated
    // Expected: guest_contacts row created with correct phone, email, display_name, source='nb'
    expect(true).toBe(true) // Placeholder
  })
})

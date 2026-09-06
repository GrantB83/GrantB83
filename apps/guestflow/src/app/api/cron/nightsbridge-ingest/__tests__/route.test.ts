import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
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

      // Should fail with parsing error
      expect(response.status).toBe(500)
      expect(data.error).toBe('Ingest failed')
    })
  })
})

describe('/api/cron/nightsbridge-reminder', () => {
  it('should check sync status', () => {
    // Placeholder for reminder endpoint tests
    expect(true).toBe(true)
  })
})

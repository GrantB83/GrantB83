'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Upload, AlertCircle, CheckCircle, Trash2, CreditCard } from 'lucide-react'
import { DemoAuthGuard } from '@/components/DemoAuthGuard'
import { useTenant } from '@/components/TenantContext'

export default function RateCardUploadPage() {
  const { selectedTenantId } = useTenant()
  const [fileContent, setFileContent] = useState('')
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [uploadedCount, setUploadedCount] = useState(0)
  const [existingRates, setExistingRates] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const sampleCSV = `room_type,season,rate_per_night,currency,min_nights,valid_from,valid_to,notes
Deluxe Suite with Valley View,high,2500,ZAR,2,2026-12-01,2027-01-31,Peak summer season
Garden Room,standard,1800,ZAR,1,2026-03-01,2026-11-30,Standard off-peak
Executive Suite,high,3200,ZAR,2,2026-12-15,2027-01-15,Holiday premium
Garden Room,high,2200,ZAR,2,2026-12-15,2027-01-15,Holiday rates`

  const sampleJSON = `[
  {
    "room_type": "Deluxe Suite with Valley View",
    "season": "high",
    "rate_per_night": 2500,
    "currency": "ZAR",
    "min_nights": 2,
    "valid_from": "2026-12-01",
    "valid_to": "2027-01-31",
    "notes": "Peak summer season"
  },
  {
    "room_type": "Garden Room",
    "season": "standard",
    "rate_per_night": 1800,
    "currency": "ZAR",
    "min_nights": 1,
    "valid_from": "2026-03-01",
    "valid_to": "2026-11-30",
    "notes": "Standard off-peak"
  }
]`

  useEffect(() => {
    if (selectedTenantId !== null) {
      fetchExistingRates()
    }
  }, [selectedTenantId])

  const fetchExistingRates = async () => {
    if (selectedTenantId === null) return
    try {
      const response = await fetch(`/api/rate-cards?tenant_id=${selectedTenantId}`)
      const data = await response.json()
      setExistingRates(data.rateCards || [])
    } catch (error) {
      console.error('Error fetching rates:', error)
    }
  }

  const parseCSV = (csv: string): any[] => {
    const lines = csv.trim().split('\n')
    if (lines.length < 2) {
      throw new Error('CSV must have header and at least one data row')
    }

    const headers = lines[0].split(',').map(h => h.trim())
    const requiredHeaders = ['room_type', 'rate_per_night']
    
    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        throw new Error(`Missing required column: ${required}`)
      }
    }

    const rateCards = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const card: any = {}
      
      headers.forEach((header, index) => {
        card[header] = values[index] || null
      })

      if (card.rate_per_night) {
        card.rate_per_night = parseFloat(card.rate_per_night)
      }
      if (card.min_nights) {
        card.min_nights = parseInt(card.min_nights)
      }

      rateCards.push(card)
    }

    return rateCards
  }

  const handleUpload = async () => {
    if (selectedTenantId === null) {
      setUploadStatus('error')
      setErrorMessage('No tenant selected')
      return
    }

    setUploadStatus('idle')
    setErrorMessage('')
    setLoading(true)

    try {
      let rateCards: any[]

      if (fileContent.trim().startsWith('[') || fileContent.trim().startsWith('{')) {
        rateCards = JSON.parse(fileContent)
        if (!Array.isArray(rateCards)) {
          rateCards = [rateCards]
        }
      } else {
        rateCards = parseCSV(fileContent)
      }

      for (const card of rateCards) {
        if (!card.room_type || !card.rate_per_night) {
          throw new Error('Each rate card must have room_type and rate_per_night')
        }
      }

      const response = await fetch('/api/rate-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rateCards, tenant_id: selectedTenantId })
      })

      const result = await response.json()

      if (response.ok) {
        setUploadStatus('success')
        setUploadedCount(result.count)
        setFileContent('')
        await fetchExistingRates()
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error: any) {
      setUploadStatus('error')
      setErrorMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClearRates = async () => {
    if (selectedTenantId === null) return
    
    if (!confirm('Delete all rate cards for this tenant? This cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/rate-cards?tenant_id=${selectedTenantId}`, { method: 'DELETE' })
      if (response.ok) {
        await fetchExistingRates()
        setUploadStatus('idle')
      }
    } catch (error) {
      console.error('Error clearing rates:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DemoAuthGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/demo" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Demo
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              Rate Card Upload
            </h1>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
              DEMO
            </span>
          </div>
          <p className="text-gray-600">
            Upload seasonal rates (CSV or JSON) — never let the system invent pricing
          </p>
        </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paste CSV or JSON Rate Card
          </label>
          <textarea
            value={fileContent}
            onChange={(e) => setFileContent(e.target.value)}
            placeholder="Paste CSV or JSON here..."
            className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
          />

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setFileContent(sampleCSV)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              Load Sample CSV
            </button>
            <button
              onClick={() => setFileContent(sampleJSON)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              Load Sample JSON
            </button>
          </div>

          <button
            onClick={handleUpload}
            disabled={!fileContent.trim() || loading}
            className="mt-6 w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" />
            {loading ? 'Uploading...' : 'Upload Rate Card'}
          </button>

          {uploadStatus === 'success' && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">Upload Successful</p>
                <p className="text-sm text-green-700">
                  {uploadedCount} rate card{uploadedCount !== 1 ? 's' : ''} uploaded successfully
                </p>
              </div>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Upload Failed</p>
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Current Rate Cards ({existingRates.length})
            </label>
            {existingRates.length > 0 && (
              <button
                onClick={handleClearRates}
                disabled={loading}
                className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
            )}
          </div>

          <div className="bg-white border border-gray-300 rounded-lg p-4 max-h-96 overflow-y-auto">
            {existingRates.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                No rate cards uploaded yet
              </p>
            ) : (
              <div className="space-y-3">
                {existingRates.map((rate) => (
                  <div key={rate.id} className="border-b pb-3 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{rate.room_type}</p>
                        <p className="text-sm text-gray-600">
                          {rate.currency} {rate.rate_per_night.toLocaleString()} / night
                        </p>
                        <p className="text-xs text-gray-500">
                          Season: {rate.season || 'standard'} · Min: {rate.min_nights} night{rate.min_nights !== 1 ? 's' : ''}
                        </p>
                        {rate.valid_from && rate.valid_to && (
                          <p className="text-xs text-gray-500">
                            Valid: {rate.valid_from} to {rate.valid_to}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Rate Card Format</h3>
        <p className="text-sm text-gray-700 mb-3">
          CSV or JSON with these fields (room_type and rate_per_night are required):
        </p>
        <ul className="space-y-1 text-sm text-gray-700">
          <li><strong>room_type</strong>: Name of room/accommodation type (required)</li>
          <li><strong>rate_per_night</strong>: Numeric rate (required)</li>
          <li><strong>season</strong>: e.g., standard, high, low (optional)</li>
          <li><strong>currency</strong>: e.g., ZAR, USD (default: ZAR)</li>
          <li><strong>min_nights</strong>: Minimum stay (default: 1)</li>
          <li><strong>valid_from / valid_to</strong>: Date range (YYYY-MM-DD, optional)</li>
          <li><strong>notes</strong>: Additional information (optional)</li>
        </ul>
      </div>

        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="font-semibold text-amber-900 mb-2">Safety Features</h3>
          <ul className="space-y-2 text-sm text-amber-800">
            <li>✅ Tenant-scoped: Each tenant has isolated rate cards</li>
            <li>✅ Local SQLite demo only (no cloud storage)</li>
            <li>✅ Quote generator will only use uploaded rates, never invent pricing</li>
            <li>✅ Missing rates = flagged clearly, no fabricated amounts</li>
            <li>⚠️ Demo mode: No authentication yet (Phase 4 stub only)</li>
          </ul>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Next Steps</h3>
          <p className="text-sm text-gray-700 mb-3">
            Once you've uploaded your rate cards, generate an OTA worksheet for manual entry:
          </p>
          <Link
            href="/demo/ota-rate-worksheet"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium"
          >
            <CreditCard className="w-4 h-4" />
            Generate OTA Rate Worksheet →
          </Link>
        </div>
      </div>
    </DemoAuthGuard>
  )
}

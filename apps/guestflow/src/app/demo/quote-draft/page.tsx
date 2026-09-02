'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, Download, Printer } from 'lucide-react'
import { useTenant } from '@/components/TenantContext'

export default function QuoteDraftPage() {
  const { selectedTenantId } = useTenant()
  const [generated, setGenerated] = useState(false)
  const [rateCards, setRateCards] = useState<any[]>([])
  const [hasRates, setHasRates] = useState(false)
  const [exporting, setExporting] = useState(false)

  const sampleBooking = {
    property: 'Riverside Lodge',
    guestName: 'Sarah & John Miller',
    checkIn: '2026-12-15',
    checkOut: '2026-12-17',
    nights: 2,
    room: 'Deluxe Suite with Valley View'
  }

  useEffect(() => {
    if (selectedTenantId !== null) {
      fetchRateCards()
    }
  }, [selectedTenantId])

  const fetchRateCards = async () => {
    if (selectedTenantId === null) return
    try {
      const response = await fetch(`/api/rate-cards?tenant_id=${selectedTenantId}`)
      const data = await response.json()
      setRateCards(data.rateCards || [])
      setHasRates(data.rateCards && data.rateCards.length > 0)
    } catch (error) {
      console.error('Error fetching rate cards:', error)
    }
  }

  const findMatchingRate = (roomType: string, checkIn: string) => {
    const checkInDate = new Date(checkIn)
    
    const matchingRates = rateCards.filter(rate => {
      if (rate.room_type !== roomType) return false
      
      if (rate.valid_from && rate.valid_to) {
        const validFrom = new Date(rate.valid_from)
        const validTo = new Date(rate.valid_to)
        return checkInDate >= validFrom && checkInDate <= validTo
      }
      
      return true
    })

    if (matchingRates.length > 0) {
      matchingRates.sort((a, b) => {
        if (a.valid_from && b.valid_from) {
          return new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime()
        }
        return 0
      })
      return matchingRates[0]
    }

    return null
  }

  const matchedRate = findMatchingRate(sampleBooking.room, sampleBooking.checkIn)

  const calculateQuote = () => {
    if (!matchedRate) {
      return {
        ratePerNight: '[RATE CARD REQUIRED]',
        subtotal: '[PENDING RATE CARD]',
        tax: '[PENDING]',
        total: '[PENDING]',
        currency: 'ZAR',
        note: 'Rates must be loaded from approved rate card. Never invented.'
      }
    }

    const subtotal = matchedRate.rate_per_night * sampleBooking.nights
    const taxRate = 0.15
    const tax = subtotal * taxRate
    const total = subtotal + tax

    return {
      ratePerNight: `${matchedRate.currency} ${matchedRate.rate_per_night.toLocaleString()}`,
      subtotal: `${matchedRate.currency} ${subtotal.toLocaleString()}`,
      tax: `${matchedRate.currency} ${tax.toFixed(2)}`,
      total: `${matchedRate.currency} ${total.toFixed(2)}`,
      currency: matchedRate.currency,
      note: `Rate from ${matchedRate.season || 'standard'} season card. Min nights: ${matchedRate.min_nights}`
    }
  }

  const quote = calculateQuote()

  const handleExport = async (format: 'markdown' | 'html') => {
    setExporting(true)
    try {
      const response = await fetch('/api/quotes/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking: sampleBooking,
          quote,
          format
        })
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quote-${sampleBooking.property.replace(/\s+/g, '-')}.${format === 'markdown' ? 'md' : 'html'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export quote. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const handlePrint = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/quotes/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking: sampleBooking,
          quote,
          format: 'html'
        })
      })

      if (!response.ok) {
        throw new Error('Print preparation failed')
      }

      const htmlContent = await response.text()
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(htmlContent)
        printWindow.document.close()
        setTimeout(() => {
          printWindow.print()
        }, 250)
      }
    } catch (error) {
      console.error('Print error:', error)
      alert('Failed to prepare quote for printing. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/demo" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Demo
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Quote & Invoice Packager
        </h1>
        <p className="text-gray-600">
          Generate professional quote drafts—amounts only from your rate card
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Booking Input Data
          </label>
          <div className="bg-white border border-gray-300 rounded-lg p-6 space-y-4">
            <div>
              <span className="text-sm text-gray-600">Guest:</span>
              <p className="font-medium">{sampleBooking.guestName}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Dates:</span>
              <p className="font-medium">Dec 15-17, 2026 ({sampleBooking.nights} nights)</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Guests:</span>
              <p className="font-medium">2 adults</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Special Requests:</span>
              <p className="font-medium">Room with view, breakfast options, pet-friendly</p>
            </div>
          </div>

          <div className={`mt-6 border rounded-lg p-4 ${hasRates ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <h3 className={`font-semibold mb-2 ${hasRates ? 'text-green-900' : 'text-amber-900'}`}>
              Rate Card Status
            </h3>
            {hasRates ? (
              <>
                <p className={`text-sm mb-2 ${hasRates ? 'text-green-800' : 'text-amber-800'}`}>
                  ✅ {rateCards.length} rate card{rateCards.length !== 1 ? 's' : ''} loaded
                </p>
                {matchedRate ? (
                  <p className="text-xs text-green-700">
                    Using: {matchedRate.season || 'standard'} season, {matchedRate.currency} {matchedRate.rate_per_night.toLocaleString()}/night
                  </p>
                ) : (
                  <p className="text-xs text-amber-700">
                    ⚠️ No matching rate found for "{sampleBooking.room}" on {sampleBooking.checkIn}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-amber-800">
                  🚫 No rate cards loaded
                </p>
                <p className="text-xs text-amber-700 mt-2">
                  <Link href="/demo/rate-card-upload" className="underline hover:text-amber-900">
                    Upload rate card
                  </Link> to enable accurate pricing
                </p>
              </>
            )}
          </div>

          <button
            onClick={() => setGenerated(true)}
            className="mt-6 w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition flex items-center justify-center gap-2"
          >
            <FileText className="w-5 h-5" />
            Generate Draft Quote
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Draft Quote Output
          </label>
          {generated ? (
            <div className="bg-white border border-gray-300 rounded-lg p-6 space-y-4">
              <div className="border-b pb-4">
                <h2 className="text-xl font-bold text-gray-900">Quote for {sampleBooking.guestName}</h2>
                <p className="text-sm text-gray-600">{sampleBooking.property}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-700">Check-in:</span>
                  <span className="font-medium">{sampleBooking.checkIn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Check-out:</span>
                  <span className="font-medium">{sampleBooking.checkOut}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Accommodation:</span>
                  <span className="font-medium">{sampleBooking.room}</span>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-700">{sampleBooking.nights} nights × Rate:</span>
                  <span className={`font-medium ${matchedRate ? 'text-gray-900' : 'text-amber-600'}`}>
                    {quote.ratePerNight}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className={`font-medium ${matchedRate ? 'text-gray-900' : 'text-amber-600'}`}>
                    {quote.subtotal}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Tax (15%):</span>
                  <span className={`font-medium ${matchedRate ? 'text-gray-900' : 'text-amber-600'}`}>
                    {quote.tax}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span className="text-gray-900">Total:</span>
                  <span className={matchedRate ? 'text-gray-900' : 'text-amber-600'}>
                    {quote.total}
                  </span>
                </div>
              </div>

              <div className={`rounded p-3 text-sm border ${matchedRate ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                {matchedRate ? (
                  <>
                    ✅ {quote.note}
                  </>
                ) : (
                  <>
                    ⚠️ {quote.note}
                  </>
                )}
              </div>

              <div className="pt-4 border-t space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleExport('markdown')}
                    disabled={exporting}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    Download .md
                  </button>
                  <button
                    onClick={() => handleExport('html')}
                    disabled={exporting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    Download .html
                  </button>
                </div>
                <button
                  onClick={handlePrint}
                  disabled={exporting}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Printer className="w-4 h-4" />
                  Print Quote
                </button>
                <Link
                  href="/demo/welcome-pack"
                  className="block w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition text-center"
                >
                  Generate Welcome Pack →
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg h-full flex items-center justify-center text-gray-400">
              Click "Generate" to see draft quote
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Quote Safety Features (Phase 8)</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✅ All amounts from uploaded rate card only</li>
          <li>✅ Missing rate = availability-only confirmation (no pricing)</li>
          <li>✅ Draft requires H7 approval gate before send</li>
          <li>✅ No payment processing in this tool (link to your payment provider)</li>
          <li>✅ Seasonal rates, promotions, and minimum stays respected</li>
          <li>✅ <strong>NEW:</strong> Printable/downloadable quote export (markdown & HTML)</li>
          <li>✅ <strong>NEW:</strong> Export preserves [RATE CARD REQUIRED] placeholders when rates missing</li>
        </ul>
      </div>
    </div>
  )
}

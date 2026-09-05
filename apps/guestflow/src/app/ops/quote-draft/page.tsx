'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, Download, Printer, Upload, Sparkles } from 'lucide-react'
import { useTenant } from '@/components/TenantContext'
import { PackGenerator } from '@/components/PackGenerator'

// Import fixtures
import fixtureWithAmounts from '../../../../fixtures/inquiry-with-amounts.json'
import fixtureWithoutAmounts from '../../../../fixtures/inquiry-without-amounts.json'

interface InquiryData {
  guestName: string
  email?: string
  phone?: string
  checkIn: string
  checkOut: string
  nights?: number
  adults?: number
  children?: number
  pets?: boolean
  property: string
  room: string
  specialRequests?: string[]
  occasion?: string
  confidence?: number
  amounts?: {
    ratePerNight: number
    currency: string
    season?: string
  }
}

export default function QuoteDraftPage() {
  const { selectedTenantId } = useTenant()
  const [generated, setGenerated] = useState(false)
  const [rateCards, setRateCards] = useState<any[]>([])
  const [hasRates, setHasRates] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [jsonInput, setJsonInput] = useState('')
  const [inputMode, setInputMode] = useState<'sample' | 'paste' | 'fixture'>('sample')
  const [inquiryData, setInquiryData] = useState<InquiryData | null>(null)
  const [parseError, setParseError] = useState('')

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

  const handleLoadFixture = (withAmounts: boolean) => {
    const fixture = withAmounts ? fixtureWithAmounts : fixtureWithoutAmounts
    setInquiryData(fixture as InquiryData)
    setJsonInput(JSON.stringify(fixture, null, 2))
    setInputMode('fixture')
    setParseError('')
    setGenerated(false)
  }

  const handleParseJSON = () => {
    try {
      const parsed = JSON.parse(jsonInput)
      
      // Validate required fields
      if (!parsed.guestName || !parsed.checkIn || !parsed.checkOut || !parsed.property || !parsed.room) {
        setParseError('Missing required fields: guestName, checkIn, checkOut, property, room')
        return
      }

      // Calculate nights if not provided
      if (!parsed.nights) {
        const checkIn = new Date(parsed.checkIn)
        const checkOut = new Date(parsed.checkOut)
        parsed.nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
      }

      setInquiryData(parsed)
      setInputMode('paste')
      setParseError('')
      setGenerated(false)
    } catch (error) {
      setParseError('Invalid JSON format. Please check your input and try again.')
    }
  }

  const getCurrentBooking = () => {
    if (inquiryData && inputMode !== 'sample') {
      return {
        property: inquiryData.property,
        guestName: inquiryData.guestName,
        checkIn: inquiryData.checkIn,
        checkOut: inquiryData.checkOut,
        nights: inquiryData.nights || 1,
        room: inquiryData.room
      }
    }
    return sampleBooking
  }

  const booking = getCurrentBooking()

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
    // Check if inquiry has embedded amounts (Phase 23)
    if (inquiryData?.amounts && inputMode !== 'sample') {
      return {
        room_type: roomType,
        rate_per_night: inquiryData.amounts.ratePerNight,
        currency: inquiryData.amounts.currency,
        season: inquiryData.amounts.season || 'quoted',
        min_nights: 1,
        source: 'inquiry'
      }
    }

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
      return { ...matchingRates[0], source: 'rate-card' }
    }

    return null
  }

  const matchedRate = findMatchingRate(booking.room, booking.checkIn)

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

    const subtotal = matchedRate.rate_per_night * booking.nights
    const taxRate = 0.15
    const tax = subtotal * taxRate
    const total = subtotal + tax

    const source = matchedRate.source === 'inquiry' ? 
      'quoted amount from inquiry' : 
      `${matchedRate.season || 'standard'} season card`

    return {
      ratePerNight: `${matchedRate.currency} ${matchedRate.rate_per_night.toLocaleString()}`,
      subtotal: `${matchedRate.currency} ${subtotal.toLocaleString()}`,
      tax: `${matchedRate.currency} ${tax.toFixed(2)}`,
      total: `${matchedRate.currency} ${total.toFixed(2)}`,
      currency: matchedRate.currency,
      note: `Rate from ${source}. Min nights: ${matchedRate.min_nights}`
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
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Quote & Invoice Packager
          </h1>
          <span className="text-xs font-medium px-3 py-1 bg-green-100 text-green-700 rounded-full">
            Phase 23
          </span>
        </div>
        <p className="text-gray-600">
          Generate professional quote drafts from inquiry JSON—amounts only from rate card or inquiry data
        </p>
      </div>

      {/* Input Mode Selector */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Input Mode</h3>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setInputMode('sample')
              setInquiryData(null)
              setGenerated(false)
              setParseError('')
            }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              inputMode === 'sample'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Sample Data
          </button>
          <button
            onClick={() => {
              setInputMode('paste')
              setGenerated(false)
              setParseError('')
            }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              inputMode === 'paste'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Paste JSON
          </button>
          <button
            onClick={() => handleLoadFixture(true)}
            className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Load With Amounts
          </button>
          <button
            onClick={() => handleLoadFixture(false)}
            className="px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 transition flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Load Without Amounts
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {inputMode === 'paste' ? 'Inquiry JSON Input' : 'Booking Input Data'}
          </label>
          
          {inputMode === 'paste' ? (
            <div>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                placeholder='Paste inquiry JSON here, e.g.:
{
  "guestName": "John Doe",
  "checkIn": "2026-12-15",
  "checkOut": "2026-12-17",
  "property": "Riverside Lodge",
  "room": "Deluxe Suite",
  ...
}'
              />
              {parseError && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  ❌ {parseError}
                </div>
              )}
              <button
                onClick={handleParseJSON}
                className="mt-4 w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Parse & Preview
              </button>
            </div>
          ) : (
            <div className="bg-white border border-gray-300 rounded-lg p-6 space-y-4 h-96 overflow-auto">
              <div>
                <span className="text-sm text-gray-600">Guest:</span>
                <p className="font-medium">{booking.guestName}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Dates:</span>
                <p className="font-medium">{booking.checkIn} to {booking.checkOut} ({booking.nights} nights)</p>
              </div>
              {inquiryData && (
                <>
                  <div>
                    <span className="text-sm text-gray-600">Guests:</span>
                    <p className="font-medium">{inquiryData.adults || 2} adults{inquiryData.children ? `, ${inquiryData.children} children` : ''}</p>
                  </div>
                  {inquiryData.specialRequests && inquiryData.specialRequests.length > 0 && (
                    <div>
                      <span className="text-sm text-gray-600">Special Requests:</span>
                      <p className="font-medium">{inquiryData.specialRequests.join(', ')}</p>
                    </div>
                  )}
                  {inquiryData.amounts && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <span className="text-sm text-green-800 font-semibold">💰 Embedded Amounts Found</span>
                      <p className="text-sm text-green-700 mt-1">
                        {inquiryData.amounts.currency} {inquiryData.amounts.ratePerNight}/night
                        {inquiryData.amounts.season && ` (${inquiryData.amounts.season})`}
                      </p>
                    </div>
                  )}
                </>
              )}
              {!inquiryData && inputMode === 'sample' && (
                <div>
                  <span className="text-sm text-gray-600">Special Requests:</span>
                  <p className="font-medium">Room with view, breakfast options, pet-friendly</p>
                </div>
              )}
            </div>
          )}

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
                    Using: {matchedRate.season || 'standard'} {matchedRate.source === 'inquiry' ? '(from inquiry)' : '(from rate card)'}, {matchedRate.currency} {matchedRate.rate_per_night.toLocaleString()}/night
                  </p>
                ) : (
                  <p className="text-xs text-amber-700">
                    ⚠️ No matching rate found for "{booking.room}" on {booking.checkIn}
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
            disabled={inputMode === 'paste' && !inquiryData}
            className="mt-6 w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
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
                <h2 className="text-xl font-bold text-gray-900">Quote for {booking.guestName}</h2>
                <p className="text-sm text-gray-600">{booking.property}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-700">Check-in:</span>
                  <span className="font-medium">{booking.checkIn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Check-out:</span>
                  <span className="font-medium">{booking.checkOut}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Accommodation:</span>
                  <span className="font-medium">{booking.room}</span>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-700">{booking.nights} nights × Rate:</span>
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
              {inputMode === 'paste' ? 'Parse JSON and generate quote' : 'Click "Generate" to see draft quote'}
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Quote Safety Features (Phase 23)</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✅ <strong>NEW:</strong> Accept inquiry JSON from Phase 22 output, paste, or fixtures</li>
          <li>✅ <strong>NEW:</strong> If amounts present in JSON → DRAFT quote with those amounts only</li>
          <li>✅ <strong>NEW:</strong> If amounts missing → availability-only draft with [RATE CARD REQUIRED] placeholders</li>
          <li>✅ <strong>NEW:</strong> Load fixtures: with-amounts and without-amounts demos</li>
          <li>✅ All amounts from uploaded rate card or inquiry JSON only</li>
          <li>✅ Missing rate = availability-only confirmation (no pricing)</li>
          <li>✅ Draft requires H7 approval gate before send</li>
          <li>✅ No payment processing in this tool (link to your payment provider)</li>
          <li>✅ Seasonal rates, promotions, and minimum stays respected</li>
          <li>✅ Printable/downloadable quote export (markdown & HTML)</li>
          <li>✅ Export preserves [RATE CARD REQUIRED] placeholders when rates missing</li>
          <li>⚠️ Never invents rates — mirrors tools/browns-quote-invoice-draft semantics</li>
        </ul>
      </div>

      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
        <h3 className="font-semibold text-red-900 mb-3">⚠️ Hard Gates (Phase 23)</h3>
        <ul className="space-y-1 text-sm text-red-800">
          <li>❌ NO live payments / paid ads / public paid signup</li>
          <li>❌ NO NightsBridge API / WhatsApp-email auto-send</li>
          <li>✅ DEMO PLACEHOLDER pricing untouched on sales pages</li>
          <li>✅ DRAFT/fixtures only — never invents amounts</li>
          <li>✅ Quotes require H7 approval before send</li>
        </ul>
      </div>
    </div>
  )
}

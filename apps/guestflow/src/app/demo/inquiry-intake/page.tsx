'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'

const SAMPLE_INQUIRY = `Hi there,

We're looking to book a weekend getaway for our anniversary in December. 
Would you have availability from December 15-17? We'll be 2 adults.

We're interested in a room with a view and would love to know about 
breakfast options. Also, do you allow pets? We have a small dog.

Looking forward to hearing from you!

Best regards,
Sarah & John Miller
sarah.miller@email.com
+27 82 555 1234`

export default function InquiryIntakePage() {
  const [inquiry, setInquiry] = useState(SAMPLE_INQUIRY)
  const [extracted, setExtracted] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleExtract = async () => {
    setLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setExtracted({
      guestName: 'Sarah & John Miller',
      email: 'sarah.miller@email.com',
      phone: '+27 82 555 1234',
      checkIn: '2026-12-15',
      checkOut: '2026-12-17',
      adults: 2,
      children: 0,
      pets: true,
      specialRequests: ['room with a view', 'breakfast options'],
      occasion: 'anniversary',
      confidence: 0.95
    })
    setLoading(false)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/demo" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Demo
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Inquiry Intake Demo
        </h1>
        <p className="text-gray-600">
          Paste an inquiry email or message below to extract structured booking data
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Raw Inquiry Text
          </label>
          <textarea
            value={inquiry}
            onChange={(e) => setInquiry(e.target.value)}
            className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            placeholder="Paste inquiry email or WhatsApp message here..."
          />
          <button
            onClick={handleExtract}
            disabled={loading || !inquiry.trim()}
            className="mt-4 w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {loading ? (
              'Extracting...'
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Extract Booking Data
              </>
            )}
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Structured JSON Output
          </label>
          {extracted ? (
            <div className="bg-gray-900 text-green-400 p-6 rounded-lg h-96 overflow-auto font-mono text-sm">
              <pre>{JSON.stringify(extracted, null, 2)}</pre>
            </div>
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg h-96 flex items-center justify-center text-gray-400">
              Click "Extract" to see structured data
            </div>
          )}
          {extracted && (
            <div className="mt-4 space-y-2">
              <Link
                href="/demo/quote-draft"
                className="block w-full px-6 py-3 bg-white border-2 border-primary-600 text-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition text-center"
              >
                Generate Quote from This →
              </Link>
              <div className="text-xs text-gray-500 text-center">
                <strong>Confidence:</strong> {(extracted.confidence * 100).toFixed(0)}% · 
                <strong className="ml-2">No live rates</strong> will be invented
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-2">What's Happening Here?</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✅ Guest details (name, email, phone) extracted from free text</li>
          <li>✅ Check-in and check-out dates normalized to ISO format</li>
          <li>✅ Guest count, pet status, and special requests identified</li>
          <li>✅ Occasion flagged for personalized communication</li>
          <li>⚠️ In production: feeds into your booking system (NightsBridge, Google Calendar, etc.)</li>
          <li>⚠️ No LLM hallucination: missing details = flagged, never invented</li>
        </ul>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'

export default function QuoteDraftPage() {
  const [generated, setGenerated] = useState(false)

  const sampleQuote = {
    property: 'Riverside Lodge',
    guestName: 'Sarah & John Miller',
    checkIn: '2026-12-15',
    checkOut: '2026-12-17',
    nights: 2,
    room: 'Deluxe Suite with Valley View',
    ratePerNight: '[RATE CARD REQUIRED]',
    subtotal: '[PENDING RATE CARD]',
    tax: '[PENDING]',
    total: '[PENDING]',
    note: 'Rates must be loaded from approved rate card. Never invented.'
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
              <p className="font-medium">Sarah & John Miller</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Dates:</span>
              <p className="font-medium">Dec 15-17, 2026 (2 nights)</p>
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

          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="font-semibold text-amber-900 mb-2">Rate Card Status</h3>
            <p className="text-sm text-amber-800">
              🚫 No rate card loaded (Demo mode)
            </p>
            <p className="text-xs text-amber-700 mt-2">
              In production: upload your seasonal rates, never let the system invent pricing
            </p>
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
                <h2 className="text-xl font-bold text-gray-900">Quote for {sampleQuote.guestName}</h2>
                <p className="text-sm text-gray-600">{sampleQuote.property}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-700">Check-in:</span>
                  <span className="font-medium">{sampleQuote.checkIn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Check-out:</span>
                  <span className="font-medium">{sampleQuote.checkOut}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Accommodation:</span>
                  <span className="font-medium">{sampleQuote.room}</span>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-700">{sampleQuote.nights} nights × Rate:</span>
                  <span className="font-medium text-amber-600">{sampleQuote.ratePerNight}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="font-medium text-amber-600">{sampleQuote.subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Tax:</span>
                  <span className="font-medium text-amber-600">{sampleQuote.tax}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-amber-600">{sampleQuote.total}</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
                ⚠️ Amounts require approved rate card. Draft-only, no auto-send.
              </div>

              <div className="pt-4 border-t">
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
        <h3 className="font-semibold text-gray-900 mb-2">Quote Safety Features</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✅ All amounts from uploaded rate card only</li>
          <li>✅ Missing rate = availability-only confirmation (no pricing)</li>
          <li>✅ Draft requires H7 approval gate before send</li>
          <li>✅ No payment processing in this tool (link to your payment provider)</li>
          <li>✅ Seasonal rates, promotions, and minimum stays respected</li>
        </ul>
      </div>
    </div>
  )
}

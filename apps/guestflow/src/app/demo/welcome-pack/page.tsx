'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail } from 'lucide-react'

export default function WelcomePackPage() {
  const [generated, setGenerated] = useState(false)

  const sampleWelcome = `Dear Sarah and John,

Welcome to Riverside Lodge! We're delighted to host you for your anniversary celebration.

**ARRIVAL DETAILS**
Check-in: December 15, 2026 from 2:00 PM
Your suite: Deluxe Suite with Valley View (Room 3)

**ACCESS**
Main gate code: [PROPERTY OWNER TO PROVIDE]
Suite key: Collect from reception on arrival

**WI-FI**
Network: Riverside-Guest
Password: [PROPERTY OWNER TO PROVIDE]

**BREAKFAST**
Served daily 7:30 AM - 10:00 AM in the dining room
Please let us know dietary preferences

**CHECKOUT**
December 17, 2026 by 10:00 AM

**YOUR PET**
We've noted you'll have your small dog with you. Pet-friendly amenities are in your suite.

**CONTACT**
Any questions: +27 XX XXX XXXX (24/7)

Looking forward to welcoming you!

Warm regards,
Riverside Lodge Team

---
⚠️ DRAFT ONLY - Never auto-sent. Missing Wi-Fi/codes flagged for owner to fill.`

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/demo" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Demo
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Guest Welcome Pack
        </h1>
        <p className="text-gray-600">
          Personalized pre-arrival messages with property facts—never invents missing details
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Property Knowledge Base
          </label>
          <div className="bg-white border border-gray-300 rounded-lg p-6 space-y-4 text-sm">
            <div>
              <span className="font-semibold text-gray-900">Property:</span> Riverside Lodge
            </div>
            <div>
              <span className="font-semibold text-gray-900">Check-in time:</span> 2:00 PM
            </div>
            <div>
              <span className="font-semibold text-gray-900">Check-out time:</span> 10:00 AM
            </div>
            <div>
              <span className="font-semibold text-gray-900">Breakfast:</span> 7:30-10:00 AM, dining room
            </div>
            <div>
              <span className="font-semibold text-gray-900">Wi-Fi:</span> 
              <span className="text-amber-600 ml-2">[NOT IN KNOWLEDGE FILE]</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">Gate code:</span> 
              <span className="text-amber-600 ml-2">[NOT IN KNOWLEDGE FILE]</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">Pet policy:</span> Small dogs allowed
            </div>
            <div>
              <span className="font-semibold text-gray-900">Emergency contact:</span> +27 XX XXX XXXX
            </div>
          </div>

          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="font-semibold text-amber-900 mb-2">Missing Facts Flagged</h3>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• Wi-Fi password not in knowledge file</li>
              <li>• Gate access code not in knowledge file</li>
            </ul>
            <p className="text-xs text-amber-700 mt-2">
              These will be placeholders in the draft for owner to fill manually
            </p>
          </div>

          <button
            onClick={() => setGenerated(true)}
            className="mt-6 w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition flex items-center justify-center gap-2"
          >
            <Mail className="w-5 h-5" />
            Generate Welcome Pack
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Draft Welcome Message
          </label>
          {generated ? (
            <div className="bg-white border border-gray-300 rounded-lg p-6">
              <div className="prose prose-sm max-w-none">
                {sampleWelcome.split('\n').map((line, i) => {
                  if (line.startsWith('**')) {
                    return <h3 key={i} className="font-semibold text-gray-900 mt-4 mb-2">{line.replace(/\*\*/g, '')}</h3>
                  }
                  if (line.includes('[PROPERTY OWNER TO PROVIDE]')) {
                    return <p key={i} className="text-amber-600">{line}</p>
                  }
                  if (line.startsWith('---')) {
                    return <hr key={i} className="my-4" />
                  }
                  if (line.startsWith('⚠️')) {
                    return <p key={i} className="text-xs text-amber-700 italic">{line}</p>
                  }
                  return <p key={i} className="text-gray-700 mb-2">{line}</p>
                })}
              </div>

              <div className="mt-6 pt-6 border-t">
                <Link
                  href="/demo/daily-brief"
                  className="block w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition text-center"
                >
                  View Daily Ops Brief →
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg h-full flex items-center justify-center text-gray-400">
              Click "Generate" to see welcome pack
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Welcome Pack Safety Features</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✅ All facts from property knowledge file only</li>
          <li>✅ Missing Wi-Fi password, codes, times → explicitly flagged</li>
          <li>✅ Personalized for guest occasion (anniversary, honeymoon, etc.)</li>
          <li>✅ H2 approval gate required before send</li>
          <li>✅ Never invents check-in times, amenities, or contact numbers</li>
        </ul>
      </div>
    </div>
  )
}

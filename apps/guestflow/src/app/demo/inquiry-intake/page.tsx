'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Sparkles, Save, FileDown, AlertCircle, CheckCircle, Upload } from 'lucide-react'
import { extractInquiry, generateDraftReply } from '@/lib/extraction'
import { useTenant } from '@/components/TenantContext'

const DEFAULT_INQUIRY = `Hi there,

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
  const { selectedTenant } = useTenant()
  const [inquiry, setInquiry] = useState(DEFAULT_INQUIRY)
  const [extracted, setExtracted] = useState<any>(null)
  const [draftReply, setDraftReply] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const handleExtract = () => {
    setLoading(true)
    
    // Use pure TS heuristics - no LLM
    const result = extractInquiry(inquiry)
    setExtracted(result)
    
    // Generate draft reply
    const propertyName = selectedTenant?.name || 'Demo Property'
    const reply = generateDraftReply(result, propertyName)
    setDraftReply(reply)
    
    setLoading(false)
  }

  const handleLoadFixture = async (fixture: 'with-amounts' | 'without-amounts' | 'whatsapp') => {
    try {
      const fixtureMap = {
        'with-amounts': '/fixtures/inquiry-with-amounts.txt',
        'without-amounts': '/fixtures/inquiry-without-amounts.txt',
        'whatsapp': '/fixtures/inquiry-whatsapp-style.txt'
      }
      
      const response = await fetch(fixtureMap[fixture])
      if (response.ok) {
        const text = await response.text()
        setInquiry(text)
        setExtracted(null)
        setDraftReply('')
      }
    } catch (err) {
      console.error('Failed to load fixture:', err)
    }
  }

  const handleSaveToCRM = async () => {
    if (!extracted || !selectedTenant) return
    
    setSaveStatus('saving')
    
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: selectedTenant.id,
          name: extracted.guestName || '[GUEST NAME]',
          email: extracted.email || '[EMAIL]',
          property_name: extracted.suiteOrUnit || '[SUITE]',
          room_count: extracted.adults || 0,
          current_system: 'inquiry-intake',
          notes: `[DRAFT INQUIRY]\nCheck-in: ${extracted.checkInDate || '[TBD]'}\nCheck-out: ${extracted.checkOutDate || '[TBD]'}\nAdults: ${extracted.adults || '?'}\nChildren: ${extracted.children || 0}\nChannel: ${extracted.channel || 'unknown'}\n\nOriginal inquiry:\n${inquiry.substring(0, 500)}`,
          status: 'new'
        })
      })
      
      if (response.ok) {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        setSaveStatus('error')
      }
    } catch (err) {
      console.error('Save error:', err)
      setSaveStatus('error')
    }
  }

  const handleExportMarkdown = () => {
    if (!draftReply) return
    
    const blob = new Blob([draftReply], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inquiry-draft-reply-${Date.now()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const hasAmounts = extracted?.quoteAmount !== undefined || extracted?.depositAmount !== undefined || extracted?.totalAmount !== undefined

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/demo" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Demo
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Demo Inquiry Intake
          </h1>
          <span className="text-xs font-medium px-2 py-1 bg-purple-100 text-purple-700 rounded-full">Phase 22</span>
        </div>
        <p className="text-gray-600">
          Paste inquiry text and get structured booking fields for active demo tenant — mirrors tools/browns-inquiry-intake heuristics (DRAFT/fixtures only)
        </p>
      </div>

      {/* Fixture Loader */}
      <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Upload className="w-5 h-5 text-amber-700" />
          <h3 className="font-semibold text-amber-900">Load Sample Fixtures</h3>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleLoadFixture('with-amounts')}
            className="px-4 py-2 bg-white border border-amber-300 text-amber-800 rounded-lg text-sm font-medium hover:bg-amber-100 transition"
          >
            With Rates & Amounts
          </button>
          <button
            onClick={() => handleLoadFixture('without-amounts')}
            className="px-4 py-2 bg-white border border-amber-300 text-amber-800 rounded-lg text-sm font-medium hover:bg-amber-100 transition"
          >
            Without Rates (Availability Only)
          </button>
          <button
            onClick={() => handleLoadFixture('whatsapp')}
            className="px-4 py-2 bg-white border border-amber-300 text-amber-800 rounded-lg text-sm font-medium hover:bg-amber-100 transition"
          >
            WhatsApp-Style
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Raw Inquiry Text (Email / WhatsApp)
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
                Extract Structured Data
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
              {extracted.missingFields && extracted.missingFields.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-900">Missing Fields</p>
                      <p className="text-xs text-amber-700 mt-1">{extracted.missingFields.join(', ')}</p>
                    </div>
                  </div>
                </div>
              )}
              {hasAmounts ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Rates Found</p>
                      <p className="text-xs text-green-700 mt-1">
                        {extracted.currency || 'ZAR'} amounts extracted from inquiry text
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">No Rates Found</p>
                      <p className="text-xs text-blue-700 mt-1">Availability check only — no amounts to extract</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Draft Reply Section */}
      {extracted && draftReply && (
        <div className="mb-8 bg-white border-2 border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Draft Reply Stub</h3>
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap mb-4 max-h-96 overflow-auto">
            {draftReply}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExportMarkdown}
              className="flex-1 px-4 py-2 bg-white border-2 border-primary-600 text-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition flex items-center justify-center gap-2"
            >
              <FileDown className="w-5 h-5" />
              Export as Markdown
            </button>
            <button
              onClick={handleSaveToCRM}
              disabled={saveStatus === 'saving' || !selectedTenant}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {saveStatus === 'saving' ? (
                'Saving...'
              ) : saveStatus === 'saved' ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Saved to CRM
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save to CRM (DRAFT)
                </>
              )}
            </button>
          </div>
          {saveStatus === 'saved' && (
            <div className="mt-3 text-sm text-green-700 text-center">
              ✓ Inquiry saved as DRAFT lead for tenant: {selectedTenant?.name}
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="mt-3 text-sm text-red-700 text-center">
              ✗ Failed to save. Please try again.
            </div>
          )}
        </div>
      )}

      {/* Hard Gates */}
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
        <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Hard Gates (Phase 22)
        </h3>
        <ul className="space-y-2 text-sm text-red-800">
          <li>✅ Pure TypeScript heuristics — NO LLM, NO hallucination</li>
          <li>✅ Rates/amounts ONLY if explicitly present with currency in text</li>
          <li>✅ Missing amounts → availability-only (never invents pricing)</li>
          <li>✅ DRAFT label on CRM save — requires tenant scope</li>
          <li>⚠️ NO live email/WhatsApp send — export is local markdown only</li>
          <li>⚠️ DEMO environment — fixture testing only</li>
        </ul>
      </div>
    </div>
  )
}

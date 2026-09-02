'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Download, FileText, Printer, ArrowLeft, FileArchive, Package } from 'lucide-react'
import { useTenant } from '@/components/TenantContext'

export default function SalesHandoffPage() {
  const { selectedTenantId, tenants } = useTenant()
  const activeTenant = tenants.find(t => t.id === selectedTenantId)
  
  const [prospectName, setProspectName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [demoDate, setDemoDate] = useState(new Date().toLocaleDateString())
  const [exporting, setExporting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const tenantName = activeTenant?.name || 'Demo Guesthouse'

  const handleExport = async (format: 'markdown' | 'html' | 'zip') => {
    setExporting(true)
    try {
      const response = await fetch('/api/sales-handoff/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format,
          tenantName,
          prospectName: prospectName.trim(),
          inviteCode: inviteCode.trim(),
          demoDate
        })
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      const fileExt = format === 'zip' ? 'zip' : format === 'html' ? 'html' : 'md'
      const dateSuffix = demoDate.replace(/\//g, '-')
      a.download = `guestflow-sales-handoff-${dateSuffix}.${fileExt}`
      
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export sales handoff. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const handlePrint = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/sales-handoff/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: 'html',
          tenantName,
          prospectName: prospectName.trim(),
          inviteCode: inviteCode.trim(),
          demoDate
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
      alert('Failed to prepare sales handoff for printing. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-100 text-sky-800 rounded-full text-sm font-medium mb-4">
          📦 PHASE 32 · Post-Demo Sales Handoff Pack
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Post-Demo Sales Handoff Pack
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Generate a downloadable handoff pack for prospects after a demo walkthrough.
          <br />
          <strong className="text-primary-600">Includes: thank-you, next steps, key links, invite code redemption, leave-behind summary, and hard gates reminder.</strong>
        </p>
      </div>

      {/* Hard Gates Warning */}
      <div className="mb-8 bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <Package className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-amber-900 mb-2">⚠️ DEMO ACCESS ONLY — Not a Paid Account</h3>
            <p className="text-sm text-amber-800 mb-2">
              This handoff pack is for post-demo follow-up with prospects. It provides demo access links and explains that 
              invite codes unlock DEMO ACCESS ONLY—not a paid account, signup, or subscription.
            </p>
            <p className="text-sm text-amber-800">
              <strong>Hard gates respected:</strong> NO live payments, NO auto-send, NO invented data, DEMO labeling throughout.
            </p>
          </div>
        </div>
      </div>

      {/* Input Form */}
      <div className="mb-8 bg-white border-2 border-gray-200 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Customize Handoff Pack</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="prospectName" className="block text-sm font-medium text-gray-700 mb-1">
              Prospect Name (optional)
            </label>
            <input
              type="text"
              id="prospectName"
              value={prospectName}
              onChange={(e) => setProspectName(e.target.value)}
              placeholder="e.g., Sarah Smith"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Used in greeting and follow-up notes</p>
          </div>

          <div>
            <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-1">
              Invite Code (optional)
            </label>
            <input
              type="text"
              id="inviteCode"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="e.g., DEMO2026"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">
              If provided, includes redemption instructions. Leave blank to show code generation instructions instead.
            </p>
          </div>

          <div>
            <label htmlFor="demoDate" className="block text-sm font-medium text-gray-700 mb-1">
              Demo Date
            </label>
            <input
              type="text"
              id="demoDate"
              value={demoDate}
              onChange={(e) => setDemoDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Used for filename and pack metadata</p>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              <strong>Active Tenant:</strong> {tenantName}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Switch tenant on <Link href="/demo" className="text-primary-600 hover:underline">Demo Hub</Link> if needed
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-8 flex gap-4 justify-center flex-wrap">
        <button
          onClick={() => handleExport('markdown')}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          Download Markdown
        </button>
        <button
          onClick={() => handleExport('html')}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          Download HTML
        </button>
        <button
          onClick={() => handleExport('zip')}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileArchive className="w-5 h-5" />
          Download ZIP
        </button>
        <button
          onClick={handlePrint}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Printer className="w-5 h-5" />
          Print to PDF
        </button>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-700 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
        >
          <FileText className="w-5 h-5" />
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </button>
      </div>

      {/* Preview Content */}
      {showPreview && (
        <div className="mb-8 bg-white border-2 border-gray-200 rounded-xl p-8">
          <h2 className="text-3xl font-bold text-primary-600 mb-6 text-center">
            GuestFlow Post-Demo Sales Handoff Pack
          </h2>
          
          <div className="space-y-6 text-gray-700">
            <div>
              <p className="font-medium">Demo Date: {demoDate}</p>
              <p className="font-medium">Tenant: {tenantName}</p>
              {inviteCode && <p className="font-medium">Your Invite Code: <code className="bg-gray-100 px-2 py-1 rounded">{inviteCode}</code></p>}
            </div>

            <hr className="border-gray-200" />

            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Thank You for Your Time</h3>
              <p>{prospectName ? `Dear ${prospectName},` : 'Hello,'}</p>
              <p className="mt-2">
                Thank you for exploring GuestFlow with us during today's demo. We hope you saw how our platform can reduce operational heavy lifting while keeping you in control of guest communication and pricing decisions.
              </p>
              <p className="mt-2 font-medium">
                This handoff pack gives you everything you need to explore further and share with your team.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Your Next Steps</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">1. Try the Demo Yourself</h4>
                  {inviteCode ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="font-medium text-green-900 mb-2">Redeem Your Demo Access Code:</p>
                      <ul className="text-sm text-green-800 space-y-1">
                        <li>• Visit: <a href="/demo/redeem" className="text-primary-600 hover:underline">localhost:3100/demo/redeem</a></li>
                        <li>• Enter code: <code className="bg-green-100 px-2 py-1 rounded">{inviteCode}</code></li>
                        <li>• Unlock full demo tenant access (DEMO ACCESS ONLY—not a paid account)</li>
                      </ul>
                      <p className="text-xs text-green-700 mt-3 italic">
                        Note: This code provides demo access to see how the platform works with sample data. 
                        It does NOT create a paid account, subscription, or charge anything.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="font-medium text-blue-900 mb-2">Generate a Demo Invite Code:</p>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Visit: <a href="/demo/invite-codes" className="text-primary-600 hover:underline">localhost:3100/demo/invite-codes</a></li>
                        <li>• Create your own demo access code</li>
                        <li>• Demo password: <code className="bg-blue-100 px-2 py-1 rounded">demo2026</code></li>
                      </ul>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">2. Join the Waitlist</h4>
                  <p className="text-sm mb-2">Reserve your spot for beta access:</p>
                  <ul className="text-sm space-y-1">
                    <li>• <a href="/waitlist" className="text-primary-600 hover:underline">Waitlist Form</a></li>
                    <li>• No payment required</li>
                    <li>• Priority notification when beta launches</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">3. Explore Key Features</h4>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="font-medium text-gray-700 mb-1">Core Automation:</p>
                      <ul className="space-y-0.5 text-gray-600">
                        <li>• <a href="/demo/inquiry-intake" className="hover:underline">Inquiry Intake</a></li>
                        <li>• <a href="/demo/quote-draft" className="hover:underline">Quote Draft</a></li>
                        <li>• <a href="/demo/welcome-drafts" className="hover:underline">Welcome Packs</a></li>
                        <li>• <a href="/demo/daily-brief" className="hover:underline">Daily Ops Brief</a></li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700 mb-1">Sales & CRM:</p>
                      <ul className="space-y-0.5 text-gray-600">
                        <li>• <a href="/crm" className="hover:underline">CRM Pipeline</a></li>
                        <li>• <a href="/demo/invite-usage" className="hover:underline">Invite Usage Report</a></li>
                        <li>• <a href="/demo/sales-leavebehind" className="hover:underline">Sales Leave-Behind</a></li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">4. Contact Us</h4>
                  <p className="text-sm mb-2">Have questions or want to discuss your specific operational needs?</p>
                  <ul className="text-sm space-y-1">
                    <li>• <strong>Email:</strong> grant@thebrowns.co.za</li>
                    <li>• <strong>Subject:</strong> GuestFlow Demo Follow-Up{prospectName ? ` — ${prospectName}` : ''}</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
              <h3 className="text-lg font-bold text-amber-900 mb-2">⚠️ Important: DEMO ACCESS ONLY</h3>
              <p className="text-sm text-amber-800 mb-2">
                This is a demo environment with placeholder data — NOT a paid account or production setup.
              </p>
              <div className="grid md:grid-cols-2 gap-3 text-sm text-amber-800">
                <div>
                  <p className="font-medium mb-1">What This Demo IS:</p>
                  <ul className="space-y-0.5">
                    <li>✅ Local SQLite with sample data</li>
                    <li>✅ All features with DRAFT/fixtures</li>
                    <li>✅ Safe exploration environment</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-1">What This Demo IS NOT:</p>
                  <ul className="space-y-0.5">
                    <li>❌ NOT a paid account</li>
                    <li>❌ NOT a signup or payment</li>
                    <li>❌ NOT connected to live services</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="text-center pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                {prospectName ? `Thank you, ${prospectName}! ` : 'Thank you! '}
                We appreciate your time and look forward to hearing from you.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                GuestFlow Sales Handoff Pack (Phase 32) · {demoDate} · DEMO/Fixtures Only
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Reference Links */}
      <div className="mb-8 bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-3">Quick Reference: What's Included in Handoff Pack</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Core Content:</h4>
            <ul className="space-y-1 text-gray-600">
              <li>✓ Thank-you message with personalized greeting</li>
              <li>✓ Invite code redemption instructions (or generation steps)</li>
              <li>✓ 13-step demo flow summary</li>
              <li>✓ Key feature links (inquiry, quote, ops, CRM)</li>
              <li>✓ Waitlist join instructions</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Safety & Compliance:</h4>
            <ul className="space-y-1 text-gray-600">
              <li>✓ Hard gates reminder (NO payments, NO auto-send)</li>
              <li>✓ DEMO ACCESS ONLY banner and explanation</li>
              <li>✓ Pricing disclaimer (PLACEHOLDER only)</li>
              <li>✓ Contact info for questions</li>
              <li>✓ Leave-behind pack deep link</li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          <strong>ZIP export includes:</strong> SALES-HANDOFF.md, QUICK-LINKS.md, HARD-GATES.md
        </p>
      </div>

      {/* Related Pages */}
      <div className="mb-8 bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-3">Related Sales Pages</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <Link
            href="/demo/sales-walkthrough"
            className="block p-4 bg-emerald-50 border border-emerald-200 rounded-lg hover:shadow-md transition"
          >
            <h4 className="font-semibold text-emerald-900 mb-1">Sales Walkthrough</h4>
            <p className="text-xs text-emerald-700">Guided 13-step demo checklist</p>
          </Link>
          <Link
            href="/demo/sales-leavebehind"
            className="block p-4 bg-teal-50 border border-teal-200 rounded-lg hover:shadow-md transition"
          >
            <h4 className="font-semibold text-teal-900 mb-1">Sales Leave-Behind</h4>
            <p className="text-xs text-teal-700">Complete product overview pack</p>
          </Link>
          <Link
            href="/demo/invite-usage"
            className="block p-4 bg-blue-50 border border-blue-200 rounded-lg hover:shadow-md transition"
          >
            <h4 className="font-semibold text-blue-900 mb-1">Invite Usage Report</h4>
            <p className="text-xs text-blue-700">Track code redemptions & attribution</p>
          </Link>
        </div>
      </div>

      {/* Back Link */}
      <div className="text-center">
        <Link
          href="/demo"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Demo Hub
        </Link>
      </div>
    </div>
  )
}

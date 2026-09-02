'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileDown, AlertCircle, FileText, Table, Download } from 'lucide-react'
import { useTenant } from '@/components/TenantContext'

export default function OTARateWorksheetPage() {
  const { selectedTenantId, tenants } = useTenant()
  const selectedTenant = tenants.find(t => t.id === selectedTenantId)
  const [rateCards, setRateCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [includePromo, setIncludePromo] = useState(false)

  const promoExample = {
    code: 'SUMMER2027',
    description: 'Summer early bird special',
    discount: '15% off standard rates',
    validFrom: '2027-01-01',
    validTo: '2027-02-28'
  }

  useEffect(() => {
    if (selectedTenantId !== null) {
      fetchRateCards()
    }
  }, [selectedTenantId])

  const fetchRateCards = async () => {
    if (selectedTenantId === null) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/rate-cards?tenant_id=${selectedTenantId}`)
      const data = await response.json()
      
      // Add at least one blank rate example to fixtures if none exist
      let rates = data.rateCards || []
      
      // If no rates exist, add example blank rate to demonstrate never-invent behavior
      if (rates.length === 0) {
        rates = [
          {
            id: 'blank-1',
            room_type: 'Standard Room (Example - No Rate Set)',
            season: 'standard',
            rate_per_night: null, // Blank to prove never-invent
            currency: 'ZAR',
            min_nights: 1,
            valid_from: null,
            valid_to: null,
            notes: 'No rate card exists - contact property owner'
          }
        ]
      } else {
        // Add one blank rate row to the existing rates to prove never-invent
        rates.push({
          id: 'blank-demo',
          room_type: 'Deluxe Suite (No Rate Card)',
          season: 'high',
          rate_per_night: null, // Intentionally blank
          currency: 'ZAR',
          min_nights: 2,
          valid_from: '2027-12-01',
          valid_to: '2028-01-31',
          notes: 'Rate card missing - never invent pricing'
        })
      }
      
      setRateCards(rates)
    } catch (error) {
      console.error('Error fetching rate cards:', error)
      // Even on error, show blank rate example
      setRateCards([{
        id: 'blank-fallback',
        room_type: 'Example Room (No Rate)',
        season: 'standard',
        rate_per_night: null,
        currency: 'ZAR',
        min_nights: 1,
        valid_from: null,
        valid_to: null,
        notes: 'Rate card required - contact property owner'
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'markdown' | 'csv' | 'html') => {
    setExporting(true)
    try {
      const worksheetData = {
        tenantName: selectedTenant?.name || 'Unknown Tenant',
        generatedAt: new Date().toISOString().split('T')[0],
        rateCards,
        promoExample: includePromo ? promoExample : null
      }

      const response = await fetch('/api/ota-worksheet/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worksheetData, format })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `ota-rate-worksheet.${format === 'markdown' ? 'md' : format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const handlePrintHTML = async () => {
    setExporting(true)
    try {
      const worksheetData = {
        tenantName: selectedTenant?.name || 'Unknown Tenant',
        generatedAt: new Date().toISOString().split('T')[0],
        rateCards,
        promoExample: includePromo ? promoExample : null
      }

      const response = await fetch('/api/ota-worksheet/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worksheetData, format: 'html' })
      })

      if (response.ok) {
        const htmlContent = await response.text()
        const printWindow = window.open('', '_blank')
        if (printWindow) {
          printWindow.document.write(htmlContent)
          printWindow.document.close()
          setTimeout(() => printWindow.print(), 500)
        }
      } else {
        alert('Print preview failed')
      }
    } catch (error) {
      console.error('Print error:', error)
      alert('Print preview failed')
    } finally {
      setExporting(false)
    }
  }

  const hasBlankRates = rateCards.some(rate => !rate.rate_per_night)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/demo" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Demo
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-gray-900">
            OTA Rate Worksheet
          </h1>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
            Phase 24
          </span>
        </div>
        <p className="text-gray-600">
          Generate OTA promotional rate worksheet from tenant rate cards — DRAFT/fixtures only, manual entry
        </p>
      </div>

      {selectedTenant && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-900">
            <strong>Active Tenant:</strong> {selectedTenant.name} ({selectedTenant.location})
          </p>
        </div>
      )}

      <div className="bg-amber-50 border-l-4 border-amber-500 p-6 mb-6 rounded-r-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900 mb-2">⚠️ APPROVAL REMINDER</h3>
            <p className="text-sm text-amber-800 mb-2">
              <strong>Grant/tenant approval required</strong> before applying any rates to live OTA or Nightsbridge systems.
            </p>
            <p className="text-sm text-amber-800">
              This worksheet is for <strong>manual review and entry only</strong>. Never auto-apply to live APIs.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading rate cards...</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-300 rounded-xl overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Room Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Season</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Rate/Night</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Currency</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Min Nights</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Valid From</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Valid To</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rateCards.map((rate, index) => (
                    <tr key={rate.id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm text-gray-900">{rate.room_type || '[ROOM TYPE REQUIRED]'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{rate.season || 'standard'}</td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {rate.rate_per_night ? (
                          <span className="text-green-700">{rate.rate_per_night}</span>
                        ) : (
                          <span className="text-red-600 font-semibold">[RATE BLANK]</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{rate.currency || 'ZAR'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{rate.min_nights || 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{rate.valid_from || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{rate.valid_to || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{rate.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {hasBlankRates && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800">
                <strong>⚠️ Missing Rates Detected:</strong> One or more rows show <span className="font-semibold">[RATE BLANK]</span>.
                These indicate no rate card exists for that configuration. <strong>Never invent pricing.</strong> Contact property owner before manual entry.
              </p>
            </div>
          )}

          <div className="bg-white border border-gray-300 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Optional: Include Promotional Example</h3>
            <label className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                checked={includePromo}
                onChange={(e) => setIncludePromo(e.target.checked)}
                className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">
                Include promotional rate example (demo fixture only)
              </span>
            </label>
            
            {includePromo && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-900 mb-1"><strong>Promo Code:</strong> {promoExample.code}</p>
                <p className="text-sm text-green-900 mb-1"><strong>Description:</strong> {promoExample.description}</p>
                <p className="text-sm text-green-900 mb-1"><strong>Discount:</strong> {promoExample.discount}</p>
                <p className="text-sm text-green-900"><strong>Valid:</strong> {promoExample.validFrom} to {promoExample.validTo}</p>
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-300 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Download className="w-5 h-5" />
              Export Worksheet
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Download for manual OTA/Nightsbridge entry. All exports are local-only for leave-behind.
            </p>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                onClick={() => handleExport('markdown')}
                disabled={exporting}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Download .md
              </button>
              <button
                onClick={() => handleExport('csv')}
                disabled={exporting}
                className="px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Table className="w-4 h-4" />
                Download .csv
              </button>
              <button
                onClick={() => handleExport('html')}
                disabled={exporting}
                className="px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <FileDown className="w-4 h-4" />
                Download .html
              </button>
              <button
                onClick={handlePrintHTML}
                disabled={exporting}
                className="px-4 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <FileDown className="w-4 h-4" />
                Print to PDF
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Manual Entry Instructions</h3>
            <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
              <li>Review all rates above for accuracy</li>
              <li>Verify blank rates are intentional (never invent pricing)</li>
              <li>Obtain Grant/tenant approval before proceeding</li>
              <li>Manually enter approved rates into OTA/Nightsbridge dashboards</li>
              <li>Do NOT use automated API uploads without explicit approval</li>
            </ol>
          </div>
        </>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/demo/rate-card-upload"
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
        >
          ← Manage Rate Cards
        </Link>
        <Link
          href="/demo"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm"
        >
          Back to Demo Hub
        </Link>
      </div>
    </div>
  )
}

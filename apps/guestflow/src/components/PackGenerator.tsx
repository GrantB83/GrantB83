'use client'

import { useState } from 'react'
import { Package, Download, Copy, CheckCircle, AlertCircle } from 'lucide-react'
import { downloadPackAsBundle, copyCliCommand, type PackResponse } from '@/lib/packDownload'

interface PackGeneratorProps {
  packType: 'inquiry-intake' | 'inquiry-quote-pipeline' | 'welcome-late' | 'ct-pack-pipeline'
  packLabel: string
  packDescription: string
  onGenerate: () => Promise<PackResponse>
  disabled?: boolean
}

export function PackGenerator({
  packType,
  packLabel,
  packDescription,
  onGenerate,
  disabled = false
}: PackGeneratorProps) {
  const [loading, setLoading] = useState(false)
  const [pack, setPack] = useState<PackResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setPack(null)
    
    try {
      const result = await onGenerate()
      setPack(result)
    } catch (err) {
      console.error('Pack generation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate pack')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!pack) return
    downloadPackAsBundle(pack)
  }

  const handleCopy = async () => {
    if (!pack) return
    const success = await copyCliCommand(pack.cliCommand)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <Package className="w-8 h-8 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-2">{packLabel}</h3>
          <p className="text-sm text-gray-600 mb-4">{packDescription}</p>
          
          {!pack && !error && (
            <button
              onClick={handleGenerate}
              disabled={disabled || loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating Pack...
                </>
              ) : (
                <>
                  <Package className="w-5 h-5" />
                  Generate Pack
                </>
              )}
            </button>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900">Generation Failed</p>
                  <p className="text-xs text-red-700 mt-1">{error}</p>
                </div>
              </div>
              <button
                onClick={handleGenerate}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
              >
                Try Again
              </button>
            </div>
          )}
          
          {pack && (
            <div className="space-y-4">
              <div className="bg-white border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Pack Generated</p>
                    <p className="text-xs text-green-700 mt-1">{pack.packName}</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-3">
                  <p className="text-xs font-medium text-gray-700 mb-1">CLI Command (SA Ops):</p>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all font-mono">
                    {pack.cliCommand}
                  </pre>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleDownload}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Pack
                  </button>
                  <button
                    onClick={handleCopy}
                    className="flex-1 px-4 py-2 bg-white border-2 border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition flex items-center justify-center gap-2"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy CLI
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800">
                  <strong>📦 Pack Contents:</strong> {Object.keys(pack.files).length} files downloaded.
                  Files are prefixed with <code className="bg-amber-100 px-1 rounded text-xs">{pack.packName}__</code> for easy folder organization.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-blue-200">
        <p className="text-xs text-gray-600">
          <strong>✅ DRAFT-ONLY:</strong> All packs are for manual review. Never auto-sends.
          <strong className="ml-2">✅ CLI-Ready:</strong> SA Ops can run exact command in terminal.
        </p>
      </div>
    </div>
  )
}

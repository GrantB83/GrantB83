'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  CheckCircle, 
  Circle, 
  Download,
  Database,
  MessageSquare,
  FileText,
  Upload,
  Calendar,
  Mail,
  Clock,
  Package,
  RefreshCw,
  BarChart3,
  AlertTriangle
} from 'lucide-react'

interface WalkthroughStep {
  id: string
  number: number
  title: string
  route: string
  pitch: string
  icon: React.ReactNode
}

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: 'seed',
    number: 1,
    title: 'Seed Demo Tenant & Fixtures',
    route: '/demo/seed',
    pitch: 'One-click setup: tenant, properties, rate cards, sample leads, and bookings—ready in seconds.',
    icon: <Database className="w-5 h-5" />
  },
  {
    id: 'tenant',
    number: 2,
    title: 'Switch Active Demo Tenant',
    route: '/demo',
    pitch: 'Multi-tenant architecture: each operator gets isolated data with their properties and guests.',
    icon: <BarChart3 className="w-5 h-5" />
  },
  {
    id: 'inquiry',
    number: 3,
    title: 'Inquiry Intake (Heuristic Extraction)',
    route: '/demo/inquiry-intake',
    pitch: 'Paste email/WhatsApp inquiry → structured booking fields. Never invents rates or contact info.',
    icon: <MessageSquare className="w-5 h-5" />
  },
  {
    id: 'quote',
    number: 4,
    title: 'Quote Draft from Inquiry JSON',
    route: '/demo/quote-draft',
    pitch: 'Generate professional quotes with embedded amounts or rate card lookup—[RATE CARD REQUIRED] when missing.',
    icon: <FileText className="w-5 h-5" />
  },
  {
    id: 'nightsbridge',
    number: 5,
    title: 'NightsBridge CSV Import & Bookings Board',
    route: '/demo/nightsbridge-import',
    pitch: 'Import OTA bookings CSV → parse, detect gaps, identify late arrivals. View on bookings board.',
    icon: <Upload className="w-5 h-5" />
  },
  {
    id: 'bookings-board',
    number: 6,
    title: 'Bookings Board & Daily Ops Brief',
    route: '/demo/bookings-board',
    pitch: 'Visual bookings timeline → generate dynamic daily ops brief with RED/AMBER/GREEN priorities.',
    icon: <Calendar className="w-5 h-5" />
  },
  {
    id: 'welcome',
    number: 7,
    title: 'Welcome Message Drafts',
    route: '/demo/welcome-drafts',
    pitch: 'Same-day/upcoming welcome stubs with warm tone—never invents guest phone or Wi-Fi codes.',
    icon: <Mail className="w-5 h-5" />
  },
  {
    id: 'late-checkin',
    number: 8,
    title: 'Late / After-Hours Check-In Queue',
    route: '/demo/late-checkin-queue',
    pitch: 'Surface late arrivals and unknown ETAs—never invents arrival times or guest phone numbers.',
    icon: <Clock className="w-5 h-5" />
  },
  {
    id: 'ct-pack',
    number: 9,
    title: 'CT-Pack Assembly (Ops Brief + Welcome + Late)',
    route: '/demo/ct-pack',
    pitch: 'Bundle daily brief, welcome stubs, and late check-in queue into one dated leave-behind pack.',
    icon: <Package className="w-5 h-5" />
  },
  {
    id: 'booking-change',
    number: 10,
    title: 'Booking Change Check (Last-Minute Verification)',
    route: '/demo/booking-change-check',
    pitch: 'Diff before/after snapshots to catch suite changes, cancellations, or new bookings before sending.',
    icon: <RefreshCw className="w-5 h-5" />
  },
  {
    id: 'ota-worksheet',
    number: 11,
    title: 'OTA Rate Worksheet (Export Placeholder)',
    route: '/demo/rate-card-upload',
    pitch: 'View/export rate cards for OTA channel uploads—DEMO placeholders only, never live publishing.',
    icon: <BarChart3 className="w-5 h-5" />
  }
]

const STORAGE_KEY = 'guestflow-sales-walkthrough-progress'

export default function SalesWalkthroughPage() {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)

  // Load progress from localStorage on mount
  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setCompletedSteps(new Set(JSON.parse(stored)))
      }
    } catch (err) {
      console.error('Failed to load walkthrough progress:', err)
    }
  }, [])

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(completedSteps)))
      } catch (err) {
        console.error('Failed to save walkthrough progress:', err)
      }
    }
  }, [completedSteps, mounted])

  const toggleStep = (stepId: string) => {
    setCompletedSteps(prev => {
      const next = new Set(prev)
      if (next.has(stepId)) {
        next.delete(stepId)
      } else {
        next.add(stepId)
      }
      return next
    })
  }

  const resetProgress = () => {
    if (confirm('Reset all walkthrough progress? This cannot be undone.')) {
      setCompletedSteps(new Set())
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch (err) {
        console.error('Failed to clear progress:', err)
      }
    }
  }

  const exportMarkdown = () => {
    const completedCount = completedSteps.size
    const totalCount = WALKTHROUGH_STEPS.length
    const progressPercent = Math.round((completedCount / totalCount) * 100)

    let md = `# GuestFlow Sales Demo Walkthrough\n\n`
    md += `**Progress:** ${completedCount}/${totalCount} steps completed (${progressPercent}%)\n\n`
    md += `**Generated:** ${new Date().toLocaleString()}\n\n`
    md += `---\n\n`
    md += `## Guided Sales Flow (Inquiry → Quote → CRM/Bookings → Ops → OTA)\n\n`

    WALKTHROUGH_STEPS.forEach(step => {
      const completed = completedSteps.has(step.id)
      md += `### ${step.number}. ${step.title}\n\n`
      md += `- **Status:** ${completed ? '✅ Completed' : '⬜ Pending'}\n`
      md += `- **Route:** \`${step.route}\`\n`
      md += `- **Pitch:** ${step.pitch}\n\n`
    })

    md += `---\n\n`
    md += `## Hard Gates (DEMO PLACEHOLDER reminder)\n\n`
    md += `- ❌ NO live payments (no Stripe, no card charges)\n`
    md += `- ❌ NO paid ads (no Google Ads pixels, no Meta tracking)\n`
    md += `- ❌ NO public signup (waitlist only, demo auth is NOT production)\n`
    md += `- ❌ NO WhatsApp/email auto-send (draft-only with approval gates)\n`
    md += `- ❌ NO live NightsBridge API (CSV import only in demo)\n`
    md += `- ❌ NO live OTA publishing (rate cards are DEMO placeholders only)\n`
    md += `- ✅ All data persists to local SQLite only\n`
    md += `- ✅ Never invents rates, contact info, guest phone, ETAs, or Wi-Fi codes\n\n`

    md += `---\n\n`
    md += `**Note:** This walkthrough demonstrates GuestFlow's fixture-based demo capabilities.\n`
    md += `All rates are DEMO PLACEHOLDERS. All communications are DRAFT-ONLY.\n`

    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `guestflow-sales-walkthrough-${new Date().toISOString().split('T')[0]}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const completedCount = completedSteps.size
  const totalCount = WALKTHROUGH_STEPS.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium mb-4">
          🎯 PHASE 25 · Guided Sales Demo Walkthrough
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Guided Sales Demo Walkthrough
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
          Complete ordered path through GuestFlow's demo capabilities: inquiry intake → quote draft → CRM/bookings → daily ops → OTA worksheet.
          <br />
          <strong className="text-primary-600">Track your progress, check off completed steps, and export your walkthrough notes.</strong>
        </p>
        
        {/* Progress Bar */}
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-2 text-sm text-gray-600">
            <span>Progress</span>
            <span className="font-semibold">{completedCount}/{totalCount} steps ({progressPercent}%)</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-primary-600 to-primary-700 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Hard Gates Callout */}
      <div className="mb-8 bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-amber-900 mb-2">⚠️ Hard Gates: DEMO/Fixtures Only</h3>
            <ul className="space-y-1 text-sm text-amber-800">
              <li>❌ <strong>NO live payments</strong> (no Stripe, no public paid signup)</li>
              <li>❌ <strong>NO paid ads</strong> (no tracking pixels)</li>
              <li>❌ <strong>NO WhatsApp/email auto-send</strong> (draft-only with approval banners)</li>
              <li>❌ <strong>NO live NightsBridge API</strong> (CSV import demo only)</li>
              <li>❌ <strong>NO live OTA publishing</strong> (rate cards are DEMO placeholders)</li>
              <li>✅ <strong>Never invents</strong> rates, contact info, guest phone, ETAs, or Wi-Fi codes</li>
              <li>✅ <strong>Local SQLite only</strong> (all data persists locally for demo purposes)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Walkthrough Steps */}
      <div className="space-y-4 mb-8">
        {WALKTHROUGH_STEPS.map(step => {
          const isCompleted = completedSteps.has(step.id)
          return (
            <div
              key={step.id}
              className={`bg-white border-2 rounded-xl p-6 transition hover:shadow-lg ${
                isCompleted ? 'border-green-300 bg-green-50/30' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <button
                  onClick={() => toggleStep(step.id)}
                  className="flex-shrink-0 mt-1 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                  aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-400 hover:text-gray-600 transition" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {step.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{step.title}</h3>
                      <p className="text-gray-700 text-sm mb-3">{step.pitch}</p>
                      <Link
                        href={step.route}
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
                      >
                        {step.icon}
                        <span>Open: {step.route}</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-4 justify-center">
        <button
          onClick={exportMarkdown}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
        >
          <Download className="w-5 h-5" />
          Export Walkthrough (Markdown)
        </button>
        <button
          onClick={resetProgress}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
        >
          <RefreshCw className="w-5 h-5" />
          Reset Progress
        </button>
        <Link
          href="/demo"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
        >
          ← Back to Demo Hub
        </Link>
      </div>

      {/* Footer Note */}
      <div className="mt-12 text-center text-sm text-gray-600">
        <p>
          <strong>Note:</strong> Salesperson progress (checklist state) stored in browser localStorage only.
          <br />
          No server auth or sync—purely client-side tracking for demo walkthrough convenience.
        </p>
      </div>
    </div>
  )
}

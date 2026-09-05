'use client'

import Link from 'next/link'
import { 
  MessageSquare, 
  FileText, 
  Calendar, 
  Clock,
  CheckCircle2,
  Upload,
  FileCheck,
  Package,
  AlertTriangle,
  Sparkles
} from 'lucide-react'

export default function OpsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-full text-sm font-medium mb-4">
          🏠 Browns Dullstroom Operations
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Internal Ops Tools
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Prepare drafts, export packs, and drive CLI tools for Browns guest operations
        </p>
      </div>

      {/* Hard Gates Warning */}
      <div className="mb-8 max-w-5xl mx-auto">
        <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-gray-900 mb-2">All Tools Are DRAFT-ONLY</h3>
              <p className="text-sm text-gray-700 mb-2">
                Every page exports draft packs for manual review. <strong>NO auto-send</strong> to guests via email or WhatsApp.
              </p>
              <p className="text-sm text-gray-700">
                <strong>Never invents:</strong> rates, phone numbers, ETAs, Wi-Fi codes, or contact details. Missing data is flagged clearly.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Core Workflow Tools */}
      <div className="mb-12 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
          Core Guest Workflow
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <OpsToolCard
            href="/ops/inquiry-intake"
            icon={<MessageSquare className="w-8 h-8 text-blue-600" />}
            title="Inquiry Intake"
            description="Extract structured data from email/WhatsApp inquiries"
            cliTool="browns-inquiry-intake"
            color="blue"
          />
          <OpsToolCard
            href="/ops/quote-draft"
            icon={<FileText className="w-8 h-8 text-green-600" />}
            title="Quote Draft"
            description="Generate quotes from bookings and rate cards (requires rate card upload)"
            cliTool="browns-quote-invoice-draft"
            color="green"
          />
          <OpsToolCard
            href="/ops/welcome-drafts"
            icon={<CheckCircle2 className="w-8 h-8 text-purple-600" />}
            title="Welcome Drafts"
            description="Draft welcome messages for upcoming arrivals (same-day/next-day)"
            cliTool="browns-welcome-draft-pack"
            color="purple"
          />
          <OpsToolCard
            href="/ops/daily-brief"
            icon={<Calendar className="w-8 h-8 text-teal-600" />}
            title="Daily Ops Brief"
            description="Morning brief with RED/AMBER/GREEN priorities, arrivals, departures, housekeeping"
            cliTool="browns-daily-ops-brief"
            color="teal"
          />
        </div>
      </div>

      {/* Operations Support Tools */}
      <div className="mb-12 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Package className="w-6 h-6 text-amber-600" />
          Operations Support
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <OpsToolCard
            href="/ops/late-checkin-queue"
            icon={<Clock className="w-8 h-8 text-orange-600" />}
            title="Late Check-In Queue"
            description="Track after-hours arrivals and unknown ETAs"
            cliTool="browns-late-checkin-queue"
            color="orange"
          />
          <OpsToolCard
            href="/ops/nightsbridge-import"
            icon={<Upload className="w-8 h-8 text-indigo-600" />}
            title="NightsBridge Import"
            description="Parse NightsBridge CSV bookings and detect gaps"
            cliTool="browns-nightsbridge-bookings-adapter"
            color="indigo"
          />
          <OpsToolCard
            href="/ops/booking-change-check"
            icon={<FileCheck className="w-8 h-8 text-amber-600" />}
            title="Booking Change Check"
            description="Compare snapshots to detect last-minute changes before CT pack"
            cliTool="browns-booking-change-check"
            color="amber"
          />
          <OpsToolCard
            href="/ops/ct-pack"
            icon={<Package className="w-8 h-8 text-rose-600" />}
            title="CT Pack"
            description="Communication pack for upcoming stays"
            cliTool="browns-ct-pack"
            color="rose"
          />
        </div>
      </div>

      {/* Configuration */}
      <div className="mb-12 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <FileText className="w-6 h-6 text-cyan-600" />
          Configuration
        </h2>
        <div className="grid md:grid-cols-1 gap-6">
          <OpsToolCard
            href="/ops/rate-cards"
            icon={<FileText className="w-8 h-8 text-cyan-600" />}
            title="Rate Card Upload"
            description="Upload and manage Browns property rate cards (CSV/JSON)"
            cliTool="(internal only)"
            color="cyan"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-12 max-w-5xl mx-auto">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Sparkles className="w-6 h-6" />
            Daily Quick Actions
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link
              href="/ops/daily-brief"
              className="bg-white/10 hover:bg-white/20 backdrop-blur rounded-lg p-4 transition group"
            >
              <Calendar className="w-6 h-6 mb-2" />
              <div className="font-semibold mb-1">Morning Brief</div>
              <div className="text-sm text-blue-100">Start your day with RED/AMBER/GREEN priorities</div>
            </Link>
            <Link
              href="/ops/inquiry-intake"
              className="bg-white/10 hover:bg-white/20 backdrop-blur rounded-lg p-4 transition group"
            >
              <MessageSquare className="w-6 h-6 mb-2" />
              <div className="font-semibold mb-1">Process Inquiries</div>
              <div className="text-sm text-blue-100">Extract & save new guest inquiries</div>
            </Link>
            <Link
              href="/ops/welcome-drafts"
              className="bg-white/10 hover:bg-white/20 backdrop-blur rounded-lg p-4 transition group"
            >
              <CheckCircle2 className="w-6 h-6 mb-2" />
              <div className="font-semibold mb-1">Welcome Messages</div>
              <div className="text-sm text-blue-100">One-click for today's arrivals</div>
            </Link>
          </div>
          <div className="mt-4 p-4 bg-white/10 backdrop-blur rounded-lg">
            <p className="text-sm">
              <strong>Autonomous Mode:</strong> Pages auto-assemble packs from inputs. Export ready-to-post drafts for WhatsApp/email. 
              All output is <strong>DRAFT-ONLY</strong> — requires CoS/Grant approval before sending.
            </p>
          </div>
        </div>
      </div>

      {/* CLI Integration Instructions */}
      <div className="max-w-5xl mx-auto">
        <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-slate-600">💻</span>
            CLI Tool Integration
          </h3>
          <p className="text-sm text-gray-700 mb-4">
            Each page exports packs matching CLI tool inputs/outputs. If CLI tools exist under <code className="bg-slate-200 px-2 py-1 rounded text-xs">tools/browns-*</code>, run them manually:
          </p>
          <pre className="bg-slate-900 text-slate-100 p-4 rounded text-xs overflow-x-auto mb-4">
{`# Example: Inquiry Intake
node tools/browns-inquiry-intake/dist/index.js --input inquiry.json

# Example: Quote Draft  
node tools/browns-quote-invoice-draft/dist/index.js --booking booking.json --rates rates.csv

# Example: Daily Brief
node tools/browns-daily-ops-brief/dist/index.js --date 2026-12-15

# Example: Welcome Drafts
node tools/browns-welcome-draft-pack/dist/index.js --date 2026-12-15 --window 1`}
          </pre>
          <p className="text-xs text-gray-600">
            If CLI tools don't exist yet, pages export the pack format for future integration. All output is DRAFT-ONLY.
          </p>
        </div>
      </div>
    </div>
  )
}

function OpsToolCard({ 
  href, 
  icon, 
  title, 
  description,
  cliTool,
  color
}: { 
  href: string
  icon: React.ReactNode
  title: string
  description: string
  cliTool: string
  color: string
}) {
  return (
    <Link 
      href={href}
      className={`block bg-white p-6 rounded-xl border-2 border-${color}-200 hover:border-${color}-400 hover:shadow-lg transition group`}
    >
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-${color}-600 transition">
        {title}
      </h3>
      <p className="text-sm text-gray-600 mb-3">{description}</p>
      <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded block truncate">
        {cliTool}
      </code>
    </Link>
  )
}

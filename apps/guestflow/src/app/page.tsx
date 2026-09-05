import Link from 'next/link'
import { 
  MessageSquare, 
  FileText, 
  Calendar, 
  Clock,
  CheckCircle2,
  Upload,
  FileCheck,
  Package
} from 'lucide-react'

export default function OpsHubPage() {
  return (
    <div className="bg-gradient-to-b from-slate-50 to-white min-h-screen">
      {/* Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-full text-sm font-medium mb-4">
            🏠 INTERNAL BROWNS OPS — Not for Sale
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Browns Dullstroom Operations Console
          </h1>
          <p className="text-xl text-gray-600 mb-2 max-w-2xl mx-auto">
            Internal localhost ops automation for The Browns Luxury Guest Suites
          </p>
          <p className="text-base text-gray-500 max-w-2xl mx-auto">
            Drives and wraps CLI tools under <code className="bg-gray-100 px-2 py-1 rounded text-sm">tools/browns-*</code>
          </p>
        </div>
      </section>

      {/* Quick Access Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Operational Tools
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <OpsCard
            href="/ops/inquiry-intake"
            icon={<MessageSquare className="w-8 h-8 text-blue-600" />}
            title="Inquiry Intake"
            description="Extract structured data from email/WhatsApp inquiries"
            cliTool="browns-inquiry-intake"
          />
          <OpsCard
            href="/ops/quote-draft"
            icon={<FileText className="w-8 h-8 text-green-600" />}
            title="Quote Draft"
            description="Generate quotes from bookings and rate cards (DRAFT-ONLY)"
            cliTool="browns-quote-invoice-draft"
          />
          <OpsCard
            href="/ops/welcome-drafts"
            icon={<CheckCircle2 className="w-8 h-8 text-purple-600" />}
            title="Welcome Drafts"
            description="Draft welcome messages for upcoming arrivals"
            cliTool="browns-welcome-draft-pack"
          />
          <OpsCard
            href="/ops/late-checkin-queue"
            icon={<Clock className="w-8 h-8 text-orange-600" />}
            title="Late Check-In Queue"
            description="Track after-hours arrivals and unknown ETAs"
            cliTool="browns-late-checkin-queue"
          />
          <OpsCard
            href="/ops/daily-brief"
            icon={<Calendar className="w-8 h-8 text-teal-600" />}
            title="Daily Ops Brief"
            description="Morning brief with arrivals, departures, housekeeping"
            cliTool="browns-daily-ops-brief"
          />
          <OpsCard
            href="/ops/nightsbridge-import"
            icon={<Upload className="w-8 h-8 text-indigo-600" />}
            title="NightsBridge Import"
            description="Parse NightsBridge CSV bookings and detect gaps"
            cliTool="browns-nightsbridge-bookings-adapter"
          />
          <OpsCard
            href="/ops/booking-change-check"
            icon={<FileCheck className="w-8 h-8 text-amber-600" />}
            title="Booking Change Check"
            description="Compare snapshots to detect last-minute changes"
            cliTool="browns-booking-change-check"
          />
          <OpsCard
            href="/ops/ct-pack"
            icon={<Package className="w-8 h-8 text-rose-600" />}
            title="CT Pack"
            description="Communication pack for upcoming stays"
            cliTool="browns-ct-pack"
          />
          <OpsCard
            href="/ops/rate-cards"
            icon={<FileText className="w-8 h-8 text-cyan-600" />}
            title="Rate Card Upload"
            description="Upload and manage Browns property rate cards"
            cliTool="(internal only)"
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-slate-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            How Browns SA Ops Uses This
          </h2>

          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <StepCard
              number="1"
              title="Start Localhost"
              description="Run npm run dev on localhost:3100 in Dullstroom or remote"
            />
            <StepCard
              number="2"
              title="Use Ops Pages"
              description="Prepare drafts with inquiry intake, quotes, welcome messages"
            />
            <StepCard
              number="3"
              title="Export Packs"
              description="Download JSON/markdown packs with CLI commands shown"
            />
            <StepCard
              number="4"
              title="Review & Approve"
              description="All output is DRAFT-ONLY — manual approval before send"
            />
          </div>

          <div className="bg-white border-2 border-slate-200 rounded-xl p-6 max-w-3xl mx-auto">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-slate-600">💻</span>
              CLI Tool Integration
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              Each page exports packs matching CLI tool inputs/outputs. If CLI tools exist, run them manually:
            </p>
            <pre className="bg-slate-900 text-slate-100 p-3 rounded text-xs overflow-x-auto">
{`# Example: Inquiry Intake
node tools/browns-inquiry-intake/dist/index.js --input inquiry.json

# Example: Quote Draft  
node tools/browns-quote-invoice-draft/dist/index.js --booking booking.json

# Example: Daily Brief
node tools/browns-daily-ops-brief/dist/index.js --date 2026-12-15`}
            </pre>
          </div>
        </div>
      </section>

      {/* Hard Gates Reminder */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">
            ⚠️ Hard Gates (Always Respected)
          </h2>
          <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <GateItem text="NO auto-send (email/WhatsApp) — DRAFT-ONLY" />
            <GateItem text="NO invented rates/phones/ETAs — flagged clearly" />
            <GateItem text="NO live payments — No Stripe, no processing" />
            <GateItem text="NO public signup — Browns internal only" />
            <GateItem text="SQLite only — Local Browns draft history" />
            <GateItem text="Single tenant — Browns Dullstroom properties" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600">
          <p className="mb-2">
            <strong>INTERNAL OPERATIONS CONSOLE</strong> — The Browns Luxury Guest Suites, Dullstroom
          </p>
          <p className="text-sm">
            Not for sale · Not multi-tenant · Not a SaaS product
          </p>
        </div>
      </footer>
    </div>
  )
}

function OpsCard({ 
  href, 
  icon, 
  title, 
  description,
  cliTool
}: { 
  href: string
  icon: React.ReactNode
  title: string
  description: string
  cliTool: string
}) {
  return (
    <Link 
      href={href}
      className="block bg-white p-6 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition"
    >
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-3">{description}</p>
      <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded block truncate">
        {cliTool}
      </code>
    </Link>
  )
}

function StepCard({ number, title, description }: { number: string, title: string, description: string }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-10 h-10 bg-slate-800 text-white rounded-full text-lg font-bold mb-3">
        {number}
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  )
}

function GateItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <span className="text-sm text-gray-800">{text}</span>
    </div>
  )
}

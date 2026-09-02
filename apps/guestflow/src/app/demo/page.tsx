'use client'

import Link from 'next/link'
import { MessageSquare, FileText, Calendar, Mail, Building2, Upload, CheckCircle, CreditCard, Presentation, FileDown, Database, StickyNote } from 'lucide-react'
import TenantSwitcher from '@/components/TenantSwitcher'

export default function DemoPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-full text-sm font-medium mb-4">
          🎭 SANDBOX DEMO
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Interactive Demo Walkthrough
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Explore GuestFlow with sample properties and mock bookings. 
          No real data, no live sends—just see how it works.
        </p>
      </div>

      {/* Phase 10: Tenant Switcher */}
      <div className="mb-8 max-w-5xl mx-auto">
        <TenantSwitcher />
      </div>

      {/* Phase 20: Demo CT-Pack Assembly */}
      <div className="mb-8 max-w-5xl mx-auto">
        <Link 
          href="/demo/ct-pack"
          className="block bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6 rounded-xl hover:shadow-xl transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <StickyNote className="w-8 h-8" />
              <h3 className="text-2xl font-bold">Demo CT-Pack Assembly</h3>
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-white/20 rounded-full">Phase 20</span>
          </div>
          <p className="text-indigo-100">
            Assemble dated pack for active demo tenant: daily-ops brief + welcome stubs + late-checkin queue into one leave-behind pack (mirrors tools/browns-ct-pack-assemble, DRAFT/fixtures only)
          </p>
        </Link>
      </div>

      {/* Phase 19: Late Check-In Queue */}
      <div className="mb-8 max-w-5xl mx-auto">
        <Link 
          href="/demo/late-checkin-queue"
          className="block bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6 rounded-xl hover:shadow-xl transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-8 h-8" />
              <h3 className="text-2xl font-bold">Late / After-Hours Check-In Queue</h3>
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-white/20 rounded-full">Phase 19</span>
          </div>
          <p className="text-orange-100">
            Track arriving guests with late check-ins, after-hours arrivals, or unknown ETAs—mirrors tools/browns-late-checkin-queue (DRAFT/fixtures only)
          </p>
        </Link>
      </div>

      {/* Phase 18: Welcome Message Drafts */}
      <div className="mb-8 max-w-5xl mx-auto">
        <Link 
          href="/demo/welcome-drafts"
          className="block bg-gradient-to-r from-rose-600 to-rose-700 text-white p-6 rounded-xl hover:shadow-xl transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Mail className="w-8 h-8" />
              <h3 className="text-2xl font-bold">Welcome Message Drafts</h3>
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-white/20 rounded-full">Phase 18</span>
          </div>
          <p className="text-rose-100">
            Generate same-day/upcoming welcome stubs from tenant bookings—mirrors tools/browns-welcome-draft-pack semantics (DRAFT/fixtures only)
          </p>
        </Link>
      </div>

      {/* Phase 17: Bookings Board & Daily Ops Brief */}
      <div className="mb-8 max-w-5xl mx-auto">
        <Link 
          href="/demo/bookings-board"
          className="block bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-xl hover:shadow-xl transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8" />
              <h3 className="text-2xl font-bold">Bookings Board & Daily Ops Brief</h3>
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-white/20 rounded-full">Phase 17 🎉</span>
          </div>
          <p className="text-green-100">
            View tenant bookings board → Generate dynamic daily ops brief from fixtures (arrivals/in-house/departing with late badges & missing-field warnings)
          </p>
        </Link>
      </div>

      {/* Phase 13: Printable Leave-Behind Export */}
      <div className="mb-8 max-w-5xl mx-auto">
        <Link 
          href="/demo/leavebehind"
          className="block bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6 rounded-xl hover:shadow-xl transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <FileDown className="w-8 h-8" />
              <h3 className="text-2xl font-bold">Printable Leave-Behind Export</h3>
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-white/20 rounded-full">Phase 13</span>
          </div>
          <p className="text-orange-100">
            Download/print sales leave-behind in markdown or HTML format—mirror Phase 8 quote export UX (local demo only)
          </p>
        </Link>
      </div>

      {/* Phase 11: Waitlist to CRM Convert */}
      <div className="mb-8 max-w-5xl mx-auto">
        <Link 
          href="/demo/waitlist-manage"
          className="block bg-gradient-to-r from-cyan-600 to-cyan-700 text-white p-6 rounded-xl hover:shadow-xl transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8" />
              <h3 className="text-2xl font-bold">Waitlist to CRM Conversion</h3>
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-white/20 rounded-full">Phase 11</span>
          </div>
          <p className="text-cyan-100">
            One-click convert waitlist entries to CRM leads—tenant-scoped, copies contact/property/notes, marks status converted (demo only)
          </p>
        </Link>
      </div>

      {/* Phase 12: CRM Lead Notes */}
      <div className="mb-8 max-w-5xl mx-auto">
        <Link 
          href="/crm"
          className="block bg-gradient-to-r from-pink-600 to-pink-700 text-white p-6 rounded-xl hover:shadow-xl transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <StickyNote className="w-8 h-8" />
              <h3 className="text-2xl font-bold">CRM Lead Notes</h3>
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-white/20 rounded-full">Phase 12</span>
          </div>
          <p className="text-pink-100">
            Add timestamped notes to CRM leads—expand rows to see note history, add new notes inline, tenant-scoped SQLite storage (demo only)
          </p>
        </Link>
      </div>

      {/* Phase 9: One-Click Demo Seed */}
      <div className="mb-8 max-w-5xl mx-auto">
        <Link 
          href="/demo/seed"
          className="block bg-gradient-to-r from-violet-600 to-violet-700 text-white p-6 rounded-xl hover:shadow-xl transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8" />
              <h3 className="text-2xl font-bold">One-Click Demo Seed</h3>
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-white/20 rounded-full">Phase 9</span>
          </div>
          <p className="text-violet-100">
            Reset demo SQLite to known-good sales walkthrough state—1 tenant, 2 properties, sample rates/leads/bookings (idempotent, DEMO only)
          </p>
        </Link>
      </div>

      {/* Phase 8: Printable Quote Export */}
      <div className="mb-8 max-w-5xl mx-auto">
        <Link 
          href="/demo/quote-draft"
          className="block bg-gradient-to-r from-teal-600 to-teal-700 text-white p-6 rounded-xl hover:shadow-xl transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8" />
              <h3 className="text-2xl font-bold">Printable Quote Export</h3>
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-white/20 rounded-full">Phase 8</span>
          </div>
          <p className="text-teal-100">
            Download/print quotes in markdown or HTML format—preserves [RATE CARD REQUIRED] when rates missing (never invents)
          </p>
        </Link>
      </div>

      {/* Phase 7: Tenant Onboarding Wizard */}
      <div className="mb-8 max-w-5xl mx-auto">
        <Link 
          href="/demo/onboard"
          className="block bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-6 rounded-xl hover:shadow-xl transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8" />
              <h3 className="text-2xl font-bold">Tenant Onboarding Wizard</h3>
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-white/20 rounded-full">Phase 7</span>
          </div>
          <p className="text-emerald-100">
            Multi-step DEMO flow: create tenant → add property → optional rate card upload → complete with links to CRM/demo hub
          </p>
        </Link>
      </div>

      {/* Phase 6: Hosting Readiness */}
      <div className="mb-8 max-w-5xl mx-auto">
        <Link 
          href="/demo/hosting-readiness"
          className="block bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6 rounded-xl hover:shadow-xl transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-8 h-8" />
              <h3 className="text-2xl font-bold">Hosting & Deployment Readiness</h3>
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-white/20 rounded-full">Phase 6</span>
          </div>
          <p className="text-indigo-100">
            Origin namespace checklist, Vercel↔Origin notes, and hard gates reminder before production deploy
          </p>
        </Link>
      </div>

      {/* Phase 5: Sales Demo Tools */}
      <div className="grid md:grid-cols-2 gap-6 mb-8 max-w-5xl mx-auto">
        <Link 
          href="/demo/walkthrough"
          className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-xl hover:shadow-xl transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <Presentation className="w-8 h-8" />
            <span className="text-xs font-medium px-2 py-1 bg-white/20 rounded-full">Phase 5</span>
          </div>
          <h3 className="text-xl font-bold mb-2">Demo Walkthrough Script</h3>
          <p className="text-purple-100 text-sm">
            Step-by-step sales demo guide for Grant/CoS presentations (landing → CRM → ops)
          </p>
        </Link>

        <Link 
          href="/demo/leavebehind"
          className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-xl hover:shadow-xl transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <FileDown className="w-8 h-8" />
            <span className="text-xs font-medium px-2 py-1 bg-white/20 rounded-full">Phase 5 → 13</span>
          </div>
          <h3 className="text-xl font-bold mb-2">Sales Leave-Behind Export</h3>
          <p className="text-purple-100 text-sm">
            Printable one-pager + markdown/HTML export for post-demo follow-up
          </p>
        </Link>
      </div>

      {/* Phase 3: Quick Nav to Key Features */}
      <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-6xl mx-auto">
        <Link 
          href="/demo/rate-card-upload"
          className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-xl hover:shadow-xl transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <CreditCard className="w-8 h-8" />
            <span className="text-xs font-medium px-2 py-1 bg-white/20 rounded-full">Phase 4</span>
          </div>
          <h3 className="text-xl font-bold mb-2">Rate Card Upload</h3>
          <p className="text-green-100 text-sm">
            Upload CSV/JSON rates into tenant-scoped SQLite—never invent pricing
          </p>
        </Link>

        <Link 
          href="/demo/nightsbridge-import"
          className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-6 rounded-xl hover:shadow-xl transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <Upload className="w-8 h-8" />
            <span className="text-xs font-medium px-2 py-1 bg-white/20 rounded-full">Phase 2</span>
          </div>
          <h3 className="text-xl font-bold mb-2">NightsBridge CSV Import</h3>
          <p className="text-primary-100 text-sm">
            Parse bookings, detect gaps, and identify late check-ins from your OTA exports
          </p>
        </Link>

        <Link 
          href="/demo/tenant"
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-xl hover:shadow-xl transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <Building2 className="w-8 h-8" />
            <span className="text-xs font-medium px-2 py-1 bg-white/20 rounded-full">Phase 2</span>
          </div>
          <h3 className="text-xl font-bold mb-2">Tenant Switcher</h3>
          <p className="text-blue-100 text-sm">
            Switch between demo tenants to see multi-property data isolation
          </p>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <DemoCard
          href="/demo/rate-card-upload"
          icon={<CreditCard className="w-8 h-8 text-green-600" />}
          title="Rate Card Upload"
          description="Upload CSV/JSON rate cards into tenant-scoped SQLite storage"
          status="Phase 4"
        />
        <DemoCard
          href="/demo/inquiry-intake"
          icon={<MessageSquare className="w-8 h-8 text-primary-600" />}
          title="Inquiry Intake"
          description="Paste a sample inquiry email and watch it transform into structured JSON"
          status="Interactive"
        />
        <DemoCard
          href="/demo/quote-draft"
          icon={<FileText className="w-8 h-8 text-primary-600" />}
          title="Quote & Invoice Packager"
          description="Generate professional quote drafts from booking data"
          status="Interactive"
        />
        <DemoCard
          href="/demo/welcome-pack"
          icon={<Mail className="w-8 h-8 text-primary-600" />}
          title="Guest Welcome Pack"
          description="Create personalized welcome messages with property details"
          status="Interactive"
        />
        <DemoCard
          href="/demo/bookings-board"
          icon={<Calendar className="w-8 h-8 text-primary-600" />}
          title="Bookings Board & Daily Brief"
          description="Tenant bookings board with dynamic daily ops brief generation"
          status="Phase 17"
        />
        <DemoCard
          href="/demo/nightsbridge-import"
          icon={<Upload className="w-8 h-8 text-primary-600" />}
          title="NightsBridge CSV Import"
          description="Upload CSV to parse bookings and detect availability gaps"
          status="Phase 2"
        />
        <DemoCard
          href="/demo/tenant"
          icon={<Building2 className="w-8 h-8 text-primary-600" />}
          title="Tenant Switcher"
          description="Switch between demo tenants (local development only)"
          status="Phase 2"
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Sample Properties</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <PropertyCard
            name="Riverside Lodge"
            rooms={5}
            location="Dullstroom, SA"
          />
          <PropertyCard
            name="Mountain View Suites"
            rooms={3}
            location="Clarens, SA"
          />
          <PropertyCard
            name="Coastal Retreat"
            rooms={4}
            location="Hermanus, SA"
          />
        </div>
      </div>

      {/* Phase 3: Funnel Walk Checklist */}
      <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-8 mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Sales & Ops Funnel Checklist</h2>
        <p className="text-gray-600 mb-6">
          Walk through the complete operator journey from discovery to daily operations
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <FunnelItem 
            title="Discovery" 
            items={['Landing page → value prop', 'Pricing page → COMING SOON', 'Join waitlist form']} 
          />
          <FunnelItem 
            title="Sales CRM" 
            items={['View leads in /crm', 'Update status (New → Contacted → Qualified)', 'Export CSV for follow-up']} 
          />
          <FunnelItem 
            title="Product Demo" 
            items={['Inquiry intake → structured JSON', 'Quote draft (rate card stub)', 'Welcome pack generation']} 
          />
          <FunnelItem 
            title="Operations Setup" 
            items={['NightsBridge CSV import', 'Multi-tenant switcher', 'Daily brief walkthrough']} 
          />
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">5-Step Demo Walk</h2>
        <ol className="space-y-4">
          <li className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Inquiry Intake</h3>
              <p className="text-gray-600">Paste a sample inquiry to see structured data extraction</p>
            </div>
          </li>
          <li className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Generate Quote</h3>
              <p className="text-gray-600">Create a draft quote with your rate card (or stub COMING SOON)</p>
            </div>
          </li>
          <li className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Welcome Pack</h3>
              <p className="text-gray-600">Preview a personalized guest welcome message</p>
            </div>
          </li>
          <li className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
              4
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Daily Brief</h3>
              <p className="text-gray-600">See a morning operations brief for your team</p>
            </div>
          </li>
          <li className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
              5
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Review & Export</h3>
              <p className="text-gray-600">Download sample CSV for OTA rate uploads (demo data)</p>
            </div>
          </li>
        </ol>
      </div>

      <div className="mt-12 text-center">
        <Link
          href="/demo/inquiry-intake"
          className="inline-block px-8 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
        >
          Start Demo →
        </Link>
      </div>
    </div>
  )
}

function DemoCard({ 
  href, 
  icon, 
  title, 
  description, 
  status 
}: { 
  href: string
  icon: React.ReactNode
  title: string
  description: string
  status: string
}) {
  return (
    <Link href={href} className="block">
      <div className="bg-white p-6 rounded-xl border-2 border-gray-200 hover:border-primary-600 hover:shadow-lg transition h-full">
        <div className="flex items-start justify-between mb-4">
          <div>{icon}</div>
          <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-full">
            {status}
          </span>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </Link>
  )
}

function PropertyCard({ name, rooms, location }: { name: string, rooms: number, location: string }) {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="font-semibold text-gray-900">{name}</h3>
      <p className="text-sm text-gray-600">{rooms} rooms · {location}</p>
    </div>
  )
}

function FunnelItem({ title, items }: { title: string, items: string[] }) {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <CheckCircle className="w-5 h-5 text-primary-600" />
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-gray-700 pl-7">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

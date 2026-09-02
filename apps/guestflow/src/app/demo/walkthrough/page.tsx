import Link from 'next/link'
import { ArrowRight, CheckCircle, ExternalLink, Home, DollarSign, Users, FileText, CreditCard, Upload, Building2, Briefcase } from 'lucide-react'

export default function WalkthroughPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium mb-4">
          🎯 PHASE 14 · Sales Funnel Demo Script
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          GuestFlow Sales Demo Walkthrough
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-4">
          Complete sales presentation script for Grant/CoS demos. 
          Follow this sequence to showcase the full platform value and sales funnel.
        </p>
        <p className="text-base text-primary-600 font-semibold">
          Inquiry → Quote → Welcome → Operations (Complete Guest Journey)
        </p>
      </div>

      {/* Demo Script Steps */}
      <div className="space-y-8">
        
        {/* Step 1: Landing Page */}
        <ScriptStep
          number={1}
          icon={<Home className="w-6 h-6" />}
          title="Landing Page → Value Prop"
          duration="2-3 min"
          route="/"
          talking_points={[
            "Multi-property guesthouse operations platform",
            "Built by actual guesthouse owners (The Browns portfolio)",
            "Demo/Waitlist stage — no live payments or auto-send",
            "Complete guest journey: Inquiry → Quote → Welcome → Operations",
            "Proven workflows from real Dullstroom & portfolio operations"
          ]}
          demo_actions={[
            "Show hero with 'Multi-Property Guest Operations, Automated' headline",
            "Scroll through features grid (intake, quotes, welcome pack, daily brief)",
            "Point out explicit 'Inquiry → Quote → Welcome → Operations' flow in How It Works section",
            "Emphasize multi-tenant ready architecture for property portfolios"
          ]}
        />

        {/* Step 2: Pricing */}
        <ScriptStep
          number={2}
          icon={<DollarSign className="w-6 h-6" />}
          title="Pricing → COMING SOON Messaging"
          duration="1-2 min"
          route="/pricing"
          talking_points={[
            "Transparent three-tier structure planned",
            "Beta pricing will reward early adopters",
            "Current focus: building with real operator feedback",
            "CLEARLY LABELED as demo placeholder pricing—not live offers",
            "Waitlist gives priority access to launch pricing"
          ]}
          demo_actions={[
            "Point out amber 'DEMO PLACEHOLDER PRICING' banner at top",
            "Show 'EXAMPLE' labels on all pricing tiers with disclaimer notes",
            "Scroll to FAQ section (addresses common objections)",
            "Highlight Beta Access Program callout",
            "Explain: 'Final pricing announced at launch—these are structure examples only'",
            "Click 'Join Waitlist' CTA"
          ]}
        />

        {/* Step 3: Waitlist */}
        <ScriptStep
          number={3}
          icon={<Users className="w-6 h-6" />}
          title="Waitlist → Lead Capture"
          duration="1 min"
          route="/waitlist"
          talking_points={[
            "Captures property/company name, room count, current system",
            "Notes field for operational pain points",
            "All leads go to tenant-scoped CRM",
            "SQLite persistence (local demo only)"
          ]}
          demo_actions={[
            "Fill sample form: 'Mountain View Lodge, 4 rooms, Excel + WhatsApp'",
            "Submit and show success confirmation",
            "Explain: 'This lead now appears in CRM for Grant to qualify'"
          ]}
        />

        {/* Step 4: CRM */}
        <ScriptStep
          number={4}
          icon={<Briefcase className="w-6 h-6" />}
          title="CRM → Sales Pipeline Management"
          duration="2-3 min"
          route="/crm"
          talking_points={[
            "All waitlist leads in one tenant-scoped view",
            "Status tracking: New → Contacted → Qualified → Won/Lost",
            "CSV export for email campaigns (external tool)",
            "Submission timestamps for follow-up prioritization"
          ]}
          demo_actions={[
            "Show lead table with property details",
            "Update one lead status to 'Contacted' via dropdown",
            "Click 'Export CSV' and explain use case",
            "Point out tenant filtering (multi-property support)"
          ]}
        />

        {/* Step 5: Rate Card Upload */}
        <ScriptStep
          number={5}
          icon={<CreditCard className="w-6 h-6" />}
          title="Rate Card Upload → Never Invent Pricing"
          duration="2-3 min"
          route="/demo/rate-card-upload"
          talking_points={[
            "CSV or JSON upload (tenant-scoped SQLite storage)",
            "Seasonal rates with date ranges and minimum nights",
            "Real-time validation (room_type + rate_per_night required)",
            "Core safety rule: GuestFlow never invents rates"
          ]}
          demo_actions={[
            "Click 'Load Sample CSV' to populate textarea",
            "Click 'Upload Rate Card' and show success",
            "Scroll to 'Current Rate Cards' section",
            "Explain: 'Quote engine will use these rates, never fabricate'"
          ]}
        />

        {/* Step 6: Quote Draft */}
        <ScriptStep
          number={6}
          icon={<FileText className="w-6 h-6" />}
          title="Quote Draft → Real Rate Integration"
          duration="2-3 min"
          route="/demo/quote-draft"
          talking_points={[
            "Professional quote packager with rate card lookup",
            "Automatic rate matching by room type and date range",
            "Shows green status when rates found, amber when missing",
            "Falls back to [RATE CARD REQUIRED] placeholders (never invents)"
          ]}
          demo_actions={[
            "Click 'Generate Draft Quote' (uses uploaded rates)",
            "Show calculated subtotal + 15% tax",
            "Point out green 'Rate Card Loaded' status",
            "Explain: 'If no rate exists, quote shows [RATE CARD REQUIRED]'"
          ]}
        />

        {/* Step 7: NightsBridge Import */}
        <ScriptStep
          number={7}
          icon={<Upload className="w-6 h-6" />}
          title="NightsBridge Import → OTA Integration"
          duration="2 min"
          route="/demo/nightsbridge-import"
          talking_points={[
            "CSV import for bookings from OTA exports",
            "Flexible header aliases (handles different formats)",
            "Detects availability gaps and late check-ins",
            "Status derivation (arriving/inhouse/departing)"
          ]}
          demo_actions={[
            "Click 'Load Sample CSV'",
            "Click 'Parse CSV' and show parsed bookings",
            "Point out gap detection and late check-in alerts",
            "Explain: 'Live API integration on roadmap post-launch'"
          ]}
        />

        {/* Step 8: Tenant Switcher */}
        <ScriptStep
          number={8}
          icon={<Building2 className="w-6 h-6" />}
          title="Tenant Admin → Multi-Property Architecture"
          duration="1-2 min"
          route="/demo/tenant"
          talking_points={[
            "Each operator gets isolated tenant sandbox",
            "Demo tenant: 'The Browns Luxury Guest Suites (Dullstroom)'",
            "Tenant switcher for local dev/testing only",
            "Production: proper multi-tenant auth with team permissions"
          ]}
          demo_actions={[
            "Show demo tenant info (ID, name, created date)",
            "Explain data isolation (tenant_id on all records)",
            "Note: 'This switcher only for demo—production has real auth'"
          ]}
        />

        {/* Step 9: Sales Leave-Behind Pack */}
        <ScriptStep
          number={9}
          icon={<FileText className="w-6 h-6" />}
          title="Sales Leave-Behind Pack → Post-Demo Follow-Up"
          duration="1 min"
          route="/demo/sales-leavebehind"
          talking_points={[
            "Complete sales leave-behind with product overview",
            "11-step demo path summary for reference",
            "Sample inquiry/quote fixtures (never invents rates)",
            "Hard gates and DEMO pricing reminders",
            "Next steps: waitlist, contact, demo links"
          ]}
          demo_actions={[
            "Show generated sales pack with tenant name",
            "Point out fixture excerpts (with/without amounts)",
            "Explain ZIP export includes walkthrough, CT-pack, OTA worksheet reminders",
            "Click 'Download Markdown' or 'Download ZIP'",
            "Explain: 'Send this after demo to keep conversation warm and provide reference materials'"
          ]}
        />

      </div>

      {/* Demo Tips */}
      <div className="mt-12 bg-blue-50 border-2 border-blue-200 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Demo Tips & Objection Handling</h2>
        <div className="space-y-4 text-gray-700">
          <DemoTip
            objection="Why waitlist instead of signup?"
            response="We're building with real operator feedback. Beta access ensures you get a product that fits your workflow, not a generic tool."
          />
          <DemoTip
            objection="Do you integrate with [OTA/PMS]?"
            response="NightsBridge CSV import works today. Live API integrations (Booking.com, Airbnb) are on post-launch roadmap based on demand."
          />
          <DemoTip
            objection="What about payments?"
            response="Draft payment links in Phase 7 (post-launch). All financial operations require human approval—no auto-charges ever."
          />
          <DemoTip
            objection="Can it handle multiple properties?"
            response="Yes! Multi-tenant from day one. Each operator gets isolated sandbox with their portfolio. Demo shows 'The Browns' with 3 properties."
          />
          <DemoTip
            objection="Is this just another booking engine?"
            response="No—it's operations automation. We don't replace your OTA presence; we make managing inquiries, quotes, and daily ops faster."
          />
        </div>
      </div>

      {/* Hard Gates Reminder */}
      <div className="mt-8 bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-amber-900 mb-2">⚠️ Demo Constraints (DO NOT Promise)</h3>
        <ul className="space-y-1 text-sm text-amber-800">
          <li>❌ <strong>NO live payments</strong> — No Stripe, no card charges, no payment processing</li>
          <li>❌ <strong>NO paid ads</strong> — No Google Ads pixels, no Meta conversion tracking</li>
          <li>❌ <strong>NO public signup</strong> — Waitlist only, demo auth is NOT production</li>
          <li>❌ <strong>NO WhatsApp/email auto-send</strong> — All messaging draft-only with approval</li>
          <li>✅ <strong>Demo labeling</strong> — All pages clearly marked DEMO / WAITLIST / COMING SOON</li>
          <li>✅ <strong>Local demo only</strong> — SQLite database, no cloud deploys without approval</li>
        </ul>
      </div>

      {/* Next Steps CTA */}
      <div className="mt-12 text-center">
        <Link
          href="/demo"
          className="inline-flex items-center gap-2 px-8 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
        >
          Back to Demo Hub
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  )
}

function ScriptStep({
  number,
  icon,
  title,
  duration,
  route,
  talking_points,
  demo_actions
}: {
  number: number
  icon: React.ReactNode
  title: string
  duration: string
  route: string
  talking_points: string[]
  demo_actions: string[]
}) {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-primary-400 transition">
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
          {number}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-primary-600">{icon}</div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
            <span className="font-medium">{duration}</span>
            <Link href={route} className="flex items-center gap-1 text-primary-600 hover:underline">
              {route}
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">💬 Talking Points</h4>
              <ul className="space-y-1.5">
                {talking_points.map((point, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">🖱️ Demo Actions</h4>
              <ul className="space-y-1.5">
                {demo_actions.map((action, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2">
                    <ArrowRight className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DemoTip({ objection, response }: { objection: string; response: string }) {
  return (
    <div className="pl-4 border-l-4 border-blue-300">
      <p className="font-semibold text-gray-900 mb-1">Q: {objection}</p>
      <p className="text-gray-700">A: {response}</p>
    </div>
  )
}

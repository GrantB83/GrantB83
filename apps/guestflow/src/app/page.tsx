import Link from 'next/link'
import { 
  MessageSquare, 
  FileText, 
  Calendar, 
  TrendingUp,
  CheckCircle2,
  Sparkles
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            DEMO / WAITLIST - Coming Soon
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Multi-Property Guest Operations,
            <span className="text-primary-600"> Automated</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Run multiple guesthouses with one platform. From inquiry to checkout, 
            automate ops, quotes, and daily briefs—built by guesthouse owners.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link 
              href="/waitlist" 
              className="px-8 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
            >
              Join Waitlist
            </Link>
            <Link 
              href="/demo" 
              className="px-8 py-3 bg-white text-primary-600 border-2 border-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition"
            >
              Try Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Everything You Need to Run Multiple Guesthouses
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Multi-tenant platform: manage all your properties in one place. From first inquiry to guest departure, 
            GuestFlow handles the operational heavy lifting across your portfolio.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={<MessageSquare className="w-8 h-8 text-primary-600" />}
            title="Smart Inquiry Intake"
            description="Automatically extract guest details, dates, and requirements from emails and messages into structured data"
          />
          <FeatureCard
            icon={<FileText className="w-8 h-8 text-primary-600" />}
            title="Quote & Invoice Drafts"
            description="Generate professional quotes and proforma invoices based on your rate cards—never invent pricing"
          />
          <FeatureCard
            icon={<Calendar className="w-8 h-8 text-primary-600" />}
            title="Daily Operations Brief"
            description="Get arrival/departure lists, housekeeping schedules, and coordination notes every morning"
          />
          <FeatureCard
            icon={<CheckCircle2 className="w-8 h-8 text-primary-600" />}
            title="Guest Welcome Packs"
            description="Draft personalized welcome messages with Wi-Fi, check-in details, and property info"
          />
          <FeatureCard
            icon={<TrendingUp className="w-8 h-8 text-primary-600" />}
            title="OTA Rate Worksheets"
            description="Manage rates across booking platforms with Nightsbridge-compatible CSV exports"
          />
          <FeatureCard
            icon={<Sparkles className="w-8 h-8 text-primary-600" />}
            title="Multi-Tenant Ready"
            description="Each operator gets their own sandbox with sample properties and bookings"
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Built from Real Multi-Property Operations
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Proven workflows from The Browns portfolio: multiple properties, one streamlined system. 
              Tenant-scoped data keeps each property's operations separate and secure.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="Connect Your Email"
              description="Forward inquiries or integrate your booking inbox"
            />
            <StepCard
              number="2"
              title="Set Your Rules"
              description="Upload rate cards, property details, and operational preferences"
            />
            <StepCard
              number="3"
              title="Review & Approve"
              description="All drafts require human approval—no auto-sends, ever"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-primary-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Automate Your Guest Operations?
          </h2>
          <p className="text-xl mb-8 text-primary-100">
            Join our waitlist to be notified when we launch
          </p>
          <Link 
            href="/waitlist" 
            className="inline-block px-8 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Get Early Access
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600">
          <p className="mb-2">
            <strong>DEMO PLATFORM</strong> - No live payments or automated messaging
          </p>
          <p className="text-sm">
            Built by <a href="https://thebrowns.co.za" className="text-primary-600 hover:underline">The Browns</a> · 
            Powered by proven guesthouse automation
          </p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}

function StepCard({ number, title, description }: { number: string, title: string, description: string }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-600 text-white rounded-full text-xl font-bold mb-4">
        {number}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}

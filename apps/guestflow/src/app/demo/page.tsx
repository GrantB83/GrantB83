import Link from 'next/link'
import { MessageSquare, FileText, Calendar, Mail } from 'lucide-react'

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

      <div className="grid md:grid-cols-2 gap-8 mb-12">
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
          href="/demo/daily-brief"
          icon={<Calendar className="w-8 h-8 text-primary-600" />}
          title="Daily Operations Brief"
          description="View a sample morning brief with arrivals, departures, and tasks"
          status="Interactive"
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

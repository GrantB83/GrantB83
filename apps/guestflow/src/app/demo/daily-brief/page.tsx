import Link from 'next/link'
import { ArrowLeft, Calendar, Users, Clock, CheckCircle2 } from 'lucide-react'

export default function DailyBriefPage() {
  const briefDate = 'December 15, 2026'
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/demo" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Demo
      </Link>

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Daily Operations Brief
            </h1>
            <p className="text-gray-600">
              Morning coordination brief for your operations team
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">SAST / CT</div>
            <div className="text-lg font-semibold text-gray-900">{briefDate}</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={<Users className="w-6 h-6 text-blue-600" />}
          label="Arrivals"
          value="3"
          color="blue"
        />
        <StatCard
          icon={<Calendar className="w-6 h-6 text-green-600" />}
          label="In-House"
          value="5"
          color="green"
        />
        <StatCard
          icon={<Clock className="w-6 h-6 text-orange-600" />}
          label="Departures"
          value="2"
          color="orange"
        />
      </div>

      <div className="space-y-6">
        <Section title="🔴 RED - Action Required" color="red">
          <AlertItem
            title="Miller Anniversary Suite - Late Check-in"
            details="Guests arriving 8:00 PM (delayed flight). Confirm after-hours access."
            action="Call +27 82 555 1234 to confirm ETA"
          />
        </Section>

        <Section title="🟡 AMBER - Today's Priorities" color="amber">
          <BriefItem
            title="Johnson Family - Dietary Requirements"
            details="Vegetarian breakfast requested. 2 adults, 2 children."
            time="Check-in: 2:00 PM"
          />
          <BriefItem
            title="Pet Guest - Suite 3"
            details="Miller party has small dog. Ensure pet amenities are in room."
            time="Arrival: 8:00 PM"
          />
        </Section>

        <Section title="Arrivals Today (3)" color="blue">
          <GuestCard
            name="Sarah & John Miller"
            room="Deluxe Suite (Room 3)"
            time="8:00 PM (Late arrival)"
            nights={2}
            guests="2 adults"
            notes="Anniversary, Pet (small dog), Late check-in"
          />
          <GuestCard
            name="Johnson Family"
            room="Family Suite (Room 5)"
            time="2:00 PM"
            nights={3}
            guests="2 adults, 2 children"
            notes="Vegetarian meals"
          />
          <GuestCard
            name="Business Traveler"
            room="Standard Room (Room 1)"
            time="3:30 PM"
            nights={1}
            guests="1 adult"
            notes="Early breakfast (7:00 AM)"
          />
        </Section>

        <Section title="In-House Guests (5)" color="green">
          <div className="text-sm text-gray-600">
            <p>• Williams party - Suite 2 (checkout tomorrow)</p>
            <p>• Corporate group - Rooms 6-8 (2 more nights)</p>
            <p>• Chen couple - Room 4 (checkout Dec 18)</p>
          </div>
        </Section>

        <Section title="Departures Today (2)" color="orange">
          <div className="text-sm text-gray-600">
            <p>• Brown family - Room 7 (checkout 10:00 AM)</p>
            <p>• Anderson couple - Room 9 (checkout 9:30 AM)</p>
          </div>
        </Section>

        <Section title="Housekeeping Schedule" color="gray">
          <TaskItem task="Morning: Rooms 7, 9 (departures)" status="pending" />
          <TaskItem task="Afternoon: Rooms 1, 3, 5 (arrivals)" status="pending" />
          <TaskItem task="Pet suite preparation - Room 3" status="pending" />
          <TaskItem task="Family suite setup - Room 5" status="pending" />
        </Section>

        <Section title="Breakfast Service" color="gray">
          <div className="text-sm text-gray-600">
            <p><strong>Regular service:</strong> 7:30-10:00 AM (5 guests)</p>
            <p><strong>Early service:</strong> 7:00 AM (1 guest, Room 1)</p>
            <p><strong>Special dietary:</strong> Vegetarian (Johnson family, arriving today)</p>
          </div>
        </Section>
      </div>

      <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Daily Brief Features</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✅ Generated from NightsBridge / Google Calendar / booking JSON</li>
          <li>✅ RED/AMBER/GREEN priority system for fast scanning</li>
          <li>✅ Housekeeping task list per arrival/departure</li>
          <li>✅ Special requests and dietary requirements highlighted</li>
          <li>✅ Draft-only: team WhatsApp send requires H11 approval</li>
          <li>✅ Never invents guest data or room assignments</li>
        </ul>
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/demo"
          className="inline-block px-8 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
        >
          Back to Demo Overview
        </Link>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) {
  const bgColor = color === 'blue' ? 'bg-blue-50' : color === 'green' ? 'bg-green-50' : 'bg-orange-50'
  return (
    <div className={`${bgColor} p-6 rounded-xl border border-gray-200`}>
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-sm text-gray-600">{label}</div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, color, children }: { title: string, color: string, children: React.ReactNode }) {
  const borderColor = 
    color === 'red' ? 'border-red-200' :
    color === 'amber' ? 'border-amber-200' :
    color === 'blue' ? 'border-blue-200' :
    color === 'green' ? 'border-green-200' :
    color === 'orange' ? 'border-orange-200' :
    'border-gray-200'
  
  return (
    <div className={`bg-white border-2 ${borderColor} rounded-xl p-6`}>
      <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}

function AlertItem({ title, details, action }: { title: string, details: string, action: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <h3 className="font-semibold text-red-900 mb-1">{title}</h3>
      <p className="text-sm text-red-800 mb-2">{details}</p>
      <p className="text-sm font-medium text-red-900">→ {action}</p>
    </div>
  )
}

function BriefItem({ title, details, time }: { title: string, details: string, time: string }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <h3 className="font-semibold text-amber-900 mb-1">{title}</h3>
      <p className="text-sm text-amber-800 mb-1">{details}</p>
      <p className="text-xs text-amber-700">{time}</p>
    </div>
  )
}

function GuestCard({ name, room, time, nights, guests, notes }: { 
  name: string
  room: string
  time: string
  nights: number
  guests: string
  notes: string
}) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900">{name}</h3>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{time}</span>
      </div>
      <p className="text-sm text-gray-700 mb-1">{room} · {nights} {nights === 1 ? 'night' : 'nights'}</p>
      <p className="text-sm text-gray-600 mb-2">{guests}</p>
      {notes && <p className="text-xs text-gray-500 italic">{notes}</p>}
    </div>
  )
}

function TaskItem({ task, status }: { task: string, status: string }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 className={`w-5 h-5 ${status === 'complete' ? 'text-green-600' : 'text-gray-300'}`} />
      <span className="text-sm text-gray-700">{task}</span>
    </div>
  )
}

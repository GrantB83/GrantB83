'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function WaitlistPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    propertyName: '',
    roomCount: '',
    currentSystem: '',
    phone: '',
    notes: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSubmitted(true)
      } else {
        alert('Something went wrong. Please try again.')
      }
    } catch (error) {
      alert('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            You're on the Waitlist!
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Thank you for your interest in GuestFlow.
          </p>
          <p className="text-lg text-gray-500 mb-8">
            This is <strong>demo/waitlist interest only</strong> — not a paid account or subscription.
          </p>
          <div className="space-y-4">
            <Link
              href="/demo"
              className="inline-block px-8 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
            >
              Try the Demo
            </Link>
            <br />
            <Link
              href="/"
              className="inline-block px-8 py-3 bg-white border-2 border-gray-300 text-gray-900 rounded-lg font-semibold hover:border-primary-600 transition"
            >
              Back to Home
            </Link>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-300 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center justify-center gap-2">
            <span className="text-amber-600">⚠️</span>
            Important: Waitlist Only (No Payment, No Signup)
          </h3>
          <p className="text-sm text-gray-700 mb-2">
            You have <strong>NOT</strong> signed up for a paid account. This waitlist submission does not charge you, create a subscription, or give you immediate access.
          </p>
          <p className="text-sm text-gray-700">
            We'll contact you when beta access opens. No payment will be requested until you explicitly choose a plan.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-left">
          <h3 className="font-semibold text-gray-900 mb-2">What Happens Next?</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✅ You'll receive a confirmation email when we launch (no immediate email)</li>
            <li>✅ We may contact you for a 15-minute discovery call to learn about your needs</li>
            <li>✅ Early access invites go out in late 2026</li>
            <li>✅ Beta participants may receive special pricing (to be announced)</li>
            <li>⚠️ <strong>No payment, subscription, or account has been created</strong></li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Home
      </Link>

      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-medium mb-3">
          🎯 PHASE 27
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Join the Waitlist
        </h1>
        <p className="text-xl text-gray-600 mb-3">
          Be among the first to automate your guesthouse operations
        </p>
        <p className="text-sm text-gray-500">
          This is <strong>demo/waitlist interest only</strong> — no payment, no signup, no subscription.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-6 text-center">
        <p className="text-sm text-gray-800">
          <span className="font-semibold">⚠️ Waitlist Only:</span> This form does <strong>NOT</strong> create a paid account or charge you anything.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border-2 border-gray-200 rounded-xl p-8 space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-800 mb-2">
              Your Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent text-gray-900"
              placeholder="John Smith"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent text-gray-900"
              placeholder="john@example.com"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Property Information</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="propertyName" className="block text-sm font-semibold text-gray-800 mb-2">
                Property / Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="propertyName"
                required
                value={formData.propertyName}
                onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent text-gray-900"
                placeholder="Riverside Lodge"
              />
            </div>

            <div>
              <label htmlFor="roomCount" className="block text-sm font-semibold text-gray-800 mb-2">
                Number of Rooms / Units <span className="text-red-500">*</span>
              </label>
              <select
                id="roomCount"
                required
                value={formData.roomCount}
                onChange={(e) => setFormData({ ...formData, roomCount: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent text-gray-900"
              >
                <option value="">Select...</option>
                <option value="1-5">1-5 rooms</option>
                <option value="6-10">6-10 rooms</option>
                <option value="11-20">11-20 rooms</option>
                <option value="21+">21+ rooms</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Additional Details (Optional)</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent text-gray-900"
                placeholder="+27 XX XXX XXXX"
              />
            </div>

            <div>
              <label htmlFor="currentSystem" className="block text-sm font-medium text-gray-700 mb-2">
                Current Booking System <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                id="currentSystem"
                value={formData.currentSystem}
                onChange={(e) => setFormData({ ...formData, currentSystem: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent text-gray-900"
                placeholder="NightsBridge, Google Calendar, etc."
              />
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Tell us about your biggest operational challenges <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              id="notes"
              rows={4}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent text-gray-900"
              placeholder="e.g., Managing multiple properties, slow inquiry responses, manual booking confirmations..."
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-4 bg-primary-600 text-white rounded-lg font-semibold text-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Submitting...' : 'Join Waitlist (Free, No Payment)'}
        </button>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-600 text-center">
            By joining the waitlist, you agree to receive updates about GuestFlow. We'll never share your information.<br />
            <span className="font-semibold">This does NOT create a paid account, subscription, or charge you anything.</span>
          </p>
        </div>
      </form>

      <div className="mt-12 grid md:grid-cols-3 gap-6">
        <BenefitCard
          title="Early Access (Future)"
          description="Be first to try when we launch beta"
        />
        <BenefitCard
          title="No Payment Required"
          description="Waitlist is free—no credit card, no signup"
        />
        <BenefitCard
          title="Shape the Product"
          description="Your feedback guides development"
        />
      </div>
    </div>
  )
}

function BenefitCard({ title, description }: { title: string, description: string }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  )
}

import Link from 'next/link'
import { Home } from 'lucide-react'

export default function WaitlistPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-red-50 border-4 border-red-600 rounded-xl p-8 text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-full mb-4">
          <span className="text-3xl text-white">🚫</span>
        </div>
        <h1 className="text-3xl font-bold text-red-900 mb-4">
          Waitlist Closed
        </h1>
        <p className="text-lg text-red-800 mb-4">
          This page has been removed. GuestFlow is now an <strong>internal Browns operations console</strong>, not a public product.
        </p>
        <p className="text-base text-red-700 mb-6">
          There is no waitlist, no public signup, and no retail distribution. This is internal ops automation for The Browns Luxury Guest Suites (Dullstroom) only.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700 transition"
        >
          <Home className="w-5 h-5" />
          Go to Browns Ops Hub
        </Link>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
        <h2 className="font-semibold text-gray-900 mb-2">
          Looking for Internal Ops Tools?
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          All operational automation is available at the ops hub or individual tool pages.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/ops"
            className="px-4 py-2 bg-white border-2 border-slate-300 text-gray-900 rounded-lg text-sm font-medium hover:border-slate-500 transition"
          >
            View All Ops Tools
          </Link>
          <Link
            href="/ops/daily-brief"
            className="px-4 py-2 bg-white border-2 border-slate-300 text-gray-900 rounded-lg text-sm font-medium hover:border-slate-500 transition"
          >
            Daily Brief
          </Link>
          <Link
            href="/ops/welcome-drafts"
            className="px-4 py-2 bg-white border-2 border-slate-300 text-gray-900 rounded-lg text-sm font-medium hover:border-slate-500 transition"
          >
            Welcome Drafts
          </Link>
        </div>
      </div>
    </div>
  )
}

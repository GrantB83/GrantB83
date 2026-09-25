'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock } from 'lucide-react'

export const dynamic = 'force-dynamic'

function StaffLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/staff-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const redirect = searchParams.get('redirect') || '/'
        router.push(redirect)
        router.refresh()
      } else if (response.status === 429) {
        setError('Too many login attempts. Try again later.')
      } else {
        setError('Invalid email or password. Contact Browns admin for access.')
      }
    } catch {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md w-full">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center mb-4">
          <img 
            src="/logos/thebrowns-logo-live.svg" 
            alt="The Browns" 
            className="h-20 w-auto"
          />
        </div>
        <h1 className="text-3xl font-bold font-serif text-white mb-2">
          Staff login
        </h1>
        <p className="text-slate-300">
          Staff-only access • Dullstroom Internal
        </p>
      </div>

      <div className="bg-muted rounded-2xl shadow-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">
            Access Ops Console
          </h2>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground bg-white"
              placeholder="you@thebrowns.co.za"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground bg-white"
              placeholder="Enter password"
            />
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Verifying...' : 'Access Ops Console'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            This is an internal operations console for Browns staff only.
            <br />
            Shared-password transition: email <code>legacy@guestflow.local</code> until that flag is retired.
            <br />
            Contact Grant at grant@thebrowns.co.za for access.
          </p>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-slate-400">
          guestflow.thebrowns.co.za • Internal Use Only
        </p>
      </div>
    </div>
  )
}

export default function StaffLoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-800 to-primary flex items-center justify-center px-4">
      <Suspense fallback={
        <div className="max-w-md w-full text-center">
          <div className="text-white">Loading...</div>
        </div>
      }>
        <StaffLoginForm />
      </Suspense>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Lock } from 'lucide-react'

const DEMO_PASSWORD = 'demo2026'

export function DemoAuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const authStatus = sessionStorage.getItem('guestflow_demo_auth')
    if (authStatus === 'authenticated') {
      setIsAuthenticated(true)
    }
    setIsLoading(false)
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password === DEMO_PASSWORD) {
      sessionStorage.setItem('guestflow_demo_auth', 'authenticated')
      setIsAuthenticated(true)
    } else {
      setError('Incorrect password')
      setPassword('')
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('guestflow_demo_auth')
    setIsAuthenticated(false)
    setPassword('')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-primary-600" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
              Demo Authentication
            </h2>
            <p className="text-center text-gray-600 mb-6">
              Enter the demo password to continue
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900 font-medium mb-1">
                🔒 DEMO MODE ONLY
              </p>
              <p className="text-xs text-blue-800">
                This is a simple local authentication stub for demo purposes.
                <br />
                Password: <code className="bg-blue-100 px-1 rounded">demo2026</code>
              </p>
            </div>

            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter demo password"
                  autoFocus
                />
              </div>

              {error && (
                <div className="mb-4 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
              >
                Sign In
              </button>
            </form>

            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-xs text-amber-800">
                ⚠️ <strong>NOT PRODUCTION AUTH:</strong> This is a demo stub only.
                Real authentication (NextAuth.js, OAuth) comes in a future phase.
                No public signup, no password reset, no user management.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4">
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-900 transition shadow-lg"
        >
          Demo Logout
        </button>
      </div>
    </>
  )
}

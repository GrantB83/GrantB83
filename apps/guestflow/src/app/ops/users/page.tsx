'use client'

import { useCallback, useEffect, useState } from 'react'
import { Users as UsersIcon } from 'lucide-react'

type StaffUser = {
  id: number
  email: string
  display_name: string | null
  created_at: string
  created_by: string
  last_login_at: string | null
}

function formatWhen(value: string | null): string {
  if (!value) return '—'
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return value
  return new Date(parsed).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })
}

export default function OpsUsersPage() {
  const [me, setMe] = useState('')
  const [users, setUsers] = useState<StaffUser[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const response = await fetch('/api/staff/users')
    if (response.status === 401) {
      window.location.href = '/staff-login?redirect=/ops/users'
      return
    }
    const data = await response.json()
    if (!response.ok) {
      setError(data.error || 'Failed to load users')
      return
    }
    setMe(data.email || '')
    setUsers(data.users || [])
  }, [])

  useEffect(() => {
    load().catch(() => setError('Failed to load users'))
  }, [load])

  const addUser = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/staff/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, display_name: displayName }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Could not add user')
        return
      }
      setEmail('')
      setDisplayName('')
      setPassword('')
      setNotice(`Added ${data.user.email}`)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const removeUser = async (user: StaffUser) => {
    if (!window.confirm(`Remove ${user.email}? They will be signed out immediately.`)) {
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(`/api/staff/users/${user.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Could not remove user')
        return
      }
      setNotice(`Removed ${user.email}`)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/staff/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Could not change password')
        return
      }
      setCurrentPassword('')
      setNewPassword('')
      setNotice('Password updated')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center gap-3 mb-8">
        <UsersIcon className="w-8 h-8 text-slate-700" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-600">
            Every signed-in person has the same full access. Login is email + password.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-lg p-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-6 bg-green-50 border-2 border-green-300 rounded-lg p-3 text-sm text-green-800">
          {notice}
        </div>
      )}

      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Display name</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Created by</th>
              <th className="px-4 py-3">Last login</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = me.toLowerCase() === user.email.toLowerCase()
              const lastUser = users.length <= 1
              return (
                <tr key={user.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {user.email}
                    {isSelf ? <span className="ml-2 text-xs text-slate-500">(you)</span> : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.display_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{formatWhen(user.created_at)}</td>
                  <td className="px-4 py-3 text-gray-600">{user.created_by}</td>
                  <td className="px-4 py-3 text-gray-600">{formatWhen(user.last_login_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={busy || isSelf || lastUser}
                      onClick={() => removeUser(user)}
                      className="px-3 py-1.5 text-sm rounded-lg border border-red-300 text-red-800 disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              )
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                  No users yet. Add the first person below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={addUser} className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-8 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Add user</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="new-email">
              Email
            </label>
            <input
              id="new-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="new-display-name">
              Display name (optional)
            </label>
            <input
              id="new-display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="new-password">
              Password
            </label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium disabled:opacity-50"
        >
          Add user
        </button>
      </form>

      <form onSubmit={changePassword} className="bg-white rounded-xl border-2 border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Change your password</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="current-password">
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="next-password">
              New password
            </label>
            <input
              id="next-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium disabled:opacity-50"
        >
          Update password
        </button>
      </form>
    </div>
  )
}

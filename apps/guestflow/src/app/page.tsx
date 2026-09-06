'use client'

import { useState, useEffect } from 'react'
import { format, addDays } from 'date-fns'
import { 
  Home, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  Upload,
  RefreshCw,
  TrendingUp,
  Users,
  MessageSquare
} from 'lucide-react'
import Link from 'next/link'

interface TodayStats {
  approvals: {
    count: number
    items: Array<{ type: string; guest: string; id: number }>
  }
  exceptions: {
    count: number
    items: Array<{ category: string; guest: string; id: number }>
  }
  next24h: {
    arriving: number
    departing: number
    inHouse: number
  }
  nbFreshness: {
    lastSync: string | null
    hoursAgo: number | null
    status: 'fresh' | 'stale' | 'missing'
  }
  aiActivity: Array<{
    action: string
    count: number
    timestamp: string
  }>
}

export default function TodayPage() {
  const [stats, setStats] = useState<TodayStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStats = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true)
      else setLoading(true)

      const response = await fetch('/api/today-stats?tenant_id=1')
      const data = await response.json()

      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch today stats:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading today's overview...</p>
        </div>
      </div>
    )
  }

  const now = new Date()
  const tomorrow = addDays(now, 1)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Home className="w-8 h-8 text-blue-600" />
                Today
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {format(now, 'EEEE, MMMM d, yyyy')} • {format(now, 'HH:mm')} SAST
              </p>
            </div>
            <button
              onClick={() => fetchStats(true)}
              disabled={refreshing}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Priority Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Needs Approval */}
          <Link 
            href="/needs-approval"
            className="bg-white rounded-xl border-2 border-blue-200 hover:border-blue-400 p-6 transition group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-600">
                    Needs approval
                  </h2>
                  <p className="text-sm text-gray-600">
                    {stats?.approvals.count || 0} items waiting
                  </p>
                </div>
              </div>
              {stats && stats.approvals.count > 0 && (
                <span className="bg-blue-600 text-white text-lg font-bold rounded-full w-10 h-10 flex items-center justify-center">
                  {stats.approvals.count}
                </span>
              )}
            </div>
            {stats && stats.approvals.count === 0 && (
              <p className="text-gray-500 text-sm">
                ✓ Routine handled. Nothing needs you.
              </p>
            )}
            {stats && stats.approvals.count > 0 && (
              <div className="space-y-2">
                {stats.approvals.items.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="text-sm text-gray-700 truncate">
                    • {item.type}: {item.guest}
                  </div>
                ))}
                {stats.approvals.count > 3 && (
                  <div className="text-sm text-blue-600 font-medium">
                    +{stats.approvals.count - 3} more
                  </div>
                )}
              </div>
            )}
          </Link>

          {/* Exceptions */}
          <Link 
            href="/exceptions"
            className="bg-white rounded-xl border-2 border-amber-200 hover:border-amber-400 p-6 transition group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 group-hover:text-amber-600">
                    Exceptions
                  </h2>
                  <p className="text-sm text-gray-600">
                    {stats?.exceptions.count || 0} active
                  </p>
                </div>
              </div>
              {stats && stats.exceptions.count > 0 && (
                <span className="bg-amber-600 text-white text-lg font-bold rounded-full w-10 h-10 flex items-center justify-center">
                  {stats.exceptions.count}
                </span>
              )}
            </div>
            {stats && stats.exceptions.count === 0 && (
              <p className="text-gray-500 text-sm">
                ✓ No exceptions right now
              </p>
            )}
            {stats && stats.exceptions.count > 0 && (
              <div className="space-y-2">
                {stats.exceptions.items.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="text-sm text-gray-700 truncate">
                    • {item.category}: {item.guest}
                  </div>
                ))}
                {stats.exceptions.count > 3 && (
                  <div className="text-sm text-amber-600 font-medium">
                    +{stats.exceptions.count - 3} more
                  </div>
                )}
              </div>
            )}
          </Link>
        </div>

        {/* Next 24h Overview */}
        <div className="bg-white rounded-xl border p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            Next 24 hours
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link 
              href="/ops/bookings?filter=arriving"
              className="p-4 bg-green-50 rounded-lg border border-green-200 hover:border-green-400 transition"
            >
              <div className="text-2xl font-bold text-green-700">
                {stats?.next24h.arriving || 0}
              </div>
              <div className="text-sm text-gray-700">Arriving</div>
              <div className="text-xs text-gray-500 mt-1">
                {format(now, 'MMM d')} - {format(tomorrow, 'MMM d')}
              </div>
            </Link>
            <Link 
              href="/ops/bookings?filter=in-house"
              className="p-4 bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-400 transition"
            >
              <div className="text-2xl font-bold text-blue-700">
                {stats?.next24h.inHouse || 0}
              </div>
              <div className="text-sm text-gray-700">In-house</div>
              <div className="text-xs text-gray-500 mt-1">Current guests</div>
            </Link>
            <Link 
              href="/ops/bookings?filter=departing"
              className="p-4 bg-amber-50 rounded-lg border border-amber-200 hover:border-amber-400 transition"
            >
              <div className="text-2xl font-bold text-amber-700">
                {stats?.next24h.departing || 0}
              </div>
              <div className="text-sm text-gray-700">Departing</div>
              <div className="text-xs text-gray-500 mt-1">Check-outs today</div>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* NightsBridge Freshness */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-gray-600" />
              NightsBridge Sync
            </h2>
            {stats?.nbFreshness.status === 'fresh' && (
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium text-green-700">Fresh data</div>
                  <div className="text-sm text-gray-600">
                    Last sync: {stats.nbFreshness.hoursAgo !== null ? `${Math.floor(stats.nbFreshness.hoursAgo)}h ago` : 'recently'}
                  </div>
                </div>
              </div>
            )}
            {stats?.nbFreshness.status === 'stale' && (
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <div className="font-medium text-amber-700">Data is stale</div>
                  <div className="text-sm text-gray-600">
                    Last sync: {stats.nbFreshness.hoursAgo !== null ? `${Math.floor(stats.nbFreshness.hoursAgo)}h ago` : 'unknown'}
                  </div>
                  <Link 
                    href="/ops/nightsbridge-import" 
                    className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                  >
                    Upload now →
                  </Link>
                </div>
              </div>
            )}
            {stats?.nbFreshness.status === 'missing' && (
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <div className="font-medium text-red-700">No sync today</div>
                  <div className="text-sm text-gray-600 mb-2">
                    Expected: 05:00 & 19:00 SAST daily
                  </div>
                  <Link 
                    href="/ops/nightsbridge-import" 
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Upload manually →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* AI Activity (Quiet) */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-600" />
              Recent Activity
            </h2>
            {stats && stats.aiActivity.length === 0 && (
              <p className="text-sm text-gray-500">No recent activity</p>
            )}
            {stats && stats.aiActivity.length > 0 && (
              <div className="space-y-3">
                {stats.aiActivity.slice(0, 4).map((activity, idx) => (
                  <div key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium">{activity.action}</div>
                      <div className="text-xs text-gray-500">
                        {activity.count} {activity.count === 1 ? 'item' : 'items'} • {activity.timestamp}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link
            href="/ops"
            className="p-4 bg-white rounded-lg border hover:border-blue-400 hover:shadow transition text-center"
          >
            <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">Tools</div>
          </Link>
          <Link
            href="/ops/inbound-queue"
            className="p-4 bg-white rounded-lg border hover:border-blue-400 hover:shadow transition text-center"
          >
            <MessageSquare className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">Inbound</div>
          </Link>
          <Link
            href="/comms"
            className="p-4 bg-white rounded-lg border hover:border-blue-400 hover:shadow transition text-center"
          >
            <MessageSquare className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">Comms</div>
          </Link>
          <Link
            href="/ops/rate-cards"
            className="p-4 bg-white rounded-lg border hover:border-blue-400 hover:shadow transition text-center"
          >
            <Calendar className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">Rates</div>
          </Link>
        </div>
      </div>
    </div>
  )
}

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

/**
 * Nightsbridge Sync Reminder Endpoint
 * 
 * Designed to run at 05:00 SAST (03:00 UTC) and 19:00 SAST (17:00 UTC).
 * 
 * Vercel Config: Only one Vercel cron is configured (03:00 UTC) for Hobby tier compatibility.
 * For the second daily run (17:00 UTC), trigger externally:
 *   - Use an external cron service (e.g., cron-job.org, GitHub Actions)
 *   - Call: GET https://guestflow.thebrowns.co.za/api/cron/nightsbridge-reminder
 *   - Include header: Authorization: Bearer {CRON_SECRET}
 * 
 * Checks the last sync time and booking freshness.
 * Logs status for monitoring and optionally sends reminders to SA Ops.
 * 
 * Does NOT auto-fetch from Nightsbridge (no API available).
 * SA Ops must manually drop arr_and_dep.xlsx or use /api/cron/nightsbridge-ingest.
 * 
 * Security: Vercel cron jobs include CRON_SECRET automatically in headers.
 * External triggers must provide it manually.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel adds this automatically for cron jobs)
    const authorization = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authorization !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid cron secret' },
        { status: 401 }
      )
    }

    const now = new Date()
    const today = format(now, 'yyyy-MM-dd')
    const hour = now.getUTCHours()
    
    // Determine sync window
    const syncWindow = hour === 3 ? 'morning' : hour === 17 ? 'evening' : 'unknown'

    const db = getDb()

    // Get Browns tenant
    const tenant = db.prepare('SELECT id FROM tenants WHERE name = ?').get('Browns Dullstroom')
    
    if (!tenant) {
      return NextResponse.json(
        { 
          error: 'Tenant not found',
          message: 'Browns Dullstroom tenant not found in database'
        },
        { status: 500 }
      )
    }

    const tenantId = (tenant as any).id

    // Check bookings for today and next 7 days
    const upcomingBookings = db.prepare(`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE tenant_id = ?
        AND check_in >= ?
        AND check_in <= date(?, '+7 days')
    `).get(tenantId, today, today) as any

    const todayArrivals = db.prepare(`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE tenant_id = ?
        AND check_in = ?
        AND status = 'arriving'
    `).get(tenantId, today) as any

    const todayDepartures = db.prepare(`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE tenant_id = ?
        AND check_out = ?
        AND status = 'departing'
    `).get(tenantId, today) as any

    // Get last booking update time (approximate - check newest booking record)
    const lastSync = db.prepare(`
      SELECT MAX(
        CASE 
          WHEN check_in = ? OR check_out = ? THEN datetime('now')
          ELSE NULL 
        END
      ) as last_sync
      FROM bookings
      WHERE tenant_id = ?
    `).get(today, today, tenantId) as any

    const status = {
      timestamp: now.toISOString(),
      syncWindow,
      timezone: 'UTC',
      sastTime: format(new Date(now.getTime() + 2 * 60 * 60 * 1000), 'yyyy-MM-dd HH:mm:ss'),
      property: 'The Browns Dullstroom (Nightsbridge 24299)',
      bookings: {
        upcomingNext7Days: upcomingBookings?.count || 0,
        arrivingToday: todayArrivals?.count || 0,
        departingToday: todayDepartures?.count || 0,
      },
      lastSync: lastSync?.last_sync || 'unknown',
      reminder: {
        message: syncWindow === 'morning' 
          ? '🌅 Morning sync window (05:00 SAST). Please drop arr_and_dep.xlsx to /api/cron/nightsbridge-ingest or use manual upload at /ops/nightsbridge-import.'
          : '🌆 Evening sync window (19:00 SAST). Please verify bookings are current before guest comms.'
      },
      instructions: {
        manual: 'Visit https://guestflow.thebrowns.co.za/ops/nightsbridge-import',
        api: 'POST file to /api/cron/nightsbridge-ingest with x-cron-secret header',
        cliDrop: 'Place arr_and_dep.xlsx in watched folder (if configured)'
      }
    }

    // Log to console for Vercel logs monitoring
    console.log('Nightsbridge sync reminder:', JSON.stringify(status, null, 2))

    // TODO: In future, send WhatsApp/email reminder to SA Ops if bookings are stale
    // For now, rely on Vercel logs and manual discipline

    return NextResponse.json(status)

  } catch (error: any) {
    console.error('Nightsbridge reminder error:', error)
    return NextResponse.json(
      {
        error: 'Reminder check failed',
        message: error.message
      },
      { status: 500 }
    )
  }
}

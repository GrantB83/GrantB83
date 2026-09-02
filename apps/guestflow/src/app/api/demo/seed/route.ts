import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

const DEMO_PASSWORD = 'demo2026'

/**
 * POST /api/demo/seed
 * 
 * One-click demo seed that resets demo SQLite to a known-good sales walkthrough state.
 * 
 * Creates:
 * - 1 demo tenant (Dullstroom Demo Guesthouse)
 * - 2 properties/suites
 * - Sample rate card rows (synthetic demo rates only — clearly labeled DEMO)
 * - 3 sample bookings/leads for CRM + quote-draft
 * 
 * Idempotent: re-running seed replaces demo data only (or wipe+reseed demo tenant).
 * Never touches non-demo tenants.
 * 
 * Protected by demo password in Authorization header.
 */
export async function POST(request: Request) {
  try {
    // Check demo auth
    const authHeader = request.headers.get('authorization')
    const providedPassword = authHeader?.replace('Bearer ', '')
    
    if (providedPassword !== DEMO_PASSWORD) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid demo password' },
        { status: 401 }
      )
    }

    const db = getDb()

    // Step 1: Find or create demo tenant
    let demoTenant = db.prepare(
      'SELECT id FROM tenants WHERE name = ?'
    ).get('Dullstroom Demo Guesthouse') as { id: number } | undefined

    if (!demoTenant) {
      const result = db.prepare(
        'INSERT INTO tenants (name, location, timezone) VALUES (?, ?, ?)'
      ).run('Dullstroom Demo Guesthouse', 'Dullstroom, Mpumalanga, South Africa', 'Africa/Johannesburg')
      
      demoTenant = { id: Number(result.lastInsertRowid) }
    }

    const demoTenantId = demoTenant.id

    // Step 2: Clear existing demo data for this tenant (idempotent)
    db.prepare('DELETE FROM bookings WHERE tenant_id = ?').run(demoTenantId)
    db.prepare('DELETE FROM inquiries WHERE tenant_id = ?').run(demoTenantId)
    db.prepare('DELETE FROM rate_cards WHERE tenant_id = ?').run(demoTenantId)
    db.prepare('DELETE FROM waitlist WHERE tenant_id = ?').run(demoTenantId)
    db.prepare('DELETE FROM properties WHERE tenant_id = ?').run(demoTenantId)

    // Step 3: Create 2 sample properties
    const property1Result = db.prepare(
      'INSERT INTO properties (tenant_id, name, location, room_count) VALUES (?, ?, ?, ?)'
    ).run(demoTenantId, 'Riverside Suite', 'Dullstroom, SA', 2)

    const property2Result = db.prepare(
      'INSERT INTO properties (tenant_id, name, location, room_count) VALUES (?, ?, ?, ?)'
    ).run(demoTenantId, 'Mountain View Cottage', 'Dullstroom, SA', 3)

    const property1Id = Number(property1Result.lastInsertRowid)
    const property2Id = Number(property2Result.lastInsertRowid)

    // Step 4: Create sample rate cards (DEMO rates - clearly synthetic)
    const rateCards = [
      // Riverside Suite rates
      {
        tenantId: demoTenantId,
        propertyId: property1Id,
        roomType: 'Deluxe Suite',
        season: 'Peak Season (DEMO)',
        ratePerNight: 2500,
        currency: 'ZAR',
        minNights: 2,
        validFrom: '2026-12-01',
        validTo: '2027-01-15',
        notes: 'DEMO RATE - Summer peak season'
      },
      {
        tenantId: demoTenantId,
        propertyId: property1Id,
        roomType: 'Deluxe Suite',
        season: 'Standard Season (DEMO)',
        ratePerNight: 1800,
        currency: 'ZAR',
        minNights: 1,
        validFrom: '2027-01-16',
        validTo: '2027-11-30',
        notes: 'DEMO RATE - Standard season'
      },
      // Mountain View Cottage rates
      {
        tenantId: demoTenantId,
        propertyId: property2Id,
        roomType: 'Family Cottage',
        season: 'Peak Season (DEMO)',
        ratePerNight: 3200,
        currency: 'ZAR',
        minNights: 2,
        validFrom: '2026-12-01',
        validTo: '2027-01-15',
        notes: 'DEMO RATE - Summer peak, sleeps 5'
      },
      {
        tenantId: demoTenantId,
        propertyId: property2Id,
        roomType: 'Family Cottage',
        season: 'Standard Season (DEMO)',
        ratePerNight: 2400,
        currency: 'ZAR',
        minNights: 1,
        validFrom: '2027-01-16',
        validTo: '2027-11-30',
        notes: 'DEMO RATE - Standard season, sleeps 5'
      }
    ]

    for (const rc of rateCards) {
      db.prepare(`
        INSERT INTO rate_cards (
          tenant_id, property_id, room_type, season, rate_per_night, 
          currency, min_nights, valid_from, valid_to, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        rc.tenantId, rc.propertyId, rc.roomType, rc.season, rc.ratePerNight,
        rc.currency, rc.minNights, rc.validFrom, rc.validTo, rc.notes
      )
    }

    // Step 5: Create 3 sample leads/inquiries for CRM
    const leads = [
      {
        tenantId: demoTenantId,
        propertyId: property1Id,
        name: 'Sarah Johnson',
        email: 'sarah.demo@example.com',
        propertyName: 'Riverside Suite',
        roomCount: '2',
        currentSystem: 'Manual / Spreadsheets',
        phone: '+27 82 555 1234',
        notes: 'DEMO LEAD - Interested in weekend getaway package',
        guestName: 'Sarah Johnson',
        guestEmail: 'sarah.demo@example.com',
        guestPhone: '+27 82 555 1234',
        checkIn: '2026-12-20',
        checkOut: '2026-12-22',
        adults: 2,
        children: 0,
        pets: 0,
        specialRequests: 'DEMO - Anniversary celebration, would like champagne on arrival',
        rawInquiry: 'DEMO INQUIRY: Hi! My husband and I would like to book the Riverside Suite for our anniversary Dec 20-22. Can you send a quote?'
      },
      {
        tenantId: demoTenantId,
        propertyId: property2Id,
        name: 'Mark & Lisa Thompson',
        email: 'thompsons.demo@example.com',
        propertyName: 'Mountain View Cottage',
        roomCount: '3',
        currentSystem: 'NightsBridge',
        phone: '+27 83 555 5678',
        notes: 'DEMO LEAD - Family vacation, 2 adults + 3 kids',
        guestName: 'Mark Thompson',
        guestEmail: 'thompsons.demo@example.com',
        guestPhone: '+27 83 555 5678',
        checkIn: '2027-01-05',
        checkOut: '2027-01-09',
        adults: 2,
        children: 3,
        pets: 0,
        specialRequests: 'DEMO - Kids ages 8, 10, 12. Need extra bedding and kid-friendly breakfast options',
        rawInquiry: 'DEMO INQUIRY: Looking for a family cottage Jan 5-9, 2027. We have 3 kids. Do you have availability?'
      },
      {
        tenantId: demoTenantId,
        propertyId: property1Id,
        name: 'Jennifer Williams',
        email: 'jen.demo@example.com',
        propertyName: 'Riverside Suite',
        roomCount: '2',
        currentSystem: 'Booking.com only',
        phone: '+27 84 555 9012',
        notes: 'DEMO LEAD - Business traveler, needs fast WiFi',
        guestName: 'Jennifer Williams',
        guestEmail: 'jen.demo@example.com',
        guestPhone: '+27 84 555 9012',
        checkIn: '2027-02-10',
        checkOut: '2027-02-13',
        adults: 1,
        children: 0,
        pets: 0,
        specialRequests: 'DEMO - Remote work setup, need desk and reliable high-speed internet',
        rawInquiry: 'DEMO INQUIRY: I need a quiet place to work remotely Feb 10-13. Do you have good WiFi?'
      }
    ]

    const inquiryIds: number[] = []
    for (const lead of leads) {
      // Insert into waitlist (for CRM)
      db.prepare(`
        INSERT INTO waitlist (
          tenant_id, name, email, property_name, room_count, 
          current_system, phone, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        lead.tenantId, lead.name, lead.email, lead.propertyName, lead.roomCount,
        lead.currentSystem, lead.phone, lead.notes
      )

      // Insert into inquiries (for quote draft)
      const inquiryResult = db.prepare(`
        INSERT INTO inquiries (
          tenant_id, property_id, guest_name, guest_email, guest_phone,
          check_in, check_out, adults, children, pets, special_requests, raw_inquiry
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        lead.tenantId, lead.propertyId, lead.guestName, lead.guestEmail, lead.guestPhone,
        lead.checkIn, lead.checkOut, lead.adults, lead.children, lead.pets,
        lead.specialRequests, lead.rawInquiry
      )

      inquiryIds.push(Number(inquiryResult.lastInsertRowid))
    }

    // Step 6: Create sample bookings with Nightsbridge-style fields (for daily brief / ops demos + Phase 18 welcome drafts)
    // Include today and tomorrow for Phase 18 welcome drafts testing
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    const dayAfter = new Date(Date.now() + 172800000).toISOString().split('T')[0]
    const todayPlusThree = new Date(Date.now() + 259200000).toISOString().split('T')[0]
    
    const bookings = [
      // Today's arrival for Phase 18 testing
      {
        tenantId: demoTenantId,
        inquiryId: null,
        propertyId: property1Id,
        guestName: 'Emma Wilson',
        checkIn: today,
        checkOut: dayAfter,
        roomNumber: 'Suite 3',
        suiteOrUnit: 'Riverside Suite 3',
        adults: 2,
        children: 0,
        notes: 'DEMO - Arriving today',
        lateCheckIn: false,
        status: 'confirmed'
      },
      // Tomorrow's arrival for Phase 18 testing
      {
        tenantId: demoTenantId,
        inquiryId: null,
        propertyId: property2Id,
        guestName: 'David Chen',
        checkIn: tomorrow,
        checkOut: todayPlusThree,
        roomNumber: 'Cottage B',
        suiteOrUnit: 'Mountain View Cottage B',
        adults: 2,
        children: 0,
        notes: 'DEMO - Business traveler',
        lateCheckIn: false,
        status: 'confirmed'
      },
      // Booking without guest name (should be skipped in welcome drafts)
      {
        tenantId: demoTenantId,
        inquiryId: null,
        propertyId: property1Id,
        guestName: '',
        checkIn: tomorrow,
        checkOut: dayAfter,
        roomNumber: 'Suite 4',
        suiteOrUnit: 'Riverside Suite 4',
        adults: 0,
        children: 0,
        notes: 'DEMO - Missing guest name test',
        lateCheckIn: false,
        status: 'pending'
      },
      // Future bookings for other demos
      {
        tenantId: demoTenantId,
        inquiryId: inquiryIds[0],
        propertyId: property1Id,
        guestName: 'Sarah Johnson',
        checkIn: '2026-12-20',
        checkOut: '2026-12-22',
        roomNumber: 'Suite 1',
        suiteOrUnit: 'Riverside Suite 1',
        adults: 2,
        children: 0,
        notes: 'Anniversary celebration - champagne on arrival',
        lateCheckIn: false,
        status: 'confirmed'
      },
      {
        tenantId: demoTenantId,
        inquiryId: inquiryIds[1],
        propertyId: property2Id,
        guestName: 'Mark Thompson',
        checkIn: '2027-01-05',
        checkOut: '2027-01-09',
        roomNumber: 'Cottage A',
        suiteOrUnit: 'Mountain View Cottage A',
        adults: 2,
        children: 3,
        notes: 'Kids ages 8, 10, 12 - extra bedding requested',
        lateCheckIn: false,
        status: 'confirmed'
      },
      {
        tenantId: demoTenantId,
        inquiryId: inquiryIds[2],
        propertyId: property1Id,
        guestName: 'Jennifer Williams',
        checkIn: '2027-02-10',
        checkOut: '2027-02-13',
        roomNumber: 'Suite 2',
        suiteOrUnit: 'Riverside Suite 2',
        adults: 1,
        children: 0,
        notes: 'Remote work - needs desk and WiFi. Late arrival ~21:00',
        lateCheckIn: true,
        status: 'confirmed'
      }
    ]

    for (const booking of bookings) {
      db.prepare(`
        INSERT INTO bookings (
          tenant_id, inquiry_id, property_id, guest_name, 
          check_in, check_out, room_number, suite_or_unit,
          adults, children, notes, late_check_in, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        booking.tenantId, booking.inquiryId, booking.propertyId, booking.guestName,
        booking.checkIn, booking.checkOut, booking.roomNumber, booking.suiteOrUnit,
        booking.adults, booking.children, booking.notes, booking.lateCheckIn ? 1 : 0, booking.status
      )
    }

    // Step 7: Return summary
    return NextResponse.json({
      success: true,
      message: 'Demo seed complete',
      summary: {
        tenant: 'Dullstroom Demo Guesthouse',
        tenantId: demoTenantId,
        properties: 2,
        rateCards: rateCards.length,
        leads: leads.length,
        inquiries: leads.length,
        bookings: bookings.length
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Error seeding demo data:', error)
    return NextResponse.json(
      { error: 'Failed to seed demo data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

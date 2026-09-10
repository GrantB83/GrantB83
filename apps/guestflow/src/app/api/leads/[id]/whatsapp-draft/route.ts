import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

const NIGHTSBRIDGE_BOOK_URL = 'https://book.nightsbridge.com/24299?promocode=WEBDIRECT'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = parseInt(params.id)

    const db = getDb()
    const lead = db.prepare(`
      SELECT w.*, t.name as tenant_name
      FROM waitlist w
      LEFT JOIN tenants t ON w.tenant_id = t.id
      WHERE w.id = ?
    `).get(leadId) as any

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Generate human-gated WhatsApp draft
    // RULE: Name + dates (if available) + booking link ONLY
    // NO rates, NO inventory, NO promises - just connection and link
    
    const draft = generateWhatsappDraft(lead)

    return NextResponse.json({ draft })
  } catch (error) {
    console.error('WhatsApp draft generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate WhatsApp draft' },
      { status: 500 }
    )
  }
}

function generateWhatsappDraft(lead: any): string {
  const lines: string[] = []
  
  // Greeting with name
  lines.push(`Hi ${lead.name.split(' ')[0]},`)
  lines.push('')
  lines.push('Thank you for your inquiry about The Browns Dullstroom.')
  lines.push('')
  
  // Dates if available
  if (lead.check_in || lead.check_out) {
    const checkIn = lead.check_in ? new Date(lead.check_in).toLocaleDateString('en-ZA', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    }) : '[DATE]'
    const checkOut = lead.check_out ? new Date(lead.check_out).toLocaleDateString('en-ZA', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    }) : '[DATE]'
    
    lines.push(`📅 Dates: ${checkIn} - ${checkOut}`)
    lines.push('')
  }
  
  // Booking link
  lines.push('You can check availability and book directly here:')
  lines.push(NIGHTSBRIDGE_BOOK_URL)
  lines.push('')
  
  // Close
  lines.push('Please let me know if you have any questions!')
  lines.push('')
  lines.push('Best regards,')
  lines.push('The Browns Team')
  
  return lines.join('\n')
}

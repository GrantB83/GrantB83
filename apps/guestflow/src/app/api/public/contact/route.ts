import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Simple in-memory rate limiting (per IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour
const MAX_REQUESTS_PER_WINDOW = 5

function getRateLimitKey(req: NextRequest): string {
  // Try to get real IP from various headers (Vercel, Cloudflare, etc.)
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  return forwarded?.split(',')[0].trim() || realIp || 'unknown'
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 }
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0 }
  }

  record.count++
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - record.count }
}

// Simple email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// CORS headers
function getCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigins = [
    'https://www.thebrowns.co.za',
    'https://thebrowns.co.za',
    'http://localhost:3000',
    'http://localhost:3100',
  ]

  const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0]

  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req.headers.get('origin')),
  })
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  try {
    // Rate limiting
    const clientKey = getRateLimitKey(req)
    const { allowed, remaining } = checkRateLimit(clientKey)

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            ...corsHeaders,
            'X-RateLimit-Remaining': '0',
            'Retry-After': '3600',
          }
        }
      )
    }

    // Parse request body
    const body = await req.json()
    const { name, email, phone, subject, message, company } = body

    // Honeypot check - if company field is filled, it's likely a bot
    if (company && company.trim() !== '') {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Check if mail is configured
    const mailConfigured = 
      process.env.RESEND_API_KEY || 
      (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)

    if (!mailConfigured) {
      console.error('Contact form submission received but email is not configured')
      return NextResponse.json(
        { error: 'Email service is not configured. Please try again later.' },
        { status: 503, headers: corsHeaders }
      )
    }

    // Send notification email
    const emailSent = await sendContactNotification({
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() || '',
      subject: subject?.trim() || '',
      message: message.trim(),
    })

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send email. Please try again later.' },
        { status: 503, headers: corsHeaders }
      )
    }

    // Store lead in database for staff follow-up
    try {
      await storeContactLead({
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim() || '',
        subject: subject?.trim() || '',
        message: message.trim(),
      })
    } catch (dbError) {
      // Log but don't fail if database storage fails
      console.error('Failed to store contact lead:', dbError)
    }

    // Success response
    return NextResponse.json(
      { 
        success: true, 
        message: 'Thank you for your inquiry. We will be in touch soon.' 
      },
      { 
        status: 200,
        headers: {
          ...corsHeaders,
          'X-RateLimit-Remaining': remaining.toString(),
        }
      }
    )

  } catch (error: any) {
    console.error('Contact API error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500, headers: corsHeaders }
    )
  }
}

async function sendContactNotification(data: {
  name: string
  email: string
  phone: string
  subject: string
  message: string
}): Promise<boolean> {
  const recipient = process.env.CONTACT_RECIPIENT_EMAIL || 'stay@thebrowns.co.za'

  // Build email subject line
  // If subject provided, use it; otherwise default to generic inquiry subject
  const emailSubject = data.subject 
    ? `Contact: ${data.subject}` 
    : `New Contact Inquiry from ${data.name}`

  // Try Resend first (if configured)
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'noreply@guestflow.thebrowns.co.za',
          to: recipient,
          subject: emailSubject,
          html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${data.name}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            ${data.phone ? `<p><strong>Phone:</strong> ${data.phone}</p>` : ''}
            ${data.subject ? `<p><strong>Subject:</strong> ${data.subject}</p>` : ''}
            <p><strong>Message:</strong></p>
            <p>${data.message.replace(/\n/g, '<br>')}</p>
          `,
        }),
      })

      if (response.ok) {
        console.log('Contact notification sent via Resend')
        return true
      }

      console.error('Resend API error:', await response.text())
    } catch (error) {
      console.error('Failed to send via Resend:', error)
    }
  }

  // Fallback to SMTP (if configured)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    // Note: For production, use nodemailer or similar
    // This is a placeholder for SMTP implementation
    console.log('SMTP configuration detected but not yet implemented')
    console.log('Contact form data:', data)
    
    // TODO: Implement SMTP sending with nodemailer
    // For now, log the data and return false to indicate service unavailable
    return false
  }

  return false
}

async function storeContactLead(data: {
  name: string
  email: string
  phone: string
  subject: string
  message: string
}): Promise<void> {
  const db = getDb()
  
  // Get default tenant (Browns)
  const tenant = db.prepare('SELECT id FROM tenants WHERE name LIKE ? LIMIT 1').get('%Browns%') as { id: number } | undefined
  const tenantId = tenant?.id || 1

  // Store in waitlist table as a new lead
  const stmt = db.prepare(`
    INSERT INTO waitlist (
      tenant_id, name, email, phone, property_name, room_count, 
      current_system, subject, message, notes, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `)

  stmt.run(
    tenantId,
    data.name,
    data.email,
    data.phone || null,
    'Contact Form Inquiry', // Default property name for web inquiries
    '1', // Default room count
    'web-contact-form',
    data.subject || null,
    data.message,
    `Web contact form submission\n${data.subject ? `Subject: ${data.subject}\n` : ''}Message: ${data.message}`,
    'new'
  )
}

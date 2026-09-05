import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    const staffPassword = process.env.STAFF_PASSWORD
    const isProduction = process.env.NODE_ENV === 'production'

    if (!staffPassword) {
      // Development mode - allow any password
      if (!isProduction) {
        const response = NextResponse.json({ success: true })
        response.cookies.set('staff_auth', 'dev', {
          httpOnly: true,
          secure: isProduction,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        })
        return response
      }
      
      return NextResponse.json(
        { error: 'Staff password not configured' },
        { status: 500 }
      )
    }

    // Verify password
    if (password === staffPassword) {
      const authToken = Buffer.from(staffPassword).toString('base64')
      
      const response = NextResponse.json({ success: true })
      response.cookies.set('staff_auth', authToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
      
      return response
    }

    return NextResponse.json(
      { error: 'Invalid password' },
      { status: 401 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

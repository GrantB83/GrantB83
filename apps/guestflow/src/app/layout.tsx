import type { Metadata } from 'next'
import { Montserrat, Playfair_Display } from 'next/font/google'
import { headers } from 'next/headers'
import './globals.css'
import Navigation from '@/components/Navigation'
import { StaffChrome } from '@/components/StaffChrome'
import { TenantProvider } from '@/components/TenantContext'

const montserrat = Montserrat({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
})

const playfairDisplay = Playfair_Display({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-serif',
})

export const metadata: Metadata = {
  title: 'GuestFlow - Guesthouse Operations Platform',
  description: 'Streamline your guesthouse operations with AI-powered automation',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // SSR-safe: read route flags and pathname from headers
  const headersList = headers()
  const isGuestRoute = headersList.get('x-is-guest-route') === 'true'
  const pathname = headersList.get('x-pathname') || headersList.get('x-invoke-path') || ''
  
  // Hide staff chrome on guest routes AND on unauthenticated staff-login
  const isStaffLogin = pathname === '/staff-login'
  const showStaffChrome = !isGuestRoute && !isStaffLogin

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
      </head>
      <body className={`${montserrat.variable} ${playfairDisplay.variable} font-sans`}>
        <TenantProvider>
          {showStaffChrome && (
            <StaffChrome>
              <Navigation />
            </StaffChrome>
          )}
          <main className={showStaffChrome ? 'staff-main' : 'min-h-screen'}>
            {children}
          </main>
        </TenantProvider>
      </body>
    </html>
  )
}

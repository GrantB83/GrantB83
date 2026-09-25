import type { Metadata } from 'next'
import { Montserrat, Playfair_Display } from 'next/font/google'
import { headers } from 'next/headers'
import './globals.css'
import Navigation from '@/components/Navigation'
import { TenantProvider } from '@/components/TenantContext'
import { OutboundRedirectBanner } from '@/components/outbound-redirect-banner'

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
            <>
              <OutboundRedirectBanner />
              <Navigation />
            </>
          )}
          <main className="min-h-screen">
            {children}
          </main>
        </TenantProvider>
      </body>
    </html>
  )
}

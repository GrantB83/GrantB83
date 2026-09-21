import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers'
import './globals.css'
import Navigation from '@/components/Navigation'
import { TenantProvider } from '@/components/TenantContext'
import { OutboundRedirectBanner } from '@/components/outbound-redirect-banner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GuestFlow - Guesthouse Operations Platform',
  description: 'Streamline your guesthouse operations with AI-powered automation',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // SSR-safe: read guest route flag from middleware header
  const headersList = headers()
  const isGuestRoute = headersList.get('x-is-guest-route') === 'true'

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body className={inter.className}>
        <TenantProvider>
          {!isGuestRoute && (
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

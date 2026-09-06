import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'
import { TenantProvider } from '@/components/TenantContext'

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
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body className={inter.className}>
        <TenantProvider>
          <Navigation />
          <main className="min-h-screen">
            {children}
          </main>
        </TenantProvider>
      </body>
    </html>
  )
}

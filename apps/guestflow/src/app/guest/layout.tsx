import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Your Stay Details - The Browns',
  description: 'Access your stay information, WiFi details, and check-in instructions',
}

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

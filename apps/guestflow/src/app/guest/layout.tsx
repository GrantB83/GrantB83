import type { Metadata } from 'next'

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

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Staff Access - GuestFlow',
  description: 'Staff authentication - Browns Dullstroom',
}

export default function UnauthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Minimal layout for unauthenticated routes (e.g., staff-login)
  // Root layout handles chrome suppression via pathname check
  // This layout provides no additional chrome
  return <>{children}</>
}

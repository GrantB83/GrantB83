'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, Home, LogOut, Menu, MessageSquare, MoreHorizontal, X, ArrowLeftRight } from 'lucide-react'
import { useState } from 'react'
import { OutboundRedirectToggle } from '@/components/OutboundRedirectToggle'

export default function Navigation() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isActive = (path: string) => pathname === path
  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2" onClick={closeMobileMenu}>
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="font-bold text-slate-800">B</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base text-white leading-tight">GuestFlow</span>
                <span className="text-xs text-slate-400 leading-tight hidden sm:block">Browns Dullstroom</span>
              </div>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <NavLink href="/" icon={<MessageSquare className="w-4 h-4" />} active={isActive('/')}>
              Inbox
            </NavLink>
            <NavLink href="/ops/arrivals-departures" icon={<ArrowLeftRight className="w-4 h-4" />} active={isActive('/ops/arrivals-departures')}>
              Arrivals & Departures
            </NavLink>
            <NavLink href="/ops/bookings" icon={<Calendar className="w-4 h-4" />} active={isActive('/ops/bookings')}>
              Bookings
            </NavLink>
            <NavLink href="/ops" icon={<MoreHorizontal className="w-4 h-4" />} active={pathname.startsWith('/ops') && pathname === '/ops'}>
              Ops
            </NavLink>
          </div>

          <div className="flex items-center space-x-2">
            <OutboundRedirectToggle />
            <button
              type="button"
              onClick={async () => {
                await fetch('/api/staff-auth/logout', { method: 'POST' })
                window.location.href = '/staff-login'
              }}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium text-slate-200 hover:bg-slate-700"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
            <div className="hidden sm:block px-3 py-1 bg-slate-700 text-slate-200 rounded text-xs font-medium">
              Internal Ops
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden inbox-tap p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden pb-4 pt-2">
            <div className="flex flex-col space-y-2">
              <MobileNavLink href="/" icon={<MessageSquare className="w-5 h-5" />} active={isActive('/')} onClick={closeMobileMenu}>
                Inbox
              </MobileNavLink>
              <MobileNavLink href="/ops/arrivals-departures" icon={<ArrowLeftRight className="w-5 h-5" />} active={isActive('/ops/arrivals-departures')} onClick={closeMobileMenu}>
                Arrivals & Departures
              </MobileNavLink>
              <MobileNavLink href="/ops/bookings" icon={<Calendar className="w-5 h-5" />} active={isActive('/ops/bookings')} onClick={closeMobileMenu}>
                Bookings
              </MobileNavLink>
              <MobileNavLink href="/ops" icon={<Home className="w-5 h-5" />} active={isActive('/ops')} onClick={closeMobileMenu}>
                Ops / More Tools
              </MobileNavLink>
              <div className="px-4 py-2">
                <OutboundRedirectToggle />
              </div>
              <button
                type="button"
                onClick={async () => {
                  closeMobileMenu()
                  await fetch('/api/staff-auth/logout', { method: 'POST' })
                  window.location.href = '/staff-login'
                }}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium text-slate-300 hover:text-white hover:bg-slate-700"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

function NavLink({
  href,
  icon,
  active,
  children,
}: {
  href: string
  icon: React.ReactNode
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition ${
        active ? 'text-white bg-slate-700' : 'text-slate-300 hover:text-white hover:bg-slate-700'
      }`}
    >
      {icon}
      <span>{children}</span>
    </Link>
  )
}

function MobileNavLink({
  href,
  icon,
  active,
  children,
  onClick,
}: {
  href: string
  icon: React.ReactNode
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium transition ${
        active ? 'text-white bg-slate-700' : 'text-slate-300 hover:text-white hover:bg-slate-700'
      }`}
    >
      {icon}
      <span>{children}</span>
    </Link>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CheckCircle, AlertTriangle, Calendar, MessageSquare, Menu, X } from 'lucide-react'
import { useState } from 'react'

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

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <NavLink href="/" icon={<Home className="w-4 h-4" />} active={isActive('/')}>
              Today
            </NavLink>
            <NavLink href="/needs-approval" icon={<CheckCircle className="w-4 h-4" />} active={isActive('/needs-approval')} badge={0}>
              Needs approval
            </NavLink>
            <NavLink href="/exceptions" icon={<AlertTriangle className="w-4 h-4" />} active={isActive('/exceptions')} badge={0}>
              Exceptions
            </NavLink>
            <NavLink href="/ops/bookings" icon={<Calendar className="w-4 h-4" />} active={isActive('/ops/bookings')}>
              Live bookings
            </NavLink>
            <NavLink href="/comms" icon={<MessageSquare className="w-4 h-4" />} active={isActive('/comms')}>
              Comms
            </NavLink>
          </div>

          <div className="flex items-center space-x-2">
            <div className="hidden sm:block px-3 py-1 bg-slate-700 text-slate-200 rounded text-xs font-medium">
              Internal Ops
            </div>
            
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 pt-2">
            <div className="flex flex-col space-y-2">
              <MobileNavLink 
                href="/" 
                icon={<Home className="w-5 h-5" />} 
                active={isActive('/')}
                onClick={closeMobileMenu}
              >
                Today
              </MobileNavLink>
              <MobileNavLink 
                href="/needs-approval" 
                icon={<CheckCircle className="w-5 h-5" />} 
                active={isActive('/needs-approval')}
                onClick={closeMobileMenu}
                badge={0}
              >
                Needs approval
              </MobileNavLink>
              <MobileNavLink 
                href="/exceptions" 
                icon={<AlertTriangle className="w-5 h-5" />} 
                active={isActive('/exceptions')}
                onClick={closeMobileMenu}
                badge={0}
              >
                Exceptions
              </MobileNavLink>
              <MobileNavLink 
                href="/ops/bookings" 
                icon={<Calendar className="w-5 h-5" />} 
                active={isActive('/ops/bookings')}
                onClick={closeMobileMenu}
              >
                Live bookings
              </MobileNavLink>
              <MobileNavLink 
                href="/comms" 
                icon={<MessageSquare className="w-5 h-5" />} 
                active={isActive('/comms')}
                onClick={closeMobileMenu}
              >
                Comms
              </MobileNavLink>
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
  badge
}: { 
  href: string
  icon: React.ReactNode
  active: boolean
  children: React.ReactNode
  badge?: number
}) {
  return (
    <Link
      href={href}
      className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition relative ${
        active
          ? 'text-white bg-slate-700'
          : 'text-slate-300 hover:text-white hover:bg-slate-700'
      }`}
    >
      {icon}
      <span>{children}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {badge}
        </span>
      )}
    </Link>
  )
}

function MobileNavLink({ 
  href, 
  icon, 
  active, 
  children,
  onClick,
  badge
}: { 
  href: string
  icon: React.ReactNode
  active: boolean
  children: React.ReactNode
  onClick: () => void
  badge?: number
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium transition relative ${
        active
          ? 'text-white bg-slate-700'
          : 'text-slate-300 hover:text-white hover:bg-slate-700'
      }`}
    >
      {icon}
      <span>{children}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
          {badge}
        </span>
      )}
    </Link>
  )
}

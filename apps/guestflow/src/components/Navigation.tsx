'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, FileText, Calendar, BarChart3 } from 'lucide-react'

export default function Navigation() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">G</span>
              </div>
              <span className="font-bold text-xl text-gray-900">GuestFlow</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <NavLink href="/" icon={<Home className="w-4 h-4" />} active={isActive('/')}>
              Home
            </NavLink>
            <NavLink href="/demo" icon={<Calendar className="w-4 h-4" />} active={isActive('/demo')}>
              Demo
            </NavLink>
            <NavLink href="/pricing" icon={<BarChart3 className="w-4 h-4" />} active={isActive('/pricing')}>
              Pricing
            </NavLink>
            <NavLink href="/waitlist" icon={<Users className="w-4 h-4" />} active={isActive('/waitlist')}>
              Waitlist
            </NavLink>
            <NavLink href="/crm" icon={<FileText className="w-4 h-4" />} active={isActive('/crm')}>
              CRM
            </NavLink>
          </div>

          <div className="flex items-center">
            <Link
              href="/demo"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition"
            >
              Try Demo
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

function NavLink({ 
  href, 
  icon, 
  active, 
  children 
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
        active
          ? 'text-primary-600 bg-primary-50'
          : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
      }`}
    >
      {icon}
      <span>{children}</span>
    </Link>
  )
}

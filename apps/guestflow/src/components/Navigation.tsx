'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, FileText } from 'lucide-react'

export default function Navigation() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="font-bold text-slate-800">B</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base text-white leading-tight">Browns Ops</span>
                <span className="text-xs text-slate-400 leading-tight">Internal Console</span>
              </div>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            <NavLink href="/" icon={<Home className="w-4 h-4" />} active={isActive('/')}>
              Ops Hub
            </NavLink>
            <NavLink href="/ops" icon={<Calendar className="w-4 h-4" />} active={pathname.startsWith('/ops')}>
              Tools
            </NavLink>
            <NavLink href="/ops/rate-cards" icon={<FileText className="w-4 h-4" />} active={isActive('/ops/rate-cards')}>
              Rate Cards
            </NavLink>
          </div>

          <div className="flex items-center">
            <div className="px-3 py-1 bg-slate-700 text-slate-200 rounded text-xs font-medium">
              Dullstroom Internal
            </div>
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
          ? 'text-white bg-slate-700'
          : 'text-slate-300 hover:text-white hover:bg-slate-700'
      }`}
    >
      {icon}
      <span>{children}</span>
    </Link>
  )
}

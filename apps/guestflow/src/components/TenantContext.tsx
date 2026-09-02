'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface Tenant {
  id: number
  name: string
  location: string
  timezone: string
}

interface TenantContextType {
  selectedTenantId: number | null
  setSelectedTenantId: (id: number) => void
  tenants: Tenant[]
  isLoading: boolean
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export function TenantProvider({ children }: { children: ReactNode }) {
  const [selectedTenantId, setSelectedTenantIdState] = useState<number | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const response = await fetch('/api/tenants')
        if (response.ok) {
          const data = await response.json()
          setTenants(data.tenants)
          
          // Try to load from localStorage first
          const storedTenantId = localStorage.getItem('guestflow_demo_tenant_id')
          if (storedTenantId) {
            setSelectedTenantIdState(parseInt(storedTenantId, 10))
          } else {
            setSelectedTenantIdState(data.defaultTenantId)
          }
        }
      } catch (error) {
        console.error('Error fetching tenants:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchTenants()
  }, [])

  const setSelectedTenantId = (id: number) => {
    setSelectedTenantIdState(id)
    localStorage.setItem('guestflow_demo_tenant_id', id.toString())
  }

  return (
    <TenantContext.Provider value={{ selectedTenantId, setSelectedTenantId, tenants, isLoading }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}

'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { Home, MapPin, Wifi, Clock, Phone, Mail, FileText, CheckCircle, Key, Car, ExternalLink } from 'lucide-react'

interface Booking {
  id: number
  guestName: string
  checkInDate: string
  checkOutDate: string
  suiteOrUnit: string
  propertyName: string
  adults: number
  children: number
  notes: string
  guestPhone: string
  guestEmail?: string
}

interface PortalData {
  booking: Booking
  property: {
    name: string
    displayName: string
    location: string
    address?: string
    mapsUrl?: string
    contact: {
      phone: string
      email: string
      whatsapp: string
    }
  }
  stayPacket: {
    wifi: {
      network: string
      password: string
    }
    accessCodes: {
      available: boolean
      gateCode: string
      doorCode: string
      lockboxCode: string
      message: string
    }
    checkIn: {
      from: string
      to: string
    }
    checkOut: {
      by: string
    }
    parking: {
      instructions: string
    }
    directions: string
    houseRules: string[]
    emergencyContact: string
  }
  nextStay: {
    enabled: boolean
    title: string
    url: string
    message: string
  } | null
}

export default function GuestPortalPage() {
  const params = useParams()
  const token = params?.code as string
  
  const [portalData, setPortalData] = useState<PortalData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [selfPhone, setSelfPhone] = useState('')
  const [selfEmail, setSelfEmail] = useState('')
  const [selfNote, setSelfNote] = useState('')
  const [selfBusy, setSelfBusy] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Invalid access link')
      setLoading(false)
      return
    }

    loadPortalData()
  }, [token])

  const loadPortalData = async () => {
    try {
      const res = await fetch(`/api/guest-portal/${token}`)
      const data = await res.json()

      if (res.ok) {
        setPortalData(data)
        setSelfPhone(data.booking?.guestPhone || '')
        setSelfEmail(data.booking?.guestEmail || '')
      } else {
        setError(data.error || 'Unable to access stay information')
      }
    } catch (err: any) {
      setError('Unable to load stay details. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 shadow-lg">
            <img src="/logos/thebrowns-logo-live.svg" alt="The Browns" className="h-12 w-auto" />
          </div>
          <p className="text-foreground font-medium">Loading your stay details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    // Determine if the error is expired vs invalid based on API response
    const isExpired = error.toLowerCase().includes('expired')
    const isRevoked = error.toLowerCase().includes('revoked')
    
    // Distinct copy for expired vs invalid/revoked
    const subtitle = isExpired 
      ? 'This stay link has expired.'
      : 'This stay link is not valid.'
    
    const badgeLabel = isExpired 
      ? 'Expired access link'
      : 'Invalid access link'
    
    const helpText = isExpired
      ? 'Your access link has expired for security. Please email us for a new link.'
      : isRevoked
        ? 'This link has been deactivated. Please email us if you need access.'
        : 'This link could not be found. Please check your link or email us for assistance.'

    return (
      <div className="min-h-screen bg-muted flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center mb-4">
              <img src="/logos/thebrowns-logo-live.svg" alt="The Browns" className="h-16 w-auto" />
            </div>
            <h1 className="text-3xl font-serif text-foreground mb-2">
              Unable to Access
            </h1>
            <p className="text-sm text-muted-foreground">
              {subtitle}
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-red-900 mb-2">{badgeLabel}</p>
            <p className="text-sm text-red-800">{helpText}</p>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-2">Need help? Contact us at</p>
            <a href="mailto:stay@thebrowns.co.za" className="text-primary hover:text-primary-700 font-medium">
              stay@thebrowns.co.za
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (!portalData) return null

  const { booking, property, stayPacket } = portalData

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-primary text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-3">
            <img src="/logos/thebrowns-logo-live.svg" alt="The Browns" className="h-12 w-auto" />
          </div>
          <h1 className="text-3xl font-serif text-white mb-2">Your Stay</h1>
          <p className="text-white/90">{property.displayName} · {property.location}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Booking Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="bg-primary border-b border-primary-700 px-6 py-4">
            <h2 className="text-xl font-bold text-white">Your Stay</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-4">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <p className="text-sm text-gray-600 mb-1">Guest Name</p>
                <p className="font-semibold text-gray-900">{booking.guestName}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-start gap-4">
                <Clock className="w-5 h-5 text-primary-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-gray-600 mb-1">Check-in</p>
                  <p className="font-semibold text-gray-900">
                    {booking.checkInDate ? format(parseISO(booking.checkInDate), 'EEEE, d MMMM yyyy') : '[MISSING DATE]'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {stayPacket.checkIn.to ? `Between ${stayPacket.checkIn.from} - ${stayPacket.checkIn.to}` : `From ${stayPacket.checkIn.from}`}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Clock className="w-5 h-5 text-primary-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-gray-600 mb-1">Check-out</p>
                  <p className="font-semibold text-gray-900">
                    {booking.checkOutDate ? format(parseISO(booking.checkOutDate), 'EEEE, d MMMM yyyy') : '[MISSING DATE]'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    By {stayPacket.checkOut.by}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4 pt-4 border-t border-gray-200">
              <Home className="w-5 h-5 text-primary-600 flex-shrink-0 mt-1" />
              <div>
                <p className="text-sm text-gray-600 mb-1">Accommodation</p>
                <p className="font-semibold text-gray-900">
                  {booking.suiteOrUnit || '[SUITE NOT ASSIGNED]'}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {booking.adults || 0} Adult{booking.adults !== 1 ? 's' : ''}
                  {booking.children > 0 && ` · ${booking.children} Child${booking.children !== 1 ? 'ren' : ''}`}
                </p>
              </div>
            </div>

            {booking.notes && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Special Requests</p>
                <p className="text-gray-900">{booking.notes}</p>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200 space-y-3">
              <p className="text-sm font-medium text-gray-900">Confirm your contact details</p>
              <p className="text-xs text-gray-500">
                Used only for this stay. Nothing is sent when you save.
              </p>
              <input
                value={selfPhone}
                onChange={(event) => setSelfPhone(event.target.value)}
                placeholder="Mobile number"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={selfEmail}
                onChange={(event) => setSelfEmail(event.target.value)}
                placeholder="Email"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <button
                disabled={selfBusy}
                onClick={async () => {
                  setSelfBusy(true)
                  setSelfNote('')
                  try {
                    const res = await fetch(`/api/guest-portal/${token}/contacts`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ phone: selfPhone, email: selfEmail }),
                    })
                    const data = await res.json()
                    setSelfNote(res.ok ? 'Saved. Thank you.' : data.error || 'Could not save')
                  } finally {
                    setSelfBusy(false)
                  }
                }}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-50 hover:bg-primary-700"
              >
                Save my contacts
              </button>
              {selfNote && <p className="text-sm text-gray-700">{selfNote}</p>}
            </div>
          </div>
        </div>

        {/* Wi-Fi Information */}
        <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="bg-primary border-b border-primary-700 px-6 py-4">
            <div className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-white" />
              <h2 className="text-xl font-bold text-white">Wi-Fi Access</h2>
            </div>
          </div>
          <div className="p-6">
            {stayPacket.wifi.network && stayPacket.wifi.password ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Network Name</p>
                  <p className="font-mono font-semibold text-lg text-gray-900 bg-gray-50 px-4 py-2 rounded border border-gray-200">
                    {stayPacket.wifi.network}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Password</p>
                  <p className="font-mono font-semibold text-lg text-gray-900 bg-gray-50 px-4 py-2 rounded border border-gray-200">
                    {stayPacket.wifi.password}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-amber-900 font-medium">Wi-Fi details pending</p>
                <p className="text-sm text-amber-700 mt-1">
                  Please contact reception for Wi-Fi access
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Access Codes (Time-gated) */}
        <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="bg-primary border-b border-primary-700 px-6 py-4">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-white" />
              <h2 className="text-xl font-bold text-white">Access Codes</h2>
            </div>
          </div>
          <div className="p-6">
            {stayPacket.accessCodes.available ? (
              stayPacket.accessCodes.gateCode || stayPacket.accessCodes.doorCode || stayPacket.accessCodes.lockboxCode ? (
                <div className="space-y-3">
                  {stayPacket.accessCodes.gateCode && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Gate Code</p>
                      <p className="font-mono font-semibold text-2xl text-gray-900 bg-gray-50 px-4 py-3 rounded border border-gray-200 text-center">
                        {stayPacket.accessCodes.gateCode}
                      </p>
                    </div>
                  )}
                  {stayPacket.accessCodes.lockboxCode && 
                   stayPacket.accessCodes.lockboxCode !== '[ASK STAFF]' && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Suite Lockbox Code</p>
                      <p className="font-mono font-semibold text-2xl text-gray-900 bg-gray-50 px-4 py-3 rounded border border-gray-200 text-center">
                        {stayPacket.accessCodes.lockboxCode}
                      </p>
                    </div>
                  )}
                  {stayPacket.accessCodes.doorCode && 
                   stayPacket.accessCodes.doorCode !== '[ASK STAFF]' && 
                   (!stayPacket.accessCodes.lockboxCode || 
                    stayPacket.accessCodes.lockboxCode === '[ASK STAFF]') && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Door Code</p>
                      <p className="font-mono font-semibold text-2xl text-gray-900 bg-gray-50 px-4 py-3 rounded border border-gray-200 text-center">
                        {stayPacket.accessCodes.doorCode}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-amber-900 font-medium">Access codes pending</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Please contact reception for access details
                  </p>
                </div>
              )
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-900 font-medium">
                  {stayPacket.accessCodes.message}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Parking */}
        <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="bg-primary border-b border-primary-700 px-6 py-4">
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 text-white" />
              <h2 className="text-xl font-bold text-white">Parking</h2>
            </div>
          </div>
          <div className="p-6">
            <p className="text-gray-900">{stayPacket.parking.instructions}</p>
          </div>
        </div>

        {/* House Rules */}
        <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="bg-primary border-b border-primary-700 px-6 py-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-white" />
              <h2 className="text-xl font-bold text-white">House Rules</h2>
            </div>
          </div>
          <div className="p-6">
            {stayPacket.houseRules && stayPacket.houseRules.length > 0 ? (
              <ul className="space-y-2">
                {stayPacket.houseRules.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-900">{rule}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">[HOUSE RULES PENDING]</p>
            )}
          </div>
        </div>

        {/* Property Address & Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="bg-primary border-b border-primary-700 px-6 py-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-white" />
              <h2 className="text-xl font-bold text-white">Property Address</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {property.address && (
              <div>
                <p className="text-lg font-semibold text-gray-900 mb-2">
                  {property.address}
                </p>
              </div>
            )}
            
            {property.mapsUrl && (
              <div>
                <a
                  href={property.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-700 transition"
                >
                  <MapPin className="w-5 h-5" />
                  Open in Google Maps
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}

            {stayPacket.directions && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2 font-medium">Getting Here</p>
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-900 whitespace-pre-line">{stayPacket.directions}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="bg-primary border-b border-primary-700 px-6 py-4">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-white" />
              <h2 className="text-xl font-bold text-white">Contact Us</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {/* WhatsApp Contact (From: +27600200825 - display only) */}
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">WhatsApp</p>
                <a 
                  href="https://wa.me/27600200825" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary hover:text-primary-700"
                >
                  +27 600 200 825
                </a>
              </div>
            </div>

            {/* Phone Contact (if available) */}
            {property.contact.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <a href={`tel:${property.contact.phone}`} className="font-semibold text-primary hover:text-primary-700">
                    {property.contact.phone}
                  </a>
                </div>
              </div>
            )}

            {/* Email Contact (stay@thebrowns.co.za) */}
            {property.contact.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <a href={`mailto:${property.contact.email}`} className="font-semibold text-primary hover:text-primary-700">
                    {property.contact.email}
                  </a>
                </div>
              </div>
            )}

            {stayPacket.emergencyContact && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Emergency Contact (After Hours)</p>
                <p className="font-semibold text-gray-900">{stayPacket.emergencyContact}</p>
              </div>
            )}
          </div>
        </div>

        {/* WEBDIRECT CTA - Only shown post-checkout */}
        {portalData.nextStay && portalData.nextStay.enabled && (
          <div className="bg-secondary rounded-xl shadow-lg overflow-hidden border-2 border-secondary-600">
            <div className="p-8 text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {portalData.nextStay.title}
              </h2>
              <p className="text-foreground/80 mb-6">
                {portalData.nextStay.message}
              </p>
              <a
                href={portalData.nextStay.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-lg font-semibold hover:bg-primary-700 transition shadow-lg"
              >
                Book Your Next Stay
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-8 text-sm text-muted-foreground">
          <p>We look forward to welcoming you!</p>
          <p className="mt-2">
            <a href="https://thebrowns.co.za" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-700 font-medium">
              thebrowns.co.za
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { Home, MapPin, Wifi, Clock, Phone, Mail, FileText, CheckCircle } from 'lucide-react'

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
}

interface PortalData {
  booking: Booking
  property: {
    name: string
    displayName: string
    location: string
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
    checkIn: {
      from: string
      to: string
    }
    checkOut: {
      by: string
    }
    directions: string
    houseRules: string[]
    emergencyContact: string
  }
}

export default function GuestPortalPage() {
  const params = useParams()
  const code = params?.code as string
  
  const [lastName, setLastName] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [portalData, setPortalData] = useState<PortalData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAuth = async () => {
    if (!lastName.trim()) {
      setError('Please enter your last name')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/guest-portal/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastName: lastName.trim() })
      })

      const data = await res.json()

      if (res.ok) {
        setPortalData(data)
        setAuthenticated(true)
      } else {
        setError(data.error || 'Invalid booking reference or last name')
      }
    } catch (err: any) {
      setError('Unable to load booking. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
              <Home className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome to The Browns
            </h1>
            <p className="text-gray-600">
              Dullstroom Luxury Guest Suites
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Booking Reference
              </label>
              <input
                type="text"
                value={code}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                placeholder="Enter your last name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
                {error}
              </div>
            )}

            <button
              onClick={handleAuth}
              disabled={loading || !lastName.trim()}
              className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'View My Stay Details'}
            </button>
          </div>

          <div className="mt-6 text-center text-xs text-gray-500">
            <p>Need help? Contact us at</p>
            <a href="mailto:grant@thebrowns.co.za" className="text-primary-600 hover:text-primary-700 font-medium">
              grant@thebrowns.co.za
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (!portalData) return null

  const { booking, property, stayPacket } = portalData

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Home className="w-8 h-8" />
            <h1 className="text-3xl font-bold">{property.displayName}</h1>
          </div>
          <p className="text-primary-100">{property.location}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Booking Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-primary-50 border-b border-primary-100 px-6 py-4">
            <h2 className="text-xl font-bold text-gray-900">Your Stay</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-4">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <p className="text-sm text-gray-600 mb-1">Guest Name</p>
                <p className="font-semibold text-gray-900">{booking.guestName}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-4">
                <Clock className="w-5 h-5 text-primary-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-gray-600 mb-1">Check-in</p>
                  <p className="font-semibold text-gray-900">
                    {booking.checkInDate ? format(parseISO(booking.checkInDate), 'EEEE, d MMMM yyyy') : '[MISSING DATE]'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Between {stayPacket.checkIn.from} - {stayPacket.checkIn.to}
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
          </div>
        </div>

        {/* Wi-Fi Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-blue-50 border-b border-blue-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Wi-Fi Access</h2>
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
                <p className="text-amber-900 font-medium">[WIFI DETAILS PENDING]</p>
                <p className="text-sm text-amber-700 mt-1">
                  Wi-Fi instructions will be provided upon arrival
                </p>
              </div>
            )}
          </div>
        </div>

        {/* House Rules */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-green-50 border-b border-green-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">House Rules</h2>
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

        {/* Directions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-purple-50 border-b border-purple-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-900">Directions</h2>
            </div>
          </div>
          <div className="p-6">
            {stayPacket.directions ? (
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-900 whitespace-pre-line">{stayPacket.directions}</p>
              </div>
            ) : (
              <p className="text-gray-600">[DIRECTIONS PENDING]</p>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-orange-50 border-b border-orange-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-orange-600" />
              <h2 className="text-xl font-bold text-gray-900">Contact Us</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {property.contact.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <a href={`tel:${property.contact.phone}`} className="font-semibold text-primary-600 hover:text-primary-700">
                    {property.contact.phone}
                  </a>
                </div>
              </div>
            )}

            {property.contact.whatsapp && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">WhatsApp</p>
                  <a 
                    href={`https://wa.me/${property.contact.whatsapp.replace(/\D/g, '')}`} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary-600 hover:text-primary-700"
                  >
                    {property.contact.whatsapp}
                  </a>
                </div>
              </div>
            )}

            {property.contact.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <a href={`mailto:${property.contact.email}`} className="font-semibold text-primary-600 hover:text-primary-700">
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

        {/* Footer */}
        <div className="text-center py-8 text-sm text-gray-600">
          <p>We look forward to welcoming you!</p>
          <p className="mt-2">
            <a href="https://thebrowns.co.za" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 font-medium">
              thebrowns.co.za
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

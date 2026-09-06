'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { MessageSquare, Calendar, User, Phone, Mail, RefreshCw, Search } from 'lucide-react'

interface Message {
  id: number
  timestamp: string
  direction: 'inbound' | 'outbound'
  channel: 'whatsapp' | 'email' | 'system'
  content: string
  sender: string
  status: 'sent' | 'delivered' | 'read' | 'draft'
}

interface Reservation {
  id: number
  guestName: string
  checkIn: string
  checkOut: string
  property: string
  suite: string
  adults: number
  children: number
  phone: string | null
  email: string | null
  status: string
}

export default function CommsPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchData = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true)
      else setLoading(true)

      const response = await fetch('/api/comms?tenant_id=1')
      const data = await response.json()

      if (data.success) {
        setMessages(data.messages)
        if (data.messages.length > 0 && !selectedReservation) {
          // Auto-select first guest's reservation
          const firstGuest = data.messages[0].sender
          // Fetch reservation for first guest
          const resResponse = await fetch(`/api/comms/reservation?guest=${encodeURIComponent(firstGuest)}`)
          const resData = await resResponse.json()
          if (resData.success && resData.reservation) {
            setSelectedReservation(resData.reservation)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch comms:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const selectGuestReservation = async (guestName: string) => {
    try {
      const response = await fetch(`/api/comms/reservation?guest=${encodeURIComponent(guestName)}`)
      const data = await response.json()
      if (data.success && data.reservation) {
        setSelectedReservation(data.reservation)
      }
    } catch (error) {
      console.error('Failed to fetch reservation:', error)
    }
  }

  const filteredMessages = messages.filter(msg =>
    msg.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg.sender.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading && messages.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading communications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Timeline (Main Area) */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-blue-600" />
              Comms
            </h1>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search messages or guests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Messages Timeline */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {filteredMessages.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No messages found</p>
            </div>
          )}

          {filteredMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
              onClick={() => selectGuestReservation(msg.sender)}
            >
              <div
                className={`max-w-lg rounded-lg p-4 cursor-pointer ${
                  msg.direction === 'outbound'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium opacity-75">
                    {msg.sender}
                  </span>
                  <span className="text-xs opacity-60">
                    {format(parseISO(msg.timestamp), 'MMM d, h:mm a')}
                  </span>
                  {msg.channel === 'whatsapp' && <span className="text-xs opacity-75">📱</span>}
                  {msg.channel === 'email' && <span className="text-xs opacity-75">✉️</span>}
                </div>
                <div className="text-sm whitespace-pre-wrap">
                  {msg.content}
                </div>
                {msg.status === 'draft' && (
                  <div className="mt-2 text-xs opacity-75 font-medium">
                    DRAFT - Not sent
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky Reservation Panel */}
      <div className="w-80 bg-white border-l flex flex-col">
        {selectedReservation ? (
          <>
            <div className="p-4 border-b">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                {selectedReservation.guestName}
              </h2>
              <p className="text-sm text-gray-600">
                {selectedReservation.property} • {selectedReservation.suite}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Reservation Details */}
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">
                  Stay Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>Check-in: {format(parseISO(selectedReservation.checkIn), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>Check-out: {format(parseISO(selectedReservation.checkOut), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>{selectedReservation.adults} adults, {selectedReservation.children} children</span>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">
                  Contact
                </h3>
                <div className="space-y-2 text-sm">
                  {selectedReservation.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <a href={`tel:${selectedReservation.phone}`} className="text-blue-600 hover:underline">
                        {selectedReservation.phone}
                      </a>
                    </div>
                  )}
                  {selectedReservation.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <a href={`mailto:${selectedReservation.email}`} className="text-blue-600 hover:underline">
                        {selectedReservation.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">
                  Status
                </h3>
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  selectedReservation.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                  selectedReservation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedReservation.status}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4 border-t">
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 mb-2">
                Send Message
              </button>
              <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">
                View Full Booking
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4 text-center">
            <div>
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 text-sm">
                Select a message to view<br />reservation details
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

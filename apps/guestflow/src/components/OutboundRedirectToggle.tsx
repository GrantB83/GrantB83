'use client'

import { useEffect, useState } from 'react'

export function OutboundRedirectToggle() {
  const [on, setOn] = useState<boolean>(true)
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/staff/outbound-redirect')
      .then(async (response) => {
        if (!response.ok) return
        const data = (await response.json()) as { on?: boolean }
        if (!cancelled && typeof data.on === 'boolean') {
          setOn(data.on)
          setLoaded(true)
        }
      })
      .catch(() => {
        if (!cancelled) setOn(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function flip(next: boolean) {
    if (!next) {
      const confirmed = window.confirm(
        'Turn OFF outbound redirect?\n\nGuest WhatsApp, SMS, email, and WhatsApp Web sends will go to their real recipients.'
      )
      if (!confirmed) return
    }
    setBusy(true)
    try {
      const response = await fetch('/api/staff/outbound-redirect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ on: next }),
      })
      if (!response.ok) return
      const data = (await response.json()) as { on?: boolean }
      if (typeof data.on === 'boolean') {
        setOn(data.on)
        setLoaded(true)
      }
    } finally {
      setBusy(false)
    }
  }

  const label = on ? 'Redirect ON' : 'Redirect OFF'
  const title = on
    ? 'Outbound redirect is ON. Guest sends go to test sinks.'
    : 'Outbound redirect is OFF. Guest sends go to real recipients.'

  return (
    <button
      type="button"
      onClick={() => flip(!on)}
      disabled={busy}
      title={title}
      aria-pressed={on}
      aria-label={title}
      className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold ${
        on
          ? 'bg-amber-500 text-slate-900 hover:bg-amber-400'
          : 'bg-rose-600 text-white hover:bg-rose-500'
      } disabled:opacity-60`}
    >
      <span>{loaded ? label : 'Redirect ON'}</span>
    </button>
  )
}

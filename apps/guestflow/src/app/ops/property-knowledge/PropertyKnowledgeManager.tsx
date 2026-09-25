'use client'

import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Save } from 'lucide-react'

interface KnowledgeEntry {
  id: number
  property: string
  section: string
  key: string
  value: string
  source: string
}

export default function PropertyKnowledgeManager() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const load = async () => {
    const response = await fetch('/api/ops/property-knowledge')
    const data = await response.json()
    if (data.success) {
      setEntries(data.entries)
      const next: Record<string, string> = {}
      for (const entry of data.entries as KnowledgeEntry[]) {
        next[`${entry.property}:${entry.section}:${entry.key}`] = entry.value
      }
      setDrafts(next)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const grouped = useMemo(() => {
    const map = new Map<string, KnowledgeEntry[]>()
    for (const entry of entries) {
      const key = `${entry.property} / ${entry.section}`
      map.set(key, [...(map.get(key) || []), entry])
    }
    return [...map.entries()]
  }, [entries])

  const save = async (entry: KnowledgeEntry) => {
    setBusy(true)
    setMessage(null)
    try {
      const value = drafts[`${entry.property}:${entry.section}:${entry.key}`] ?? entry.value
      const response = await fetch('/api/ops/property-knowledge/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property: entry.property,
          section: entry.section,
          key: entry.key,
          value,
        }),
      })
      const data = await response.json()
      if (!data.success) {
        setMessage(data.error || 'Save failed')
        return
      }
      setMessage('Saved. Drafts will use this on the next LLM run. Approve&Send stays human.')
      await load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-4">
        <BookOpen className="w-7 h-7 text-slate-700" />
        <h1 className="text-3xl font-bold text-slate-900">Property knowledge</h1>
      </div>
      <p className="text-sm text-slate-600 mb-6">
        Staff-editable facts for LLM draft replies. Unknowns stay empty or &quot;ask staff&quot;.
        Drafts must not invent restaurants, amenities, or codes. Approve&amp;Send stays a human click.
      </p>
      {message && <p className="text-sm text-emerald-700 mb-4">{message}</p>}
      <div className="space-y-8">
        {grouped.map(([heading, rows]) => (
          <section key={heading} className="bg-white border rounded-xl p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">{heading}</h2>
            <div className="space-y-3">
              {rows.map((entry) => {
                const id = `${entry.property}:${entry.section}:${entry.key}`
                return (
                  <div key={id} className="grid md:grid-cols-[180px_1fr_auto] gap-2 items-start">
                    <div>
                      <div className="text-sm font-medium text-slate-800">{entry.key}</div>
                      <div className="text-[11px] text-slate-500 break-all">{entry.source}</div>
                    </div>
                    <textarea
                      value={drafts[id] ?? entry.value}
                      onChange={(event) =>
                        setDrafts((current) => ({ ...current, [id]: event.target.value }))
                      }
                      rows={2}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => save(entry)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm bg-slate-900 text-white rounded-lg disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

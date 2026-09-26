'use client'

import { CHIP_TONE_CLASS, type HeaderChip } from '@/lib/header-chips'

export function HeaderStatusChips({
  visible,
  overflow,
}: {
  visible: HeaderChip[]
  overflow: HeaderChip[]
}) {
  if (visible.length === 0 && overflow.length === 0) return null
  return (
    <div data-inbox-slot="header-badge" className="flex flex-wrap items-center gap-1 justify-end">
      {visible.map((chip) => (
        <span
          key={chip.id}
          aria-label={chip.label}
          className={`inline-flex items-center h-[22px] px-2 rounded-full text-[11px] font-medium ${CHIP_TONE_CLASS[chip.tone]}`}
        >
          {chip.label}
        </span>
      ))}
      {overflow.length > 0 && (
        <span
          className="inline-flex items-center h-[22px] px-2 rounded-full text-[11px] font-medium bg-[#EEF1F4] text-[#5B6B7C]"
          title={overflow.map((chip) => chip.label).join(', ')}
          aria-label={`More status: ${overflow.map((chip) => chip.label).join(', ')}`}
        >
          ···
        </span>
      )}
    </div>
  )
}

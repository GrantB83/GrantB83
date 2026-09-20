import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

describe('staff_ops remains copy-only', () => {
  it('Needs Approval still hides Send for staff_ops', () => {
    const src = readFileSync(
      path.join(__dirname, '../src/app/needs-approval/page.tsx'),
      'utf8'
    )
    expect(src).toContain("item.type === 'staff_ops' || Boolean(item.metadata?.copy_only)")
    expect(src).toContain('Copy-only — no WhatsApp Send')
    expect(src).toContain('Copy WhatsApp text')
    expect(src).toContain('Never auto-sent')
    expect(src).toMatch(/if \(!selectedItem \|\| isCopyOnlyItem\(selectedItem\)\) return/)
  })
})

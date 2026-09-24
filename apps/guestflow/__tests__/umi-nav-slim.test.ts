import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

describe('UMI nav slim', () => {
  it('drops Needs Approval from top nav and ops primary', () => {
    const nav = readFileSync(path.join(__dirname, '../src/components/Navigation.tsx'), 'utf8')
    const ops = readFileSync(path.join(__dirname, '../src/app/ops/page.tsx'), 'utf8')
    const home = readFileSync(path.join(__dirname, '../src/app/page.tsx'), 'utf8')
    expect(nav).toContain('Inbox')
    expect(nav).not.toContain('/needs-approval')
    expect(nav).not.toContain('Needs approval')
    expect(ops).not.toMatch(/href="\/needs-approval"/)
    expect(home).toContain('Needs attention')
    expect(home).toContain('Approve')
    expect(home).toContain('Link to booking')
  })

  it('keeps staff_ops copy-only on the leftover approvals page', () => {
    const src = readFileSync(path.join(__dirname, '../src/app/needs-approval/page.tsx'), 'utf8')
    expect(src).toContain("item.type === 'staff_ops' || Boolean(item.metadata?.copy_only)")
  })
})

import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

describe('staff login and users UI', () => {
  it('staff-login requires email and password', () => {
    const src = readFileSync(path.join(__dirname, '../src/app/staff-login/page.tsx'), 'utf8')
    expect(src).toContain('id="email"')
    expect(src).toContain('type="email"')
    expect(src).toContain('id="password"')
    expect(src).toContain('JSON.stringify({ email, password })')
    expect(src).not.toContain('id="username"')
    expect(src).not.toContain('Staff Password')
  })

  it('nav has logout and does not add Users to top nav', () => {
    const nav = readFileSync(path.join(__dirname, '../src/components/Navigation.tsx'), 'utf8')
    expect(nav).toContain('/api/staff-auth/logout')
    expect(nav).toContain('Logout')
    expect(nav).not.toContain('/ops/users')
  })

  it('Users lives under Ops only', () => {
    const ops = readFileSync(path.join(__dirname, '../src/app/ops/page.tsx'), 'utf8')
    expect(ops).toContain('href="/ops/users"')
    expect(ops).toContain('title="Users"')
    const page = readFileSync(path.join(__dirname, '../src/app/ops/users/page.tsx'), 'utf8')
    expect(page).toContain('Add user')
    expect(page).toContain('Remove')
    expect(page).toContain('window.confirm')
    expect(page).toContain('display_name')
    expect(page).not.toMatch(/\badmin\b|\bowner\b|RBAC/i)
    expect(page).not.toMatch(/role=/i)
  })

  it('schema has email unique index and no role or username column', () => {
    const schema = readFileSync(path.join(__dirname, '../src/lib/staff-users-schema.ts'), 'utf8')
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS staff_users')
    expect(schema).toContain('email TEXT NOT NULL')
    expect(schema).toContain('idx_staff_users_email')
    expect(schema).toContain('display_name')
    expect(schema).not.toMatch(/\brole\b|\bis_admin\b|\bis_owner\b/)
    expect(schema).not.toContain('username TEXT')
  })
})

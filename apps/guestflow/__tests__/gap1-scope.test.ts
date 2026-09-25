import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

const guestflowRoot = path.resolve(__dirname, '..')

function read(rel: string): string {
  return fs.readFileSync(path.join(guestflowRoot, rel), 'utf8')
}

function walkSrc(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkSrc(full, acc)
    else acc.push(full)
  }
  return acc
}

describe('Sprint 2 gap-point-1 scope guards', () => {
  it('db seed no longer invents Riverside / Mountain View / Coastal lodges', () => {
    const source = read('src/lib/db.ts')
    expect(source).not.toMatch(/Riverside Lodge/)
    expect(source).not.toMatch(/Mountain View Suites/)
    expect(source).not.toMatch(/Coastal Retreat/)
  })

  it('nothing in src references /api/today-stats', () => {
    const files = walkSrc(path.join(guestflowRoot, 'src'))
    const hits = files.filter((file) => {
      const text = fs.readFileSync(file, 'utf8')
      return text.includes('/api/today-stats') || text.includes('today-stats')
    })
    expect(hits).toEqual([])
  })

  it('this package does not restore or edit rate-cards routes', () => {
    const rateCard = path.join(guestflowRoot, 'src/app/api/rate-cards/route.ts')
    expect(fs.existsSync(rateCard)).toBe(true)
  })
})

import { describe, it, expect } from 'vitest'
import { applyFilters, cacheIsStale } from './index'
import type { DiscoveredJob } from './types'

function job(over: Partial<DiscoveredJob>): DiscoveredJob {
  return {
    id: Math.random().toString(36),
    company: 'Acme',
    title: 'Engineer',
    url: 'https://x/' + Math.random(),
    source: 'Test',
    ...over,
  }
}

describe('applyFilters', () => {
  const jobs: DiscoveredJob[] = [
    job({ title: 'Frontend Engineer', remote: true, postedAt: new Date().toISOString() }),
    job({ title: 'Backend Engineer', remote: false, postedAt: '2020-01-01T00:00:00Z' }),
    job({ title: 'Designer', company: 'Globex', remote: true }),
  ]

  it('filters by keyword across title/company/location', () => {
    expect(applyFilters(jobs, { keyword: 'frontend', remoteOnly: false, maxAgeDays: null })).toHaveLength(1)
    expect(applyFilters(jobs, { keyword: 'globex', remoteOnly: false, maxAgeDays: null })).toHaveLength(1)
  })

  it('filters remote-only', () => {
    expect(applyFilters(jobs, { keyword: '', remoteOnly: true, maxAgeDays: null })).toHaveLength(2)
  })

  it('filters by recency', () => {
    const recent = applyFilters(jobs, { keyword: '', remoteOnly: false, maxAgeDays: 30 })
    // The 2020 posting is excluded; the undated one is kept (no postedAt).
    expect(recent.some((j) => j.title === 'Backend Engineer')).toBe(false)
  })
})

describe('cacheIsStale', () => {
  it('treats a missing or old cache as stale', () => {
    expect(cacheIsStale(null)).toBe(true)
    expect(cacheIsStale({ fetchedAt: 0, jobs: [] })).toBe(true)
    expect(cacheIsStale({ fetchedAt: Date.now(), jobs: [] })).toBe(false)
  })
})

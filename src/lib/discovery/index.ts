import {
  fetchGreenhouseBoard,
  fetchLeverBoard,
  fetchRemotive,
  fetchHimalayas,
} from './adapters'
import type { DiscoveredJob, DiscoveryFilters } from './types'
import type { WatchlistEntry } from '../../types'

export type { DiscoveredJob, DiscoveryFilters } from './types'

const CACHE_KEY = 'jobmate.discovery.cache'
const TTL_MS = 12 * 60 * 60 * 1000 // 12h TTL (PRD §7)

interface CacheShape {
  fetchedAt: number
  jobs: DiscoveredJob[]
}

export function readCache(): CacheShape | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheShape
    return parsed
  } catch {
    return null
  }
}

export function cacheIsStale(cache: CacheShape | null): boolean {
  return !cache || Date.now() - cache.fetchedAt > TTL_MS
}

function writeCache(jobs: DiscoveredJob[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), jobs }))
  } catch {
    /* storage full — ignore */
  }
}

export interface FetchReport {
  jobs: DiscoveredJob[]
  errors: string[]
}

// Fetch watchlist boards + remote feeds sequentially (gentle rate limiting),
// dedupe by id, and cache. Serves cache unless stale or force-refreshed.
export async function fetchDiscovery(
  watchlist: WatchlistEntry[],
  opts: { includeFeeds: boolean; force?: boolean },
): Promise<FetchReport> {
  const cache = readCache()
  if (!opts.force && !cacheIsStale(cache) && cache) {
    return { jobs: cache.jobs, errors: [] }
  }

  const tasks: { label: string; run: () => Promise<DiscoveredJob[]> }[] = []
  for (const w of watchlist) {
    tasks.push({
      label: `${w.ats}:${w.token}`,
      run: () => (w.ats === 'greenhouse' ? fetchGreenhouseBoard(w) : fetchLeverBoard(w)),
    })
  }
  if (opts.includeFeeds) {
    tasks.push({ label: 'Remotive', run: fetchRemotive })
    tasks.push({ label: 'Himalayas', run: fetchHimalayas })
  }

  const all: DiscoveredJob[] = []
  const errors: string[] = []
  for (const task of tasks) {
    try {
      all.push(...(await task.run()))
    } catch (err) {
      errors.push(`${task.label}: ${err instanceof Error ? err.message : 'failed'}`)
    }
    await new Promise((r) => setTimeout(r, 250)) // ~throttle
  }

  const deduped = dedupe(all)
  writeCache(deduped)
  return { jobs: deduped, errors }
}

function dedupe(jobs: DiscoveredJob[]): DiscoveredJob[] {
  const seen = new Set<string>()
  const out: DiscoveredJob[] = []
  for (const j of jobs) {
    const key = j.id || `${j.company}|${j.title}`.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(j)
  }
  return out
}

export function applyFilters(jobs: DiscoveredJob[], f: DiscoveryFilters): DiscoveredJob[] {
  const kw = f.keyword.trim().toLowerCase()
  const cutoff = f.maxAgeDays != null ? Date.now() - f.maxAgeDays * 86_400_000 : null
  return jobs.filter((j) => {
    if (f.remoteOnly && !j.remote) return false
    if (kw && !`${j.title} ${j.company} ${j.location ?? ''}`.toLowerCase().includes(kw)) return false
    if (cutoff && j.postedAt && Date.parse(j.postedAt) < cutoff) return false
    return true
  })
}

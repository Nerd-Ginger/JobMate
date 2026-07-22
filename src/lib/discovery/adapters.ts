import type { DiscoveredJob } from './types'
import type { WatchlistEntry } from '../../types'

// Each adapter is a small, disposable function returning normalized jobs
// (PRD §9). All sources here are free and CORS-enabled.

function hashId(...parts: string[]): string {
  return parts.join('|').toLowerCase().replace(/\s+/g, ' ').trim()
}

function isRemote(loc?: string): boolean | undefined {
  return loc ? /remote|anywhere|worldwide/i.test(loc) : undefined
}

// ── Greenhouse board listing ────────────────────────────────────────────────
export async function fetchGreenhouseBoard(w: WatchlistEntry): Promise<DiscoveredJob[]> {
  const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${w.token}/jobs`)
  if (!res.ok) throw new Error(`Greenhouse ${res.status}`)
  const data = await res.json()
  return (data.jobs ?? []).map((j: Record<string, unknown>): DiscoveredJob => {
    const location = (j.location as { name?: string })?.name
    return {
      id: hashId('gh', w.token, String(j.id)),
      company: w.label,
      title: String(j.title ?? ''),
      location,
      remote: isRemote(location),
      url: String(j.absolute_url ?? ''),
      source: `Greenhouse: ${w.label}`,
      postedAt: typeof j.updated_at === 'string' ? j.updated_at : undefined,
    }
  })
}

// ── Lever board listing ─────────────────────────────────────────────────────
export async function fetchLeverBoard(w: WatchlistEntry): Promise<DiscoveredJob[]> {
  const res = await fetch(`https://api.lever.co/v0/postings/${w.token}?mode=json`)
  if (!res.ok) throw new Error(`Lever ${res.status}`)
  const data = await res.json()
  return (data as Record<string, unknown>[]).map((j): DiscoveredJob => {
    const location = (j.categories as { location?: string })?.location
    return {
      id: hashId('lever', w.token, String(j.id)),
      company: w.label,
      title: String(j.text ?? ''),
      location,
      remote: isRemote(location),
      url: String(j.hostedUrl ?? ''),
      source: `Lever: ${w.label}`,
      postedAt: typeof j.createdAt === 'number' ? new Date(j.createdAt).toISOString() : undefined,
    }
  })
}

// ── Remotive aggregated remote feed ─────────────────────────────────────────
export async function fetchRemotive(): Promise<DiscoveredJob[]> {
  const res = await fetch('https://remotive.com/api/remote-jobs?limit=50')
  if (!res.ok) throw new Error(`Remotive ${res.status}`)
  const data = await res.json()
  return (data.jobs ?? []).map((j: Record<string, unknown>): DiscoveredJob => ({
    id: hashId('remotive', String(j.id)),
    company: String(j.company_name ?? ''),
    title: String(j.title ?? ''),
    location: String(j.candidate_required_location ?? '') || undefined,
    remote: true,
    url: String(j.url ?? ''),
    source: 'Remotive',
    postedAt: typeof j.publication_date === 'string' ? j.publication_date : undefined,
  }))
}

// ── Himalayas aggregated remote feed (attribution + linkback required) ───────
export async function fetchHimalayas(): Promise<DiscoveredJob[]> {
  const res = await fetch('https://himalayas.app/jobs/api?limit=20')
  if (!res.ok) throw new Error(`Himalayas ${res.status}`)
  const data = await res.json()
  return (data.jobs ?? []).map((j: Record<string, unknown>): DiscoveredJob => {
    const locations = Array.isArray(j.locationRestrictions)
      ? (j.locationRestrictions as string[]).join(', ')
      : undefined
    const url = String(j.applicationLink ?? j.guid ?? '')
    return {
      id: hashId('himalayas', String(j.guid ?? url)),
      company: String(j.companyName ?? ''),
      title: String(j.title ?? ''),
      location: locations,
      remote: true,
      url,
      source: 'Himalayas',
      postedAt:
        typeof j.pubDate === 'number' ? new Date(j.pubDate * 1000).toISOString() : undefined,
      // Himalayas terms: attribution + linkback rendered with results.
      attribution: { label: 'via Himalayas', url: 'https://himalayas.app' },
    }
  })
}

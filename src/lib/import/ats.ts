import type { ParsedPosting } from './types'
import { htmlToText } from './html'

// ATS deep-link adapters (PRD §3.2 tier 1). These hit the public, CORS-enabled
// JSON APIs directly — no proxy, no scraping.

export interface AtsRef {
  ats: 'greenhouse' | 'lever'
  token: string
  jobId: string
}

// Recognize Greenhouse / Lever job URLs and pull out the board token + job id.
export function matchAtsUrl(url: string): AtsRef | null {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  const host = u.hostname
  const segs = u.pathname.split('/').filter(Boolean)

  // boards.greenhouse.io/{token}/jobs/{id}  |  job-boards.greenhouse.io/{token}/jobs/{id}
  if (host.endsWith('greenhouse.io')) {
    const jobsIdx = segs.indexOf('jobs')
    if (jobsIdx >= 1 && segs[jobsIdx + 1]) {
      return { ats: 'greenhouse', token: segs[0], jobId: segs[jobsIdx + 1] }
    }
  }
  // jobs.lever.co/{token}/{id}
  if (host.endsWith('lever.co') && segs.length >= 2) {
    return { ats: 'lever', token: segs[0], jobId: segs[1] }
  }
  return null
}

interface GreenhouseJob {
  title: string
  location?: { name?: string }
  content?: string
  absolute_url?: string
  company_name?: string
}

export async function fetchGreenhouse(
  ref: AtsRef,
  originalUrl: string,
): Promise<ParsedPosting> {
  const api = `https://boards-api.greenhouse.io/v1/boards/${ref.token}/jobs/${ref.jobId}?content=true`
  const res = await fetch(api)
  if (!res.ok) throw new Error(`Greenhouse API ${res.status}`)
  const job: GreenhouseJob = await res.json()
  const description = job.content ? htmlToText(decodeEntities(job.content)) : undefined
  const location = job.location?.name
  return {
    company: job.company_name || titleCase(ref.token),
    title: job.title,
    location,
    remote: location ? /remote/i.test(location) : undefined,
    description,
    summary: description?.slice(0, 200),
    url: job.absolute_url || originalUrl,
    source: 'Greenhouse',
  }
}

interface LeverPosting {
  text: string
  categories?: { location?: string; team?: string; commitment?: string }
  descriptionPlain?: string
  description?: string
  hostedUrl?: string
  salaryRange?: { min?: number; max?: number; currency?: string }
}

export async function fetchLever(
  ref: AtsRef,
  originalUrl: string,
): Promise<ParsedPosting> {
  const api = `https://api.lever.co/v0/postings/${ref.token}/${ref.jobId}?mode=json`
  const res = await fetch(api)
  if (!res.ok) throw new Error(`Lever API ${res.status}`)
  const p: LeverPosting = await res.json()
  const location = p.categories?.location
  const salary = p.salaryRange
    ? `${p.salaryRange.currency ?? ''}${p.salaryRange.min ?? ''}–${p.salaryRange.max ?? ''}`
    : undefined
  const description = p.descriptionPlain || (p.description ? htmlToText(p.description) : undefined)
  return {
    company: titleCase(ref.token),
    title: p.text,
    location,
    salary,
    remote: location ? /remote/i.test(location) : undefined,
    description,
    summary: description?.slice(0, 200),
    url: p.hostedUrl || originalUrl,
    source: 'Lever',
  }
}

function titleCase(token: string): string {
  return token
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

function decodeEntities(s: string): string {
  const t = document.createElement('textarea')
  t.innerHTML = s
  return t.value
}

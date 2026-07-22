import type { ParsedPosting } from './types'
import { htmlToText } from './html'

// Parse schema.org JobPosting JSON-LD embedded in a page (PRD §3.2 tier 2).
// Returns null when no JobPosting block is present.
export function parseJsonLd(html: string, url: string): ParsedPosting | null {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]')

  for (const script of scripts) {
    let data: unknown
    try {
      data = JSON.parse(script.textContent ?? '')
    } catch {
      continue
    }
    const posting = findJobPosting(data)
    if (posting) return normalize(posting, url)
  }
  return null
}

// JSON-LD may be a single object, an array, or use @graph.
function findJobPosting(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findJobPosting(item)
      if (found) return found
    }
    return null
  }
  if (typeof data !== 'object' || data === null) return null
  const obj = data as Record<string, unknown>
  const type = obj['@type']
  const isPosting = Array.isArray(type)
    ? type.includes('JobPosting')
    : type === 'JobPosting'
  if (isPosting) return obj
  if (obj['@graph']) return findJobPosting(obj['@graph'])
  return null
}

function normalize(p: Record<string, unknown>, url: string): ParsedPosting {
  const org = p.hiringOrganization as Record<string, unknown> | undefined
  const company = str(org?.name) || str(p.hiringOrganizationName) || 'Unknown company'

  const location = extractLocation(p)
  const salary = extractSalary(p.baseSalary)
  const rawDesc = str(p.description)
  const description = rawDesc ? htmlToText(rawDesc) : undefined
  const skills = extractSkills(p.skills)

  return {
    company,
    title: str(p.title) || 'Untitled role',
    location,
    salary,
    remote: p.jobLocationType === 'TELECOMMUTE' || (location ? /remote/i.test(location) : undefined),
    skills,
    description,
    summary: description?.slice(0, 200),
    url: str(p.url) || url,
    source: 'JSON-LD',
  }
}

function extractLocation(p: Record<string, unknown>): string | undefined {
  const loc = p.jobLocation
  const first = Array.isArray(loc) ? loc[0] : loc
  const addr = (first as Record<string, unknown>)?.address as
    | Record<string, unknown>
    | undefined
  if (!addr) return undefined
  return (
    [str(addr.addressLocality), str(addr.addressRegion), str(addr.addressCountry)]
      .filter(Boolean)
      .join(', ') || undefined
  )
}

function extractSalary(base: unknown): string | undefined {
  if (typeof base !== 'object' || base === null) return undefined
  const b = base as Record<string, unknown>
  const value = b.value as Record<string, unknown> | undefined
  if (!value) return undefined
  const currency = str(b.currency)
  const min = value.minValue ?? value.value
  const max = value.maxValue
  if (min == null) return undefined
  return `${currency} ${min}${max != null ? `–${max}` : ''}`.trim()
}

function extractSkills(skills: unknown): string[] | undefined {
  if (Array.isArray(skills)) return skills.map(String).slice(0, 12)
  if (typeof skills === 'string')
    return skills.split(/[,;]/).map((s) => s.trim()).filter(Boolean).slice(0, 12)
  return undefined
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

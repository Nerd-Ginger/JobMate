export interface DiscoveredJob {
  id: string // dedupe key
  company: string
  title: string
  location?: string
  remote?: boolean
  url: string
  source: string // adapter label, e.g. "Greenhouse: Stripe", "Remotive"
  postedAt?: string // ISO
  // Attribution linkback required by some feeds (PRD §7.3, Himalayas).
  attribution?: { label: string; url: string }
}

export interface DiscoveryFilters {
  keyword: string
  remoteOnly: boolean
  maxAgeDays: number | null
}

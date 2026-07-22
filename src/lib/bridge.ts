import type { NewApplicationInput } from '../store/useAppStore'
import type { Profile } from '../types'

// Serverless bridge to the companion extension via page localStorage (PRD §6).
// The extension writes captured jobs to jt.inbox; we publish the profile to
// jt.outbox for autofill.

const INBOX = 'jt.inbox'
const OUTBOX = 'jt.outbox'

interface CapturedJob {
  company?: string
  title?: string
  location?: string
  remote?: boolean
  description?: string
  url?: string
  source?: string
}

// Drain the inbox into new Wishlist applications, skipping URLs already tracked.
export async function processInbox(
  existingUrls: Set<string>,
  add: (input: NewApplicationInput) => Promise<unknown>,
): Promise<number> {
  let inbox: CapturedJob[]
  try {
    inbox = JSON.parse(localStorage.getItem(INBOX) || '[]')
  } catch {
    return 0
  }
  if (!inbox.length) return 0

  let imported = 0
  for (const job of inbox) {
    if (!job.title && !job.company) continue
    if (job.url && existingUrls.has(job.url)) continue
    await add({
      company: job.company || 'Unknown company',
      title: job.title || 'Untitled role',
      laneId: 'wishlist',
      url: job.url,
      location: job.location,
      remote: job.remote,
      description: job.description,
      source: job.source || 'Extension',
    })
    imported++
  }
  localStorage.removeItem(INBOX)
  return imported
}

// Publish profile (and optional drafted answers) for the extension's autofill.
export function publishOutbox(
  profile: Profile,
  answers: Record<string, string> = {},
): void {
  try {
    localStorage.setItem(OUTBOX, JSON.stringify({ profile, answers }))
  } catch {
    /* storage full — ignore */
  }
}

import Dexie, { type Table } from 'dexie'
import type { Application, Lane } from '../types'

// Default swim lanes (PRD §3.1). Seeded once on first open.
export const DEFAULT_LANES: Lane[] = [
  { id: 'wishlist', name: 'Wishlist', order: 0, isTerminal: false },
  { id: 'applied', name: 'Applied', order: 1, isTerminal: false },
  { id: 'screening', name: 'Screening', order: 2, isTerminal: false },
  { id: 'interviewing', name: 'Interviewing', order: 3, isTerminal: false },
  { id: 'offer', name: 'Offer', order: 4, isTerminal: false },
  { id: 'closed', name: 'Closed', order: 5, isTerminal: true },
]

export class JobMateDB extends Dexie {
  applications!: Table<Application, string>
  lanes!: Table<Lane, string>

  constructor() {
    super('jobmate')
    this.version(1).stores({
      applications: 'id, laneId, company',
      lanes: 'id, order',
    })
  }
}

export const db = new JobMateDB()

// Seed default lanes only when the lanes table is empty (first run or post-wipe).
export async function ensureSeeded(): Promise<void> {
  const count = await db.lanes.count()
  if (count === 0) {
    await db.lanes.bulkPut(DEFAULT_LANES)
  }
}

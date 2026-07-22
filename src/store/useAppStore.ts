import { create } from 'zustand'
import { db, ensureSeeded, DEFAULT_LANES } from '../db/db'
import type { Application, Lane, OutcomeTag } from '../types'

// Input for creating a new application from the Add/Edit modal.
export type NewApplicationInput = Omit<
  Application,
  'id' | 'stageHistory' | 'createdAt' | 'updatedAt' | 'outcome'
>

function uuid(): string {
  return crypto.randomUUID()
}

function nowISO(): string {
  return new Date().toISOString()
}

interface AppState {
  lanes: Lane[]
  applications: Application[]
  loaded: boolean

  load: () => Promise<void>
  addApplication: (input: NewApplicationInput) => Promise<Application>
  updateApplication: (
    id: string,
    patch: Partial<Application>,
  ) => Promise<void>
  deleteApplication: (id: string) => Promise<void>
  // Move a card to a lane, appending stage history. Optional outcome tag is set
  // when the target lane is terminal (Closed).
  moveApplication: (
    id: string,
    toLaneId: string,
    outcome?: OutcomeTag,
  ) => Promise<void>
  replaceAll: (lanes: Lane[], applications: Application[]) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  lanes: [],
  applications: [],
  loaded: false,

  load: async () => {
    await ensureSeeded()
    const [lanes, applications] = await Promise.all([
      db.lanes.orderBy('order').toArray(),
      db.applications.toArray(),
    ])
    set({ lanes, applications, loaded: true })
  },

  addApplication: async (input) => {
    const at = nowISO()
    const app: Application = {
      ...input,
      id: uuid(),
      stageHistory: [{ laneId: input.laneId, at }],
      createdAt: at,
      updatedAt: at,
    }
    await db.applications.put(app)
    set((s) => ({ applications: [...s.applications, app] }))
    return app
  },

  updateApplication: async (id, patch) => {
    const existing = get().applications.find((a) => a.id === id)
    if (!existing) return

    // Editing the lane via the form also records a stage-history entry.
    const laneChanged = patch.laneId != null && patch.laneId !== existing.laneId
    const stageHistory = laneChanged
      ? [...existing.stageHistory, { laneId: patch.laneId!, at: nowISO() }]
      : existing.stageHistory

    const updated: Application = {
      ...existing,
      ...patch,
      stageHistory,
      updatedAt: nowISO(),
    }
    await db.applications.put(updated)
    set((s) => ({
      applications: s.applications.map((a) => (a.id === id ? updated : a)),
    }))
  },

  deleteApplication: async (id) => {
    await db.applications.delete(id)
    set((s) => ({ applications: s.applications.filter((a) => a.id !== id) }))
  },

  moveApplication: async (id, toLaneId, outcome) => {
    const existing = get().applications.find((a) => a.id === id)
    if (!existing || existing.laneId === toLaneId) return

    const updated: Application = {
      ...existing,
      laneId: toLaneId,
      stageHistory: [...existing.stageHistory, { laneId: toLaneId, at: nowISO() }],
      // Only terminal lanes carry an outcome; clear it when leaving Closed.
      outcome: outcome,
      updatedAt: nowISO(),
    }
    await db.applications.put(updated)
    set((s) => ({
      applications: s.applications.map((a) => (a.id === id ? updated : a)),
    }))
  },

  replaceAll: async (lanes, applications) => {
    const safeLanes = lanes.length > 0 ? lanes : DEFAULT_LANES
    await db.transaction('rw', db.lanes, db.applications, async () => {
      await db.lanes.clear()
      await db.applications.clear()
      await db.lanes.bulkPut(safeLanes)
      await db.applications.bulkPut(applications)
    })
    const ordered = [...safeLanes].sort((a, b) => a.order - b.order)
    set({ lanes: ordered, applications })
  },
}))

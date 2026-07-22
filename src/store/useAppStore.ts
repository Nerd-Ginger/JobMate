import { create } from 'zustand'
import {
  db,
  ensureSeeded,
  DEFAULT_LANES,
  DEFAULT_SETTINGS,
  DEFAULT_PROFILE,
} from '../db/db'
import { encryptSecret, decryptSecret } from '../lib/crypto'
import { generateFeature, type GenerateOutput } from '../lib/ai/generate'
import type {
  AiFeature,
  Application,
  AppEvent,
  EventType,
  Interview,
  Lane,
  OutcomeTag,
  Profile,
  Settings,
} from '../types'

export type NewApplicationInput = Omit<
  Application,
  'id' | 'stageHistory' | 'createdAt' | 'updatedAt' | 'outcome'
>

export type NewInterviewInput = Omit<Interview, 'id' | 'createdAt'>

function uuid(): string {
  return crypto.randomUUID()
}
function nowISO(): string {
  return new Date().toISOString()
}

interface AppState {
  lanes: Lane[]
  applications: Application[]
  interviews: Interview[]
  events: AppEvent[]
  settings: Settings
  profile: Profile
  loaded: boolean

  // Decrypted API key, held in memory for the session only (never persisted).
  apiKey: string | null

  load: () => Promise<void>

  // Applications
  addApplication: (input: NewApplicationInput) => Promise<Application>
  updateApplication: (id: string, patch: Partial<Application>) => Promise<void>
  deleteApplication: (id: string) => Promise<void>
  moveApplication: (
    id: string,
    toLaneId: string,
    outcome?: OutcomeTag,
  ) => Promise<void>

  // Interviews
  addInterview: (input: NewInterviewInput) => Promise<Interview>
  updateInterview: (id: string, patch: Partial<Interview>) => Promise<void>
  deleteInterview: (id: string) => Promise<void>

  // Settings & profile
  updateSettings: (patch: Partial<Settings>) => Promise<void>
  updateProfile: (patch: Partial<Profile>) => Promise<void>
  setApiKey: (key: string, passphrase: string) => Promise<void>
  unlockApiKey: (passphrase: string) => Promise<void>
  clearApiKey: () => Promise<void>

  // AI (key-gated)
  generateAiFeature: (
    feature: AiFeature,
    applicationId: string,
    force?: boolean,
  ) => Promise<GenerateOutput>

  // Events
  recordEvent: (
    type: EventType,
    applicationId?: string,
    meta?: Record<string, unknown>,
  ) => Promise<void>

  replaceAll: (data: {
    lanes: Lane[]
    applications: Application[]
    interviews?: Interview[]
    events?: AppEvent[]
    profile?: Profile | null
    settings?: Partial<Settings> | null
  }) => Promise<void>
}

// The "offer" lane id — reaching it emits an `offer` event for metrics/badges.
const OFFER_LANE_ID = 'offer'

export const useAppStore = create<AppState>((set, get) => ({
  lanes: [],
  applications: [],
  interviews: [],
  events: [],
  settings: DEFAULT_SETTINGS,
  profile: DEFAULT_PROFILE,
  loaded: false,
  apiKey: null,

  load: async () => {
    await ensureSeeded()
    const [lanes, applications, interviews, events, settings, profile] =
      await Promise.all([
        db.lanes.orderBy('order').toArray(),
        db.applications.toArray(),
        db.interviews.toArray(),
        db.events.toArray(),
        db.settings.get('app'),
        db.profile.get('me'),
      ])
    set({
      lanes,
      applications,
      interviews,
      events,
      settings: settings ?? DEFAULT_SETTINGS,
      profile: profile ?? DEFAULT_PROFILE,
      loaded: true,
    })
  },

  recordEvent: async (type, applicationId, meta) => {
    const event: AppEvent = { id: uuid(), type, at: nowISO(), applicationId, meta }
    await db.events.put(event)
    set((s) => ({ events: [...s.events, event] }))
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
    await get().recordEvent('application_created', app.id)
    if (app.laneId === OFFER_LANE_ID) await get().recordEvent('offer', app.id)
    return app
  },

  updateApplication: async (id, patch) => {
    const existing = get().applications.find((a) => a.id === id)
    if (!existing) return

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
    if (laneChanged) {
      await get().recordEvent('stage_moved', id, {
        from: existing.laneId,
        to: patch.laneId,
      })
      if (patch.laneId === OFFER_LANE_ID) await get().recordEvent('offer', id)
    }
  },

  deleteApplication: async (id) => {
    await db.transaction('rw', db.applications, db.interviews, async () => {
      await db.applications.delete(id)
      await db.interviews.where('applicationId').equals(id).delete()
    })
    set((s) => ({
      applications: s.applications.filter((a) => a.id !== id),
      interviews: s.interviews.filter((i) => i.applicationId !== id),
    }))
  },

  moveApplication: async (id, toLaneId, outcome) => {
    const existing = get().applications.find((a) => a.id === id)
    if (!existing || existing.laneId === toLaneId) return

    const updated: Application = {
      ...existing,
      laneId: toLaneId,
      stageHistory: [...existing.stageHistory, { laneId: toLaneId, at: nowISO() }],
      outcome,
      updatedAt: nowISO(),
    }
    await db.applications.put(updated)
    set((s) => ({
      applications: s.applications.map((a) => (a.id === id ? updated : a)),
    }))
    await get().recordEvent('stage_moved', id, {
      from: existing.laneId,
      to: toLaneId,
    })
    if (toLaneId === OFFER_LANE_ID) await get().recordEvent('offer', id)
  },

  addInterview: async (input) => {
    const interview: Interview = { ...input, id: uuid(), createdAt: nowISO() }
    await db.interviews.put(interview)
    set((s) => ({ interviews: [...s.interviews, interview] }))
    await get().recordEvent('interview_logged', input.applicationId, {
      type: input.type,
      round: input.round,
    })
    return interview
  },

  updateInterview: async (id, patch) => {
    const existing = get().interviews.find((i) => i.id === id)
    if (!existing) return
    const updated = { ...existing, ...patch }
    await db.interviews.put(updated)
    set((s) => ({
      interviews: s.interviews.map((i) => (i.id === id ? updated : i)),
    }))
  },

  deleteInterview: async (id) => {
    await db.interviews.delete(id)
    set((s) => ({ interviews: s.interviews.filter((i) => i.id !== id) }))
  },

  updateSettings: async (patch) => {
    const updated: Settings = { ...get().settings, ...patch, id: 'app' }
    await db.settings.put(updated)
    set({ settings: updated })
  },

  updateProfile: async (patch) => {
    const updated: Profile = {
      ...get().profile,
      ...patch,
      id: 'me',
      updatedAt: nowISO(),
    }
    await db.profile.put(updated)
    set({ profile: updated })
  },

  setApiKey: async (key, passphrase) => {
    const encryptedApiKey = await encryptSecret(key, passphrase)
    await get().updateSettings({ encryptedApiKey })
    set({ apiKey: key })
  },

  unlockApiKey: async (passphrase) => {
    const secret = get().settings.encryptedApiKey
    if (!secret) throw new Error('No API key stored.')
    const key = await decryptSecret(secret, passphrase) // throws on wrong passphrase
    set({ apiKey: key })
  },

  clearApiKey: async () => {
    await get().updateSettings({ encryptedApiKey: undefined })
    set({ apiKey: null })
  },

  generateAiFeature: async (feature, applicationId, force) => {
    const { apiKey, settings, profile } = get()
    if (!apiKey) throw new Error('Unlock your API key in Settings first.')
    const app = get().applications.find((a) => a.id === applicationId)
    if (!app) throw new Error('Application not found.')

    const result = await generateFeature({
      feature,
      app,
      apiKey,
      settings,
      profile,
      force,
    })
    if (!result.cached) {
      await get().recordEvent('kit_generated', applicationId, { feature })
      await get().recordEvent('ai_usage', applicationId, {
        feature,
        model: result.entry.model,
        inputTokens: result.entry.usage.inputTokens,
        outputTokens: result.entry.usage.outputTokens,
        costUsd: result.costUsd,
      })
    }
    return result
  },

  replaceAll: async (data) => {
    const safeLanes = data.lanes.length > 0 ? data.lanes : DEFAULT_LANES
    const interviews = data.interviews ?? []
    const events = data.events ?? []
    const profile: Profile = { ...DEFAULT_PROFILE, ...data.profile, id: 'me' }
    // Imports never carry the encrypted key (PRD §9); preserve the current one.
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      ...data.settings,
      encryptedApiKey: get().settings.encryptedApiKey,
      id: 'app',
    }

    await db.transaction(
      'rw',
      [db.lanes, db.applications, db.interviews, db.events, db.profile, db.settings],
      async () => {
        await Promise.all([
          db.lanes.clear(),
          db.applications.clear(),
          db.interviews.clear(),
          db.events.clear(),
        ])
        await db.lanes.bulkPut(safeLanes)
        await db.applications.bulkPut(data.applications)
        await db.interviews.bulkPut(interviews)
        await db.events.bulkPut(events)
        await db.profile.put(profile)
        await db.settings.put(settings)
      },
    )

    set({
      lanes: [...safeLanes].sort((a, b) => a.order - b.order),
      applications: data.applications,
      interviews,
      events,
      profile,
      settings,
    })
  },
}))

import Dexie, { type Table } from 'dexie'
import type {
  AiCacheEntry,
  Application,
  AppEvent,
  Interview,
  Lane,
  Profile,
  Settings,
} from '../types'

// Default swim lanes (PRD §3.1). Seeded once on first open.
export const DEFAULT_LANES: Lane[] = [
  { id: 'wishlist', name: 'Wishlist', order: 0, isTerminal: false },
  { id: 'applied', name: 'Applied', order: 1, isTerminal: false },
  { id: 'screening', name: 'Screening', order: 2, isTerminal: false },
  { id: 'interviewing', name: 'Interviewing', order: 3, isTerminal: false },
  { id: 'offer', name: 'Offer', order: 4, isTerminal: false },
  { id: 'closed', name: 'Closed', order: 5, isTerminal: true },
]

// Model routing defaults (PRD §7.2): extraction → Haiku, generation → Sonnet.
const HAIKU = 'claude-haiku-4-5'
const SONNET = 'claude-sonnet-5'

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  models: {
    parse: HAIKU,
    coverLetter: SONNET,
    bullets: SONNET,
    screeningAnswers: SONNET,
    fitCheck: HAIKU,
    interviewPrep: SONNET,
  },
  // Hard max_tokens caps per feature (PRD §7.3).
  maxTokens: {
    parse: 700,
    coverLetter: 1400,
    bullets: 1000,
    screeningAnswers: 1400,
    fitCheck: 500,
    interviewPrep: 1400,
  },
  // CORS proxies for JSON-LD fetch, tried in order (PRD §3.2).
  proxyList: [
    'https://corsproxy.io/?url=',
    'https://api.allorigins.win/raw?url=',
  ],
  watchlist: [],
  savedFilters: [],
  weeklyGoal: 10,
  // Editable price table so estimates survive price changes (PRD §7.7).
  prices: [
    { model: HAIKU, inputPerMTok: 1, outputPerMTok: 5 },
    { model: SONNET, inputPerMTok: 3, outputPerMTok: 15 },
  ],
}

export const DEFAULT_PROFILE: Profile = { id: 'me' }

export class JobMateDB extends Dexie {
  applications!: Table<Application, string>
  lanes!: Table<Lane, string>
  interviews!: Table<Interview, string>
  events!: Table<AppEvent, string>
  settings!: Table<Settings, string>
  profile!: Table<Profile, string>
  aiCache!: Table<AiCacheEntry, string>

  constructor() {
    super('jobmate')
    // v1 — Phase 1 board.
    this.version(1).stores({
      applications: 'id, laneId, company',
      lanes: 'id, order',
    })
    // v2 — interviews, events, settings, profile (Phases 2–4).
    this.version(2).stores({
      applications: 'id, laneId, company',
      lanes: 'id, order',
      interviews: 'id, applicationId, date',
      events: 'id, type, at, applicationId',
      settings: 'id',
      profile: 'id',
    })
    // v3 — AI output cache (PRD §7.4).
    this.version(3).stores({
      aiCache: 'key, applicationId, feature',
    })
  }
}

export const db = new JobMateDB()

// Seed default lanes + settings + profile singletons when missing.
export async function ensureSeeded(): Promise<void> {
  if ((await db.lanes.count()) === 0) {
    await db.lanes.bulkPut(DEFAULT_LANES)
  }
  if (!(await db.settings.get('app'))) {
    await db.settings.put(DEFAULT_SETTINGS)
  }
  if (!(await db.profile.get('me'))) {
    await db.profile.put(DEFAULT_PROFILE)
  }
}

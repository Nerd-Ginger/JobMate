// Core domain types for JobMate. See PRD §4 for the data model.

export type OutcomeTag = 'Rejected' | 'Withdrawn' | 'Accepted'

export interface StageHistoryEntry {
  laneId: string
  at: string // ISO timestamp
}

export interface Lane {
  id: string
  name: string
  order: number
  isTerminal: boolean // terminal lanes (Closed) prompt for an outcome tag
}

export interface Application {
  id: string
  company: string
  title: string
  laneId: string
  stageHistory: StageHistoryEntry[]
  createdAt: string
  updatedAt: string

  // Optional form fields
  url?: string
  source?: string
  location?: string
  salary?: string
  remote?: boolean
  notes?: string
  outcome?: OutcomeTag
  skills?: string[]
  description?: string
  nextActionAt?: string
}

// ── Interviews (PRD §3.3) ──────────────────────────────────────────────────

export type InterviewType =
  | 'recruiter'
  | 'hiring-manager'
  | 'technical'
  | 'panel'
  | 'onsite'
  | 'final'

export type InterviewOutcome = 'pending' | 'passed' | 'failed'

export interface Interview {
  id: string
  applicationId: string
  round: number
  type: InterviewType
  date: string // ISO date
  interviewers: string[]
  notes?: string
  outcome: InterviewOutcome
  createdAt: string
}

// ── Events (PRD §4) — append-only log powering streaks/badges/metrics ───────

export type EventType =
  | 'application_created'
  | 'stage_moved'
  | 'interview_logged'
  | 'offer'
  | 'kit_generated'
  | 'ai_usage'

export interface AppEvent {
  id: string
  type: EventType
  at: string // ISO timestamp
  applicationId?: string
  // Free-form payload: stage_moved → {from,to}; ai_usage → {feature,model,inputTokens,outputTokens,costUsd}
  meta?: Record<string, unknown>
}

// ── Profile (PRD §4) — for Apply Kit + extension autofill ───────────────────

export interface Profile {
  id: 'me' // singleton
  fullName?: string
  email?: string
  phone?: string
  location?: string
  links?: { label: string; url: string }[]
  workAuthorization?: string
  requiresSponsorship?: boolean
  resumeText?: string // ≤ ~8k chars, used in AI prompts
  resumeFileName?: string
  updatedAt?: string
}

// ── Settings (PRD §4, §7) ──────────────────────────────────────────────────

export type AiFeature =
  | 'parse'
  | 'coverLetter'
  | 'bullets'
  | 'screeningAnswers'
  | 'fitCheck'
  | 'interviewPrep'

export interface WatchlistEntry {
  ats: 'greenhouse' | 'lever'
  token: string // board token, e.g. "stripe"
  label: string
}

export interface SavedFilter {
  id: string
  name: string
  keyword?: string
  remoteOnly?: boolean
  location?: string
  salaryFloor?: number
  maxAgeDays?: number
  sources?: string[]
}

export interface ModelPrice {
  model: string
  inputPerMTok: number // USD per million input tokens
  outputPerMTok: number
}

// Encrypted-at-rest secret blob (WebCrypto AES-GCM + PBKDF2 passphrase).
export interface EncryptedSecret {
  ciphertext: string // base64
  iv: string // base64
  salt: string // base64
}

export interface Settings {
  id: 'app' // singleton
  encryptedApiKey?: EncryptedSecret
  // Model routing per feature (defaults in db seed).
  models: Record<AiFeature, string>
  // Hard max_tokens caps per feature.
  maxTokens: Record<AiFeature, number>
  proxyList: string[]
  watchlist: WatchlistEntry[]
  savedFilters: SavedFilter[]
  weeklyGoal: number
  softBudgetUsd?: number
  prices: ModelPrice[]
  // Optional keys for keyed discovery adapters (stored client-side).
  adapterKeys?: Record<string, string>
}

// ── AI cache (PRD §7.4) — key = hash(resume + jd + feature) ─────────────────

export interface AiUsage {
  inputTokens: number
  outputTokens: number
}

export interface AiCacheEntry {
  key: string // hash
  feature: AiFeature
  applicationId?: string
  model: string
  output: string
  usage: AiUsage
  createdAt: string
}

// ── Export / import ─────────────────────────────────────────────────────────

export const EXPORT_APP_ID = 'jobmate'
export const EXPORT_VERSION = 2

export interface ExportFile {
  app: typeof EXPORT_APP_ID
  version: number
  exportedAt: string
  lanes: Lane[]
  applications: Application[]
  interviews?: Interview[]
  events?: AppEvent[]
  profile?: Profile | null
  // settings are exported WITHOUT the encrypted key by default (PRD §9 key security)
  settings?: Omit<Settings, 'encryptedApiKey'> | null
}

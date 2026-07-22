// Core domain types for JobMate. Phase 1 uses a subset of PRD §4; fields not
// yet surfaced in the UI (skills, description, nextActionAt) are kept optional
// so later phases require no Dexie migration.

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

  // Optional / Phase 1 form fields
  url?: string
  source?: string
  location?: string
  salary?: string
  remote?: boolean
  notes?: string
  outcome?: OutcomeTag

  // Reserved for later phases (no Phase 1 UI)
  skills?: string[]
  description?: string
  nextActionAt?: string
}

export const EXPORT_APP_ID = 'jobmate'
export const EXPORT_VERSION = 1

export interface ExportFile {
  app: typeof EXPORT_APP_ID
  version: number
  exportedAt: string
  lanes: Lane[]
  applications: Application[]
}

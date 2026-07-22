import {
  EXPORT_APP_ID,
  EXPORT_VERSION,
  type Application,
  type AppEvent,
  type ExportFile,
  type Interview,
  type Lane,
  type Profile,
  type Settings,
} from '../types'

export interface ExportInput {
  lanes: Lane[]
  applications: Application[]
  interviews: Interview[]
  events: AppEvent[]
  profile: Profile
  settings: Settings
}

export function buildExport(input: ExportInput): ExportFile {
  // Strip the encrypted API key from exports by default (PRD §9 key security).
  const { encryptedApiKey: _omit, ...settingsSansKey } = input.settings
  return {
    app: EXPORT_APP_ID,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    lanes: input.lanes,
    applications: input.applications,
    interviews: input.interviews,
    events: input.events,
    profile: input.profile,
    settings: settingsSansKey,
  }
}

export function downloadExport(input: ExportInput): void {
  const blob = new Blob([JSON.stringify(buildExport(input), null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `jobmate-export-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export class ImportError extends Error {}

// Parse and validate an import file. Throws ImportError on any structural
// problem so the caller can surface a message without touching stored data.
export function parseImport(text: string): ExportFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new ImportError('File is not valid JSON.')
  }
  if (typeof data !== 'object' || data === null) {
    throw new ImportError('Unexpected file structure.')
  }
  const obj = data as Record<string, unknown>

  if (obj.app !== EXPORT_APP_ID) throw new ImportError('Not a JobMate export file.')
  if (typeof obj.version !== 'number' || obj.version > EXPORT_VERSION) {
    throw new ImportError('Unsupported export version.')
  }
  if (!Array.isArray(obj.lanes) || !Array.isArray(obj.applications)) {
    throw new ImportError('Export is missing lanes or applications.')
  }

  return {
    app: EXPORT_APP_ID,
    version: obj.version,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : '',
    lanes: obj.lanes as Lane[],
    applications: obj.applications as Application[],
    interviews: Array.isArray(obj.interviews) ? (obj.interviews as Interview[]) : [],
    events: Array.isArray(obj.events) ? (obj.events as AppEvent[]) : [],
    profile: (obj.profile as Profile) ?? null,
    settings: (obj.settings as Omit<Settings, 'encryptedApiKey'>) ?? null,
  }
}

import {
  EXPORT_APP_ID,
  EXPORT_VERSION,
  type Application,
  type ExportFile,
  type Lane,
} from '../types'

export function buildExport(lanes: Lane[], applications: Application[]): ExportFile {
  return {
    app: EXPORT_APP_ID,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    lanes,
    applications,
  }
}

export function downloadExport(lanes: Lane[], applications: Application[]): void {
  const payload = buildExport(lanes, applications)
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
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

// Parse and validate an import file's contents. Throws ImportError on any
// structural problem so the caller can surface a message without touching data.
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

  if (obj.app !== EXPORT_APP_ID) {
    throw new ImportError('Not a JobMate export file.')
  }
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
  }
}

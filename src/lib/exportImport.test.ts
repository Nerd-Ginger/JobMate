import { describe, it, expect } from 'vitest'
import { buildExport, parseImport, ImportError, type ExportInput } from './exportImport'
import { DEFAULT_SETTINGS, DEFAULT_PROFILE, DEFAULT_LANES } from '../db/db'
import { EXPORT_APP_ID, EXPORT_VERSION } from '../types'

const input: ExportInput = {
  lanes: DEFAULT_LANES,
  applications: [],
  interviews: [],
  events: [],
  profile: DEFAULT_PROFILE,
  settings: {
    ...DEFAULT_SETTINGS,
    encryptedApiKey: { ciphertext: 'c', iv: 'i', salt: 's' },
  },
}

describe('buildExport', () => {
  it('omits the encrypted API key', () => {
    const out = buildExport(input)
    expect(out.app).toBe(EXPORT_APP_ID)
    expect(out.version).toBe(EXPORT_VERSION)
    expect(JSON.stringify(out)).not.toContain('ciphertext')
    expect(out.settings && 'encryptedApiKey' in out.settings).toBe(false)
  })
})

describe('parseImport', () => {
  it('round-trips a valid export', () => {
    const text = JSON.stringify(buildExport(input))
    const parsed = parseImport(text)
    expect(parsed.lanes).toHaveLength(DEFAULT_LANES.length)
  })

  it('rejects invalid JSON', () => {
    expect(() => parseImport('{not json')).toThrow(ImportError)
  })

  it('rejects a non-JobMate file', () => {
    expect(() => parseImport(JSON.stringify({ app: 'other', version: 1 }))).toThrow(ImportError)
  })

  it('rejects a future version', () => {
    const text = JSON.stringify({ app: EXPORT_APP_ID, version: EXPORT_VERSION + 1, lanes: [], applications: [] })
    expect(() => parseImport(text)).toThrow(ImportError)
  })

  it('rejects a file missing lanes/applications', () => {
    const text = JSON.stringify({ app: EXPORT_APP_ID, version: EXPORT_VERSION })
    expect(() => parseImport(text)).toThrow(ImportError)
  })
})

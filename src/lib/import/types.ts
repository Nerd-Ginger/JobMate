// Normalized result of the import pipeline. Maps onto Application fields.
export interface ParsedPosting {
  company: string
  title: string
  location?: string
  salary?: string
  remote?: boolean
  skills?: string[]
  summary?: string
  description?: string
  url?: string
  source: string
}

export type ImportMethod =
  | 'greenhouse'
  | 'lever'
  | 'jsonld'
  | 'ai-parse'
  | 'paste'

export interface ImportResult {
  posting: ParsedPosting
  method: ImportMethod
  // Present only when a paid AI-parse tier ran, so the caller can log spend.
  usage?: { inputTokens: number; outputTokens: number }
  model?: string
}

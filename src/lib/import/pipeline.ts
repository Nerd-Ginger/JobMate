import { matchAtsUrl, fetchGreenhouse, fetchLever } from './ats'
import { fetchViaProxy } from './proxy'
import { parseJsonLd } from './jsonld'
import { callAnthropic } from '../ai/anthropic'
import { parsePrompt, truncate } from '../ai/prompts'
import { extractJson } from '../ai/generate'
import type { ImportMethod, ImportResult, ParsedPosting } from './types'
import type { AiUsage, Settings } from '../../types'

export interface ImportContext {
  settings: Settings
  apiKey: string | null
  onProgress?: (msg: string) => void
}

// Tiered URL import (PRD §3.2): ATS-direct → JSON-LD → AI parse → (caller does
// paste). Each tier degrades gracefully to the next; nothing is a dead end.
export async function importFromUrl(
  url: string,
  ctx: ImportContext,
): Promise<ImportResult> {
  const progress = ctx.onProgress ?? (() => {})

  // Tier 1 — ATS public JSON (free, no proxy).
  const ats = matchAtsUrl(url)
  if (ats) {
    progress(`Fetching from ${ats.ats}…`)
    const posting =
      ats.ats === 'greenhouse'
        ? await fetchGreenhouse(ats, url)
        : await fetchLever(ats, url)
    return { posting, method: ats.ats }
  }

  // Tier 2 — JSON-LD via CORS proxy (free).
  let html: string | null = null
  try {
    progress('Fetching page…')
    html = await fetchViaProxy(url, ctx.settings.proxyList)
    const jsonld = parseJsonLd(html, url)
    if (jsonld) {
      progress('Found structured data.')
      return { posting: jsonld, method: 'jsonld' }
    }
  } catch {
    // proxy failed — fall through
  }

  // Tier 3 — AI parse of the fetched HTML text (paid; needs key).
  if (html && ctx.apiKey) {
    progress('Parsing with AI…')
    const { posting, method, usage, model } = await aiParse(html, url, ctx)
    return { posting, method, usage, model }
  }

  throw new ImportNeedsPaste(
    html
      ? 'No structured data found. Add your API key to auto-parse, or paste the text.'
      : 'Could not fetch the page (login-walled or proxy down). Paste the text instead.',
  )
}

// Paste fallback (PRD §3.2 tier 4). With a key we AI-parse; without one we
// return the raw text as the description for the user to fill in the rest.
export async function importFromPaste(
  text: string,
  ctx: ImportContext,
  url?: string,
): Promise<ImportResult> {
  if (ctx.apiKey) {
    return aiParse(text, url ?? '', ctx)
  }
  return {
    posting: {
      company: '',
      title: '',
      description: truncate(text, 6000),
      summary: text.slice(0, 200),
      url,
      source: 'Paste',
    },
    method: 'paste',
  }
}

export class ImportNeedsPaste extends Error {}

async function aiParse(
  content: string,
  url: string,
  ctx: ImportContext,
): Promise<ImportResult & { usage: AiUsage; model: string }> {
  const prompt = parsePrompt(content)
  const model = ctx.settings.models.parse
  const res = await callAnthropic({
    apiKey: ctx.apiKey!,
    model,
    system: prompt.system,
    messages: [{ role: 'user', content: prompt.user }],
    maxTokens: ctx.settings.maxTokens.parse,
  })

  let obj: Record<string, unknown> = {}
  try {
    obj = JSON.parse(extractJson(res.text))
  } catch {
    /* leave empty — user completes the form */
  }

  const posting: ParsedPosting = {
    company: strOr(obj.company, ''),
    title: strOr(obj.title, ''),
    location: strOr(obj.location, '') || undefined,
    salary: strOr(obj.salary, '') || undefined,
    remote: typeof obj.remote === 'boolean' ? obj.remote : undefined,
    skills: Array.isArray(obj.skills) ? obj.skills.map(String) : undefined,
    summary: strOr(obj.summary, '') || undefined,
    description: truncate(content, 6000),
    url: url || undefined,
    source: 'AI parse',
  }
  return { posting, method: 'ai-parse' as ImportMethod, usage: res.usage, model: res.model }
}

function strOr(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback
}

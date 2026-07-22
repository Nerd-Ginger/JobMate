import { db } from '../../db/db'
import { callAnthropic } from './anthropic'
import { estimateCost, hashKey } from './pricing'
import {
  bulletsPrompt,
  coverLetterPrompt,
  fitCheckPrompt,
  interviewPrepPrompt,
  postingSummary,
  screeningPrompt,
  type Prompt,
} from './prompts'
import type {
  AiCacheEntry,
  AiFeature,
  Application,
  Profile,
  Settings,
} from '../../types'

function buildPrompt(
  feature: AiFeature,
  app: Application,
  resume: string,
): Prompt {
  switch (feature) {
    case 'coverLetter':
      return coverLetterPrompt(app, resume)
    case 'bullets':
      return bulletsPrompt(app, resume)
    case 'screeningAnswers':
      return screeningPrompt(app, resume)
    case 'fitCheck':
      return fitCheckPrompt(app, resume)
    case 'interviewPrep':
      return interviewPrepPrompt(app, resume)
    case 'parse':
      throw new Error('Use the import pipeline for parsing.')
  }
}

export interface GenerateOutput {
  entry: AiCacheEntry
  cached: boolean
  costUsd: number
}

// Generate (or return cached) output for one Apply Kit feature. Cache key is
// hash(feature + model + resume + job description) so spend only recurs when
// the resume, posting, or model changed, or the user forces a regenerate.
export async function generateFeature(opts: {
  feature: AiFeature
  app: Application
  apiKey: string
  settings: Settings
  profile: Profile
  force?: boolean
}): Promise<GenerateOutput> {
  const { feature, app, apiKey, settings, profile, force } = opts
  const resume = profile.resumeText ?? ''
  const model = settings.models[feature]
  const maxTokens = settings.maxTokens[feature]
  const jobKey = app.description ?? postingSummary(app)
  const key = hashKey(feature, model, resume, jobKey)

  const existing = await db.aiCache.get(key)
  if (existing && !force) return { entry: existing, cached: true, costUsd: 0 }

  const prompt = buildPrompt(feature, app, resume)
  const result = await callAnthropic({
    apiKey,
    model,
    system: prompt.system,
    messages: [{ role: 'user', content: prompt.user }],
    maxTokens,
  })

  const entry: AiCacheEntry = {
    key,
    feature,
    applicationId: app.id,
    model: result.model,
    output: result.text,
    usage: result.usage,
    createdAt: new Date().toISOString(),
  }
  await db.aiCache.put(entry)

  return {
    entry,
    cached: false,
    costUsd: estimateCost(result.usage, result.model, settings.prices),
  }
}

// Load any cached kit outputs for an application, keyed by feature.
export async function loadCachedKit(
  applicationId: string,
): Promise<Partial<Record<AiFeature, AiCacheEntry>>> {
  const entries = await db.aiCache
    .where('applicationId')
    .equals(applicationId)
    .toArray()
  const out: Partial<Record<AiFeature, AiCacheEntry>> = {}
  for (const e of entries) out[e.feature] = e
  return out
}

// Parse a fit-check JSON payload defensively.
export interface FitCheck {
  score: number
  gaps: string[]
  summary: string
}
export function parseFitCheck(text: string): FitCheck | null {
  try {
    const obj = JSON.parse(extractJson(text))
    if (typeof obj.score !== 'number') return null
    return {
      score: Math.max(1, Math.min(10, Math.round(obj.score))),
      gaps: Array.isArray(obj.gaps) ? obj.gaps.slice(0, 3).map(String) : [],
      summary: typeof obj.summary === 'string' ? obj.summary : '',
    }
  } catch {
    return null
  }
}

// Pull the first {...} block out of a model response that may wrap it in prose.
export function extractJson(text: string): string {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) return text
  return text.slice(start, end + 1)
}

import type { AppEvent, Application, Interview } from '../types'

// Funnel + gamification + spend computations (PRD §3.3, §3.6, §7.7). Pure
// functions over store data so views stay dumb.

// Ordered pipeline stages the funnel tracks (excludes Wishlist and Closed).
export const FUNNEL_STAGES = [
  { id: 'applied', label: 'Applied' },
  { id: 'screening', label: 'Screening' },
  { id: 'interviewing', label: 'Interviewing' },
  { id: 'offer', label: 'Offer' },
] as const

export interface FunnelStage {
  id: string
  label: string
  count: number
  conversionFromPrev: number | null // % of previous stage that reached this one
}

// Count applications that ever reached each stage (via stageHistory).
export function funnel(applications: Application[]): FunnelStage[] {
  const reached = (laneId: string) =>
    applications.filter((a) => a.stageHistory.some((h) => h.laneId === laneId)).length

  return FUNNEL_STAGES.map((stage, i) => {
    const count = reached(stage.id)
    const prev = i === 0 ? null : reached(FUNNEL_STAGES[i - 1].id)
    return {
      ...stage,
      count,
      conversionFromPrev: prev && prev > 0 ? Math.round((count / prev) * 100) : null,
    }
  })
}

// Average days spent before leaving each tracked stage.
export function avgDaysPerStage(applications: Application[]): Record<string, number> {
  const totals: Record<string, { sum: number; n: number }> = {}
  for (const app of applications) {
    const h = app.stageHistory
    for (let i = 0; i < h.length - 1; i++) {
      const days = (Date.parse(h[i + 1].at) - Date.parse(h[i].at)) / 86_400_000
      const bucket = (totals[h[i].laneId] ??= { sum: 0, n: 0 })
      bucket.sum += days
      bucket.n += 1
    }
  }
  const out: Record<string, number> = {}
  for (const [lane, { sum, n }] of Object.entries(totals)) {
    out[lane] = n > 0 ? Math.round((sum / n) * 10) / 10 : 0
  }
  return out
}

export function interviewStats(applications: Application[], interviews: Interview[]) {
  const total = interviews.length
  const withInterview = new Set(interviews.map((i) => i.applicationId)).size
  return {
    total,
    perApplication:
      applications.length > 0
        ? Math.round((total / applications.length) * 100) / 100
        : 0,
    withInterview,
  }
}

// ── Gamification ────────────────────────────────────────────────────────────

function startOfWeek(d: Date): Date {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7 // Monday = 0
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - day)
  return x
}

export function applicationsThisWeek(events: AppEvent[]): number {
  const weekStart = startOfWeek(new Date()).getTime()
  return events.filter(
    (e) => e.type === 'application_created' && Date.parse(e.at) >= weekStart,
  ).length
}

// Consecutive weeks (ending this week) with ≥1 application created.
export function weekStreak(events: AppEvent[]): number {
  const weeks = new Set<number>()
  for (const e of events) {
    if (e.type === 'application_created') {
      weeks.add(startOfWeek(new Date(e.at)).getTime())
    }
  }
  let streak = 0
  const cursor = startOfWeek(new Date())
  while (weeks.has(cursor.getTime())) {
    streak += 1
    cursor.setDate(cursor.getDate() - 7)
  }
  return streak
}

export interface Badge {
  id: string
  label: string
  earned: boolean
}

export function badges(events: AppEvent[]): Badge[] {
  const count = (t: string) => events.filter((e) => e.type === t).length
  const apps = count('application_created')
  const interviews = count('interview_logged')
  const offers = count('offer')
  return [
    { id: 'first-app', label: 'First application', earned: apps >= 1 },
    { id: 'first-interview', label: 'First interview', earned: interviews >= 1 },
    { id: 'first-offer', label: 'First offer', earned: offers >= 1 },
    { id: 'apps-10', label: '10 applications', earned: apps >= 10 },
    { id: 'apps-100', label: '100 applications', earned: apps >= 100 },
    { id: 'apps-1000', label: '1000 applications', earned: apps >= 1000 },
  ]
}

// ── Spend meter (PRD §7.7) ──────────────────────────────────────────────────

export interface Spend {
  inputTokens: number
  outputTokens: number
  costUsd: number
}

function spendSince(events: AppEvent[], since: number): Spend {
  const acc: Spend = { inputTokens: 0, outputTokens: 0, costUsd: 0 }
  for (const e of events) {
    if (e.type !== 'ai_usage' || Date.parse(e.at) < since) continue
    const m = e.meta ?? {}
    acc.inputTokens += Number(m.inputTokens) || 0
    acc.outputTokens += Number(m.outputTokens) || 0
    acc.costUsd += Number(m.costUsd) || 0
  }
  return acc
}

export function spend(events: AppEvent[]) {
  const now = new Date()
  const weekStart = startOfWeek(now).getTime()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  return {
    week: spendSince(events, weekStart),
    month: spendSince(events, monthStart),
  }
}

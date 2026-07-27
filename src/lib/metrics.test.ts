import { describe, it, expect } from 'vitest'
import {
  funnel,
  avgDaysPerStage,
  interviewStats,
  applicationsThisWeek,
  weekStreak,
  badges,
  spend,
} from './metrics'
import type { Application, AppEvent, Interview } from '../types'

function app(id: string, stages: string[]): Application {
  const base = Date.parse('2026-07-01T00:00:00Z')
  return {
    id,
    company: id,
    title: 'Eng',
    laneId: stages[stages.length - 1],
    stageHistory: stages.map((laneId, i) => ({
      laneId,
      at: new Date(base + i * 2 * 86_400_000).toISOString(), // +2 days per move
    })),
    createdAt: new Date(base).toISOString(),
    updatedAt: new Date(base).toISOString(),
  }
}

const apps: Application[] = [
  app('a1', ['wishlist', 'applied', 'screening', 'interviewing']),
  app('a2', ['applied']),
  app('a3', ['applied', 'screening']),
]

describe('funnel', () => {
  it('counts apps that reached each stage', () => {
    const f = funnel(apps)
    const by = Object.fromEntries(f.map((s) => [s.id, s.count]))
    expect(by).toEqual({ applied: 3, screening: 2, interviewing: 1, offer: 0 })
  })

  it('computes stage-to-stage conversion', () => {
    const f = funnel(apps)
    const conv = Object.fromEntries(f.map((s) => [s.id, s.conversionFromPrev]))
    expect(conv.applied).toBeNull()
    expect(conv.screening).toBe(67) // 2/3
    expect(conv.interviewing).toBe(50) // 1/2
    expect(conv.offer).toBe(0) // 0/1
  })
})

describe('avgDaysPerStage', () => {
  it('averages days between consecutive stage moves', () => {
    const d = avgDaysPerStage(apps)
    // Each move is +2 days apart in the fixture.
    expect(d.applied).toBe(2)
    expect(d.wishlist).toBe(2)
  })
})

describe('interviewStats', () => {
  it('totals and per-application ratio', () => {
    const interviews: Interview[] = [
      { id: 'i1', applicationId: 'a1', round: 1, type: 'recruiter', date: '2026-07-05', interviewers: [], outcome: 'passed', createdAt: '' },
      { id: 'i2', applicationId: 'a1', round: 2, type: 'technical', date: '2026-07-08', interviewers: [], outcome: 'pending', createdAt: '' },
    ]
    const s = interviewStats(apps, interviews)
    expect(s.total).toBe(2)
    expect(s.withInterview).toBe(1)
    expect(s.perApplication).toBeCloseTo(2 / 3, 2)
  })
})

describe('gamification', () => {
  const nowEvent = (type: AppEvent['type'], meta?: Record<string, unknown>): AppEvent => ({
    id: Math.random().toString(36),
    type,
    at: new Date().toISOString(),
    meta,
  })

  it('counts applications created this week', () => {
    const events = [nowEvent('application_created'), nowEvent('application_created')]
    expect(applicationsThisWeek(events)).toBe(2)
  })

  it('reports a streak of at least 1 when there is a recent application', () => {
    expect(weekStreak([nowEvent('application_created')])).toBeGreaterThanOrEqual(1)
  })

  it('earns milestone badges from the event log', () => {
    const events = [nowEvent('application_created'), nowEvent('interview_logged')]
    const earned = badges(events)
    expect(earned.find((b) => b.id === 'first-app')?.earned).toBe(true)
    expect(earned.find((b) => b.id === 'first-interview')?.earned).toBe(true)
    expect(earned.find((b) => b.id === 'first-offer')?.earned).toBe(false)
  })

  it('sums AI spend', () => {
    const events = [
      nowEvent('ai_usage', { inputTokens: 1000, outputTokens: 500, costUsd: 0.02 }),
      nowEvent('ai_usage', { inputTokens: 2000, outputTokens: 100, costUsd: 0.03 }),
    ]
    const s = spend(events)
    expect(s.week.costUsd).toBeCloseTo(0.05, 5)
    expect(s.week.inputTokens).toBe(3000)
  })
})

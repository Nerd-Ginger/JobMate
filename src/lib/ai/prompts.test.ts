import { describe, it, expect } from 'vitest'
import {
  coverLetterPrompt,
  fitCheckPrompt,
  parsePrompt,
  postingSummary,
  truncate,
  RESUME_LIMIT,
} from './prompts'
import type { Application } from '../../types'

const app: Application = {
  id: 'a1',
  company: 'Acme',
  title: 'Frontend Engineer',
  laneId: 'wishlist',
  stageHistory: [],
  createdAt: '',
  updatedAt: '',
  location: 'Remote',
  skills: ['React', 'TypeScript'],
  description: 'Build UIs with React.',
}

describe('postingSummary', () => {
  it('includes the key posting fields', () => {
    const s = postingSummary(app)
    expect(s).toContain('Acme')
    expect(s).toContain('Frontend Engineer')
    expect(s).toContain('React')
  })
})

describe('prompt builders', () => {
  it('embed the resume and posting in the cover-letter prompt', () => {
    const p = coverLetterPrompt(app, 'DANIEL WRIGHT — Product Manager')
    expect(p.user).toContain('DANIEL WRIGHT')
    expect(p.user).toContain('Acme')
    expect(p.system).toBeTruthy()
  })

  it('notes when no resume is provided', () => {
    const p = coverLetterPrompt(app, '')
    expect(p.user.toLowerCase()).toContain('not provided a resume')
  })

  it('asks for strict JSON in the fit-check prompt', () => {
    expect(fitCheckPrompt(app, 'resume').system.toLowerCase()).toContain('json')
  })

  it('parse prompt requests the extraction schema', () => {
    const p = parsePrompt('raw posting text')
    expect(p.user).toContain('raw posting text')
    expect(p.user).toContain('company')
  })
})

describe('truncate', () => {
  it('caps length', () => {
    expect(truncate('x'.repeat(RESUME_LIMIT + 100), RESUME_LIMIT)).toHaveLength(RESUME_LIMIT)
    expect(truncate('short', RESUME_LIMIT)).toBe('short')
  })
})

import { describe, it, expect } from 'vitest'
import { matchAtsUrl } from './ats'

describe('matchAtsUrl', () => {
  it('matches boards.greenhouse.io job URLs', () => {
    expect(matchAtsUrl('https://boards.greenhouse.io/stripe/jobs/1234567')).toEqual({
      ats: 'greenhouse',
      token: 'stripe',
      jobId: '1234567',
    })
  })

  it('matches the job-boards.greenhouse.io host variant', () => {
    expect(matchAtsUrl('https://job-boards.greenhouse.io/gitlab/jobs/8503792002')).toEqual({
      ats: 'greenhouse',
      token: 'gitlab',
      jobId: '8503792002',
    })
  })

  it('matches jobs.lever.co URLs', () => {
    expect(matchAtsUrl('https://jobs.lever.co/netflix/abc-def-123')).toEqual({
      ats: 'lever',
      token: 'netflix',
      jobId: 'abc-def-123',
    })
  })

  it('returns null for non-ATS URLs', () => {
    expect(matchAtsUrl('https://linkedin.com/jobs/view/999')).toBeNull()
    expect(matchAtsUrl('not a url')).toBeNull()
  })
})

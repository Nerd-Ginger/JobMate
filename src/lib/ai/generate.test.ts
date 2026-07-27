import { describe, it, expect } from 'vitest'
import { parseFitCheck, extractJson } from './generate'

describe('extractJson', () => {
  it('pulls the JSON object out of surrounding prose', () => {
    expect(extractJson('Here you go: {"a":1} thanks')).toBe('{"a":1}')
  })
  it('returns the input when no braces are present', () => {
    expect(extractJson('no json here')).toBe('no json here')
  })
})

describe('parseFitCheck', () => {
  it('parses a well-formed fit check and clamps the score', () => {
    const fit = parseFitCheck('{"score": 12, "gaps": ["a","b","c","d"], "summary": "ok"}')
    expect(fit).not.toBeNull()
    expect(fit!.score).toBe(10) // clamped to 1..10
    expect(fit!.gaps).toHaveLength(3) // capped at 3
    expect(fit!.summary).toBe('ok')
  })

  it('handles prose-wrapped JSON', () => {
    const fit = parseFitCheck('Assessment: {"score": 7, "gaps": [], "summary": "solid"}')
    expect(fit?.score).toBe(7)
  })

  it('returns null on malformed output', () => {
    expect(parseFitCheck('not json')).toBeNull()
    expect(parseFitCheck('{"summary":"no score"}')).toBeNull()
  })
})

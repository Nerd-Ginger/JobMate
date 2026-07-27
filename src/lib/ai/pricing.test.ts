import { describe, it, expect } from 'vitest'
import { estimateCost, hashKey } from './pricing'
import type { ModelPrice } from '../../types'

const prices: ModelPrice[] = [
  { model: 'claude-haiku-4-5', inputPerMTok: 1, outputPerMTok: 5 },
  { model: 'claude-sonnet-5', inputPerMTok: 3, outputPerMTok: 15 },
]

describe('estimateCost', () => {
  it('prices input and output tokens per the table', () => {
    // 1M input @ $3 + 1M output @ $15 = $18
    expect(estimateCost({ inputTokens: 1_000_000, outputTokens: 1_000_000 }, 'claude-sonnet-5', prices)).toBeCloseTo(18, 5)
  })

  it('returns 0 for an unpriced model', () => {
    expect(estimateCost({ inputTokens: 1000, outputTokens: 1000 }, 'mystery', prices)).toBe(0)
  })
})

describe('hashKey', () => {
  it('is deterministic and order-sensitive', () => {
    expect(hashKey('a', 'b')).toBe(hashKey('a', 'b'))
    expect(hashKey('a', 'b')).not.toBe(hashKey('b', 'a'))
  })
})

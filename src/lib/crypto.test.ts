import { describe, it, expect } from 'vitest'
import { encryptSecret, decryptSecret } from './crypto'

describe('crypto', () => {
  it('round-trips a secret with the right passphrase', async () => {
    const secret = await encryptSecret('sk-ant-abc123', 'correct horse')
    expect(secret.ciphertext).toBeTruthy()
    expect(JSON.stringify(secret)).not.toContain('sk-ant-abc123')
    const plain = await decryptSecret(secret, 'correct horse')
    expect(plain).toBe('sk-ant-abc123')
  })

  it('rejects a wrong passphrase', async () => {
    const secret = await encryptSecret('sk-ant-abc123', 'correct horse')
    await expect(decryptSecret(secret, 'wrong')).rejects.toBeDefined()
  })

  it('produces distinct salt/iv per call', async () => {
    const a = await encryptSecret('x', 'p')
    const b = await encryptSecret('x', 'p')
    expect(a.salt).not.toBe(b.salt)
    expect(a.iv).not.toBe(b.iv)
  })
})

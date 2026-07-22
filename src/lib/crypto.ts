import type { EncryptedSecret } from '../types'

// Device-only encryption of the Anthropic API key (PRD §1, §9). AES-GCM with a
// key derived from a user passphrase via PBKDF2. Nothing leaves the device.

const enc = new TextEncoder()
const dec = new TextDecoder()

function toB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function fromB64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

async function deriveKey(
  passphrase: string,
  salt: BufferSource,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase) as BufferSource,
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 150_000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptSecret(
  plaintext: string,
  passphrase: string,
): Promise<EncryptedSecret> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext) as BufferSource,
  )
  return {
    ciphertext: toB64(ciphertext),
    iv: toB64(iv.buffer),
    salt: toB64(salt.buffer),
  }
}

// Throws if the passphrase is wrong (GCM auth tag fails to verify).
export async function decryptSecret(
  secret: EncryptedSecret,
  passphrase: string,
): Promise<string> {
  const salt = fromB64(secret.salt) as BufferSource
  const iv = fromB64(secret.iv) as BufferSource
  const key = await deriveKey(passphrase, salt)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    fromB64(secret.ciphertext) as BufferSource,
  )
  return dec.decode(plaintext)
}

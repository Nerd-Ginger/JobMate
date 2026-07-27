import { webcrypto } from 'node:crypto'

// jsdom exposes crypto.getRandomValues but not subtle; back it with Node's
// WebCrypto so the at-rest encryption test can run.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  })
}

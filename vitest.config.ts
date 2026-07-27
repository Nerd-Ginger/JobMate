import { defineConfig } from 'vitest/config'

// Tests exercise pure logic only (no network, no live API key). jsdom provides
// DOMParser / File / document used by the import + resume modules.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
})

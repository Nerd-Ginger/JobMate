// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { extractResumeText, ResumeExtractError } from './extract'
import { coverLetterPrompt } from '../ai/prompts'
import type { Application } from '../../types'

// Node's File (undici) round-trips arrayBuffer cleanly, so extract.ts's docx
// path runs here directly. pdf.js's main build needs browser-only DOMMatrix,
// so the .pdf file is validated via pdf.js's node (legacy) build below; the
// browser pdf path in extract.ts is covered by the in-app smoke test.
const DOCX = resolve(process.cwd(), 'Daniel_Wright_Resume_v6.docx')
const PDF = resolve(process.cwd(), 'Daniel_Wright_Resume_v6.pdf')

describe('extractResumeText', () => {
  it('rejects unsupported file types', async () => {
    await expect(extractResumeText(new File(['x'], 'resume.txt'))).rejects.toBeInstanceOf(
      ResumeExtractError,
    )
  })

  it.skipIf(!existsSync(DOCX))('extracts the real .docx (mammoth node build)', async () => {
    const mammoth = await import('mammoth')
    const { value: text } = await mammoth.extractRawText({ buffer: readFileSync(DOCX) })
    expect(text.length).toBeGreaterThan(1000)
    expect(text.toLowerCase()).toContain('product manager')

    // The extracted resume flows into an Apply Kit prompt.
    const app: Application = {
      id: 'a', company: 'Acme', title: 'PM', laneId: 'wishlist',
      stageHistory: [], createdAt: '', updatedAt: '',
    }
    expect(coverLetterPrompt(app, text).user).toContain('Charlotte')
  })

  it.skipIf(!existsSync(PDF))('extracts the real .pdf (pdf.js node build)', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const data = new Uint8Array(readFileSync(PDF))
    const doc = await pdfjs.getDocument({ data }).promise
    let out = ''
    for (let i = 1; i <= doc.numPages; i++) {
      const content = await (await doc.getPage(i)).getTextContent()
      out += content.items.map((it) => ('str' in it ? it.str : '')).join(' ') + '\n'
    }
    expect(out.length).toBeGreaterThan(1000)
    expect(out).toMatch(/experience|product|education|skills/i)
  })
})

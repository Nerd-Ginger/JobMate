import { RESUME_LIMIT } from '../ai/prompts'

// Extract plain text from an uploaded resume (.docx / .pdf) for the profile.
// Heavy parsers are dynamic-imported so they never enter the main bundle.

export class ResumeExtractError extends Error {}

export async function extractResumeText(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  const buf = await file.arrayBuffer()
  let raw: string
  if (name.endsWith('.docx')) raw = await extractDocx(buf)
  else if (name.endsWith('.pdf')) raw = await extractPdf(buf)
  else throw new ResumeExtractError('Unsupported file. Upload a .docx or .pdf.')
  return normalize(raw)
}

async function extractDocx(buf: ArrayBuffer): Promise<string> {
  const mammoth = await import('mammoth')
  const { value } = await mammoth.extractRawText({ arrayBuffer: buf })
  return value
}

async function extractPdf(buf: ArrayBuffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  // Vite resolves ?url to the worker asset; harmless to reset each call.
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise
  let out = ''
  for (let page = 1; page <= doc.numPages; page++) {
    const content = await (await doc.getPage(page)).getTextContent()
    out +=
      content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ') + '\n'
  }
  return out
}

function normalize(text: string): string {
  const cleaned = text
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
  return cleaned.length > RESUME_LIMIT ? cleaned.slice(0, RESUME_LIMIT) : cleaned
}

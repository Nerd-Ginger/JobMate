import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { importFromUrl, importFromPaste, ImportNeedsPaste } from '../lib/import/pipeline'
import { estimateCost } from '../lib/ai/pricing'
import type { ParsedPosting } from '../lib/import/types'
import { inputClass, labelClass, btnPrimary, btnGhost } from './ui'

export default function ImportModal({
  onImported,
  onClose,
}: {
  onImported: (posting: ParsedPosting) => void
  onClose: () => void
}) {
  const store = useAppStore()
  const [url, setUrl] = useState('')
  const [paste, setPaste] = useState('')
  const [pasteMode, setPasteMode] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const ctx = () => ({
    settings: store.settings,
    apiKey: store.apiKey,
    onProgress: (m: string) => setProgress(m),
  })

  async function logUsage(usage?: { inputTokens: number; outputTokens: number }, model?: string) {
    if (!usage || !model) return
    await store.recordEvent('ai_usage', undefined, {
      feature: 'parse',
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      costUsd: estimateCost(usage, model, store.settings.prices),
    })
  }

  async function runUrl() {
    setBusy(true)
    setError(null)
    setProgress(null)
    try {
      const result = await importFromUrl(url.trim(), ctx())
      await logUsage(result.usage, result.model)
      onImported(result.posting)
    } catch (err) {
      if (err instanceof ImportNeedsPaste) {
        setPasteMode(true)
        setError(err.message)
      } else {
        setError(err instanceof Error ? err.message : 'Import failed.')
      }
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  async function runPaste() {
    setBusy(true)
    setError(null)
    try {
      const result = await importFromPaste(paste, ctx(), url.trim() || undefined)
      await logUsage(result.usage, result.model)
      onImported(result.posting)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/60 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-lg rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-100">Import a job</h2>
        <p className="mt-1 text-sm text-slate-400">
          Paste a job URL. Greenhouse and Lever links import directly; other sites try structured
          data, then AI parsing if your key is unlocked.
        </p>

        <div className="mt-4">
          <label className={labelClass}>Job URL</label>
          <input
            className={inputClass}
            placeholder="https://boards.greenhouse.io/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        {pasteMode && (
          <div className="mt-4">
            <label className={labelClass}>Or paste the job description</label>
            <textarea
              className={`${inputClass} min-h-40 resize-y`}
              placeholder="Paste the posting text here…"
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
            />
            {!store.apiKey && (
              <p className="mt-1 text-xs text-slate-500">
                No API key unlocked — the text becomes the description and you fill in company/title.
              </p>
            )}
          </div>
        )}

        {progress && <p className="mt-3 text-sm text-sky-400">{progress}</p>}
        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className={btnGhost}>
            Cancel
          </button>
          {!pasteMode && (
            <button onClick={() => setPasteMode(true)} className={btnGhost}>
              Paste instead
            </button>
          )}
          {pasteMode ? (
            <button onClick={runPaste} disabled={busy || !paste.trim()} className={btnPrimary}>
              {busy ? 'Importing…' : 'Import text'}
            </button>
          ) : (
            <button onClick={runUrl} disabled={busy || !url.trim()} className={btnPrimary}>
              {busy ? 'Importing…' : 'Import URL'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

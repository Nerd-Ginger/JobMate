import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { loadCachedKit, parseFitCheck } from '../lib/ai/generate'
import { AiError } from '../lib/ai/anthropic'
import type { AiCacheEntry, AiFeature } from '../types'

const KIT_FEATURES: { feature: AiFeature; label: string; hint: string }[] = [
  { feature: 'fitCheck', label: 'Fit check', hint: 'Cheap 1–10 score before you invest time' },
  { feature: 'coverLetter', label: 'Cover letter', hint: '220–280 words' },
  { feature: 'bullets', label: 'Tailored bullets', hint: '4–6 resume bullets' },
  { feature: 'screeningAnswers', label: 'Screening answers', hint: 'Why us / why role / salary / availability' },
  { feature: 'interviewPrep', label: 'Interview prep', hint: '8 likely questions + angles' },
]

export default function ApplyKitPanel({ applicationId }: { applicationId: string }) {
  const apiKey = useAppStore((s) => s.apiKey)
  const generate = useAppStore((s) => s.generateAiFeature)

  const [cache, setCache] = useState<Partial<Record<AiFeature, AiCacheEntry>>>({})
  const [busy, setBusy] = useState<AiFeature | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCachedKit(applicationId).then(setCache)
  }, [applicationId])

  const fit = cache.fitCheck ? parseFitCheck(cache.fitCheck.output) : null

  async function run(feature: AiFeature, force = false) {
    // Fit-check gate (PRD §7.5): low fit → speed bump before expensive spend.
    if (feature !== 'fitCheck' && fit && fit.score < 5 && !force) {
      if (
        !window.confirm(
          `Fit check scored ${fit.score}/10 for this role. Generate anyway?`,
        )
      )
        return
    }
    setBusy(feature)
    setError(null)
    try {
      const { entry } = await generate(feature, applicationId, force)
      setCache((c) => ({ ...c, [feature]: entry }))
    } catch (err) {
      setError(err instanceof AiError || err instanceof Error ? err.message : 'Failed.')
    } finally {
      setBusy(null)
    }
  }

  if (!apiKey) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300">
        Unlock your Anthropic API key in <span className="font-medium">Settings</span> to
        generate cover letters, tailored bullets, screening answers, a fit check, and
        interview prep from your resume and this posting.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-sm text-rose-300">
          {error}
        </div>
      )}

      {KIT_FEATURES.map(({ feature, label, hint }) => {
        const entry = cache[feature]
        return (
          <div key={feature} className="rounded-lg border border-slate-700 bg-slate-800">
            <div className="flex items-center justify-between gap-2 p-3">
              <div>
                <div className="text-sm font-medium text-slate-100">{label}</div>
                <div className="text-xs text-slate-500">{hint}</div>
              </div>
              <div className="flex shrink-0 gap-2">
                {entry && (
                  <button
                    onClick={() => run(feature, true)}
                    disabled={busy !== null}
                    className="rounded-lg px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                  >
                    Regenerate
                  </button>
                )}
                {!entry && (
                  <button
                    onClick={() => run(feature)}
                    disabled={busy !== null}
                    className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                  >
                    {busy === feature ? 'Generating…' : 'Generate'}
                  </button>
                )}
              </div>
            </div>

            {feature === 'fitCheck' && fit ? (
              <div className="border-t border-slate-700 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-sky-400">{fit.score}</span>
                  <span className="text-sm text-slate-400">/ 10 · {fit.summary}</span>
                </div>
                {fit.gaps.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-sm text-slate-300">
                    {fit.gaps.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : entry ? (
              <KitOutput text={entry.output} />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function KitOutput({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="border-t border-slate-700 p-3">
      <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap font-sans text-sm text-slate-200">
        {text}
      </pre>
      <button
        onClick={copy}
        className="mt-2 rounded-lg px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  )
}

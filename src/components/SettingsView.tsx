import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { spend } from '../lib/metrics'
import { inputClass, labelClass, btnPrimary } from './ui'
import type { WatchlistEntry } from '../types'

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-800/40 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{title}</h2>
      {desc && <p className="mt-1 text-xs text-slate-500">{desc}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

export default function SettingsView() {
  const store = useAppStore()
  const { settings, profile } = store

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <ApiKeySection />
        <SpendSection />

        <Section title="Weekly goal">
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              className={`${inputClass} w-28`}
              value={settings.weeklyGoal}
              onChange={(e) => store.updateSettings({ weeklyGoal: Number(e.target.value) })}
            />
            <span className="text-sm text-slate-400">applications per week</span>
          </div>
          <div className="mt-4">
            <label className={labelClass}>Soft budget (USD / month, optional)</label>
            <input
              type="number"
              min={0}
              step="0.5"
              className={`${inputClass} w-40`}
              value={settings.softBudgetUsd ?? ''}
              placeholder="none"
              onChange={(e) =>
                store.updateSettings({
                  softBudgetUsd: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
        </Section>

        <Section
          title="Profile"
          desc="Used to generate cover letters, tailored bullets, and screening answers. Stored on this device only."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name" value={profile.fullName ?? ''} onChange={(v) => store.updateProfile({ fullName: v })} />
            <Field label="Email" value={profile.email ?? ''} onChange={(v) => store.updateProfile({ email: v })} />
            <Field label="Phone" value={profile.phone ?? ''} onChange={(v) => store.updateProfile({ phone: v })} />
            <Field label="Location" value={profile.location ?? ''} onChange={(v) => store.updateProfile({ location: v })} />
            <Field label="Work authorization" value={profile.workAuthorization ?? ''} onChange={(v) => store.updateProfile({ workAuthorization: v })} />
          </div>
          <div className="mt-4">
            <label className={labelClass}>Resume (plain text, ≤ ~8k chars)</label>
            <textarea
              className={`${inputClass} min-h-40 resize-y font-mono text-xs`}
              value={profile.resumeText ?? ''}
              onChange={(e) => store.updateProfile({ resumeText: e.target.value })}
              placeholder="Paste your resume text here…"
            />
            <p className="mt-1 text-xs text-slate-500">
              {(profile.resumeText?.length ?? 0).toLocaleString()} characters
            </p>
          </div>
        </Section>

        <WatchlistSection />
        <ModelsSection />
      </div>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function ApiKeySection() {
  const store = useAppStore()
  const hasStoredKey = !!store.settings.encryptedApiKey
  const unlocked = !!store.apiKey

  const [key, setKey] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    setError(null)
    if (!key.trim() || !pass) {
      setError('Enter both an API key and a passphrase.')
      return
    }
    setBusy(true)
    try {
      await store.setApiKey(key.trim(), pass)
      setKey('')
      setPass('')
    } catch {
      setError('Could not save the key.')
    } finally {
      setBusy(false)
    }
  }

  async function unlock() {
    setError(null)
    setBusy(true)
    try {
      await store.unlockApiKey(pass)
      setPass('')
    } catch {
      setError('Wrong passphrase.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section
      title="Anthropic API key"
      desc="Encrypted at rest with your passphrase (WebCrypto). Never leaves this device and is excluded from exports."
    >
      {unlocked ? (
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Unlocked for this session
          </span>
          <button
            onClick={() => store.clearApiKey()}
            className="rounded-lg px-3 py-1.5 text-sm text-rose-400 hover:bg-rose-500/10"
          >
            Remove key
          </button>
        </div>
      ) : hasStoredKey ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">A key is stored. Enter your passphrase to unlock it.</p>
          <div className="flex gap-2">
            <input
              type="password"
              className={inputClass}
              placeholder="Passphrase"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
            <button onClick={unlock} disabled={busy} className={btnPrimary}>
              Unlock
            </button>
          </div>
          <button
            onClick={() => store.clearApiKey()}
            className="text-xs text-slate-500 hover:text-rose-400"
          >
            Forget stored key
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="password"
            className={inputClass}
            placeholder="sk-ant-…"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          <div className="flex gap-2">
            <input
              type="password"
              className={inputClass}
              placeholder="Choose a passphrase"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
            <button onClick={save} disabled={busy} className={btnPrimary}>
              Save
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
    </Section>
  )
}

function SpendSection() {
  const events = useAppStore((s) => s.events)
  const softBudget = useAppStore((s) => s.settings.softBudgetUsd)
  const { week, month } = spend(events)
  const overBudget = softBudget != null && softBudget > 0 && month.costUsd >= softBudget * 0.8

  return (
    <Section title="Spend meter" desc="Estimated Anthropic API cost, logged from each response's token usage.">
      {overBudget && (
        <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-sm text-amber-300">
          You've used {Math.round((month.costUsd / softBudget!) * 100)}% of your ${softBudget} monthly soft budget.
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <SpendCard label="This week" cost={week.costUsd} tokens={week.inputTokens + week.outputTokens} />
        <SpendCard label="This month" cost={month.costUsd} tokens={month.inputTokens + month.outputTokens} />
      </div>
    </Section>
  )
}

function SpendCard({ label, cost, tokens }: { label: string; cost: number; tokens: number }) {
  return (
    <div className="rounded-lg bg-slate-800 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-100">${cost.toFixed(3)}</div>
      <div className="text-xs text-slate-500">{tokens.toLocaleString()} tokens</div>
    </div>
  )
}

function WatchlistSection() {
  const store = useAppStore()
  const watchlist = store.settings.watchlist
  const [ats, setAts] = useState<'greenhouse' | 'lever'>('greenhouse')
  const [token, setToken] = useState('')
  const [label, setLabel] = useState('')

  function add() {
    if (!token.trim()) return
    const entry: WatchlistEntry = {
      ats,
      token: token.trim(),
      label: label.trim() || token.trim(),
    }
    store.updateSettings({ watchlist: [...watchlist, entry] })
    setToken('')
    setLabel('')
  }

  function remove(i: number) {
    store.updateSettings({ watchlist: watchlist.filter((_, idx) => idx !== i) })
  }

  return (
    <Section
      title="Company watchlist"
      desc="Greenhouse / Lever board tokens (e.g. the slug in boards.greenhouse.io/stripe). Polled on the Discover tab."
    >
      <div className="space-y-2">
        {watchlist.map((w, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2">
            <span className="text-sm text-slate-200">
              <span className="rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-300">{w.ats}</span>{' '}
              {w.label} <span className="text-slate-500">({w.token})</span>
            </span>
            <button onClick={() => remove(i)} className="text-xs text-slate-500 hover:text-rose-400">
              Remove
            </button>
          </div>
        ))}
        {watchlist.length === 0 && <p className="text-sm text-slate-500">No companies watched yet.</p>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <select className={`${inputClass} w-32`} value={ats} onChange={(e) => setAts(e.target.value as 'greenhouse' | 'lever')}>
          <option value="greenhouse">Greenhouse</option>
          <option value="lever">Lever</option>
        </select>
        <input className={`${inputClass} w-36`} placeholder="board token" value={token} onChange={(e) => setToken(e.target.value)} />
        <input className={`${inputClass} w-36`} placeholder="label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
        <button onClick={add} className={btnPrimary}>
          Add
        </button>
      </div>
    </Section>
  )
}

function ModelsSection() {
  const store = useAppStore()
  const { models, maxTokens } = store.settings
  const features = Object.keys(models) as (keyof typeof models)[]

  return (
    <Section title="Models & token budgets" desc="Per-feature model routing and hard max_tokens caps (PRD defaults: Haiku for parsing/fit, Sonnet for generation).">
      <div className="space-y-2">
        {features.map((f) => (
          <div key={f} className="grid grid-cols-[1fr_2fr_1fr] items-center gap-2">
            <span className="text-sm capitalize text-slate-300">{f.replace(/([A-Z])/g, ' $1')}</span>
            <input
              className={`${inputClass} text-xs`}
              value={models[f]}
              onChange={(e) => store.updateSettings({ models: { ...models, [f]: e.target.value } })}
            />
            <input
              type="number"
              className={`${inputClass} text-xs`}
              value={maxTokens[f]}
              onChange={(e) => store.updateSettings({ maxTokens: { ...maxTokens, [f]: Number(e.target.value) } })}
            />
          </div>
        ))}
      </div>
    </Section>
  )
}

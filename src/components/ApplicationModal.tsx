import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { Application } from '../types'

interface Props {
  // The application being edited, or null when adding a new one.
  application: Application | null
  onClose: () => void
}

interface FormState {
  company: string
  title: string
  laneId: string
  url: string
  source: string
  location: string
  salary: string
  remote: boolean
  notes: string
}

function initialForm(app: Application | null, defaultLaneId: string): FormState {
  return {
    company: app?.company ?? '',
    title: app?.title ?? '',
    laneId: app?.laneId ?? defaultLaneId,
    url: app?.url ?? '',
    source: app?.source ?? '',
    location: app?.location ?? '',
    salary: app?.salary ?? '',
    remote: app?.remote ?? false,
    notes: app?.notes ?? '',
  }
}

const inputClass =
  'w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500'
const labelClass = 'mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400'

export default function ApplicationModal({ application, onClose }: Props) {
  const lanes = useAppStore((s) => s.lanes)
  const addApplication = useAppStore((s) => s.addApplication)
  const updateApplication = useAppStore((s) => s.updateApplication)
  const deleteApplication = useAppStore((s) => s.deleteApplication)

  const defaultLaneId = lanes[0]?.id ?? 'wishlist'
  const [form, setForm] = useState<FormState>(() =>
    initialForm(application, defaultLaneId),
  )
  const [saving, setSaving] = useState(false)

  const isEdit = application !== null
  const canSave = form.company.trim() !== '' && form.title.trim() !== ''

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!canSave || saving) return
    setSaving(true)
    const payload = {
      company: form.company.trim(),
      title: form.title.trim(),
      laneId: form.laneId,
      url: form.url.trim() || undefined,
      source: form.source.trim() || undefined,
      location: form.location.trim() || undefined,
      salary: form.salary.trim() || undefined,
      remote: form.remote,
      notes: form.notes.trim() || undefined,
    }
    if (isEdit) {
      await updateApplication(application!.id, payload)
    } else {
      await addApplication(payload)
    }
    onClose()
  }

  async function handleDelete() {
    if (!isEdit) return
    if (!window.confirm('Delete this application? This cannot be undone.')) return
    setSaving(true)
    await deleteApplication(application!.id)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-lg rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-100">
          {isEdit ? 'Edit application' : 'Add application'}
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <label className={labelClass}>Company *</label>
            <input
              className={inputClass}
              value={form.company}
              autoFocus
              onChange={(e) => set('company', e.target.value)}
            />
          </div>
          <div className="sm:col-span-1">
            <label className={labelClass}>Role / Title *</label>
            <input
              className={inputClass}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Lane</label>
            <select
              className={inputClass}
              value={form.laneId}
              onChange={(e) => set('laneId', e.target.value)}
            >
              {lanes.map((lane) => (
                <option key={lane.id} value={lane.id}>
                  {lane.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Source</label>
            <input
              className={inputClass}
              value={form.source}
              placeholder="LinkedIn, referral…"
              onChange={(e) => set('source', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Location</label>
            <input
              className={inputClass}
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Salary</label>
            <input
              className={inputClass}
              value={form.salary}
              onChange={(e) => set('salary', e.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>URL</label>
            <input
              className={inputClass}
              value={form.url}
              onChange={(e) => set('url', e.target.value)}
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              id="remote"
              type="checkbox"
              className="h-4 w-4 rounded border-slate-600 bg-slate-900"
              checked={form.remote}
              onChange={(e) => set('remote', e.target.checked)}
            />
            <label htmlFor="remote" className="text-sm text-slate-300">
              Remote
            </label>
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea
              className={`${inputClass} min-h-20 resize-y`}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          {isEdit ? (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="rounded-lg px-3 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/10 disabled:opacity-50"
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave || saving}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isEdit ? 'Save' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

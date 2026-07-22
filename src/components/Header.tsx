import { useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import { downloadExport, parseImport, ImportError } from '../lib/exportImport'
import type { View } from '../types-ui'

interface Props {
  view: View
  onView: (v: View) => void
  onAdd: () => void
  onImportJob: () => void
}

const NAV: { id: View; label: string }[] = [
  { id: 'board', label: 'Board' },
  { id: 'discover', label: 'Discover' },
  { id: 'insights', label: 'Insights' },
  { id: 'settings', label: 'Settings' },
]

export default function Header({ view, onView, onAdd, onImportJob }: Props) {
  const store = useAppStore()
  const fileRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    downloadExport({
      lanes: store.lanes,
      applications: store.applications,
      interviews: store.interviews,
      events: store.events,
      profile: store.profile,
      settings: store.settings,
    })
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const parsed = parseImport(await file.text())
      const ok = window.confirm(
        `Import ${parsed.applications.length} application(s)? ` +
          'This replaces all current data on this device.',
      )
      if (!ok) return
      await store.replaceAll({
        lanes: parsed.lanes,
        applications: parsed.applications,
        interviews: parsed.interviews,
        events: parsed.events,
        profile: parsed.profile,
        settings: parsed.settings,
      })
    } catch (err) {
      const msg = err instanceof ImportError ? err.message : 'Could not import file.'
      window.alert(`Import failed: ${msg}`)
    }
  }

  const btn = 'rounded-lg px-3 py-2 text-sm font-medium transition-colors'

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
      <div className="flex items-center gap-6">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-bold text-slate-100">JobMate</h1>
        </div>
        <nav className="flex items-center gap-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => onView(n.id)}
              className={`${btn} ${
                view === n.id
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              {n.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleExport}
          className={`${btn} text-slate-300 hover:bg-slate-800`}
        >
          Export
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className={`${btn} text-slate-300 hover:bg-slate-800`}
        >
          Import
        </button>
        {view === 'board' && (
          <>
            <button
              onClick={onImportJob}
              className={`${btn} border border-slate-700 text-slate-200 hover:bg-slate-800`}
            >
              Import job
            </button>
            <button
              onClick={onAdd}
              className={`${btn} bg-sky-600 text-white hover:bg-sky-500`}
            >
              + Add application
            </button>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </header>
  )
}

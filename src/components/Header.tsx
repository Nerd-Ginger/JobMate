import { useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import { downloadExport, parseImport, ImportError } from '../lib/exportImport'

interface Props {
  onAdd: () => void
}

export default function Header({ onAdd }: Props) {
  const lanes = useAppStore((s) => s.lanes)
  const applications = useAppStore((s) => s.applications)
  const replaceAll = useAppStore((s) => s.replaceAll)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    downloadExport(lanes, applications)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-importing the same file
    if (!file) return
    try {
      const parsed = parseImport(await file.text())
      const ok = window.confirm(
        `Import ${parsed.applications.length} application(s)? ` +
          'This replaces all current data on this device.',
      )
      if (!ok) return
      await replaceAll(parsed.lanes, parsed.applications)
    } catch (err) {
      const msg = err instanceof ImportError ? err.message : 'Could not import file.'
      window.alert(`Import failed: ${msg}`)
    }
  }

  const btn =
    'rounded-lg px-3 py-2 text-sm font-medium transition-colors'

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
      <div className="flex items-baseline gap-2">
        <h1 className="text-xl font-bold text-slate-100">JobMate</h1>
        <span className="text-sm text-slate-500">Job Application Tracker</span>
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
        <button
          onClick={onAdd}
          className={`${btn} bg-sky-600 text-white hover:bg-sky-500`}
        >
          + Add application
        </button>
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

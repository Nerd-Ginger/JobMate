import { useEffect, useState } from 'react'
import { useAppStore } from './store/useAppStore'
import type { View } from './types-ui'
import type { ParsedPosting } from './lib/import/types'
import Header from './components/Header'
import Board from './components/Board'
import ApplicationModal from './components/ApplicationModal'
import ApplicationDrawer from './components/ApplicationDrawer'
import ImportModal from './components/ImportModal'
import SettingsView from './components/SettingsView'
import InsightsView from './components/InsightsView'
import DiscoverView from './components/DiscoverView'

export default function App() {
  const load = useAppStore((s) => s.load)
  const loaded = useAppStore((s) => s.loaded)

  const [view, setView] = useState<View>('board')
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  // undefined: closed; ParsedPosting|null: create modal (with/without prefill)
  const [createModal, setCreateModal] = useState<ParsedPosting | null | undefined>(undefined)

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="flex h-full flex-col">
      <Header
        view={view}
        onView={setView}
        onAdd={() => setCreateModal(null)}
        onImportJob={() => setShowImport(true)}
      />

      <main className="min-h-0 flex-1 pt-4">
        {!loaded ? (
          <p className="px-4 text-slate-500">Loading…</p>
        ) : view === 'board' ? (
          <Board onEdit={(app) => setDrawerId(app.id)} />
        ) : view === 'discover' ? (
          <DiscoverView />
        ) : view === 'insights' ? (
          <InsightsView />
        ) : (
          <SettingsView />
        )}
      </main>

      {createModal !== undefined && (
        <ApplicationModal
          prefill={createModal ?? undefined}
          onClose={() => setCreateModal(undefined)}
        />
      )}

      {drawerId && (
        <ApplicationDrawer applicationId={drawerId} onClose={() => setDrawerId(null)} />
      )}

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={(posting) => {
            setShowImport(false)
            setCreateModal(posting)
          }}
        />
      )}
    </div>
  )
}

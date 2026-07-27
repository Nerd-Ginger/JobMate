import { lazy, Suspense, useEffect, useState } from 'react'
import { useAppStore } from './store/useAppStore'
import { processInbox, publishOutbox } from './lib/bridge'
import type { View } from './types-ui'
import type { ParsedPosting } from './lib/import/types'
import Header from './components/Header'
import Board from './components/Board'
import ApplicationModal from './components/ApplicationModal'
import ApplicationDrawer from './components/ApplicationDrawer'
import ImportModal from './components/ImportModal'

// Insights pulls in Recharts (~heavy) and Discover/Settings aren't the landing
// view — lazy-load them so the initial board bundle stays lean.
const SettingsView = lazy(() => import('./components/SettingsView'))
const InsightsView = lazy(() => import('./components/InsightsView'))
const DiscoverView = lazy(() => import('./components/DiscoverView'))

export default function App() {
  const load = useAppStore((s) => s.load)
  const loaded = useAppStore((s) => s.loaded)

  const [view, setView] = useState<View>('board')
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  // undefined: closed; ParsedPosting|null: create modal (with/without prefill)
  const [createModal, setCreateModal] = useState<ParsedPosting | null | undefined>(undefined)

  const profile = useAppStore((s) => s.profile)

  useEffect(() => {
    void load()
  }, [load])

  // Bridge: import any jobs the companion extension captured, then keep the
  // profile published for autofill.
  useEffect(() => {
    if (!loaded) return
    const { applications, addApplication } = useAppStore.getState()
    const urls = new Set(applications.map((a) => a.url).filter(Boolean) as string[])
    void processInbox(urls, addApplication)
  }, [loaded])

  useEffect(() => {
    if (loaded) publishOutbox(profile)
  }, [loaded, profile])

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
        ) : (
          <Suspense fallback={<p className="px-6 text-slate-500">Loading…</p>}>
            {view === 'discover' ? (
              <DiscoverView />
            ) : view === 'insights' ? (
              <InsightsView />
            ) : (
              <SettingsView />
            )}
          </Suspense>
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

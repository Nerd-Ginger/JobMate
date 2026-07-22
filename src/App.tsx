import { useEffect, useState } from 'react'
import { useAppStore } from './store/useAppStore'
import type { Application } from './types'
import Header from './components/Header'
import Board from './components/Board'
import ApplicationModal from './components/ApplicationModal'

export default function App() {
  const load = useAppStore((s) => s.load)
  const loaded = useAppStore((s) => s.loaded)

  // modal === undefined: closed; null: adding; Application: editing.
  const [modal, setModal] = useState<Application | null | undefined>(undefined)

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="flex h-full flex-col">
      <Header onAdd={() => setModal(null)} />

      <main className="min-h-0 flex-1 pt-4">
        {loaded ? (
          <Board onEdit={(app) => setModal(app)} />
        ) : (
          <p className="px-4 text-slate-500">Loading…</p>
        )}
      </main>

      {modal !== undefined && (
        <ApplicationModal
          application={modal}
          onClose={() => setModal(undefined)}
        />
      )}
    </div>
  )
}

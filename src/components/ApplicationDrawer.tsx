import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import ApplicationForm from './ApplicationForm'
import InterviewLog from './InterviewLog'
import ApplyKitPanel from './ApplyKitPanel'

type Tab = 'details' | 'interviews' | 'kit'

const TABS: { id: Tab; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'interviews', label: 'Interviews' },
  { id: 'kit', label: 'Apply Kit' },
]

export default function ApplicationDrawer({
  applicationId,
  onClose,
}: {
  applicationId: string
  onClose: () => void
}) {
  const application = useAppStore((s) =>
    s.applications.find((a) => a.id === applicationId),
  )
  const [tab, setTab] = useState<Tab>('details')

  if (!application) return null

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/50" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-xl flex-col bg-slate-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-700 p-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">{application.company}</h2>
            <p className="text-sm text-slate-400">{application.title}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-1 border-b border-slate-700 px-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-sm font-medium ${
                tab === t.id
                  ? 'border-b-2 border-sky-500 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {tab === 'details' && (
            <ApplicationForm application={application} onDone={onClose} />
          )}
          {tab === 'interviews' && <InterviewLog applicationId={applicationId} />}
          {tab === 'kit' && <ApplyKitPanel applicationId={applicationId} />}
        </div>
      </div>
    </div>
  )
}

import { useDroppable } from '@dnd-kit/core'
import type { Application, Lane as LaneType } from '../types'
import ApplicationCard from './ApplicationCard'

interface Props {
  lane: LaneType
  applications: Application[]
  onEdit: (app: Application) => void
}

export default function Lane({ lane, applications, onEdit }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: lane.id })

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl bg-slate-800/40">
      <div className="flex items-center justify-between px-3 py-2.5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          {lane.name}
        </h2>
        <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-300">
          {applications.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 overflow-y-auto rounded-b-xl border-2 border-dashed p-2 transition-colors ${
          isOver ? 'border-sky-500/60 bg-sky-500/5' : 'border-transparent'
        }`}
      >
        {applications.map((app) => (
          <ApplicationCard key={app.id} application={app} onEdit={onEdit} />
        ))}
        {applications.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-slate-500">
            Drop applications here
          </p>
        )}
      </div>
    </div>
  )
}

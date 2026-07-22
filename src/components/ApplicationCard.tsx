import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Application } from '../types'

interface Props {
  application: Application
  onEdit: (app: Application) => void
}

const OUTCOME_STYLES: Record<string, string> = {
  Rejected: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
  Withdrawn: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  Accepted: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
}

export default function ApplicationCard({ application, onEdit }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: application.id })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onEdit(application)}
      className="cursor-grab rounded-lg border border-slate-700 bg-slate-800 p-3 text-left shadow-sm transition-colors hover:border-slate-500 active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-slate-100">
          {application.company || 'Untitled company'}
        </span>
        {application.remote && (
          <span className="shrink-0 rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-300">
            Remote
          </span>
        )}
      </div>
      <div className="mt-0.5 text-sm text-slate-300">{application.title}</div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
        {application.location && <span>{application.location}</span>}
        {application.salary && (
          <span className="text-slate-300">{application.salary}</span>
        )}
      </div>

      {application.outcome && (
        <span
          className={`mt-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
            OUTCOME_STYLES[application.outcome] ?? ''
          }`}
        >
          {application.outcome}
        </span>
      )}
    </div>
  )
}

import type { OutcomeTag } from '../types'

interface Props {
  onSelect: (outcome: OutcomeTag) => void
  onCancel: () => void
}

const OPTIONS: { tag: OutcomeTag; className: string }[] = [
  { tag: 'Rejected', className: 'bg-rose-600 hover:bg-rose-500' },
  { tag: 'Withdrawn', className: 'bg-amber-600 hover:bg-amber-500' },
  { tag: 'Accepted', className: 'bg-emerald-600 hover:bg-emerald-500' },
]

export default function OutcomePicker({ onSelect, onCancel }: Props) {
  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-slate-100">Close this application</h3>
        <p className="mt-1 text-sm text-slate-400">How did it end?</p>
        <div className="mt-4 flex flex-col gap-2">
          {OPTIONS.map(({ tag, className }) => (
            <button
              key={tag}
              onClick={() => onSelect(tag)}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${className}`}
            >
              {tag}
            </button>
          ))}
        </div>
        <button
          onClick={onCancel}
          className="mt-3 w-full rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

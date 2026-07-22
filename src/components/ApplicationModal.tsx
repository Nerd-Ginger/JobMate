import ApplicationForm from './ApplicationForm'
import type { ParsedPosting } from '../lib/import/types'

interface Props {
  // Optional parsed posting to prefill a new application (from import).
  prefill?: ParsedPosting
  onClose: () => void
}

// Modal for creating a new application (blank or prefilled from an import).
// Editing an existing application happens in ApplicationDrawer.
export default function ApplicationModal({ prefill, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-lg rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-100">
          {prefill ? 'Review imported job' : 'Add application'}
        </h2>
        <ApplicationForm application={null} prefill={prefill} onDone={onClose} />
      </div>
    </div>
  )
}

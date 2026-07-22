import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { Interview, InterviewType, InterviewOutcome } from '../types'
import { inputClass, labelClass, btnPrimary } from './ui'

const TYPES: { value: InterviewType; label: string }[] = [
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'hiring-manager', label: 'Hiring manager' },
  { value: 'technical', label: 'Technical' },
  { value: 'panel', label: 'Panel' },
  { value: 'onsite', label: 'Onsite' },
  { value: 'final', label: 'Final' },
]

const OUTCOMES: InterviewOutcome[] = ['pending', 'passed', 'failed']

const OUTCOME_STYLE: Record<InterviewOutcome, string> = {
  pending: 'text-slate-400',
  passed: 'text-emerald-400',
  failed: 'text-rose-400',
}

export default function InterviewLog({ applicationId }: { applicationId: string }) {
  const interviews = useAppStore((s) =>
    s.interviews
      .filter((i) => i.applicationId === applicationId)
      .sort((a, b) => a.round - b.round),
  )
  const addInterview = useAppStore((s) => s.addInterview)
  const updateInterview = useAppStore((s) => s.updateInterview)
  const deleteInterview = useAppStore((s) => s.deleteInterview)

  const [adding, setAdding] = useState(false)
  const [type, setType] = useState<InterviewType>('recruiter')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [interviewers, setInterviewers] = useState('')
  const [notes, setNotes] = useState('')

  async function handleAdd() {
    await addInterview({
      applicationId,
      round: interviews.length + 1,
      type,
      date,
      interviewers: interviewers
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      notes: notes.trim() || undefined,
      outcome: 'pending',
    })
    setInterviewers('')
    setNotes('')
    setAdding(false)
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">
          {interviews.length} interview{interviews.length === 1 ? '' : 's'}
        </h3>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-sm font-medium text-sky-400 hover:text-sky-300"
          >
            + Log round
          </button>
        )}
      </div>

      <div className="space-y-2">
        {interviews.map((iv) => (
          <InterviewRow
            key={iv.id}
            interview={iv}
            onOutcome={(o) => updateInterview(iv.id, { outcome: o })}
            onDelete={() => deleteInterview(iv.id)}
          />
        ))}
        {interviews.length === 0 && !adding && (
          <p className="text-sm text-slate-500">No interviews logged yet.</p>
        )}
      </div>

      {adding && (
        <div className="mt-3 space-y-3 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Type</label>
              <select
                className={inputClass}
                value={type}
                onChange={(e) => setType(e.target.value as InterviewType)}
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Date</label>
              <input
                type="date"
                className={inputClass}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Interviewers (comma-separated)</label>
            <input
              className={inputClass}
              value={interviewers}
              onChange={(e) => setInterviewers(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              className={`${inputClass} min-h-16 resize-y`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setAdding(false)}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button onClick={handleAdd} className={btnPrimary}>
              Save round
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function InterviewRow({
  interview,
  onOutcome,
  onDelete,
}: {
  interview: Interview
  onOutcome: (o: InterviewOutcome) => void
  onDelete: () => void
}) {
  const typeLabel = TYPES.find((t) => t.value === interview.type)?.label ?? interview.type
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-100">
          Round {interview.round} · {typeLabel}
        </span>
        <span className="text-xs text-slate-400">{interview.date}</span>
      </div>
      {interview.interviewers.length > 0 && (
        <p className="mt-1 text-xs text-slate-400">
          With {interview.interviewers.join(', ')}
        </p>
      )}
      {interview.notes && (
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{interview.notes}</p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <select
          value={interview.outcome}
          onChange={(e) => onOutcome(e.target.value as InterviewOutcome)}
          className={`rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs ${OUTCOME_STYLE[interview.outcome]}`}
        >
          {OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <button
          onClick={onDelete}
          className="ml-auto text-xs text-slate-500 hover:text-rose-400"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { useAppStore } from '../store/useAppStore'
import {
  funnel,
  avgDaysPerStage,
  interviewStats,
  applicationsThisWeek,
  weekStreak,
  badges,
} from '../lib/metrics'

const BAR_COLORS = ['#0ea5e9', '#6366f1', '#8b5cf6', '#10b981']

export default function InsightsView() {
  const applications = useAppStore((s) => s.applications)
  const interviews = useAppStore((s) => s.interviews)
  const events = useAppStore((s) => s.events)
  const weeklyGoal = useAppStore((s) => s.settings.weeklyGoal)

  const stages = funnel(applications)
  const days = avgDaysPerStage(applications)
  const ivs = interviewStats(applications, interviews)
  const thisWeek = applicationsThisWeek(events)
  const streak = weekStreak(events)
  const earned = badges(events)

  const goalPct = weeklyGoal > 0 ? Math.min(100, Math.round((thisWeek / weeklyGoal) * 100)) : 0

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Gamification row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat label="This week's goal">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-slate-100">{thisWeek}</span>
              <span className="text-slate-400">/ {weeklyGoal}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-700">
              <div
                className="h-2 rounded-full bg-sky-500 transition-all"
                style={{ width: `${goalPct}%` }}
              />
            </div>
          </Stat>
          <Stat label="Week streak">
            <span className="text-3xl font-bold text-slate-100">🔥 {streak}</span>
          </Stat>
          <Stat label="Interviews / application">
            <span className="text-3xl font-bold text-slate-100">{ivs.perApplication}</span>
            <p className="mt-1 text-xs text-slate-500">{ivs.total} total across {ivs.withInterview} apps</p>
          </Stat>
        </div>

        {/* Funnel */}
        <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-300">
            Pipeline funnel
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            Applications that ever reached each stage, with stage-to-stage conversion.
          </p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stages} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    color: '#e2e8f0',
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {stages.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
            {stages.map(
              (s) =>
                s.conversionFromPrev != null && (
                  <span key={s.id}>
                    → {s.label}: <span className="text-slate-200">{s.conversionFromPrev}%</span>
                  </span>
                ),
            )}
          </div>
        </div>

        {/* Avg days per stage */}
        <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
            Average days in stage
          </h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(days).length === 0 && (
              <p className="text-sm text-slate-500">Move cards between lanes to see timing.</p>
            )}
            {Object.entries(days).map(([lane, d]) => (
              <div key={lane} className="rounded-lg bg-slate-800 px-3 py-2">
                <div className="text-xs capitalize text-slate-400">{lane}</div>
                <div className="text-lg font-semibold text-slate-100">{d}d</div>
              </div>
            ))}
          </div>
        </div>

        {/* Badges */}
        <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
            Milestones
          </h2>
          <div className="flex flex-wrap gap-2">
            {earned.map((b) => (
              <span
                key={b.id}
                className={`rounded-full px-3 py-1 text-sm ${
                  b.earned
                    ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40'
                    : 'bg-slate-800 text-slate-600'
                }`}
              >
                {b.earned ? '🏅 ' : '🔒 '}
                {b.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2">{children}</div>
    </div>
  )
}

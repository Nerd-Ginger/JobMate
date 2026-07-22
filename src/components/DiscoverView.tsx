import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import {
  fetchDiscovery,
  applyFilters,
  readCache,
  type DiscoveredJob,
  type DiscoveryFilters,
} from '../lib/discovery'
import { inputClass, btnPrimary } from './ui'

export default function DiscoverView() {
  const store = useAppStore()
  const watchlist = store.settings.watchlist
  const applications = store.applications

  const [jobs, setJobs] = useState<DiscoveredJob[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [includeFeeds, setIncludeFeeds] = useState(true)
  const [filters, setFilters] = useState<DiscoveryFilters>({
    keyword: '',
    remoteOnly: false,
    maxAgeDays: null,
  })

  // Serve any cached results on first render (no network).
  useEffect(() => {
    const cache = readCache()
    if (cache) setJobs(cache.jobs)
  }, [])

  async function run(force: boolean) {
    setBusy(true)
    setErrors([])
    try {
      const report = await fetchDiscovery(watchlist, { includeFeeds, force })
      setJobs(report.jobs)
      setErrors(report.errors)
    } finally {
      setBusy(false)
    }
  }

  const trackedUrls = new Set(applications.map((a) => a.url).filter(Boolean))
  const visible = applyFilters(jobs, filters)

  async function track(job: DiscoveredJob) {
    await store.addApplication({
      company: job.company,
      title: job.title,
      laneId: 'wishlist',
      url: job.url,
      location: job.location,
      remote: job.remote,
      source: job.source,
    })
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => run(true)} disabled={busy} className={btnPrimary}>
            {busy ? 'Fetching…' : 'Fetch jobs'}
          </button>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={includeFeeds}
              onChange={(e) => setIncludeFeeds(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900"
            />
            Include remote feeds (Remotive, Himalayas)
          </label>
          <span className="text-xs text-slate-500">
            {watchlist.length} companies watched · results cached 12h
          </span>
        </div>

        {watchlist.length === 0 && !includeFeeds && (
          <p className="text-sm text-slate-500">
            Add companies to your watchlist in Settings, or enable remote feeds.
          </p>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            className={`${inputClass} w-56`}
            placeholder="Filter by keyword…"
            value={filters.keyword}
            onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={filters.remoteOnly}
              onChange={(e) => setFilters((f) => ({ ...f, remoteOnly: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900"
            />
            Remote only
          </label>
          <select
            className={`${inputClass} w-40`}
            value={filters.maxAgeDays ?? ''}
            onChange={(e) =>
              setFilters((f) => ({ ...f, maxAgeDays: e.target.value ? Number(e.target.value) : null }))
            }
          >
            <option value="">Any age</option>
            <option value="7">Past week</option>
            <option value="30">Past month</option>
          </select>
        </div>

        {errors.length > 0 && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-300">
            Some sources failed: {errors.join(' · ')}
          </div>
        )}

        <p className="text-xs text-slate-500">{visible.length} jobs</p>

        <div className="space-y-2">
          {visible.map((job) => {
            const tracked = job.url && trackedUrls.has(job.url)
            return (
              <div
                key={job.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800 p-3"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-100">
                    {job.title}{' '}
                    {job.remote && (
                      <span className="ml-1 rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] uppercase text-sky-300">
                        Remote
                      </span>
                    )}
                  </div>
                  <div className="truncate text-sm text-slate-400">
                    {job.company}
                    {job.location ? ` · ${job.location}` : ''}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                    <span>{job.source}</span>
                    {job.attribution && (
                      <a href={job.attribution.url} target="_blank" rel="noreferrer" className="underline hover:text-slate-300">
                        {job.attribution.label}
                      </a>
                    )}
                    {job.url && (
                      <a href={job.url} target="_blank" rel="noreferrer" className="underline hover:text-slate-300">
                        View
                      </a>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => track(job)}
                  disabled={!!tracked}
                  className="shrink-0 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:cursor-default disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {tracked ? 'Tracked' : 'Track'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

# JobTracker — Frontend-Only Job Application Tracker
**Product Plan / PRD v2 — Daniel Wright, July 2026**
*Target: high-volume job search (hundreds–thousands of applications) with zero backend.*

---

## 1. Product Vision & Principles

A gamified job-application pipeline manager plus application accelerator that runs entirely client-side. No backend, no accounts, no servers.

- **Backend-free.** Static web app (GitHub Pages / Netlify / Vercel free tier) + a companion browser extension. All logic client-side.
- **Bring your own API key.** A Settings section takes the user's Anthropic API key; the browser calls the API directly (`anthropic-dangerous-direct-browser-access` CORS header). The key is stored only on-device, encrypted at rest (WebCrypto + passphrase).
- **Full data ownership.** IndexedDB storage, JSON export/import, optional sync to the user's own Google Drive/OneDrive via OAuth PKCE (pattern already proven in the Flutter connector project).
- **Honest automation boundary.** The web cannot one-click-submit to arbitrary sites (CORS, CSRF, captchas — and Greenhouse's submit endpoint needs *employer* credentials). The design gets to "review and click submit" in seconds instead, which also protects application quality.

## 2. Where AI Is Used (BYO key)

| Feature | What the model does | Trigger |
|---|---|---|
| Posting parse | Raw HTML/pasted text → strict JSON `{company,title,location,salary,remote,skills[],summary}` | URL/paste import fallback |
| Apply Kit: cover letter | 220–280 word letter from stored resume + posting | Per-application button |
| Apply Kit: tailored bullets | 4–6 resume bullets rewritten to the posting's keywords | Per-application button |
| Apply Kit: screening answers | "Why us / why this role / salary strategy / availability" | Per-application button |
| Fit check | 1–10 score + 3-bullet gap analysis before you invest time | Per-application button |
| Interview prep | 8 likely questions + answer angles from the saved description | Per-round button |
| Autofill answers (ext.) | Maps free-text application questions to drafted answers | Extension autofill pass |

All prompts include the stored resume (≤8k chars) + saved job description. No key → tracking still fully works; AI buttons explain what's missing.

## 3. Core Features

### 3.1 Swim-Lane Board
- Lanes: **Wishlist → Applied → Screening → Interviewing → Offer → Closed** (Closed tagged Rejected/Withdrawn/Accepted). Drag-and-drop; custom lanes editable.
- Card face: company, role, salary, days-in-stage badge (warns at 14+), interview-count badge, next-action date.
- Stage moves auto-timestamp → feed funnel metrics.
- **Signature UI element:** a "funnel spine" across the lane headers showing live counts and stage-to-stage conversion %.

### 3.2 Job Import from URL (tiered, degrades gracefully)
1. **ATS deep links first**: URLs matching `boards.greenhouse.io/*` or `jobs.lever.co/*` skip scraping — hit the ATS public JSON API directly (clean, CORS-friendly, reliable).
2. **Structured data**: fetch via configurable public CORS proxies (corsproxy.io, allorigins — with failover); parse schema.org **JobPosting** JSON-LD present on most major boards.
3. **AI parse**: no JSON-LD → stripped HTML to the model, strict-JSON extraction.
4. **Paste fallback**: login-walled sites (LinkedIn/Indeed) → paste text, same AI parse. Never a dead end.
5. **Extension capture** (best path once installed — see §6).

### 3.3 Interview Tracking
- Per-application log: rounds with type (recruiter/HM/technical/panel/onsite/final), date, interviewers, notes, outcome.
- Rollups: total interviews, interviews per application, stage-conversion funnel (Applied→Screen→Interview→Offer %), average days per stage.

### 3.4 Job Discovery (free/public APIs, client-side)
- **Company watchlist — the killer feature**: user saves target companies' Greenhouse/Lever board tokens once; app polls their live boards (public, no-auth, CORS-enabled JSON — verified current 2026). Ashby/Workable/Recruitee adapters later.
- Aggregated remote feeds: Himalayas (free JSON, 20/req, attribution + linkback required), Remotive, USAJobs (free key). Keyed aggregators (Adzuna/Jooble/JSearch free tiers) as optional adapters, keys stored client-side.
- Normalize → dedupe → filter (keyword, location/remote, salary floor, recency, source) → one-click "Track" to Wishlist. Saved filter sets.

### 3.5 Apply Kit (per application)
One panel generating the full application package from stored resume + parsed posting: cover letter, tailored bullets, screening answers, fit check, prep questions — each with copy-to-clipboard. For a thousands-scale search this is the throughput engine: ~40 min/application → ~5.

### 3.6 Gamification
Weekly application goal + progress, week streak (≥1 application), milestone badges (first app/interview/offer, 10/100/1000 apps), month-over-month conversion trends framed as achievements.

## 4. Architecture & Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | React 18 + Vite (or single-file vanilla for v0) | Static build, fast |
| Drag & drop | dnd-kit | Accessible, maintained |
| Storage | IndexedDB via Dexie.js | Structured, large, offline |
| State | Zustand persisted to Dexie | Minimal |
| Styling | Tailwind | Speed |
| Charts | Recharts | Funnel/trends |
| PWA | vite-plugin-pwa | Installable, offline board |
| AI | Anthropic API direct from browser | BYO key |
| Sync (opt.) | Drive/OneDrive OAuth PKCE, app-folder scope | Reuse Flutter pattern |

**Data model (Dexie):**
- `applications` — id, company, title, url, source, location, salary, remote, skills[], description, laneId, stageHistory[{lane,at}], nextActionAt, notes
- `interviews` — id, applicationId, round, type, date, interviewers[], notes, outcome
- `lanes` — id, name, order, isTerminal, outcomeTag
- `profile` — contact fields, links, work-authorization answers, resume text/file (for Apply Kit + extension autofill)
- `settings` — encrypted keys, goals, watchlist[{ats,token,label}], savedFilters, proxyList
- `events` — append-only log (applied/interviewed/offer) powering streaks, badges, metrics

## 5. Apply Kit + Submission Reality

- **In-app**: generate → review → copy per field. Track "kit generated" and "submitted" as events for throughput stats.
- **Why no auto-submit**: browser same-origin policy blocks cross-site POSTs; ATS forms carry CSRF tokens; captchas gate submission; Greenhouse's public submit endpoint authenticates the *employer*, not the applicant. Every "auto-apply" product on the market runs servers or an extension — hence §6.
- **Positioning**: human-on-the-button is a quality feature. Mass blind-applying tanks response rates; JobTracker optimizes *prepared* volume.

## 6. Companion Browser Extension (MV3) — the real unlock

Still no backend: an extension is client-side software whose content scripts run *on* the job page, so CORS doesn't apply.

**Capabilities**
1. **One-click capture**: on any job page, scrape JSON-LD JobPosting (fallback: heuristics/AI via the user's key) → push to the tracker. No proxy needed; works on LinkedIn/Indeed pages you're viewing.
2. **Autofill applications**: content script fills ATS forms (Greenhouse, Lever, Ashby, Workable selectors first; generic label-matching fallback) from the stored profile — name/contact/links/work-auth, attach resume file, and paste AI-drafted answers into free-text questions. User reviews, clicks submit.
3. **Field mapper**: for unrecognized forms, a point-and-map mode saves per-domain selector maps to extension storage, improving coverage as you go.

**Architecture**
- `manifest.json` (MV3): `activeTab`, `scripting`, `storage`; optional host permissions per ATS domain.
- `popup`: Capture this job / Autofill this page / open tracker.
- `content scripts`: `scrape.js` (JSON-LD + heuristics), `autofill.js` (selector maps + label matching), per-domain maps in `chrome.storage.local`.
- **App ↔ extension bridge (no server)**: a content script matched to the deployed tracker's URL reads/writes a `jt.inbox` queue in the page's localStorage — captured jobs flow in, profile + drafted answers flow out. Fallback bridge: copy/paste JSON.
- Publish: load-unpacked for personal use; Chrome Web Store one-time $5 fee if shared (still serverless).

## 7. API Usage & Cost Controls

**Governing rule: no API call ever fires automatically.** Every Anthropic call is behind an explicit user action (a button press), and every external fetch is user-initiated or cache-served. Nothing polls in the background.

### Anthropic API (the only paid dependency)
1. **Free paths first, AI last.** The import pipeline is ordered by cost: ATS-direct JSON (free) → JSON-LD parse (free) → AI parse (paid, fallback only). The AI parser should fire on a minority of imports.
2. **Model routing by job type.** Extraction/parsing → Haiku (cheap, structured output is easy). Generation (cover letters, answers, prep) → Sonnet. Model per feature configurable in Settings with these defaults.
3. **Token budgets per feature.** Strip HTML and truncate inputs before sending (posting ≤ ~6k chars, resume ≤ ~8k chars); hard `max_tokens` caps per feature (parse ~700, kit items ~1,400). Budgets live in one config object, not scattered in prompts.
4. **Cache everything generated.** Key = hash(resume version + job description + feature). Kit outputs and parses persist in IndexedDB; reopening a card shows the cached result. New spend only on an explicit **Regenerate** press or when the resume/description changed.
5. **Fit-check gates the kit.** The cheap fit-check call (small budget) runs before the expensive kit generation is offered prominently; low-fit jobs get a "generate anyway?" speed bump. Don't spend Sonnet tokens on bad-fit postings.
6. **Generate on demand, not in bulk.** Kit items are separate buttons, not one mega-call — you pay only for the artifacts you'll actually use. No "generate kits for all Wishlist" bulk action in v1.
7. **Visible spend meter.** Every response's `usage` field (input/output tokens) is logged to the `events` table; Settings shows tokens and estimated cost this week/month against an optional soft budget with a warning banner at 80%. Model prices stored in an editable table so estimates survive price changes.

### Free/public APIs (cost = rate limits and goodwill)
1. **Manual fetch + TTL cache.** Watchlist and feed results cache in IndexedDB with a 12–24h TTL; "Fetch" serves cache unless stale or force-refreshed. No scheduled polling.
2. **Client-side rate limiter.** Global fetch queue capped (~2 concurrent, ~30 req/min) with exponential backoff on 429/5xx; per-source cooldowns after repeated failures.
3. **Respect source terms.** Himalayas: ≤20/request, attribution + linkback rendered with results, no re-posting to third parties. Attribution strings live with each adapter.
4. **CORS proxy discipline.** Max 2 proxy attempts per import, then fall through to AI/paste — never retry-loop a free proxy.
5. **Dedupe before render** (URL + company+title hash) so refreshes don't multiply cards or trigger re-parses.

## 8. Build Phases

**Phase 1 — Board MVP** (one weekend): lanes, drag-drop with stage history, manual add/edit, Dexie persistence, JSON export/import. *Immediately usable.*
**Phase 2 — Import + interviews + metrics**: URL pipeline (§3.2), interview log, funnel dashboard, goals/streaks.
**Phase 3 — Discovery + Apply Kit**: watchlist polling, remote feeds with filters/dedupe, full Apply Kit, PWA install, optional cloud sync.
**Phase 4 — Extension**: capture → autofill (Greenhouse/Lever first) → field mapper → AI answer-fill. This is the phase that makes thousands-scale volume realistic.

## 9. Risks & Mitigations

- **CORS proxies flaky** → configurable proxy list with failover; ATS-direct and extension capture avoid proxies entirely; paste always works.
- **ATS form drift breaks autofill** → per-domain selector maps are data, not code; field-mapper lets the user self-heal; generic label matching as floor.
- **Free API churn** → adapters behind one interface (~50 lines each, disposable); attribution requirements honored (Himalayas linkback).
- **Key security** → device-only, WebCrypto-encrypted, never in exports by default.
- **IndexedDB loss** → auto-export reminders + one-click Drive/OneDrive backup.
- **Volume vs. quality** → fit-check gate before Apply Kit spend; dashboard surfaces response-rate by source so effort follows results.

## 10. Resume Framing (once shipped)

"**JobTracker** — backend-free PWA + browser extension for high-volume job searches: drag-and-drop pipeline with funnel analytics, AI application kit (cover letters, tailored bullets, screening answers), one-click posting capture and ATS autofill, and live discovery from public ATS APIs — BYO-API-key, full user data ownership."

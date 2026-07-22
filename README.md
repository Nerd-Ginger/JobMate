# JobMate

A backend-free, client-side job-application tracker and application accelerator.
All data lives on your device (IndexedDB) — no accounts, no servers. Bring your
own Anthropic API key for the AI features. See [`JobTracker_Plan.md`](./JobTracker_Plan.md)
for the full product plan.

## Features

**Board & tracking**
- Swim-lane board (Wishlist → Applied → Screening → Interviewing → Offer → Closed)
  with drag-and-drop; every move recorded to stage history
- Dropping into *Closed* prompts for an outcome (Rejected / Withdrawn / Accepted)
- Per-application interview log (rounds, type, interviewers, notes, outcome)
- JSON export / import for full data ownership

**Import** — paste a job URL; the pipeline degrades gracefully:
1. Greenhouse / Lever public JSON APIs (direct, no scraping)
2. schema.org JobPosting JSON-LD via CORS proxy
3. AI parse of the page (needs your key)
4. Paste fallback — never a dead end

**Discover** — poll your watchlist of Greenhouse/Lever company boards plus
Remotive & Himalayas remote feeds; dedupe, filter (keyword / remote / recency),
one-click Track to Wishlist. Results cached 12h; nothing polls in the background.

**Insights** — funnel with stage-to-stage conversion, average days per stage,
interviews per application; weekly goal, week streak, milestone badges.

**Apply Kit** (per application, BYO key) — cover letter, tailored resume bullets,
screening answers, a fit check, and interview prep. Outputs are cached; a
fit-check gate discourages spending on low-fit roles; a spend meter tracks
estimated cost against an optional soft budget.

**Companion extension** ([`extension/`](./extension)) — MV3, load-unpacked:
capture any job page and autofill ATS applications from your profile. Serverless
— data bridges through your browser's storage. See its README.

**Cloud backup** (optional) — back up to your own Google Drive app-data folder
via OAuth PKCE (bring your own client ID).

**PWA** — installable, offline board.

## Privacy & keys

Everything is stored locally (IndexedDB `jobmate`). Your Anthropic API key is
encrypted at rest with a passphrase (WebCrypto AES-GCM + PBKDF2), held in memory
only for the session, and excluded from exports. No API call fires automatically
— every AI request is behind an explicit button, and free import/discovery paths
run before any paid one.

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · dnd-kit · Dexie.js · Zustand ·
Recharts · vite-plugin-pwa · Anthropic API (direct from browser)

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build (+ PWA service worker)
npm run lint     # oxlint
```

Then, in the app: **Settings** → add your Anthropic API key and resume to enable
the Apply Kit and AI import; add company board tokens to your watchlist for
Discover.

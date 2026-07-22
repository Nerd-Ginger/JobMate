# JobMate

A backend-free, client-side job-application tracker. All data lives on your device (IndexedDB) — no accounts, no servers. See [`JobTracker_Plan.md`](./JobTracker_Plan.md) for the full product plan.

## Status — Phase 1 (Board MVP)

The swim-lane board is implemented:

- **Swim lanes** — Wishlist → Applied → Screening → Interviewing → Offer → Closed
- **Drag & drop** between lanes, each move recorded in the application's stage history
- **Add / edit / delete** applications (company, role, lane, source, location, salary, remote, URL, notes)
- **Outcome tagging** — dropping into *Closed* prompts for Rejected / Withdrawn / Accepted
- **Local persistence** via IndexedDB (Dexie) — your board survives reloads
- **JSON export / import** for full data ownership and backups

Later phases (URL import, interview tracking, funnel metrics, Apply Kit, companion extension) are described in the plan.

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · dnd-kit · Dexie.js · Zustand

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run lint     # oxlint
```

## Data & privacy

Everything is stored locally in your browser's IndexedDB (database `jobmate`). Use **Export** to save a JSON backup; **Import** replaces the current on-device data with a backup's contents.

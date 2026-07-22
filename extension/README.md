# JobMate Companion (MV3)

A serverless Chrome/Edge extension that captures job postings and autofills
applications for the [JobMate](../) tracker. All data flows through your
browser — there is no server.

## Install (load unpacked)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. **Load unpacked** → select this `extension/` folder.

## Use

- **Capture this job** — on any job page, scrapes the posting (schema.org
  JobPosting JSON-LD first, then heuristics) into a queue.
- Open the tracker (set its URL in the popup) — captured jobs flow into the
  board's Wishlist automatically via the page bridge.
- **Autofill this page** — fills an ATS application form from your JobMate
  profile (name, email, phone, links, work authorization). You review and
  submit yourself; the extension never submits.
- **Map fields…** — for forms the generic matcher misses, click each field and
  assign it a profile value. The per-domain selector map is saved and reused.

## How the bridge works (no server)

`background.js` holds the capture queue in `chrome.storage.local`. `bridge.js`
runs only on the tracker's own pages and moves captured jobs into the page's
`localStorage['jt.inbox']` (which the app imports), and reads the profile the
app publishes to `localStorage['jt.outbox']` for autofill.

## Publishing

Personal use runs fine as load-unpacked. Sharing via the Chrome Web Store is a
one-time $5 developer fee — still serverless. Note: Chrome prefers PNG action
icons; replace `icon.svg` with PNGs before store submission.

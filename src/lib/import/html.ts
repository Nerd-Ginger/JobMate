// Strip HTML to plain text for AI parsing and previews (PRD §7.3). Uses the
// DOM so entities and structure collapse cleanly; scripts/styles are dropped.
export function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script, style, noscript').forEach((n) => n.remove())
  return (doc.body?.textContent ?? '').replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

// Injected into a job page on demand. Scrapes a posting (JSON-LD JobPosting
// first, then heuristics) and reports it to the background service worker.
(() => {
  function fromJsonLd() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]')
    for (const s of scripts) {
      let data
      try {
        data = JSON.parse(s.textContent)
      } catch {
        continue
      }
      const posting = findPosting(data)
      if (posting) return normalizeLd(posting)
    }
    return null
  }

  function findPosting(data) {
    if (Array.isArray(data)) {
      for (const item of data) {
        const f = findPosting(item)
        if (f) return f
      }
      return null
    }
    if (!data || typeof data !== 'object') return null
    const t = data['@type']
    if (Array.isArray(t) ? t.includes('JobPosting') : t === 'JobPosting') return data
    if (data['@graph']) return findPosting(data['@graph'])
    return null
  }

  function stripHtml(html) {
    const d = new DOMParser().parseFromString(html || '', 'text/html')
    return (d.body?.textContent || '').replace(/\n{3,}/g, '\n\n').trim()
  }

  function normalizeLd(p) {
    const org = p.hiringOrganization || {}
    const loc = Array.isArray(p.jobLocation) ? p.jobLocation[0] : p.jobLocation
    const addr = loc?.address || {}
    const location = [addr.addressLocality, addr.addressRegion, addr.addressCountry]
      .filter(Boolean)
      .join(', ')
    return {
      company: org.name || '',
      title: p.title || document.title,
      location: location || undefined,
      remote: p.jobLocationType === 'TELECOMMUTE' || /remote/i.test(location),
      description: stripHtml(p.description),
      url: p.url || location.href || window.location.href,
      source: 'Extension (JSON-LD)',
    }
  }

  // Heuristic fallback: title from h1/og:title, company from og:site_name.
  function heuristic() {
    const meta = (name) =>
      document.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.content
    const title =
      document.querySelector('h1')?.textContent?.trim() ||
      meta('og:title') ||
      document.title
    const company = meta('og:site_name') || location.hostname.replace(/^www\./, '')
    const main = document.querySelector('main, article, [role="main"]') || document.body
    return {
      company,
      title: (title || '').trim(),
      description: (main.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 6000),
      url: window.location.href,
      source: 'Extension (heuristic)',
    }
  }

  const posting = fromJsonLd() || heuristic()
  chrome.runtime.sendMessage({ type: 'jobmate-capture', posting })
})()

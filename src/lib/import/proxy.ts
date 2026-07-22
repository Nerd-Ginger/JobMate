// Fetch a page's HTML through configurable CORS proxies with failover
// (PRD §3.2, §7). At most a couple of attempts, then the caller falls through
// to AI/paste — never retry-loop a free proxy.
export async function fetchViaProxy(
  url: string,
  proxies: string[],
  maxAttempts = 2,
): Promise<string> {
  const candidates = proxies.slice(0, maxAttempts)
  let lastErr: unknown
  for (const proxy of candidates) {
    try {
      const res = await fetch(proxy + encodeURIComponent(url), {
        headers: { accept: 'text/html' },
      })
      if (!res.ok) throw new Error(`Proxy ${res.status}`)
      const text = await res.text()
      if (text && text.length > 200) return text
      throw new Error('Empty proxy response')
    } catch (err) {
      lastErr = err
    }
  }
  throw new Error(
    `All proxies failed (${lastErr instanceof Error ? lastErr.message : 'unknown'})`,
  )
}

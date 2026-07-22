// Point-and-map mode: click a form field, name the profile value it should
// receive, and the selector map is saved per-domain so autofill covers this
// site next time (PRD §6 field mapper — data, not code).
(() => {
  const FIELDS = [
    'fullName', 'email', 'phone', 'location', 'workAuthorization',
    'link:linkedin', 'link:github', 'link:website',
  ]
  const domain = location.hostname

  const banner = document.createElement('div')
  banner.textContent = 'JobMate map mode: click a field to assign it. Press Esc to finish.'
  Object.assign(banner.style, {
    position: 'fixed', top: '0', left: '0', right: '0', zIndex: '2147483647',
    background: '#0ea5e9', color: '#0f172a', font: '600 13px system-ui',
    padding: '8px 12px', textAlign: 'center',
  })
  document.body.appendChild(banner)

  function cssPath(el) {
    if (el.id) return `#${CSS.escape(el.id)}`
    if (el.name) return `${el.tagName.toLowerCase()}[name="${CSS.escape(el.name)}"]`
    // Fallback: nth-of-type path (shallow).
    const parent = el.parentElement
    if (!parent) return el.tagName.toLowerCase()
    const siblings = [...parent.children].filter((c) => c.tagName === el.tagName)
    const idx = siblings.indexOf(el) + 1
    return `${cssPath(parent)} > ${el.tagName.toLowerCase()}:nth-of-type(${idx})`
  }

  function onClick(e) {
    const el = e.target
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return
    e.preventDefault()
    e.stopPropagation()
    const field = prompt(`Map this field to which value?\n\n${FIELDS.join(', ')}`)
    if (!field) return
    const selector = cssPath(el)
    chrome.storage.local.get('jt_maps', (data) => {
      const maps = data.jt_maps || {}
      maps[domain] = { ...(maps[domain] || {}), [selector]: field.trim() }
      chrome.storage.local.set({ jt_maps: maps })
      el.style.outline = '2px solid #0ea5e9'
    })
  }

  function finish() {
    document.removeEventListener('click', onClick, true)
    document.removeEventListener('keydown', onKey, true)
    banner.remove()
  }
  function onKey(e) {
    if (e.key === 'Escape') finish()
  }

  document.addEventListener('click', onClick, true)
  document.addEventListener('keydown', onKey, true)
})()

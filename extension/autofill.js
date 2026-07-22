// Injected into an application page on demand. Fills known fields from the
// synced profile, using per-domain selector maps first, then generic label
// matching. The user reviews and clicks submit — the extension never submits.
(() => {
  chrome.storage.local.get(['jt_profile', 'jt_maps', 'jt_answers'], (data) => {
    const profile = data.jt_profile || {}
    const maps = data.jt_maps || {}
    const answers = data.jt_answers || {}
    const domain = location.hostname
    let filled = 0

    // React-friendly setter: fires the events controlled inputs listen for.
    function setValue(el, value) {
      if (!el || value == null || value === '') return
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement
      const setter = Object.getOwnPropertyDescriptor(proto.prototype, 'value')?.set
      if (setter) setter.call(el, value)
      else el.value = value
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      filled++
    }

    // 1. Per-domain saved selector map (from the field mapper).
    const map = maps[domain]
    if (map) {
      for (const [selector, field] of Object.entries(map)) {
        const el = document.querySelector(selector)
        if (el) setValue(el, resolveField(field, profile))
      }
    }

    // 2. Generic label matching for anything still empty.
    const fieldKeywords = [
      { keys: ['first name'], value: firstName(profile.fullName) },
      { keys: ['last name', 'surname'], value: lastName(profile.fullName) },
      { keys: ['full name', 'name'], value: profile.fullName },
      { keys: ['email'], value: profile.email },
      { keys: ['phone', 'mobile'], value: profile.phone },
      { keys: ['location', 'city', 'address'], value: profile.location },
      { keys: ['linkedin'], value: link(profile, 'linkedin') },
      { keys: ['github'], value: link(profile, 'github') },
      { keys: ['website', 'portfolio'], value: link(profile, 'website') },
      { keys: ['authoriz', 'sponsor', 'visa'], value: profile.workAuthorization },
    ]

    document.querySelectorAll('input, textarea').forEach((el) => {
      if (el.type === 'hidden' || el.type === 'file' || el.value) return
      const label = labelFor(el).toLowerCase()
      if (!label) return
      for (const { keys, value } of fieldKeywords) {
        if (value && keys.some((k) => label.includes(k))) {
          setValue(el, value)
          break
        }
      }
      // Free-text questions → drafted answers by keyword overlap.
      if (!el.value && el.tagName === 'TEXTAREA') {
        for (const [q, a] of Object.entries(answers)) {
          if (label.includes(q.toLowerCase())) {
            setValue(el, a)
            break
          }
        }
      }
    })

    alert(`JobMate: filled ${filled} field(s). Review, then submit yourself.`)
  })

  function labelFor(el) {
    if (el.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`)
      if (lbl) return lbl.textContent || ''
    }
    const wrap = el.closest('label')
    if (wrap) return wrap.textContent || ''
    return el.getAttribute('aria-label') || el.placeholder || el.name || ''
  }

  function resolveField(field, profile) {
    if (field.startsWith('link:')) return link(profile, field.slice(5))
    return profile[field]
  }
  function firstName(n) {
    return (n || '').trim().split(/\s+/)[0] || ''
  }
  function lastName(n) {
    const parts = (n || '').trim().split(/\s+/)
    return parts.length > 1 ? parts.slice(1).join(' ') : ''
  }
  function link(profile, kind) {
    const found = (profile.links || []).find((l) =>
      (l.label || l.url || '').toLowerCase().includes(kind),
    )
    return found?.url
  }
})()

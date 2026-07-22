// Runs on the deployed tracker page. Bridges the extension's chrome.storage
// and the page's localStorage with no server (PRD §6):
//   captured jobs   → localStorage['jt.inbox']   (tracker imports them)
//   profile/answers ← localStorage['jt.outbox']  (tracker publishes them)
(() => {
  const INBOX = 'jt.inbox'
  const OUTBOX = 'jt.outbox'

  // Push captured jobs into the page inbox, then clear the extension queue.
  function pushCaptured() {
    chrome.storage.local.get('jt_captured', (data) => {
      const captured = data.jt_captured || []
      if (!captured.length) return
      let inbox = []
      try {
        inbox = JSON.parse(localStorage.getItem(INBOX) || '[]')
      } catch {
        inbox = []
      }
      const seen = new Set(inbox.map((j) => j.url))
      for (const job of captured) {
        if (!seen.has(job.url)) inbox.push(job)
      }
      localStorage.setItem(INBOX, JSON.stringify(inbox))
      chrome.storage.local.set({ jt_captured: [] })
      chrome.action?.setBadgeText?.({ text: '' })
    })
  }

  // Pull profile + drafted answers the tracker published for autofill.
  function pullOutbox() {
    let outbox
    try {
      outbox = JSON.parse(localStorage.getItem(OUTBOX) || 'null')
    } catch {
      return
    }
    if (!outbox) return
    chrome.storage.local.set({
      jt_profile: outbox.profile || {},
      jt_answers: outbox.answers || {},
    })
  }

  pushCaptured()
  pullOutbox()
  // Re-sync while the tab is open so newly published profile data is picked up.
  setInterval(pullOutbox, 4000)
})()

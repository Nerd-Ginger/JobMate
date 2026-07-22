// Service worker: holds the capture queue and the last-synced profile/answers.
// No network — everything lives in chrome.storage.local.

const CAPTURE_KEY = 'jt_captured'

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'jobmate-capture' && msg.posting) {
    chrome.storage.local.get(CAPTURE_KEY, (data) => {
      const queue = data[CAPTURE_KEY] ?? []
      // Dedupe on URL so re-capturing the same page doesn't pile up.
      if (!queue.some((j) => j.url && j.url === msg.posting.url)) {
        queue.push({ ...msg.posting, capturedAt: new Date().toISOString() })
      }
      chrome.storage.local.set({ [CAPTURE_KEY]: queue }, () => {
        chrome.action.setBadgeText({ text: String(queue.length) })
        chrome.action.setBadgeBackgroundColor({ color: '#0ea5e9' })
        sendResponse({ ok: true, count: queue.length })
      })
    })
    return true // async response
  }
})

const status = document.getElementById('status')
const trackerInput = document.getElementById('tracker')

// Restore the saved tracker URL and captured count.
chrome.storage.local.get(['jt_tracker_url', 'jt_captured'], (data) => {
  trackerInput.value = data.jt_tracker_url || 'http://localhost:5173'
  const n = (data.jt_captured || []).length
  if (n) status.textContent = `${n} job(s) queued — open the tracker to import.`
})

async function activeTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab?.id
}

async function inject(file) {
  const tabId = await activeTabId()
  if (tabId == null) return
  await chrome.scripting.executeScript({ target: { tabId }, files: [file] })
}

document.getElementById('capture').addEventListener('click', async () => {
  status.textContent = 'Capturing…'
  await inject('scrape.js')
})

// Background reports capture results; reflect the new count.
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'jobmate-capture') {
    status.textContent = 'Captured! Open the tracker to import.'
  }
})

document.getElementById('autofill').addEventListener('click', async () => {
  status.textContent = 'Filling…'
  await inject('autofill.js')
})

document.getElementById('map').addEventListener('click', async () => {
  await inject('field-mapper.js')
  window.close()
})

document.getElementById('open').addEventListener('click', () => {
  const url = trackerInput.value.trim() || 'http://localhost:5173'
  chrome.storage.local.set({ jt_tracker_url: url })
  chrome.tabs.create({ url })
})

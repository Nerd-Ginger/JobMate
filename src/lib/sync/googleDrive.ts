// Optional Google Drive backup to the app-data folder via OAuth 2.0 PKCE
// (public client — no secret). Requires the user to register their own OAuth
// client ID and add this app's origin as an authorized redirect URI. Access
// tokens live in sessionStorage only; nothing is persisted to disk.

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
const BACKUP_NAME = 'jobmate-backup.json'
const TOKEN_KEY = 'jt.gdrive.token'
const VERIFIER_KEY = 'jt.gdrive.verifier'

function base64url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier) as BufferSource,
  )
  return base64url(digest)
}

function randomString(len = 64): string {
  return base64url(crypto.getRandomValues(new Uint8Array(len)).buffer)
}

function redirectUri(): string {
  return window.location.origin + window.location.pathname
}

// Kick off the OAuth redirect. Returns nothing — the page navigates away.
export async function connectGoogleDrive(clientId: string): Promise<void> {
  const verifier = randomString()
  sessionStorage.setItem(VERIFIER_KEY, verifier)
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPE,
    code_challenge: await pkceChallenge(verifier),
    code_challenge_method: 'S256',
    access_type: 'online',
    prompt: 'consent',
  })
  window.location.assign(`${AUTH_ENDPOINT}?${params}`)
}

// Call on app load: if we returned from the OAuth redirect (?code=…), exchange
// it for a token. Returns true when a token was obtained this load.
export async function handleOAuthRedirect(clientId: string): Promise<boolean> {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  if (!code) return false
  const verifier = sessionStorage.getItem(VERIFIER_KEY)
  if (!verifier) return false

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      code,
      code_verifier: verifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri(),
    }),
  })
  if (!res.ok) throw new Error(`Token exchange failed (${res.status})`)
  const data = await res.json()
  sessionStorage.setItem(TOKEN_KEY, data.access_token)
  sessionStorage.removeItem(VERIFIER_KEY)
  // Clean the code out of the URL.
  url.searchParams.delete('code')
  url.searchParams.delete('scope')
  window.history.replaceState({}, '', url.pathname + url.search)
  return true
}

export function isDriveConnected(): boolean {
  return !!sessionStorage.getItem(TOKEN_KEY)
}

function token(): string {
  const t = sessionStorage.getItem(TOKEN_KEY)
  if (!t) throw new Error('Not connected to Google Drive.')
  return t
}

async function findBackupId(): Promise<string | null> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${encodeURIComponent(
      `name='${BACKUP_NAME}'`,
    )}&fields=files(id)`,
    { headers: { authorization: `Bearer ${token()}` } },
  )
  if (!res.ok) throw new Error(`Drive query failed (${res.status})`)
  const data = await res.json()
  return data.files?.[0]?.id ?? null
}

// Upload the export JSON to the app-data folder (create or overwrite).
export async function backupToDrive(json: string): Promise<void> {
  const existing = await findBackupId()
  const boundary = 'jobmate' + randomString(8)
  const metadata = existing
    ? {}
    : { name: BACKUP_NAME, parents: ['appDataFolder'] }
  const body =
    `--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\ncontent-type: application/json\r\n\r\n` +
    `${json}\r\n--${boundary}--`

  const url = existing
    ? `https://www.googleapis.com/upload/drive/v3/files/${existing}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'

  const res = await fetch(url, {
    method: existing ? 'PATCH' : 'POST',
    headers: {
      authorization: `Bearer ${token()}`,
      'content-type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })
  if (!res.ok) throw new Error(`Backup upload failed (${res.status})`)
}

// Download the latest backup JSON, or null if none exists.
export async function restoreFromDrive(): Promise<string | null> {
  const id = await findBackupId()
  if (!id) return null
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${id}?alt=media`,
    { headers: { authorization: `Bearer ${token()}` } },
  )
  if (!res.ok) throw new Error(`Restore download failed (${res.status})`)
  return res.text()
}

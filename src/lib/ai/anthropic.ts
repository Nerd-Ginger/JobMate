import type { AiUsage } from '../../types'

// Direct browser → Anthropic API call (PRD §2). BYO key; the key is passed in
// from the in-memory session store, never hard-coded. Thinking is disabled so
// the full max_tokens budget goes to the answer (predictable cost, PRD §7.3).

const ENDPOINT = 'https://api.anthropic.com/v1/messages'

export interface AiMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AiCallParams {
  apiKey: string
  model: string
  system?: string
  messages: AiMessage[]
  maxTokens: number
  signal?: AbortSignal
}

export interface AiResult {
  text: string
  usage: AiUsage
  model: string
}

export class AiError extends Error {}

export async function callAnthropic(p: AiCallParams): Promise<AiResult> {
  let res: Response
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': p.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: p.model,
        max_tokens: p.maxTokens,
        thinking: { type: 'disabled' },
        system: p.system,
        messages: p.messages,
      }),
      signal: p.signal,
    })
  } catch (err) {
    throw new AiError(
      err instanceof Error ? `Network error: ${err.message}` : 'Network error.',
    )
  }

  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (body?.error?.message) detail = body.error.message
    } catch {
      /* ignore parse failure */
    }
    if (res.status === 401) throw new AiError('Invalid API key.')
    if (res.status === 429) throw new AiError('Rate limited — try again shortly.')
    throw new AiError(detail)
  }

  const data = await res.json()
  if (data.stop_reason === 'refusal') {
    throw new AiError('The model declined this request.')
  }
  const text = (data.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('')

  return {
    text,
    model: data.model ?? p.model,
    usage: {
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
    },
  }
}

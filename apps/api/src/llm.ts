/**
 * Thin OpenRouter chat-completions wrapper. No SDK — Workers' fetch is enough.
 *
 * Privacy: HelpXs only ever sends already-anonymized aggregate data
 * (counts, percentages, topic labels, demographic buckets). Names, emails,
 * coach ids, and student-identifying fields are never included in prompts.
 */

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
const DEFAULT_MODEL = "google/gemini-3-flash-preview"
const TIMEOUT_MS = 25_000

export type LlmEnv = {
  OPENROUTER_API_KEY?: string
  OPENROUTER_MODEL?: string
}

export type LlmMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export type LlmCallOptions = {
  messages: LlmMessage[]
  temperature?: number
  maxTokens?: number
  responseFormat?: "text" | "json_object"
}

export class LlmUnavailable extends Error {
  constructor() {
    super("LLM not configured (OPENROUTER_API_KEY missing)")
  }
}

export function llmEnabled(env: LlmEnv) {
  return !!env.OPENROUTER_API_KEY
}

export async function chat(
  env: LlmEnv,
  opts: LlmCallOptions,
): Promise<string> {
  if (!env.OPENROUTER_API_KEY) throw new LlmUnavailable()

  const model = env.OPENROUTER_MODEL ?? DEFAULT_MODEL
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "X-Title": "HelpXs",
      },
      body: JSON.stringify({
        model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 600,
        ...(opts.responseFormat === "json_object"
          ? { response_format: { type: "json_object" } }
          : {}),
      }),
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 300)}`)
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error("OpenRouter returned no content")
  return text
}

/**
 * Convenience: ask for a JSON object back, parse it, never throw on bad JSON
 * (caller can fall back to a default).
 */
export async function chatJson<T>(
  env: LlmEnv,
  opts: LlmCallOptions,
): Promise<T | null> {
  const raw = await chat(env, { ...opts, responseFormat: "json_object" })
  try {
    return JSON.parse(raw) as T
  } catch {
    // Some models wrap JSON in ```json fences; try to recover.
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0]) as T
      } catch {
        return null
      }
    }
    return null
  }
}

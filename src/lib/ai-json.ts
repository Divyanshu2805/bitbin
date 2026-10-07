import type { getOpenAIClient } from '@/lib/openai'

/**
 * Getting JSON out of a model that may not have a JSON mode. The calls ask for JSON mode, but
 * providers differ: some reject the option, some ignore it and wrap the answer in a ```json fence or
 * a sentence. These two helpers make both cases work, so any chat model can be used.
 */

type Client = ReturnType<typeof getOpenAIClient>

interface JsonRequest {
  model: string
  instructions: string
  input: string
}

/**
 * Ask for a JSON reply and return the model's text. JSON mode is requested first; a provider that
 * refuses the option (HTTP 400 or 422) gets the same request again without it, and the prompt's own
 * "return JSON" instruction does the rest. Any other failure is thrown.
 */
export async function requestJsonText(client: Client, request: JsonRequest): Promise<string> {
  try {
    const response = await client.responses.create({ ...request, text: { format: { type: 'json_object' } } })
    return response.output_text
  } catch (error) {
    const status = (error as { status?: unknown } | null)?.status
    if (status !== 400 && status !== 422) throw error
    const response = await client.responses.create(request)
    return response.output_text
  }
}

/** The first complete JSON object or array starting at `start`, or null. */
function balancedSlice(text: string, start: number): string | null {
  const open = text[start]
  const close = open === '{' ? '}' : ']'
  let depth = 0
  let inString = false

  for (let i = start; i < text.length; i++) {
    const char = text[i]
    if (inString) {
      if (char === '\\') i++
      else if (char === '"') inString = false
    } else if (char === '"') {
      inString = true
    } else if (char === open) {
      depth++
    } else if (char === close && --depth === 0) {
      return text.slice(start, i + 1)
    }
  }
  return null
}

/**
 * The JSON value in a model's reply: the reply itself, the inside of a ``` fence, or the first
 * object or array that appears in the text. `undefined` when there is none.
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim()
  if (!trimmed) return undefined

  const candidates: string[] = [trimmed]

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced) candidates.push(fenced[1])

  for (const source of [trimmed, fenced?.[1]]) {
    if (!source) continue
    for (const open of ['{', '[']) {
      const start = source.indexOf(open)
      if (start === -1) continue
      const slice = balancedSlice(source, start)
      if (slice) candidates.push(slice)
    }
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate)
    } catch {
      // try the next shape
    }
  }
  return undefined
}

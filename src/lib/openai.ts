import OpenAI from 'openai'

// Any OpenAI-compatible provider works. For OpenRouter, set
// OPENAI_BASE_URL="https://openrouter.ai/api/v1" and use a provider-prefixed
// model name such as AI_MODEL="openai/gpt-5-nano".
export const AI_MODEL = process.env.AI_MODEL || 'gpt-5-nano'

/**
 * The provider key: AI_API_KEY, or OPENAI_API_KEY (the original name, which also still works
 * for any provider's key). AI_API_KEY wins when both are set.
 */
export function resolveApiKey(env: Record<string, string | undefined> = process.env): string | undefined {
  return env.AI_API_KEY || env.OPENAI_API_KEY || undefined
}

let client: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (client) return client

  const apiKey = resolveApiKey()
  if (!apiKey) {
    throw new Error('AI_API_KEY (or OPENAI_API_KEY) environment variable is not set')
  }

  client = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  })
  return client
}

import OpenAI from 'openai'

// Any OpenAI-compatible provider works. For OpenRouter, set
// OPENAI_BASE_URL="https://openrouter.ai/api/v1" and use a provider-prefixed
// model name such as AI_MODEL="openai/gpt-5-nano".
export const AI_MODEL = process.env.AI_MODEL || 'gpt-5-nano'

let client: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (client) return client

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  client = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  })
  return client
}

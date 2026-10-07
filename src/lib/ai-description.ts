import { z } from 'zod'
import { getOpenAIClient, AI_MODEL } from '@/lib/openai'
import { extractJson, requestJsonText } from '@/lib/ai-json'
import { checkAiRateLimit, type ActionResult } from '@/lib/action-utils'

const MAX_CONTENT_LENGTH = 2000

const generateDescriptionSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  content: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  typeName: z.string().min(1, 'Type is required'),
})

export type GenerateDescriptionInput = z.input<typeof generateDescriptionSchema>

/**
 * An AI-written 1-2 sentence description, shared by the `generateDescription`
 * server action and `POST /api/v1/ai/description`. The caller authenticates and
 * checks Pro; this validates, applies the AI rate limit and calls the model.
 */
export async function describeItemForUser(
  userId: string,
  input: unknown
): Promise<ActionResult<string>> {
  const parsed = generateDescriptionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Validation failed' }
  }

  const rateLimitError = await checkAiRateLimit(userId)
  if (rateLimitError) return rateLimitError

  const { title, content, url, language, typeName } = parsed.data

  // Build context for the AI
  const truncatedContent = content
    ? content.slice(0, MAX_CONTENT_LENGTH)
    : null

  const contextParts = [
    `Type: ${typeName}`,
    `Title: ${title}`,
    language ? `Language: ${language}` : null,
    url ? `URL: ${url}` : null,
    truncatedContent ? `Content:\n${truncatedContent}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const client = getOpenAIClient()

    const text = await requestJsonText(client, {
      model: AI_MODEL,
      instructions:
        'You are a developer tool assistant that writes concise descriptions for code snippets, prompts, commands, notes, and links. Return a JSON object with a "description" key containing a 1-2 sentence description. The description should be clear, informative, and summarize what the item is or does. Only return valid JSON.',
      input: `Write a concise 1-2 sentence description for this developer item. Respond in json format with a "description" string.\n\n${contextParts}`,
    })

    if (!text) {
      return { success: false, error: 'AI returned an empty response' }
    }

    // The reply may be bare JSON, fenced, or wrapped in a sentence
    const parsed_response = extractJson(text) as { description?: unknown } | string | null | undefined

    // Handle both { description: "..." } and plain string
    let description: string
    if (typeof parsed_response === 'string') {
      description = parsed_response
    } else if (parsed_response && typeof parsed_response.description === 'string') {
      description = parsed_response.description
    } else {
      return { success: false, error: 'AI returned an unexpected format' }
    }

    const trimmed = description.trim()
    if (trimmed.length === 0) {
      return { success: false, error: 'AI could not generate a description for this item' }
    }

    return { success: true, data: trimmed }
  } catch (error) {
    console.error('AI description generation failed:', error)
    return { success: false, error: 'Failed to generate description. Please try again.' }
  }
}

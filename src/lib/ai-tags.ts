import { z } from 'zod'
import { getOpenAIClient, AI_MODEL } from '@/lib/openai'
import { checkAiRateLimit, type ActionResult } from '@/lib/action-utils'

const MAX_CONTENT_LENGTH = 2000

const generateAutoTagsSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  content: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  typeName: z.string().min(1, 'Type is required'),
})

export type GenerateAutoTagsInput = z.input<typeof generateAutoTagsSchema>

/**
 * AI tag suggestions shared by the `generateAutoTags` server action and
 * `POST /api/v1/ai/tags`. The caller authenticates and checks Pro; this
 * validates, applies the AI rate limit and calls the model.
 */
export async function suggestTagsForUser(
  userId: string,
  input: unknown
): Promise<ActionResult<string[]>> {
  const parsed = generateAutoTagsSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Validation failed' }
  }

  const rateLimitError = await checkAiRateLimit(userId)
  if (rateLimitError) return rateLimitError

  const { title, content, language, typeName } = parsed.data

  // Build context for the AI
  const truncatedContent = content
    ? content.slice(0, MAX_CONTENT_LENGTH)
    : null

  const contextParts = [
    `Type: ${typeName}`,
    `Title: ${title}`,
    language ? `Language: ${language}` : null,
    truncatedContent ? `Content:\n${truncatedContent}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const client = getOpenAIClient()

    const response = await client.responses.create({
      model: AI_MODEL,
      instructions:
        'You are a developer tool assistant that suggests relevant tags for code snippets, prompts, commands, notes, and links. Return a JSON object with a "tags" key containing an array of 3-5 short, lowercase tag strings. Tags should be specific and useful for categorization. Only return valid JSON.',
      input: `Suggest 3-5 tags for this developer item. Respond in json format with a "tags" array.\n\n${contextParts}`,
      text: {
        format: { type: 'json_object' },
      },
    })

    const text = response.output_text
    if (!text) {
      return { success: false, error: 'AI returned an empty response' }
    }

    const parsed_response = JSON.parse(text)

    // Handle both { tags: [...] } and [...] formats
    let tags: unknown[]
    if (Array.isArray(parsed_response)) {
      tags = parsed_response
    } else if (parsed_response.tags && Array.isArray(parsed_response.tags)) {
      tags = parsed_response.tags
    } else {
      return { success: false, error: 'AI returned an unexpected format' }
    }

    // Normalize: filter to strings, lowercase, dedupe, limit to 5
    const normalizedTags = [...new Set(
      tags
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim().toLowerCase())
    )].slice(0, 5)

    if (normalizedTags.length === 0) {
      return { success: false, error: 'AI could not generate tags for this item' }
    }

    return { success: true, data: normalizedTags }
  } catch (error) {
    console.error('AI tag generation failed:', error)
    return { success: false, error: 'Failed to generate tags. Please try again.' }
  }
}

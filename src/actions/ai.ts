'use server'

import { z } from 'zod'
import { getOpenAIClient, AI_MODEL } from '@/lib/openai'
import { extractJson, requestJsonText } from '@/lib/ai-json'
import { suggestTagsForUser, type GenerateAutoTagsInput } from '@/lib/ai-tags'
import { describeItemForUser, type GenerateDescriptionInput } from '@/lib/ai-description'
import { getAuthedSession, requirePro, checkAiRateLimit, type ActionResult } from '@/lib/action-utils'

const MAX_CONTENT_LENGTH = 2000

export async function generateAutoTags(
  input: GenerateAutoTagsInput
): Promise<ActionResult<string[]>> {
  const { session, unauthorized } = await getAuthedSession()
  if (unauthorized) return unauthorized

  const proError = requirePro(session.user.isPro)
  if (proError) return proError

  return suggestTagsForUser(session.user.id, input)
}

// ============================================
// Generate Description
// ============================================

export async function generateDescription(
  input: GenerateDescriptionInput
): Promise<ActionResult<string>> {
  const { session, unauthorized } = await getAuthedSession()
  if (unauthorized) return unauthorized

  const proError = requirePro(session.user.isPro)
  if (proError) return proError

  return describeItemForUser(session.user.id, input)
}

// ============================================
// Explain Code
// ============================================

const explainCodeSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  language: z.string().nullable().optional(),
  typeName: z.enum(['snippet', 'command']),
})

export type ExplainCodeInput = z.infer<typeof explainCodeSchema>

// ============================================
// Optimize Prompt
// ============================================

const optimizePromptSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
})

export type OptimizePromptInput = z.infer<typeof optimizePromptSchema>

/**
 * The optimized prompt out of a model's reply. Asked for
 * `{ "optimizedPrompt": "..." }`, models also send a bare JSON string, a
 * ```json fence around it, another key (`optimized_prompt`, `prompt`, …) or,
 * for a structured prompt, `optimizedPrompt` as an object of sections. The
 * sections become markdown ("Context:" + a list); anything else is null.
 */
function readOptimizedPrompt(text: string): string | null {
  const value = extractJson(text)
  // A model without JSON mode may just answer with the rewritten prompt
  if (value === undefined) return text.trim().replace(/^```(?:markdown|md)?\s*/i, '').replace(/\s*```$/, '')
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const record = value as Record<string, unknown>
  const key = ['optimizedPrompt', 'optimized_prompt', 'improvedPrompt', 'prompt'].find((k) => k in record)
  const found = key ? record[key] : null
  if (typeof found === 'string') return found
  if (found && typeof found === 'object') return sectionsToMarkdown(found)
  return null
}

function sectionsToMarkdown(value: object): string | null {
  const blocks: string[] = []
  for (const [name, body] of Object.entries(value)) {
    // A title adds nothing to the prompt itself
    if (name.toLowerCase() === 'title') continue
    const heading = name.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase())
    const text = toMarkdown(body, 0)
    if (text) blocks.push(`${heading}:\n${text}`)
  }
  return blocks.length ? blocks.join('\n\n') : null
}

/** Any JSON value as markdown, nothing dropped: lists become bullets, objects "key: value" bullets. */
function toMarkdown(value: unknown, depth: number): string {
  const indent = '  '.repeat(depth)
  if (value === null || value === undefined) return ''
  if (typeof value !== 'object') return String(value)
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        item !== null && typeof item === 'object'
          ? `${indent}-\n${toMarkdown(item, depth + 1)}`
          : `${indent}- ${String(item)}`
      )
      .join('\n')
  }
  return Object.entries(value)
    .map(([key, item]) =>
      item !== null && typeof item === 'object'
        ? `${indent}- ${key}:\n${toMarkdown(item, depth + 1)}`
        : `${indent}- ${key}: ${String(item)}`
    )
    .join('\n')
}

export async function optimizePrompt(
  input: OptimizePromptInput
): Promise<ActionResult<string>> {
  const { session, unauthorized } = await getAuthedSession()
  if (unauthorized) return unauthorized

  const proError = requirePro(session.user.isPro)
  if (proError) return proError

  const parsed = optimizePromptSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Validation failed' }
  }

  const rateLimitError = await checkAiRateLimit(session.user.id)
  if (rateLimitError) return rateLimitError

  const { title, content } = parsed.data

  // Build context for the AI
  const truncatedContent = content.slice(0, MAX_CONTENT_LENGTH)

  const contextParts = [
    `Title: ${title}`,
    `Prompt:\n${truncatedContent}`,
  ].join('\n')

  try {
    const client = getOpenAIClient()

    const text = await requestJsonText(client, {
      model: AI_MODEL,
      instructions:
        [
          'You are a prompt engineering expert. Rewrite the prompt so it is clearer and more effective, without losing anything.',
          'Rules:',
          '- Keep EVERY requirement, constraint, context detail, number and example from the original. Never drop, merge away or summarise one; the result must be at least as specific as the original.',
          '- Improve structure and wording: give it a clear role and task, then sections such as Context, Requirements, Constraints and Output format, each as a markdown bullet list.',
          '- You may add missing details that make the task unambiguous (expected output shape, edge cases to handle), but never change what is being asked.',
          '- Do not add a title line or commentary about the changes.',
          'Return a JSON object with one key, "optimizedPrompt", whose value is the whole rewritten prompt as a single markdown string (not an object or array). Only return valid JSON.',
        ].join('\n'),
      input: `Optimize the following prompt. Return a JSON object with an "optimizedPrompt" key.\n\n${contextParts}`,
    })

    if (!text) {
      return { success: false, error: 'AI returned an empty response' }
    }

    const optimized = readOptimizedPrompt(text)
    if (optimized === null) {
      return { success: false, error: 'AI returned an unexpected format' }
    }

    const trimmed = optimized.trim()
    if (trimmed.length === 0) {
      return { success: false, error: 'AI could not optimize this prompt' }
    }

    return { success: true, data: trimmed }
  } catch (error) {
    console.error('AI prompt optimization failed:', error)
    return { success: false, error: 'Failed to optimize prompt. Please try again.' }
  }
}

export async function explainCode(
  input: ExplainCodeInput
): Promise<ActionResult<string>> {
  const { session, unauthorized } = await getAuthedSession()
  if (unauthorized) return unauthorized

  const proError = requirePro(session.user.isPro)
  if (proError) return proError

  const parsed = explainCodeSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Validation failed' }
  }

  const rateLimitError = await checkAiRateLimit(session.user.id)
  if (rateLimitError) return rateLimitError

  const { title, content, language, typeName } = parsed.data

  // Build context for the AI
  const truncatedContent = content.slice(0, MAX_CONTENT_LENGTH)

  const contextParts = [
    `Type: ${typeName}`,
    `Title: ${title}`,
    language ? `Language: ${language}` : null,
    `Code:\n${truncatedContent}`,
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const client = getOpenAIClient()

    const response = await client.responses.create({
      model: AI_MODEL,
      instructions:
        'You are a developer tool assistant that explains code snippets and terminal commands. Provide a clear, concise explanation (200-300 words) in markdown format. Cover what the code does, key concepts used, and any important details. Use markdown headings, bullet points, and inline code formatting where appropriate. Return plain markdown text, NOT JSON.',
      input: `Explain the following code. Provide a concise explanation in markdown format.\n\n${contextParts}`,
    })

    const text = response.output_text
    if (!text) {
      return { success: false, error: 'AI returned an empty response' }
    }

    const trimmed = text.trim()
    if (trimmed.length === 0) {
      return { success: false, error: 'AI could not generate an explanation for this code' }
    }

    return { success: true, data: trimmed }
  } catch (error) {
    console.error('AI code explanation failed:', error)
    return { success: false, error: 'Failed to explain code. Please try again.' }
  }
}

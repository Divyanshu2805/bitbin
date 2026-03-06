# AI features

Four Pro-only helpers, all implemented as server actions in
`src/actions/ai.ts` on top of the OpenAI **Responses API**
(`src/lib/openai.ts`, model constant `AI_MODEL`).

| Action | Where it shows up | Output |
| --- | --- | --- |
| `generateAutoTags` | "Suggest tags" button in item create/edit | 3–5 lowercase tags, deduped |
| `generateDescription` | "Generate" next to the description field | One or two sentence summary |
| `explainCode` | "Explain" in the code editor header when viewing an item in the drawer | Markdown explanation |
| `optimizePrompt` | "Optimize" in the markdown editor for prompt items | Rewritten prompt the user can accept or discard |

## Guard sequence

Every AI action runs the same checks before calling OpenAI:

```
getAuthedSession()      → "Unauthorized"
requirePro(isPro)       → "AI features require a Pro subscription"
zod.safeParse(input)    → "Validation failed"
checkAiRateLimit(user)  → 20 requests / hour (Upstash)
```

Content sent to the model is truncated to **2,000 characters**
(`MAX_CONTENT_LENGTH`) to keep latency and cost predictable.

## Response handling

- Tag suggestions ask for JSON (`{"tags": [...]}`). The parser also accepts a
  bare array, filters out non-strings, lowercases, dedupes and caps at five.
- Any OpenAI error is logged server-side, and the client only gets a friendly
  message ("Failed to generate tags. Please try again."). Keys and stack
  traces never reach the browser.

## UI

- `src/components/shared/pro-ai-button.tsx` renders AI buttons in a disabled
  state with an upgrade tooltip for Free users.
- `suggest-tags-button.tsx` shows suggestions as chips. Each one can be
  accepted (✓) or dismissed (✕).
- `generate-description-button.tsx` fills the description field in place.

## Testing

`src/actions/ai.test.ts` mocks the OpenAI client and covers auth, Pro gating,
validation, rate limiting and response parsing. No network calls are made in
tests.

## Changing the model

Update `AI_MODEL` in `src/lib/openai.ts`. All four actions pick it up. The
prompts are plain strings inside each action, so tuning them doesn't need any
other changes.

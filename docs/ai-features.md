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

## Provider and model

The client in `src/lib/openai.ts` works with OpenAI or any OpenAI-compatible
API. It's configured with three variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | none (required) | Key for the provider you use |
| `OPENAI_BASE_URL` | OpenAI's API | Point at another provider |
| `AI_MODEL` | `gpt-5-nano` | Model name as the provider spells it |

### Using OpenRouter

```
OPENAI_API_KEY="sk-or-..."
OPENAI_BASE_URL="https://openrouter.ai/api/v1"
AI_MODEL="mistralai/mistral-small-3.2-24b-instruct"
```

OpenRouter model names are prefixed with the vendor (`openai/gpt-4.1-nano`,
`google/gemini-2.5-flash-lite`, ...). The actions use the Responses API with
`text.format: json_object` for tags and descriptions. Pick a model that
supports JSON mode, or those two actions reply with *"AI returned an
unexpected format"*.

**Reasoning models cost more than they look.** Models like `gpt-5-nano` think
before answering, and those hidden tokens are billed as output. A cheaper-looking
reasoning model can end up costing more per request than a small non-reasoning
one.

All four actions read `AI_MODEL`, and the prompts are plain strings inside
each action, so switching models or tuning prompts needs no other changes.

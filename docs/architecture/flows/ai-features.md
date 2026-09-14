# AI Features Flow

Four Pro-only helpers, all server actions in `src/actions/ai.ts`, calling the **Responses API** of OpenAI — or any OpenAI-compatible provider — through `src/lib/openai.ts`, with the model named by `AI_MODEL` (default `gpt-5-nano`).

| Action | Where it shows up | Output |
|---|---|---|
| `generateAutoTags` | "Suggest tags" in the item create and edit forms | 3–5 lowercase tags, de-duplicated |
| `generateDescription` | "Generate" next to the description field | A one- or two-sentence summary |
| `explainCode` | "Explain" in the code editor header when viewing an item in the drawer | A markdown explanation |
| `optimizePrompt` | "Optimize" in the markdown editor for prompt items | A rewritten prompt the user can accept or discard |

## Guard sequence

Every AI action runs the same checks, in this order, before calling OpenAI:

```
getAuthedSession()      → "Unauthorized"
requirePro(isPro)       → "AI features require a Pro subscription"
zod.safeParse(input)    → "Validation failed"
checkAiRateLimit(user)  → 20 requests / hour per IP + user (Upstash)
```

Content sent to the model is truncated to **2,000 characters** (`MAX_CONTENT_LENGTH`), to keep latency and cost predictable.

## Response handling

- Tag suggestions ask for JSON (`{"tags": [...]}`). The parser also accepts a bare array, drops non-strings, lowercases, de-duplicates and caps at five.
- Any OpenAI error is logged server-side, and the client gets a friendly message ("Failed to generate tags. Please try again."). Keys and stack traces never reach the browser.

## UI

- `components/shared/pro-ai-button.tsx` renders AI buttons disabled, with an upgrade tooltip, for Free users.
- `suggest-tags-button.tsx` shows suggestions as chips that can each be accepted (✓) or dismissed (✕).
- `generate-description-button.tsx` fills the description field in place.

## Provider and model

The client works with OpenAI or any OpenAI-compatible API, configured by three variables:

| Variable | Default | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | none — required | Key for the provider you use |
| `OPENAI_BASE_URL` | OpenAI's API | Point at another provider |
| `AI_MODEL` | `gpt-5-nano` | The model name as the provider spells it |

For OpenRouter:

```
OPENAI_API_KEY="sk-or-..."
OPENAI_BASE_URL="https://openrouter.ai/api/v1"
AI_MODEL="mistralai/mistral-small-3.2-24b-instruct"
```

OpenRouter model names are prefixed with the vendor (`openai/gpt-4.1-nano`, `google/gemini-2.5-flash-lite`, …).

- **The model needs JSON mode.** Tags and descriptions use the Responses API with `text.format: json_object`. A model without JSON mode makes those two actions reply *"AI returned an unexpected format"*.
- **Reasoning models cost more than they look.** Models like `gpt-5-nano` think before answering, and those hidden tokens are billed as output — a cheaper-looking reasoning model can cost more per request than a small non-reasoning one.

All four actions read `AI_MODEL`, and the prompts are plain strings inside each action, so switching models or tuning prompts needs no other change. `src/actions/ai.test.ts` mocks the client, so tests never call a provider.

## Related

- [AI actions](../README.md)
- [AI integration plan](../design-notes/ai-integration-plan.md) — the original design write-up.

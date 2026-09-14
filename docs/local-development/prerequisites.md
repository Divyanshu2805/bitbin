# Prerequisites

## Required

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20 or newer | `@types/node` is pinned to 20 |
| npm | 10 or newer | The repository ships a `package-lock.json` |
| PostgreSQL | 15 or newer | A free [Neon](https://neon.tech) project is the easiest option; a local server works too |

With only these, BitBin runs: you can register (with email verification skipped), sign in, and create text, command, note, prompt and link items and collections.

## Optional, per feature

Each hosted service switches on one area of the app. Leave it out and only that area stops working — see [what works without which key](configuration.md#what-works-without-which-key).

| Service | Unlocks | Free tier |
|---|---|---|
| GitHub OAuth app | "Continue with GitHub" | Yes |
| [Resend](https://resend.com) | Verification and password-reset emails (only to your own address until you verify a domain) | Yes |
| [Upstash Redis](https://upstash.com) | Rate limiting | Yes |
| [Cloudflare R2](https://developers.cloudflare.com/r2/) | File and image items, ZIP export | Yes |
| [Stripe](https://stripe.com) (test mode) + the Stripe CLI | Upgrading to Pro, the billing portal, webhooks | Test mode is free |
| [OpenAI](https://platform.openai.com), or an OpenAI-compatible provider such as [OpenRouter](https://openrouter.ai) | The four AI helpers | Pay as you go |

Pro-only features (files, images, AI, ZIP export) also need a Pro account. Locally you can get one either by running a test-mode checkout, or by setting `isPro = true` on your user in Prisma Studio (`npm run db:studio`) — sessions pick the change up on the next request.

## Next

[Setup](setup.md).

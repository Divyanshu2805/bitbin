# Integration Pitfalls

## Stripe

- **Tag BitBin's checkouts.** The webhook ignores `checkout.session.completed` unless `metadata.app` is `bitbin` — a new checkout path that forgets `STRIPE_APP_TAG` upgrades nobody.
- **Production needs the dashboard endpoint's secret**, not the one `stripe listen` printed locally.
- **Verify against the raw body.** The webhook reads `request.text()` and passes it to `constructEvent`. Reading `request.json()` first changes the bytes and every signature fails.
- **Each `stripe listen` session has its own secret.** Restarting the CLI can print a new `whsec_…`; the dev server needs restarting with it, or every event returns `400`.
- **The dashboard endpoint must subscribe to all five events.** Missing `customer.subscription.deleted` means cancelled users stay Pro forever.
- **Events aren't de-duplicated or ordered.** A retried or late `invoice.paid` can set `isPro = true` after a `customer.subscription.deleted`. See [known gaps](../../known-gaps/constraints-and-trade-offs.md).
- **Checkout doesn't check the current plan.** A Pro user who reaches checkout can start a second subscription.

## Cloudflare R2

- **Keys are derived from `R2_PUBLIC_URL`.** `deleteFromR2` strips the configured public URL from the stored `fileUrl`. Change the public URL (say, to a custom domain) and every existing item's delete stops finding its object.
- **New image hosts need `next.config.ts`.** `images.remotePatterns` allows `*.r2.dev`, `pub-*.r2.dev` and `*.r2.cloudflarestorage.com`; a custom domain renders as a broken image until it's added.
- **Deletes swallow errors.** A failed R2 delete is logged and the item is deleted anyway, leaving an orphan.

## Upstash

- **It fails open.** Missing, placeholder or invalid variables, or a Redis error, mean no rate limiting at all, with only a log line to show for it. A production deploy without the `UPSTASH_*` variables looks fine and has no brute-force protection.
- **Local testing trips limits quickly.** Five sign-in attempts in 15 minutes is easy to hit while developing. Clear the keys or unset the variables — see [resetting data](../../local-development/resetting-data.md#clear-rate-limits).

## Resend

- **The default sender only reaches you.** Without `FROM_EMAIL`, mail goes from Resend's sandbox sender (`onboarding@resend.dev`), which delivers only to the address the Resend account was created with. Everyone else's verification email never arrives.
- **A sender on an unverified domain is rejected** with a `403` — and because registration creates the user before sending, the sign-up fails with a `500` and leaves an unverified account behind.
- **Add DMARC.** SPF and DKIM come from Resend's setup; without a `_dmarc` record, Gmail and Yahoo are more likely to file verification emails as spam.
- **`SKIP_EMAIL_VERIFICATION` must be off in production.** With it on, anyone can register any email address and sign in immediately.

## OpenAI and compatible providers

- **Pick a model with JSON mode.** Tags and descriptions request `json_object` output; other models fail with *"AI returned an unexpected format"*.
- **Model names are provider-specific.** OpenRouter needs the vendor prefix (`openai/gpt-5-nano`); OpenAI doesn't.
- **`OPENAI_API_KEY` holds any provider's key**, including OpenRouter's — the name is historical.
- **Tag responses aren't always the requested shape.** The parser accepts `{"tags": [...]}` or a bare array and drops anything else — keep that tolerance if you change the prompt.

# Provider Callbacks

Each hosted service needs to know where the deployed app lives. Set these once per domain.

## GitHub OAuth

A GitHub OAuth app allows **one** callback URL, so production gets its own app. Create a second OAuth app (GitHub → Settings → Developer settings → OAuth Apps) with the callback:

```
https://bitbin.yourdomain.com/api/auth/callback/github
```

and put its client id and secret in Vercel. Keep the development app for `http://localhost:3000/api/auth/callback/github`.

## Stripe

1. Developers → Webhooks → add an endpoint for `https://bitbin.yourdomain.com/api/webhooks/stripe`.
2. Subscribe it to exactly these events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`.
3. Put **that endpoint's** signing secret in `STRIPE_WEBHOOK_SECRET`.
4. Create the **BitBin Pro** product with $8 / month and $72 / year prices, and put their ids in `STRIPE_PRICE_ID_MONTHLY` / `_YEARLY`.
5. Enable the Customer Portal (Settings → Billing → Customer portal).

Checkout's success and cancel URLs, and the portal's return URL, are built from `NEXT_PUBLIC_APP_URL` — no Stripe setting needed for them. If the Stripe account is shared with other apps, see [sharing a Stripe account](../architecture/flows/billing.md#sharing-a-stripe-account-with-other-apps).

### Stripe test mode in production

Live mode needs an activated Stripe account, and in some countries — India included — new accounts are invite-only. The deployed app works with **test-mode** keys: visitors can upgrade with the `4242 4242 4242 4242` test card and no real money moves. When live mode is available, switch to the `sk_live_` / `pk_live_` keys, recreate the product, prices and webhook in live mode, and update the price ids and webhook secret.

## Resend

Until a domain is verified, Resend only delivers to your own address, so other people's sign-ups never receive their verification link.

1. Resend → **Domains → Add Domain** → `bitbin.yourdomain.com` (a subdomain keeps email reputation separate from your main domain).
2. Add the SPF and DKIM records Resend shows in Cloudflare DNS (or use Resend's one-click Cloudflare setup). Leave them **DNS only**.
3. Add a DMARC record: a TXT record `_dmarc` with `v=DMARC1; p=none;`, tightened to `p=quarantine` once reports look clean. Without it, verification emails are more likely to land in spam.
4. Once Resend marks the domain *Verified*, set `FROM_EMAIL="BitBin <noreply@bitbin.yourdomain.com>"` in Vercel and redeploy.

Email links are built from `NEXT_PUBLIC_APP_URL`.

## Cloudflare R2

- Enable the bucket's public URL (or attach a custom domain) and put it in `R2_PUBLIC_URL`.
- A custom domain must also be added to `images.remotePatterns` in `next.config.ts`, which today allows `*.r2.dev`, `pub-*.r2.dev` and `*.r2.cloudflarestorage.com`.
- Decide the public URL before users upload anything: stored file URLs and deletes are derived from it.

## Upstash and the AI provider

No callbacks — only the keys (and, for the AI provider, `OPENAI_BASE_URL` / `AI_MODEL` if you don't use OpenAI's defaults).

## Related

- [Billing flow](../architecture/flows/billing.md) · [Integration pitfalls](../practices/gotchas/integrations.md)

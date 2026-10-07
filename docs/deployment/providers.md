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

Live mode needs an activated Stripe account, and in some countries — India included — new accounts are invite-only. The deployed app works with **test-mode** keys: visitors can upgrade with the `4242 4242 4242 4242` test card and no real money moves. When live mode is available, switch to the `sk_live_` key, recreate the product, prices and webhook in live mode, and update the price ids and webhook secret.

## Resend

Until a domain is verified, Resend only delivers to your own address, so other people's sign-ups never receive their verification link.

1. Resend → **Domains → Add Domain** → `bitbin.yourdomain.com` (a subdomain keeps email reputation separate from your main domain).
2. Add the SPF and DKIM records Resend shows in Cloudflare DNS (or use Resend's one-click Cloudflare setup). Leave them **DNS only**.
3. Add a DMARC record: a TXT record `_dmarc` with `v=DMARC1; p=none;`, tightened to `p=quarantine` once reports look clean. Without it, verification emails are more likely to land in spam.
4. Once Resend marks the domain *Verified*, set `FROM_EMAIL="BitBin <noreply@bitbin.yourdomain.com>"` in Vercel and redeploy.

A brand-new sending domain has no reputation, so the first messages often go to spam even with SPF, DKIM and DMARC in place; that improves as recipients open them. The README tells new users to check their spam folder.

Email links are built from `NEXT_PUBLIC_APP_URL`.

## Cloudflare Turnstile

Optional bot protection on register and forgot-password, so a script can't use BitBin to send mail to strangers (on top of the per-IP and per-address limits).

1. Cloudflare dashboard → **Turnstile → Add widget**. Hostname: `bitbin.yourdomain.com`. Mode: *Managed*.
2. Put the **site key** in `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and the **secret key** in `TURNSTILE_SECRET_KEY` on Vercel, then redeploy. The site key is read at build time (the policy in `src/lib/csp.ts` then allows `https://challenges.cloudflare.com` for scripts, frames and connections), so a redeploy is needed, not just a restart.
3. Set only one of the two and the check stays off. With both set, a request without a valid token is refused, and so is one when Cloudflare can't be reached (it fails closed). For local development use Cloudflare's [test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/).

## VirusTotal

Optional: uploads are checked against VirusTotal's database of known malware.

1. Create a free account at virustotal.com and copy the API key from your profile.
2. Set it as `VIRUSTOTAL_API_KEY` on Vercel.

Only the file's SHA-256 is sent, never the file. A file VirusTotal has never seen passes (so this catches known samples, not new ones), and a failed or slow lookup lets the upload through. The free tier allows about 4 lookups a minute, which the 10-uploads-an-hour limit stays well under.

## Cloudflare R2

- Keep the bucket **private**: no `r2.dev` URL, no custom domain. Every file is read through the app with the API token's credentials.
- `R2_PUBLIC_URL` is only the name stored file URLs are built from (and what the ownership check compares them to). It doesn't have to be reachable. Don't change it once users have uploaded files: stored URLs and deletes are derived from it.
- **Turning public access off on an existing bucket:** deploy this code first, check that images, downloads and the ZIP export work for a signed-in user, then disable the `r2.dev` URL (or custom domain) in the Cloudflare dashboard. Doing it in that order means there is no moment when images break.

## Sentry

Server errors go to [Sentry](https://sentry.io) (`lib/monitoring.ts`). Both Next.js's own error hook and every `console.error` are captured, which includes the failures worth an alert: a 500 from any route, a Stripe webhook that failed, `Rate limit check failed`, `Upstash Redis not configured`. Cookies, auth headers, request bodies, query strings (reset and verification links carry their token there), IPs and user data are stripped before an event leaves the server, and no performance traces are sent.

1. Create a Sentry project (platform: Next.js) and copy its DSN.
2. Add it to Vercel as `SENTRY_DSN` (Production) and redeploy.
3. In Sentry: **Alerts → Create alert → Issues**, with the trigger *A new issue is created* (and, to hear about an old problem getting worse, *An issue escalates*), the action **Notify on preferred channel**, and no filter. Every first failure is a new issue, a failing Stripe webhook included: those are logged as `Error handling <event type>` or `Webhook signature verification failed`. Sentry's message filters (*Event attribute*) don't combine with the *new issue* trigger, so don't try to narrow it to the webhook.
4. Archive an issue (**Archive → Forever**) once it's understood and harmless, so it stops alerting.

Without `SENTRY_DSN` nothing is sent and nothing changes.

## GitHub

Two switches in the repository's **Settings → Advanced Security** belong to the repository, not the code, and are on for this one: **Secret scanning** and **Push protection**. Check them when forking. The CI workflow is described under [Continuous integration](README.md#continuous-integration).

## Upstash and the AI provider

No callbacks — only the keys (and, for the AI provider, `OPENAI_BASE_URL` / `AI_MODEL` if you don't use OpenAI's defaults).

## Related

- [Billing flow](../architecture/flows/billing.md) · [Integration pitfalls](../practices/gotchas/integrations.md)

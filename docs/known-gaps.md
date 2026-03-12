# Known gaps

Things that don't work the way they ideally should, found while setting up
and deploying BitBin. Each entry says what happens, why it matters and what
fixing it would take. Nothing here blocks normal use of the live site.

Severity: **High** = can cause failures or security exposure, **Medium** = a
user or maintainer can get stuck, **Low** = polish.

## Dependencies & security

| Gap | Severity | Details | Suggested fix |
| --- | --- | --- | --- |
| Open security advisories | High | `npm audit` reports 70 advisories (10 critical, 31 high, 25 moderate, 4 low), including in direct dependencies `next`, `next-auth`, `@auth/prisma-adapter`, `prisma` and `vitest`. | Upgrade `next` to the patched 16.x release (a non-breaking fix is available), then re-run `npm audit` and upgrade the rest one at a time with `npm run test && npm run build` after each. Avoid `npm audit fix --force`: it proposes breaking downgrades. |
| Auth library is a beta | Medium | `next-auth@5.0.0-beta.30`. GitHub sign-in only works because of the `issuer` override in `auth.ts` / `auth.config.ts` (see [authentication.md](authentication.md)). Upgrading within the beta line did not fix the underlying issue. | Re-test GitHub sign-in after every `next-auth` upgrade; drop the override once Auth.js handles GitHub's `iss` parameter itself. |
| Postgres SSL mode will change meaning | Low | Every DB connection logs a warning: `sslmode=require` is currently treated as `verify-full`, but `pg` v9 will switch to libpq semantics, which are weaker. | Use `sslmode=verify-full` explicitly in `DATABASE_URL` (local `.env` and Vercel). |
| Prisma major upgrade pending | Low | Prisma 8 is available; the project is on 7.3. | Follow Prisma's major-version guide on a branch; regenerate the client and run the full test suite. |

## Accounts & sign-in

| Gap | Severity | Details | Suggested fix |
| --- | --- | --- | --- |
| Failed verification email leaves a stuck account | Medium | `POST /api/auth/register` creates the user **before** sending the verification email. If sending fails, the user sees *"An error occurred during registration"*, and retrying says *"User with this email already exists"*. The way out (sign in, then *Resend verification email*) isn't obvious. | Send the email inside a transaction with user creation, or delete the user when sending fails, or make "already exists but unverified" re-send the email instead of erroring. |
| Re-opening a used verification link shows an error | Low | Tokens are single-use. Opening the link a second time (or refreshing the page) returns *"Invalid verification token"*, even though the account is already verified. | When a token isn't found, tell the user the link was already used and point them to sign in. |
| No account linking | Medium | Someone who registered with email + password can't later "Sign in with GitHub" using the same email: they get `OAuthAccountNotLinked`. There's no settings screen to link the two. | Add a "Connect GitHub" action in Settings for signed-in users (linking only after they've proven ownership of both). Don't enable `allowDangerousEmailAccountLinking`. |
| GitHub-only users can't add a password | Low | Accounts created through GitHub have no password. *Forgot password* deliberately returns the same generic "link sent" message for them (to avoid revealing which emails exist), so they wait for an email that never comes. | Add "Set a password" to Settings for accounts without one. |

## Payments

| Gap | Severity | Details | Suggested fix |
| --- | --- | --- | --- |
| Production runs in Stripe test mode | Medium | Live mode needs an activated Stripe account, and new Indian accounts are invite-only. The live site accepts only test cards; no real money moves. | Once live mode is available, follow *Stripe test mode in production* in [deployment.md](deployment.md). |
| Checkout webhook can fail for deleted users | Low | `handleCheckoutCompleted` uses `prisma.user.update`. If the user deleted their account between paying and the webhook arriving, it throws and returns 500, and Stripe keeps retrying for days. | Use `updateMany` (or catch "record not found") and return 200. |

## Email

| Gap | Severity | Details | Suggested fix |
| --- | --- | --- | --- |
| No DMARC record | Medium | SPF and DKIM for `bitbin.divyanshuagrahari.dev` are set up through Resend, but there's no `_dmarc` record. Gmail and Yahoo increasingly expect one, and without it verification emails are more likely to land in spam. | Add a TXT record `_dmarc` with `v=DMARC1; p=none;` in Cloudflare, then tighten to `p=quarantine` once reports look clean. |
| Local email only reaches the Resend owner | Low | Without `FROM_EMAIL`, local development uses Resend's sandbox sender, which only delivers to the Resend account's own address. | Expected; documented in [environment-variables.md](environment-variables.md). Set `FROM_EMAIL` locally to test other recipients. |

## Infrastructure & operations

| Gap | Severity | Details | Suggested fix |
| --- | --- | --- | --- |
| Development and production share a database | Medium | Local development and the live site use the same Neon database, so test accounts and experiments appear in production and a bad local migration would hit live data. | Create a Neon `development` branch and use its URL in the local `.env`. |
| Rate limiting fails open | Low | By design, if Upstash is unreachable or unconfigured, every request is allowed so users are never locked out. During an outage there's no brute-force protection. | Acceptable trade-off; add an alert when the "not configured" / Redis error logs appear in production. |
| Noisy log when Upstash is unset | Low | *"Upstash Redis not configured"* is logged on every rate-limit check, not once. | Log once per process. |
| No error monitoring | Medium | Server errors only appear in Vercel's function logs; nobody is notified. | Add an error tracker (e.g. Sentry) or at least Vercel log drains with alerts on 5xx responses and webhook failures. |

## Product & UX

| Gap | Severity | Details | Suggested fix |
| --- | --- | --- | --- |
| Search index is loaded once | Low | The ⌘K palette fetches its data when the dashboard loads. Items created in another tab don't show up until a reload. | Refetch on palette open, or after create/update/delete actions. |
| AI key variable is named after OpenAI | Low | `OPENAI_API_KEY` also holds OpenRouter keys, which can be confusing. | Accept `AI_API_KEY` as an alias and keep the old name for compatibility. |
| AI output depends on the model | Low | Tags and descriptions require a model with JSON mode; others fail with *"AI returned an unexpected format"*. | Documented in [ai-features.md](ai-features.md#provider-and-model); optionally fall back to parsing JSON from plain text. |

## Testing

| Gap | Severity | Details | Suggested fix |
| --- | --- | --- | --- |
| Route handlers have no tests | Medium | The 218 tests cover server actions and libraries, but none of the API routes: register, verify, forgot/reset password, upload, download, export, Stripe checkout/portal and the webhook. The registration and webhook gaps above would have been caught by them. | Add route tests with mocked Prisma, Resend and Stripe, starting with registration and the webhook. |

## Roadmap

Planned additions, not bugs:

- **Save from anywhere (Pro):** a keyboard shortcut that saves the current
  text selection into BitBin through a small popup. Planned as a browser
  extension first, then a desktop tray app with a system-wide shortcut. Both
  need personal access tokens and a small `POST /api/v1/items` endpoint.
- **Separate development database** (see above).
- **Live Stripe payments** once the account can be activated.

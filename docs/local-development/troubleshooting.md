# Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `PrismaClientInitializationError` on start | `DATABASE_URL` is wrong or unreachable. For Neon, make sure `?sslmode=require` is present. `npm run db:test` checks the connection on its own |
| `Cannot find module '@/generated/prisma'`, or the seed fails with `Cannot find module '../src/generated/prisma/client'` | The client hasn't been generated — `prisma migrate deploy` doesn't generate it. Run `npm run db:generate` (or `npm run db:migrate`) |
| Registration fails with "An error occurred during registration" | Usually Resend rejecting the send: the sandbox sender only reaches the Resend account owner, and a `FROM_EMAIL` on an unverified domain gets a `403`. The user row was already created, so a retry says the email exists — sign in and use *Resend verification email*, or delete the user. See [known gaps](../known-gaps/not-yet-built.md#accounts-and-billing) |
| The verification email never arrives for other people | `FROM_EMAIL` isn't set to an address on a domain verified in Resend |
| "Please verify your email" on sign-in | The account's `emailVerified` is empty. Set `SKIP_EMAIL_VERIFICATION="true"` for development, or configure Resend and use the link |
| GitHub sign-in fails with `unexpected "iss" (issuer) response parameter value` | The GitHub provider is missing its `issuer` override. Both `src/auth.ts` and `src/auth.config.ts` must configure `GitHub({ issuer: 'https://github.com/login/oauth' })` — see [authentication](../architecture/flows/authentication.md#github) |
| GitHub sign-in loops back to `/sign-in` | The GitHub OAuth app's callback must be exactly `http://localhost:3000/api/auth/callback/github`, and `AUTH_URL` must match the origin you're browsing |
| `/sign-in?error=OAuthAccountNotLinked` | That email already has a password account. BitBin doesn't link GitHub to password accounts — sign in with the password. See [authentication](../architecture/flows/authentication.md#github) |
| Creating an item fails with "Failed to create item" on a fresh database | The system item types are missing. Run `npm run db:seed` |
| Uploads fail with 500 | An `R2_*` variable is missing, or the bucket has no public URL |
| Uploads fail with 403 | The account isn't Pro. Files and images are Pro-only |
| Images don't render | `R2_PUBLIC_URL`'s host isn't allowed by `images.remotePatterns` in `next.config.ts` (it allows `*.r2.dev` and `*.r2.cloudflarestorage.com`; a custom domain needs adding) |
| AI buttons return an error | `OPENAI_API_KEY` is missing, the account isn't Pro, or the 20 / hour AI limit was hit |
| "AI returned an unexpected format" | The model in `AI_MODEL` doesn't support JSON mode, which tags and descriptions need — see [provider and model](../architecture/flows/ai-features.md#provider-and-model) |
| Upgrading succeeds in Stripe but the app still says Free | The webhook didn't arrive. Locally, `stripe listen` must be running and its `whsec_…` must be in `STRIPE_WEBHOOK_SECRET` (restart the dev server after changing it) |
| "Too many attempts" while testing sign-in | You hit a rate limit. Wait, or [clear the counters](resetting-data.md#clear-rate-limits) |
| A new item doesn't appear in ⌘K search | The search index is loaded once per page load. Reload. See [search](../architecture/flows/search.md) |
| Schema changes aren't picked up | Run `npm run db:migrate` — not `db push`, which is disabled |

## Related

- [Known pitfalls](../practices/gotchas/README.md) — traps that fail silently rather than with an error.

# Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `PrismaClientInitializationError` on start | `DATABASE_URL` is wrong or unreachable. For Neon, make sure `?sslmode=require` is present. `npm run db:studio` is a quick way to check the connection on its own |
| `Cannot find module '@/generated/prisma'`, or the seed fails with `Cannot find module '../src/generated/prisma/client'` | The client hasn't been generated — `prisma migrate deploy` doesn't generate it. Run `npm run db:generate` (or `npm run db:migrate`) |
| Registration fails with "An error occurred during registration" | Usually Resend rejecting the send: the sandbox sender only reaches the Resend account owner, and a `FROM_EMAIL` on an unverified domain gets a `403`. The new account is removed again when the email can't be sent, so fix the sender and register again |
| The verification email never arrives for other people | `FROM_EMAIL` isn't set to an address on a domain verified in Resend |
| "Please verify your email" on sign-in | The account's `emailVerified` is empty. Set `SKIP_EMAIL_VERIFICATION="true"` for development, or configure Resend and use the link |
| GitHub sign-in fails with `unexpected "iss" (issuer) response parameter value` | The GitHub provider is missing its `issuer` override. Both `src/auth.ts` and `src/auth.config.ts` must configure `GitHub({ issuer: 'https://github.com/login/oauth' })` — see [authentication](../architecture/flows/authentication.md#github) |
| GitHub sign-in loops back to `/sign-in` | The GitHub OAuth app's callback must be exactly `http://localhost:3000/api/auth/callback/github`, and `AUTH_URL` must match the origin you're browsing |
| `/sign-in?error=OAuthAccountNotLinked` | That email already has a password account. BitBin doesn't link GitHub to password accounts — sign in with the password. See [authentication](../architecture/flows/authentication.md#github) |
| Creating an item fails with "Failed to create item" on a fresh database | The system item types are missing. Run `npm run db:seed` |
| Uploads fail with 500 | An `R2_*` variable is missing (`R2_ACCOUNT_ID`, the key pair, `R2_BUCKET_NAME` or `R2_PUBLIC_URL`) |
| Uploads fail with 403 | The account isn't Pro. Files and images are Pro-only |
| Images or downloads fail (404 or 500 from `/api/download`) | The R2 credentials can't read the bucket (the token needs *Object Read & Write*), or `R2_PUBLIC_URL` was changed after files were uploaded, so the stored URLs no longer map to keys |
| AI buttons return an error | `OPENAI_API_KEY` is missing, the account isn't Pro, or the 20 / hour AI limit was hit |
| "AI returned an unexpected format" | The model in `AI_MODEL` doesn't support JSON mode, which tags and descriptions need — see [provider and model](../architecture/flows/ai-features.md#provider-and-model) |
| Upgrading succeeds in Stripe but the app still says Free | The webhook didn't arrive. Locally, `stripe listen` must be running and its `whsec_…` must be in `STRIPE_WEBHOOK_SECRET` (restart the dev server after changing it) |
| "Too many attempts" while testing sign-in | You hit a rate limit. Wait, or [clear the counters](resetting-data.md#clear-rate-limits) |
| ⌘K search doesn't show something just saved | The index reloads when the palette opens; close it and reopen it after a moment. See [search](../architecture/flows/search.md) |
| The code editor never loads (blank box), or `/monaco/vs/loader.js` is a 404 | `public/monaco` is missing: `npm run dev` and `npm run build` create it, but `npx next dev` or `next start` on a fresh clone don't. Run `node scripts/copy-monaco.mjs` |
| The console shows "Refused to … because it violates the following Content Security Policy" | Something loads from an origin the policy doesn't list (`src/lib/csp.ts`). Serve it from this site, or add the origin on purpose; don't loosen `script-src` for convenience. Cloudflare Turnstile is allowed only when its site key is set |
| `db:seed` or `db:cleanup` stops with "refusing to run" | The database host isn't marked safe to reset. Add it to `SAFE_DATABASE_HOSTS` (a Neon development branch, say) or confirm once with `CONFIRM_DATABASE_HOST`. Never do either for the production host. See [resetting data](resetting-data.md#before-you-run-either-script) |
| `npm run test:coverage` fails with "coverage for … does not meet global threshold" | A change lowered coverage below the floor in `vitest.config.ts`. Add tests for the new code; don't lower the floor |
| Signing in with `?callbackUrl=https://…` lands on the dashboard | Deliberate: only paths on this site are followed after sign-in (`safeCallbackPath`), so an external URL can't be used as a phishing redirect |
| No errors appear in Sentry locally | Deliberate: Sentry is off unless `SENTRY_DSN` is set, and it is set on Vercel only |
| Schema changes aren't picked up | Run `npm run db:migrate` — not `db push`, which is disabled |

## Related

- [Known pitfalls](../practices/gotchas/README.md) — traps that fail silently rather than with an error.

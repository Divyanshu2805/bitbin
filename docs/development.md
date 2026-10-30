# Development

## Setup

**You need:** Node 20+ (CI uses 22), npm 10+, and a PostgreSQL 15+ database. A free [Neon](https://neon.tech) project is the easiest.

```bash
git clone https://github.com/Divyanshu2805/bitbin.git
cd bitbin
npm install
cp .env.example .env      # set DATABASE_URL and AUTH_SECRET (npx auth secret prints one)
npm run db:migrate        # create the schema
npm run db:seed           # the seven item types and the demo account
npm run dev               # http://localhost:3000
```

Sign in as `demo@bitbin.dev` / `12345678`, or register: keep `SKIP_EMAIL_VERIFICATION="true"` and new accounts sign in without an email. To try Pro features locally, run a test-mode checkout or set `isPro = true` on your user in Prisma Studio (`npm run db:studio`). The session picks it up on the next request.

`npm run dev` and `npm run build` first copy the code editor into `public/monaco` and the PDF reader into `public/pdfjs`, so both are served from the app's own origin. Starting Next another way on a fresh clone skips that: run `node scripts/copy-monaco.mjs` and `node scripts/copy-pdfjs.mjs` once.

## Configuration

Everything is an environment variable, read from `.env` locally and from the project settings on Vercel. `.env.example` has a `YOUR_…` placeholder for each. Only the first group is required; every other service switches on one area of the app.

| Variable | Needed for |
|---|---|
| `DATABASE_URL` | Everything. For Neon, the pooled URL with `?sslmode=require` |
| `AUTH_SECRET`, `AUTH_URL` | Sessions. `AUTH_URL` is the origin you browse, `http://localhost:3000` locally |
| `NEXT_PUBLIC_APP_URL` | Absolute links in emails, Stripe redirects, the sitemap and preview images. Read at build time |
| `SKIP_EMAIL_VERIFICATION` | `"true"` in development only: accounts are verified at registration |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | GitHub sign-in. Callback `{AUTH_URL}/api/auth/callback/github` |
| `RESEND_API_KEY`, `FROM_EMAIL` | Verification and reset emails. Without a verified domain, Resend delivers only to its account owner |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate limits |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | Files, images and ZIP export and import. `R2_PUBLIC_URL` is only the prefix stored file URLs are built from; set it once and never change it |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_YEARLY` | Upgrading to Pro and the billing portal |
| `AI_API_KEY`, `OPENAI_BASE_URL`, `AI_MODEL` | The AI helpers. Any OpenAI-compatible provider; the default model is `gpt-5-nano` |
| `CRON_SECRET` | The two crons, in production |
| `SENTRY_DSN` | Error reports, in production |
| `SAFE_DATABASE_HOSTS` | Database hosts `db:seed` and `db:cleanup` may reset, such as a development branch |

For OpenRouter, set `OPENAI_BASE_URL="https://openrouter.ai/api/v1"` and a prefixed model name such as `openai/gpt-5-nano`. A model without JSON mode works: the request is retried without it and the JSON is read out of the answer.

## Stripe locally

```bash
stripe login
stripe listen --events checkout.session.completed,invoice.paid,invoice.payment_failed,customer.subscription.updated,customer.subscription.deleted --forward-to localhost:3000/api/webhooks/stripe
```

Put the `whsec_…` it prints in `STRIPE_WEBHOOK_SECRET` and restart `npm run dev`. Pay with `4242 4242 4242 4242`, any future date and any CVC.

## Commands

| Command | Does |
|---|---|
| `npm run dev` | The dev server on port 3000 |
| `npm run build` | `prisma generate`, a full type-check and the production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest, once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | The tests with a coverage report. Fails below the floor |
| `npm run db:migrate` | Create a migration from a schema change and apply it locally |
| `npm run db:migrate:deploy` | Apply pending migrations (production) |
| `npm run db:generate` | Regenerate the Prisma client. Run it after `db:migrate` |
| `npm run db:seed` | Item types, the demo account and its library |
| `npm run db:studio` | Prisma Studio |
| `npm run db:cleanup` | Delete every user except the demo account |

`db:seed` and `db:cleanup` refuse a database host that isn't in `SAFE_DATABASE_HOSTS` or confirmed once with `CONFIRM_DATABASE_HOST`. `npm run db:push` is disabled on purpose.

## Tests

```bash
npm run lint && npm run test && npm run build   # before every push
npx vitest run src/actions/items.test.ts        # one file
cd desktop && npm test                          # the desktop app
```

| Suite | Count | Covers |
|---|---|---|
| Vitest | 1,007 tests in 83 files | Every server action, the library code and every route handler. Prisma, `auth()`, OpenAI, R2 and Upstash are mocked, so no test needs a network or a database |
| Desktop (`node:test`) | 46 | Type guessing, the API client and request bodies, the file rules, the config store |

- Tests sit next to the code (`foo.ts` → `foo.test.ts`) and assert on the `ActionResult`.
- Race tests cover the Free-plan caps and single-use email links under concurrent requests.
- Coverage is measured over `src/actions`, `src/lib` and `src/app/api`, with a floor of 80% statements, branches and lines and 70% functions in `vitest.config.ts`.
- Components, the extension and the desktop app's windows are checked in the browser and the running app.

## Browser extension and desktop app

| | |
|---|---|
| Extension | `extension/`, plain JavaScript, Manifest V3. Load it unpacked from `chrome://extensions`. Bump `version` in `manifest.json` with every change. See [extension/README.md](../extension/README.md) |
| Desktop app | `desktop/`, Electron, plain CommonJS with its own `package.json`. `cd desktop && npm install && npm start`. See [desktop/README.md](../desktop/README.md) |

Both sit outside the Next build and talk only to the [token API](api.md#token-api). `desktop/src/guess.js` mirrors `extension/lib.js`, so a change to type guessing goes in both.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Cannot find module '@/generated/prisma'` | Run `npm run db:generate`. `prisma migrate deploy` doesn't generate the client |
| Creating an item fails on a fresh database | The item types are missing. Run `npm run db:seed` |
| Registration fails with "An error occurred during registration" | Resend refused the send. Its sandbox sender reaches only the account owner, and an unverified `FROM_EMAIL` domain gets a `403` |
| "Please verify your email" on sign-in | Set `SKIP_EMAIL_VERIFICATION="true"`, or configure Resend and use the link |
| GitHub sign-in loops back to `/sign-in` | The OAuth app's callback must be exactly `http://localhost:3000/api/auth/callback/github`, and `AUTH_URL` must match the origin you browse |
| `/sign-in?error=OAuthAccountNotLinked` | That email has a password account. Sign in with the password |
| Uploads fail with `500` | An `R2_*` variable is missing |
| Images or downloads `404` | The R2 token needs Object Read & Write, or `R2_PUBLIC_URL` changed after files were stored |
| Upgraded in Stripe but still Free | The webhook didn't arrive. `stripe listen` must be running with its secret in `STRIPE_WEBHOOK_SECRET` |
| "Too many attempts" while testing | A rate limit. Wait, or delete the `ratelimit:*` keys in Upstash |
| The code editor is a blank box | `public/monaco` is missing. Run `node scripts/copy-monaco.mjs` |
| A Content Security Policy error in the console | Something loads from another origin. Serve it from this site, or add the origin to `src/lib/csp.ts` on purpose |
| `db:seed` says "refusing to run" | Add the host to `SAFE_DATABASE_HOSTS`, never the production one |
| Coverage below the threshold | Add tests for the new code |

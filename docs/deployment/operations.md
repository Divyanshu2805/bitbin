# Operations

Running BitBin once it is deployed: what happens on a schedule, where to look when something breaks, how data is backed up, and the routine jobs (rotating a secret, releasing the desktop app, going live with Stripe).

## What runs where

| Piece | Runs on | Deploys |
|---|---|---|
| Web app, route handlers, `/api/v1`, crons | Vercel (serverless functions) | Every push to `main` |
| Database | Neon PostgreSQL (`production` branch; a `dev` branch for local work) | Migrations by hand, before the code that needs them |
| Files | Cloudflare R2, private bucket | — |
| Rate-limit counters | Upstash Redis | — |
| Browser extension | Users' browsers, loaded unpacked from the Settings download | With the web app (the ZIP is built from `extension/` at runtime) |
| Desktop app | Users' machines | A `desktop-v*` tag publishes a GitHub Release |

## Scheduled jobs

| Job | Schedule (UTC) | Route | Needs |
|---|---|---|---|
| Demo reset | Daily, 21:00 | `GET /api/cron/reset-demo` | `CRON_SECRET` |
| Orphaned-file sweep | Sundays, 03:00 | `GET /api/cron/sweep-files` | `CRON_SECRET` |

Both are declared in `vercel.json` and listed under **Vercel → Project → Cron Jobs**, where either can be run by hand. To see what the sweep would delete without deleting anything:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://bitbin.yourdomain.com/api/cron/sweep-files?dryRun=1"
```

A sweep that finds more than half of the bucket orphaned aborts and logs an error instead of deleting, because that means it is reading the wrong database. Check `DATABASE_URL` before running it again.

## Monitoring

| Signal | Where |
|---|---|
| Server errors and every `console.error`, with personal data stripped | Sentry (`SENTRY_DSN`); alert on new and escalating issues ([setup](providers.md#sentry)) |
| Function logs, cron runs, build logs | Vercel → Project → Logs / Cron Jobs / Deployments |
| Webhook deliveries | Stripe → Developers → Webhooks → the endpoint |
| CI | GitHub Actions, and the badge on the README |
| Page views | Vercel Analytics |

Errors worth an alert, all logged with `console.error` and so reaching Sentry: `Rate limit check failed` (Redis is erroring, so sign-in is refused), `Error handling <event>` from the Stripe webhook, `Demo reset failed`, `File sweep aborted` / `File sweep failed`. `Upstash Redis not configured` is a warning, so it only shows in Vercel's logs; the smoke test checks for it.

There are no uptime checks or metrics endpoints. The [constraints](../known-gaps/constraints-and-trade-offs.md#operations) page lists what that leaves out.

## Backups and restore

- **Database.** Neon keeps a point-in-time history of the `production` branch for its plan's restore window. To recover, create a branch from a timestamp before the incident in the Neon console, check it, then restore it or point `DATABASE_URL` at it.
- **Files.** R2 objects are not versioned. A deleted item's file is deleted with it, and the weekly sweep deletes objects no item points at, so a database restored to an earlier point may reference files that are gone (those items show a missing file).
- **Users' own copies.** Every user can export their library as JSON, and Pro users as a ZIP with their files, then import it back.

## Rotating a secret

| Secret | Effect of rotating | Steps |
|---|---|---|
| `AUTH_SECRET` | Signs everyone out | Set the new value on Vercel and redeploy |
| `CRON_SECRET` | None | Set the new value on Vercel; the next cron run sends it |
| `STRIPE_WEBHOOK_SECRET` | Webhooks fail until both sides match | Roll the endpoint's secret in Stripe, set it on Vercel, redeploy |
| Provider keys (Stripe, R2, Resend, AI, Upstash, GitHub) | The feature fails until the new key is live | Create the new key, set it on Vercel, redeploy, then revoke the old one |
| A user's API token | Only that client | The user revokes it in **Settings → Browser extension** and creates another |

Never change `R2_PUBLIC_URL` once files exist: stored URLs and keys are derived from it.

## Releasing a schema change

Vercel doesn't run migrations. Apply a migration to production **before** pushing the code that needs it, and keep it backward compatible with the code still running. The steps are in [Vercel](vercel.md#releasing-a-schema-change).

## Releasing the desktop app

1. Bump `version` in `desktop/package.json` (the settings window shows it) and commit.
2. Push a tag:

   ```bash
   git tag desktop-v0.2.0
   git push origin desktop-v0.2.0
   ```

3. `.github/workflows/desktop-release.yml` runs the desktop tests, builds the unsigned Windows installer on a Windows runner, and publishes `BitBin-Setup.exe` as a GitHub Release. The name has no version, so **Settings → Desktop app**'s link (`releases/latest/download/BitBin-Setup.exe`) always points at the newest.

macOS and Linux users run the app from source. Builds aren't signed, so SmartScreen warns on first launch, and there is no auto-update.

## Releasing an extension change

Bump `version` in `extension/manifest.json` and deploy. The Settings download is built from the folder at runtime, so the new version is what the next download gets. Installed copies don't update themselves: users download again, replace the folder's contents and reload the extension.

## Going live with Stripe

The live site uses test-mode keys. When the account can take real payments, follow [Stripe test mode in production](providers.md#stripe-test-mode-in-production): live keys, a live product and prices, and a live webhook endpoint with its own secret.

## Related

- [Smoke test](smoke-test.md): run it after any deploy that touches more than copy or styling.
- [Provider callbacks](providers.md) · [Vercel](vercel.md)

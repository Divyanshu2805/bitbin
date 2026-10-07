# Security Mechanism Pitfalls

## A schema change that new code depends on must be migrated first

Prisma selects explicit columns, so code that reads a column production doesn't have yet fails every query that touches that table, which for `users` is every sign-in. Vercel doesn't run migrations. For a change like the token-scopes column, run `npm run db:migrate:deploy` against production **before** the push, and say so in the commit. Make migrations backward compatible (new nullable or defaulted columns) so the old code keeps working until the new code deploys.

## The code editor comes from `public/monaco`, which is generated

The editor is served from our own origin (the CSP forbids a CDN). `public/monaco` is created by `scripts/copy-monaco.mjs` from `node_modules/monaco-editor` and is git-ignored. `npm run dev` and `npm run build` run it; `npx next dev` or `next start` on a fresh clone don't, and the editor then fails to load with a 404 on `/monaco/vs/loader.js`. The version served is the one pinned in `package.json` (`monaco-editor`), so upgrading it is a deliberate change.

## `script-src 'unsafe-inline'` is a trade-off, not an oversight

A strict nonce-based policy would make every page render dynamically. See [ADR 0010](../../architecture/decisions/0010-content-security-policy-without-script-nonces.md). Don't "fix" it by adding a nonce to one component; the whole approach changes, or none of it does. Don't add `'unsafe-eval'` for convenience outside development.

## The CSP applies to downloads differently

`next.config.ts` gives `/api/download/*` a minimal policy and everything else the full one, with a regex source (`/((?!api/download/).*)`) so a path never gets two policies. A new path that needs a looser policy gets its own rule, not a looser global one.

## `sharp` re-encodes: the stored size is not the uploaded size

An uploaded photo is decoded and written out again, so `fileSize` returned by `/api/upload` is the stored size. Code that compares it with `File.size` will see a difference. GIF and SVG are stored unchanged.

## Turnstile tokens are single use

The widget's token is spent by one request. After a failed submit the form resets the widget (`resetKey`); a new form that posts to a protected endpoint must do the same, or the retry fails with "complete the verification check".

## Per-address limits only mean something with the address normalised

`registerEmail` and friends are keyed by the lowercased, trimmed address. Pass the same normalisation from every caller, or `A@b.com` and `a@b.com` get separate budgets.

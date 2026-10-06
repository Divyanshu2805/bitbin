# Smoke Test

Run through this after a deploy that touches anything beyond copy or styling. It covers every external service at least once.

## Accounts

- [ ] The homepage loads over HTTPS on your domain and shows the ⌘K hint.
- [ ] Register with an address that **isn't** the Resend account owner's → the verification email arrives → the link verifies → sign in.
- [ ] Forgot password → the reset email arrives → the new password works.
- [ ] GitHub sign-in lands on `/dashboard` in one click.
- [ ] Signed out, `/dashboard` redirects to sign-in.
- [ ] Change password → you're signed out → the new password works. Delete a throwaway account (with its password) → it's gone and can't sign in.
- [ ] `/sign-in?callbackUrl=https://example.com` signs in and lands on `/dashboard`, not on example.com.
- [ ] The demo account (`demo@bitbin.dev`) signs in, and changing its password, deleting it and upgrading it are each refused.
- [ ] `/privacy` and `/terms` load signed out and are linked from the footer and the sign-up form.
- [ ] `/robots.txt` and `/sitemap.xml` show the production domain (not `localhost`), and a signed-in page such as `/dashboard` is listed as disallowed.
- [ ] Pasting the site URL into a chat app or a card validator shows the BitBin title, description and preview image.

## Items

- [ ] Create a snippet with tags and a collection; pin it; favorite it.
- [ ] Find it with ⌘K (no reload needed: the index reloads when the palette opens).
- [ ] Edit it in the drawer; delete it.

## Pro

- [ ] Upgrade with a Stripe test card → back on `/settings?upgraded=true` → the account shows Pro without signing out.
- [ ] Upload an image → it renders; upload a file → it downloads with its name.
- [ ] Suggest tags on an item → suggestions appear.
- [ ] "Manage subscription" opens the Customer Portal.

## Data

- [ ] Export JSON downloads; export ZIP (Pro) includes `files/` and the `snippets/`, `prompts/`, `commands/`, `notes/` folders and `links.md`.
- [ ] Importing the JSON export with **Skip duplicates** on reports everything skipped.

## Platform

- [ ] Stripe dashboard → Webhooks shows the deliveries as succeeded (`200`).
- [ ] Vercel's function logs show no `Upstash Redis not configured`, `Invalid Upstash Redis config` or `Rate limit check failed` lines.
- [ ] Vercel → Cron Jobs lists `/api/cron/reset-demo`, and `CRON_SECRET` is set (the demo library is restored daily).
- [ ] The latest GitHub Actions run on `main` is green, and Sentry is receiving events (`SENTRY_DSN` set).
- [ ] The Cloudflare R2 bucket still has public access off: a direct object URL returns `403`/`404`, while images render in the app.

# Smoke Test

Run through this after a deploy that touches anything beyond copy or styling. It covers every external service at least once.

## Accounts

- [ ] The homepage loads over HTTPS on your domain and shows the ⌘K hint.
- [ ] Register with an address that **isn't** the Resend account owner's → the verification email arrives → the link verifies → sign in.
- [ ] Forgot password → the reset email arrives → the new password works.
- [ ] GitHub sign-in lands on `/dashboard` in one click.
- [ ] Signed out, `/dashboard` redirects to sign-in.

## Items

- [ ] Create a snippet with tags and a collection; pin it; favorite it.
- [ ] Find it with ⌘K (after a reload — the index loads once per page).
- [ ] Edit it in the drawer; delete it.

## Pro

- [ ] Upgrade with a Stripe test card → back on `/settings?upgraded=true` → the account shows Pro without signing out.
- [ ] Upload an image → it renders; upload a file → it downloads with its name.
- [ ] Suggest tags on an item → suggestions appear.
- [ ] "Manage subscription" opens the Customer Portal.

## Data

- [ ] Export JSON downloads; export ZIP (Pro) includes `files/`.
- [ ] Importing the JSON export with **Skip duplicates** on reports everything skipped.

## Platform

- [ ] Stripe dashboard → Webhooks shows the deliveries as succeeded (`200`).
- [ ] Vercel's function logs show no `Upstash Redis not configured`, `Invalid Upstash Redis config` or `Rate limit check failed` lines.

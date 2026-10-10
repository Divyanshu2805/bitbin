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
- [ ] The demo account (`demo@bitbin.dev`) signs in, and changing its password, deleting it and upgrading it are each refused. It also can't save a link or import.
- [ ] **Sign out everywhere** signs the account out in a second browser too.
- [ ] A cross-site request is refused: `curl -X POST -H 'Sec-Fetch-Site: cross-site' https://bitbin.yourdomain.com/api/auth/change-password` answers `403`.
- [ ] `/privacy` and `/terms` load signed out and are linked from the footer and the sign-up form.
- [ ] `/robots.txt` and `/sitemap.xml` show the production domain (not `localhost`), and a signed-in page such as `/dashboard` is listed as disallowed.
- [ ] Pasting the site URL into a chat app or a card validator shows the BitBin title, description and preview image.

## Items

- [ ] Create a snippet with tags and a collection; pin it; favorite it.
- [ ] Find it with ⌘K straight away, and by `#tag`.
- [ ] Drag an item onto a collection in the sidebar; it appears in that collection.
- [ ] Rename a tag in **Settings → Tags**, then delete it; the items keep everything else.
- [ ] Edit it in the drawer; delete it.

## Pro

- [ ] Upgrade with a Stripe test card → back on `/settings?upgraded=true` → the account shows Pro without signing out.
- [ ] Upload an image → it renders; upload a file → it downloads with its name.
- [ ] Upload a file between 5 and 10 MB (it goes up in parts) → it is created, and downloads complete.
- [ ] Suggest tags on an item → suggestions appear.
- [ ] Open an item in the editor: the code editor loads (it is served from `/monaco/`), and the browser console shows no Content Security Policy errors on the homepage, the sign-in page or any signed-in page.
- [ ] Create an API token with only **Save items**: `GET /api/v1/me` shows `scopes: ["items:write"]`, `POST /api/v1/items` works, `GET /api/v1/collections`, `POST /api/v1/files` and the AI endpoints answer `403`.
- [ ] The browser extension downloads from Settings, connects with a token and saves a selection.
- [ ] The desktop app connects with a token, saves the clipboard and attaches an image.
- [ ] Upload a phone photo with location data: the stored image has no EXIF (download it and check).
- [ ] "Manage subscription" opens the Customer Portal.

## Data

- [ ] Export JSON downloads; export ZIP (Pro) includes `files/` and the `snippets/`, `prompts/`, `commands/`, `notes/` folders and `links.md`.
- [ ] A collection's ⋯ menu exports just that collection.
- [ ] Importing the JSON export with **Skip duplicates** on reports everything skipped.
- [ ] Importing a ZIP export into another Pro account restores its files and images.

## Platform

- [ ] Stripe dashboard → Webhooks shows the deliveries as succeeded (`200`).
- [ ] Vercel's function logs show no `Upstash Redis not configured`, `Invalid Upstash Redis config` or `Rate limit check failed` lines.
- [ ] Vercel → Cron Jobs lists `/api/cron/reset-demo` and `/api/cron/sweep-files`, and `CRON_SECRET` is set. A dry run of the sweep (`?dryRun=1`, see [operations](operations.md#scheduled-jobs)) answers `200` and `aborted: null`.
- [ ] **Settings → Desktop app → Download for Windows** downloads `BitBin-Setup.exe` (a GitHub Release exists).
- [ ] The latest GitHub Actions run on `main` is green, and Sentry is receiving events (`SENTRY_DSN` set).
- [ ] The Cloudflare R2 bucket still has public access off: a direct object URL returns `403`/`404`, while images render in the app.

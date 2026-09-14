# 0004. Files in Cloudflare R2, downloaded through an app route

**Status:** Accepted

## Context

Pro users attach files (up to 10 MB) and images (up to 5 MB) to items. Storing bytes in PostgreSQL would bloat the database and every backup, and serving them from serverless functions costs time and bandwidth. Images need to render inline quickly; files need to download with their original name, which browsers won't reliably do for a cross-origin URL.

## Decision

Binaries go to a **Cloudflare R2** bucket through the S3 API (`lib/r2.ts`), under `{userId}/{timestamp}-{sanitised name}`. The database stores only the public URL, name and size. Images render straight from the bucket's public URL via `next/image`. Downloads go through `GET /api/download/{userId}/{file}`, which checks the session, requires the path to start with the caller's id, and streams the object with `Content-Disposition: attachment`.

## Consequences

- No egress fees, and images are served by Cloudflare rather than the app.
- The user-id prefix makes one user's objects easy to find — and is what the download route's ownership check relies on.
- The bucket is public. The download route's check keeps one user from using *BitBin* to fetch another's file, but anyone who has an object's URL can read it directly. Private files would need a private bucket and signed URLs.
- Upload and item creation are separate requests, so an abandoned upload leaves an orphaned object; so does deleting an account.
- Changing `R2_PUBLIC_URL` breaks every stored URL, since keys are derived from it.

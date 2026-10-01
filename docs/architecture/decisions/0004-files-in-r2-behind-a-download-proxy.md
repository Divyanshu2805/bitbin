# 0004. Files in a private Cloudflare R2 bucket, read through an app route

**Status:** Accepted, amended (the bucket was public at first; it is now private)

## Context

Pro users attach files (up to 10 MB) and images (up to 5 MB) to items. Storing bytes in PostgreSQL would bloat the database and every backup, and serving them from serverless functions costs time and bandwidth. Images need to render inline quickly; files need to download with their original name, which browsers won't reliably do for a cross-origin URL.

## Decision

Binaries go to a **private Cloudflare R2** bucket through the S3 API (`lib/r2.ts`), under `{userId}/{timestamp}-{sanitised name}`. The database stores the object's URL, name and size; the URL only *identifies* the object (its key is the path), and nothing fetches it. Every read, whether an image preview, a PDF or text preview, a download or the ZIP export, goes through the server, which reads the object with its own R2 credentials (`getFromR2`). `GET /api/download/{userId}/{file}` checks the session, requires the key to be a plain path inside the caller's own `{userId}/` folder (no other user's folder, no `..`), and returns the object: with `Content-Disposition: attachment` by default, or inline with `?inline=1` for the app's previews. Images render from that route through `<img>` / `next/image` with `unoptimized`.

## Consequences

- R2 has no egress fees, but image bytes now pass through a function instead of being served straight by Cloudflare: more function time and bandwidth, no image resizing (the files are per-user and private, so they aren't optimised), and a private cache header (`private, max-age=3600`) instead of a CDN cache. For files this small (images are capped at 5 MB) that is acceptable; if it ever isn't, issue short-lived presigned URLs for large files from the same ownership check.
- The user-id prefix makes one user's objects easy to find — and is what the download route's ownership check relies on.
- The bucket must have **public access turned off** (Cloudflare dashboard → R2 → the bucket → Settings: disable the `r2.dev` URL and any custom domain). With it on, the route's ownership check is only a convenience, because anyone holding an object's URL could read it directly.
- Upload and item creation are separate requests, so an abandoned upload leaves an orphaned object; so does deleting an account.
- Changing `R2_PUBLIC_URL` breaks every stored URL, since keys are derived from it. It is only a name for the bucket now, so it can stay at the old `r2.dev` value even after public access is turned off.

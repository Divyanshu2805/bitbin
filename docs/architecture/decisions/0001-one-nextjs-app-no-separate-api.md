# 0001. One Next.js application, no separate API

**Status:** Accepted

## Context

BitBin is a personal knowledge store with one kind of client — its own web UI. It needs server-rendered pages, authenticated writes, a handful of endpoints that must be real HTTP (OAuth callbacks, file transfer, a Stripe webhook), and calls to a few third-party APIs. A separate backend would mean a second deployable, a second set of environment variables, and a hand-maintained contract between the two, for no client that needs it.

## Decision

The whole product is one Next.js App Router application deployed to Vercel. Pages are React Server Components that read through `lib/db`; writes are server actions ([0002](0002-server-actions-for-writes.md)); route handlers exist only where an HTTP endpoint is required — NextAuth, registration and password flows, upload / download, export, the item detail fetch for the drawer, and Stripe checkout, portal and webhook.

## Consequences

- One repository, one build (`prisma generate && next build`), one deploy, one place for configuration.
- Server and client share TypeScript types directly — a changed query result type is a compile error in the component that uses it.
- There is no public API. Anything that wants BitBin's data from outside the browser (a CLI, an editor extension) needs new route handlers and a way to authenticate without a browser session.
- Every request runs in Vercel's serverless functions, so long-running work (a large ZIP export) is bounded by the function time limit.

# 0002. Server actions for writes, returning an ActionResult

**Status:** Accepted

## Context

Most of BitBin's writes — create an item, pin it, rename a collection, save editor preferences — come from client components and need the same steps: identify the caller, validate the input, check the plan and sometimes a rate limit, run a scoped query, and show either the result or a message. Writing a route handler plus a `fetch` wrapper for each would duplicate that plumbing, and thrown errors from server code reach the client as opaque failures.

## Decision

Every UI write is a server action in `src/actions/`. Each one:

1. calls `getAuthedSession()` and returns its `Unauthorized` result if there's no session;
2. validates input with a Zod schema declared next to it (`safeParse`, never `parse`);
3. applies plan limits (`lib/usage.ts`, `requirePro`) and rate limits where relevant;
4. calls a `lib/db` function, passing the session's user id;
5. returns an `ActionResult<T>` — `{ success, data?, error?, fieldErrors? }` — and never throws to the client.

Components check `result.success`, show a toast, and call `router.refresh()`.

## Consequences

- One shape for every result, so every form handles success, a user-facing error, and per-field errors the same way.
- Actions are plain async functions, so tests call them directly with `auth()` and Prisma mocked — no HTTP layer to stand up.
- A server action is still a public POST endpoint; the checks in steps 1–3 are the only protection, which is why no step may be skipped.
- Reads for server components don't go through actions — pages call `lib/db` directly — so there are two entry points into `lib/db` to keep scoped.

# Next.js and NextAuth Pitfalls

## `proxy.ts` can only use `auth.config.ts`

`src/proxy.ts` (Next 16's `middleware.ts`) builds its own NextAuth instance from `auth.config.ts`, which has no Prisma adapter and a placeholder `authorize`. Importing `src/auth.ts` there would pull Prisma and bcrypt into the proxy, which is exactly what the split exists to avoid. Keep the full provider setup in `auth.ts`, and keep `auth.config.ts` to what the proxy needs. A provider added to one file and not the other shows up in one place only.

## The proxy only covers `/dashboard`

The matcher is `/dashboard/:path*`. Every other protected page (`/items/*`, `/collections`, `/favorites`, `/profile`, `/settings`, `/upgrade`) must call `auth()` and `redirect('/sign-in')` itself. A new page that forgets is served to signed-out users instead of redirecting them.

## GitHub needs an explicit `issuer`

GitHub sends `iss=https://github.com/login/oauth` on its OAuth callback, and Auth.js rejects it unless the provider's `issuer` matches — for a provider without one it compares against `https://authjs.dev`. Both `auth.ts` and `auth.config.ts` configure `GitHub({ issuer: 'https://github.com/login/oauth' })`. Keep the two in sync, and re-test GitHub sign-in after every `next-auth` upgrade (it's a beta); drop the override once Auth.js handles GitHub's `iss` itself.

## GitHub sign-in must run on the server

Calling `signIn('github')` from a client component needed two clicks in production: the redirect raced the session cookie. `signInWithGitHub` is a server action for that reason — don't move it back to the client.

## `isPro` is read on every session evaluation

The `jwt` callback queries `users.isPro` each time it runs. That's what makes Stripe upgrades instant, and it means:

- Adding more database reads to `jwt` adds them to every request.
- Tests or scripts that change `isPro` see the change on the next request — no need to sign out.
- The session can't be used as a cache of anything else that changes outside the request.

## JWTs outlive the account

With JWT sessions, deleting a user or changing a password doesn't sign anyone out: an existing token stays valid until it expires. Code that loads the user from a session id must handle "user not found" rather than assume the row exists.

## `router.refresh()`, not `revalidatePath`

Actions don't revalidate; components call `router.refresh()` after a successful action. A new component that forgets leaves the page showing stale server-rendered data until the next navigation.

## The search index doesn't refresh

`SearchProvider` loads the ⌘K index once when the dashboard layout mounts. `refreshSearchData` exists but nothing calls it, so a just-created item isn't searchable until a reload. Call it after mutations if you're fixing this — see [search](../../architecture/flows/search.md).

## The React Compiler is on

`reactCompiler: true` in `next.config.ts`. Components that break the rules of hooks, or mutate values during render, can behave differently once compiled. Treat the `react-hooks` lint errors as real bugs.

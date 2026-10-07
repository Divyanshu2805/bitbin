# Next.js and NextAuth Pitfalls

## `proxy.ts` can only use `auth.config.ts`

`src/proxy.ts` (Next 16's `middleware.ts`) builds its own NextAuth instance from `auth.config.ts`, which has no Prisma adapter and a placeholder `authorize`. Importing `src/auth.ts` there would pull Prisma and bcrypt into the proxy, which is exactly what the split exists to avoid. Keep the full provider setup in `auth.ts`, and keep `auth.config.ts` to what the proxy needs. A provider added to one file and not the other shows up in one place only.

## The app shell lives in `(app)/layout.tsx`

Signed-in pages sit in the `src/app/(app)/` route group. Its layout renders the sidebar and the rest of the shell once and keeps it mounted across navigations, so a page must not wrap itself in `DashboardLayout` again (it would nest a second shell). The layout doesn't re-run on client navigation, so pages keep their own `auth()` check; `router.refresh()` does re-render it, which is what keeps sidebar counts current.

## The proxy only covers `/dashboard`

The matcher is `/dashboard/:path*`. Every other protected page (`/items/*`, `/collections`, `/favorites`, `/profile`, `/settings`, `/upgrade`) must call `auth()` and `redirect('/sign-in')` itself. A new page that forgets is served to signed-out users instead of redirecting them.

## GitHub needs an explicit `issuer`

GitHub sends `iss=https://github.com/login/oauth` on its OAuth callback, and Auth.js rejects it unless the provider's `issuer` matches — for a provider without one it compares against `https://authjs.dev`. Both `auth.ts` and `auth.config.ts` configure `GitHub({ issuer: 'https://github.com/login/oauth' })`. Keep the two in sync, and re-test GitHub sign-in after every `next-auth` upgrade (it's a beta); drop the override once Auth.js handles GitHub's `iss` itself.

## GitHub sign-in must run on the server

Calling `signIn('github')` from a client component needed two clicks in production: the redirect raced the session cookie. `signInWithGitHub` is a server action for that reason — don't move it back to the client.

## `isPro` is read on every session evaluation

The `jwt` callback queries `users.isPro` and `users.sessionVersion` each time it runs. That's what makes Stripe upgrades instant, and it means:

- Adding more database reads to `jwt` adds them to every request.
- Tests or scripts that change `isPro` see the change on the next request — no need to sign out.
- The session can't be used as a cache of anything else that changes outside the request.

## JWTs outlive the account

With JWT sessions, deleting a user or changing a password doesn't sign anyone out: an existing token stays valid until it expires. Code that loads the user from a session id must handle "user not found" rather than assume the row exists.

## `callbackUrl` is user input

The proxy puts the page someone was heading to in `?callbackUrl=`, and the sign-in form follows it after a successful sign-in. Anyone can craft that link, so the form passes it through `safeCallbackPath` and only follows a path on this site. Following the raw value would turn `/sign-in?callbackUrl=https://evil.example` into an open redirect from a trusted domain.

## Importing `next-auth` in a unit test fails

Vitest's Node resolver can't load `next-auth` (it imports `next/server` without the extension), so a test of anything that imports it dies with "Cannot find module .../next/server". Mock it (`vi.mock('next-auth', () => ({ CredentialsSignin: class extends Error {} }))`) as `lib/credentials.test.ts` does, and keep logic in `lib/` so it can be tested without NextAuth.

## A sign-in error's `code` is how the form learns what happened

A `CredentialsSignin` subclass thrown from `authorize()` (see `lib/credentials.ts`) comes back to the client as `?error=CredentialsSignin&code=<its code>`. The form reads `result.code`. A plain `Error` becomes a generic failure, so anything the form must react to (`rate_limited`) needs its own subclass.

## `AUTH_URL` is also where `signOut` sends the browser

`signOut({ callbackUrl })` and the URLs NextAuth returns are built from `AUTH_URL`. With `AUTH_URL` on `localhost:3000` and the app on another port, sign-out lands on whatever runs on 3000. Keep `AUTH_URL` equal to the origin you are browsing.

## `router.refresh()`, not `revalidatePath`

Actions don't revalidate; components call `router.refresh()` after a successful action. A new component that forgets leaves the page showing stale server-rendered data until the next navigation.

## The palette searches on the server, as you type

`CommandPalette` calls the `searchLibrary` action after a pause in typing, so what you just saved is found without any refresh, and nothing is preloaded. `shouldFilter={false}` stops cmdk filtering the answer a second time. The search is a raw `ILIKE` query: user text goes through `containsPattern` (which escapes `%`, `_` and `\`) and is bound as a parameter, never put into the SQL. See [search](../../architecture/flows/search.md).

## `'use server'` files may only export async functions

Next treats every export of a `'use server'` file as a server action, including `export type { X }` re-exports. Re-exporting a type from `src/actions/*` crashes the action loader at runtime (`ReferenceError: X is not defined`), which breaks every action on the page. `tsc`, the tests and `next build` all still pass. Import types from the `lib/` module that defines them instead (e.g. `CreateItemInput` from `@/lib/item-create`).

## The React Compiler is on

`reactCompiler: true` in `next.config.ts`. Components that break the rules of hooks, or mutate values during render, can behave differently once compiled. Treat the `react-hooks` lint errors as real bugs.

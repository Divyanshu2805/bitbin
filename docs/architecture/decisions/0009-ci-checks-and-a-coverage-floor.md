# 0009. CI verifies every push; a coverage floor guards the server code

**Status:** Accepted

## Context

Lint, tests and the build were run by hand before each push. Every push to `main` deploys to production at once (there is no staging environment), and the tests mock every external service, so they are fast and need no secrets. What was missing was something that ran them when a person forgot, that proved it to a reader, and that stopped coverage quietly eroding as code was added.

## Decision

`.github/workflows/ci.yml` runs on every push to `main` and every pull request: `npm ci`, a production dependency audit that fails on **high or critical** advisories, `npm run lint`, `npm run test:coverage` and `npm run build`. The build uses placeholder environment variables, so CI holds no secrets.

Coverage is measured with v8 over `src/actions`, `src/lib` and `src/app/api`, the code the unit tests are written for. Components are excluded: they are checked in the browser. `vitest.config.ts` sets a floor just under the current numbers (75% statements, branches and lines; 65% functions). The floor is raised as coverage grows and is never lowered to let a change through.

CI does **not** gate the deploy. Vercel builds from the push independently.

## Consequences

- A broken push is visible within minutes, and the README's badge shows the state of `main`.
- Because Vercel deploys in parallel, a red run means fix forward, not "it didn't ship". Making CI a gate means requiring the `verify` check through branch protection and deploying from pull requests; that is a deliberate step up, not done yet.
- Moderate advisories don't fail the build, because they're often in build-time tooling with no fix; high and critical ones do.
- A number under 100% is honest. The floor protects against decline, not against untested behaviour that is still above it, so tests for new code remain part of the [definition of done](../../practices/definition-of-done.md).
- No end-to-end tests run in CI yet; a Playwright suite is on the [checklist](../../known-gaps/remaining-work.md).

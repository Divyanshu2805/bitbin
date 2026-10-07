# Definition of Done

A change is ready to merge when every line that applies is true.

## Code

- [ ] `npm run lint`, `npm run test` and `npm run build` pass, and CI is green on the push (it also runs the production audit and the coverage floor).
- [ ] New server actions follow the [action pattern](coding-conventions.md#server-actions): session, validation, plan and rate-limit checks, scoped query, `ActionResult`.
- [ ] New queries take the user id and are scoped by it ([guardrails](security-guardrails.md)).
- [ ] Anything behind Pro is checked on the server, and the UI shows the upgrade state for Free users.
- [ ] New actions, route handlers and library functions have tests next to them, and coverage stays above the floor in `vitest.config.ts`.
- [ ] Anything that changes account-level state (password, name, email, deletion, billing) refuses the demo account with `isDemoEmail`.
- [ ] Any URL taken from the client to redirect to goes through `safeCallbackPath`.
- [ ] A cookie-authenticated route that changes state calls `rejectCrossSite`, and a new `/api/v1` endpoint passes the scope it needs.
- [ ] Nothing new loads from another origin; if something must, `lib/csp.ts` changes in the same commit with the reason, and the browser console shows no Content Security Policy errors on a production build.
- [ ] A schema change that new code depends on is applied to production **before** the deploy, and the commit says so.

## Data

- [ ] Schema changes come with a committed migration, and the SQL has been read.
- [ ] Export, import and the seed handle any new field or type.

## Behaviour checked by hand

- [ ] The change works signed in as a Free user and as a Pro user.
- [ ] It works at phone width and on desktop, with no horizontal scroll.
- [ ] It is usable by keyboard (focus is visible, interactive things are real buttons or links), text keeps its contrast, and heading levels don't skip. Run Lighthouse's accessibility audit on a production build for a page that changed (`npm run build && npm run start`).
- [ ] Loading, empty and error states look right.
- [ ] Anything touching Stripe, R2, Resend or OpenAI has been tried against the real service in test mode.

## Docs

- [ ] Any page in `docs/` the change makes inaccurate is updated in the same change — including the [API reference](../api/README.md), [data model](../schema/README.md) and [known gaps](../known-gaps/README.md).
- [ ] New environment variables are in `.env.example` and the [configuration](../local-development/configuration.md) page.

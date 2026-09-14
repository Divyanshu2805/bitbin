# Definition of Done

A change is ready to merge when every line that applies is true.

## Code

- [ ] `npm run lint`, `npm run test` and `npm run build` pass.
- [ ] New server actions follow the [action pattern](coding-conventions.md#server-actions): session, validation, plan and rate-limit checks, scoped query, `ActionResult`.
- [ ] New queries take the user id and are scoped by it ([guardrails](security-guardrails.md)).
- [ ] Anything behind Pro is checked on the server, and the UI shows the upgrade state for Free users.
- [ ] New actions and library functions have tests next to them.

## Data

- [ ] Schema changes come with a committed migration, and the SQL has been read.
- [ ] Export, import and the seed handle any new field or type.

## Behaviour checked by hand

- [ ] The change works signed in as a Free user and as a Pro user.
- [ ] It works at phone width and on desktop.
- [ ] Loading, empty and error states look right.
- [ ] Anything touching Stripe, R2, Resend or OpenAI has been tried against the real service in test mode.

## Docs

- [ ] Any page in `docs/` the change makes inaccurate is updated in the same change — including the [API reference](../api/README.md), [data model](../schema/README.md) and [known gaps](../known-gaps/README.md).
- [ ] New environment variables are in `.env.example` and the [configuration](../local-development/configuration.md) page.
- [ ] User-visible changes are noted in `CHANGELOG.md`.

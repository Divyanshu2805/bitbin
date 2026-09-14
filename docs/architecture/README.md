# Architecture

How BitBin is put together: one Next.js application, the layers inside it, the services it depends on, how the important requests flow end to end, and the decisions behind the shape of it all.

If you are new to the codebase, read these in order:

1. [System context](system-context.md) — the app, its layers, and every external service it talks to.
2. [Module map](module-map.md) — what lives in each folder, the routes, and the layering rules.
3. The request flows that cover almost everything non-trivial:
   - [Authentication](flows/authentication.md) — registration, email verification, credentials and GitHub sign-in, password reset.
   - [Items](flows/items.md) — creating, reading, editing and deleting items; pinning and favorites.
   - [Collections](flows/collections.md) — grouping items, the dominant colour, the sidebar.
   - [File uploads](flows/file-uploads.md) — Pro uploads to Cloudflare R2 and the download proxy.
   - [Billing](flows/billing.md) — Stripe Checkout, webhooks, and how `isPro` reaches the session.
   - [AI features](flows/ai-features.md) — the four Pro helpers and their shared guard sequence.
   - [Import and export](flows/import-export.md) — JSON and ZIP exports, transactional imports.
   - [Search](flows/search.md) — the ⌘K command palette.

## Reference

| Page | Covers |
|---|---|
| [Security model](security-model.md) | Tenancy, sessions, what protects each route, plan enforcement, secrets |
| [Cross-cutting concerns](cross-cutting-concerns.md) | Action results and errors, validation, rate limiting, refreshing data, configuration, observability |
| [Key abstractions](key-abstractions.md) | The handful of concepts worth knowing by name |
| [Where do I change…?](where-to-change.md) | A task-oriented index into the code |
| [Architecture decisions](decisions/README.md) | Records of the significant design decisions and their trade-offs |
| [Design notes](design-notes/README.md) | The original planning write-ups for item CRUD, AI and Stripe |

## Related

- [Data model](../database.md) — the tables, relations, indexes and item types.
- [API reference](README.md) — every route handler and server action.
- [Known gaps](../known-gaps.md) — the constraints and trade-offs this design accepts today.

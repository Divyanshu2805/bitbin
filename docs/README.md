# BitBin Documentation

Everything about how BitBin is built, run and changed. Start with the section that matches what you're trying to do.

## Getting started

- [Local development](local-development/README.md) — prerequisites, setup, configuration, commands, troubleshooting.
- [Tech stack](tech-stack.md) — the frameworks and services in use.

## Understanding the app

- [Architecture](architecture/README.md) — layers, module map, request flows, security model.
- [Architecture decisions](architecture/decisions/README.md) — why the app is shaped the way it is.
- [Data model](schema/README.md) — the tables, item types, conventions, migrations and seeding.

## Reference

- [API reference](api/README.md) — every route handler and server action, the [token API](api/token-api.md) used by the browser extension, the export format, errors and rate limits.
- [Browser extension](../extension/README.md) — the Chrome / Edge "Save from anywhere" extension: files, installing, loading it locally.
- [Known gaps](known-gaps/README.md) — constraints, trade-offs, open issues, and the roadmap.

## Contributing

- [Engineering practices](practices/README.md) — conventions, security guardrails, testing, definition of done, design system, and known pitfalls.
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — the contribution workflow.

## Running in production

- [Deployment](deployment/README.md) — Vercel and Neon, the custom domain, provider callbacks, and the post-deploy smoke test.

## Keeping these docs accurate

These pages describe the app as it is now. A change that makes any of them inaccurate updates them in the same commit. The [design notes](architecture/design-notes/README.md) are the exception: they're kept as historical planning records.

# BitBin Documentation

Everything about how BitBin works, how it is built, and how to run and change it. Start with the section that matches what you're trying to do.

## Getting started

- [Features](features.md) — everything the app does, by area, with the plans and limits.
- [Local development](local-development/README.md) — prerequisites, setup, configuration, commands, troubleshooting.
- [Tech stack](tech-stack.md) — the frameworks and services in use.

## Understanding the app

- [Architecture](architecture/README.md) — layers, module map, request flows, security model.
- [Architecture decisions](architecture/decisions/README.md) — why the app is shaped the way it is (ten records).
- [Data model](schema/README.md) — the tables, item types, conventions, migrations and seeding.

## Reference

- [API reference](api/README.md) — every route handler and server action, the [token API](api/token-api.md) used by the browser extension and the desktop app, the export format, errors and rate limits.
- [Browser extension](../extension/README.md) — the Chrome / Edge "save from anywhere" extension: files, installing, loading it locally.
- [Desktop tray app](../desktop/README.md) — the Electron app that saves the clipboard or a file from a global shortcut: files, running, packaging, releasing.
- [Project metrics](metrics.md) — measured quality, accessibility, security and scale figures, and how to re-check them.
- [Known gaps](known-gaps/README.md) — constraints, trade-offs, behaviour that looks like a bug, and the remaining work.

## Contributing

- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — the workflow, the checks and the commit style.
- [Engineering practices](practices/README.md) — conventions, security guardrails, testing, definition of done, design system, and known pitfalls.
- [`SECURITY.md`](../SECURITY.md) — reporting a vulnerability.

## Running in production

- [Deployment](deployment/README.md) — Vercel and Neon, CI, the custom domain, provider callbacks, and the post-deploy smoke test.
- [Operations](deployment/operations.md) — scheduled jobs, monitoring, backups, rotating secrets, releasing the desktop app.

## Keeping these docs accurate

These pages describe the app as it is now. A change that makes any of them inaccurate updates them in the same commit.

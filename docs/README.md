# BitBin documentation

Start with **Getting started**, then dip into whichever area you're working on.

## Setup

| Doc | What's inside |
| --- | --- |
| [Getting started](getting-started.md) | Install, configure, migrate, seed, run |
| [Environment variables](environment-variables.md) | Every variable, where to get it, what breaks without it |
| [Deployment](deployment.md) | Vercel + Neon + Stripe webhooks in production |

## How it works

| Doc | What's inside |
| --- | --- |
| [Architecture](architecture.md) | Request flow, folders, server actions vs route handlers |
| [Database](database.md) | Prisma schema, relations, indexes, migrations, seeding |
| [Authentication](authentication.md) | NextAuth v5, credentials + GitHub, verification, password reset |
| [Items](items.md) | Item CRUD, the drawer, editors, pin/favorite |
| [Item types](item-types.md) | The 7 system types and how each stores content |
| [Collections](collections.md) | Many-to-many grouping, favorites, dominant color |
| [Search](search.md) | ⌘K command palette |
| [File uploads](file-uploads.md) | Cloudflare R2 upload/download flow and limits |
| [AI features](ai-features.md) | Auto-tag, describe, explain, optimize |
| [Billing](billing.md) | Stripe checkout, portal, webhooks, Free vs Pro |
| [Rate limiting](rate-limiting.md) | Upstash sliding windows per endpoint |
| [Import & export](import-export.md) | JSON / ZIP export format and import rules |

## Frontend

| Doc | What's inside |
| --- | --- |
| [Design system](design-system.md) | Colors, type, motion, reusable UI pieces |

## Quality

| Doc | What's inside |
| --- | --- |
| [Testing](testing.md) | Vitest setup, what's covered, how to add tests |

## Design notes

Longer write-ups from when features were planned:

- [Item CRUD architecture](item-crud-architecture.md)
- [AI integration plan](ai-integration-plan.md)
- [Stripe integration plan](stripe-integration-plan.md)

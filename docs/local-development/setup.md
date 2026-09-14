# Setup

From an empty machine (with the [prerequisites](prerequisites.md)) to a running app.

## 1. Clone and install

```bash
git clone https://github.com/Divyanshu2805/bitbin.git
cd bitbin
npm install
```

## 2. Configure

```bash
cp .env.example .env
```

At minimum set:

- `DATABASE_URL` — your PostgreSQL connection string (keep `?sslmode=require` for Neon).
- `AUTH_SECRET` — `npx auth secret` prints one.

Leave `SKIP_EMAIL_VERIFICATION="true"` while developing, so accounts can sign in without a Resend key. Every other variable is optional and documented in [configuration](configuration.md).

## 3. Create the schema

```bash
npm run db:migrate    # prisma migrate dev — applies prisma/migrations and generates the client
```

The generated Prisma client is written to `src/generated/prisma/` (git-ignored). Never use `prisma db push` here — `npm run db:push` is deliberately disabled; see [migrations](../database.md).

## 4. Seed

```bash
npm run db:seed
```

This creates any missing system item types (the app can't create items without them) and a demo account with sample collections and items:

| Email | Password |
|---|---|
| `demo@bitbin.dev` | `12345678` |

## 5. Run

```bash
npm run dev
```

- Homepage: <http://localhost:3000>
- Dashboard: <http://localhost:3000/dashboard> (sign in first)

## 6. Optional: Stripe webhooks

To test upgrading to Pro end to end, forward Stripe's webhooks to your dev server:

```bash
stripe login        # choose the account BitBin uses
stripe listen   --events checkout.session.completed,invoice.paid,invoice.payment_failed,customer.subscription.updated,customer.subscription.deleted   --forward-to localhost:3000/api/webhooks/stripe
```

Copy the `whsec_…` it prints into `STRIPE_WEBHOOK_SECRET` and restart `npm run dev`. `--events` limits forwarding to the five events BitBin handles; `--api-key "$STRIPE_SECRET_KEY"` instead of `stripe login` guarantees the CLI listens to the same account as the app. Pay with card `4242 4242 4242 4242`, any future expiry and any CVC. See the [billing flow](../billing.md).

## Before you push

```bash
npm run lint && npm run test && npm run build
```

`npm run build` runs `prisma generate` and a full type-check. Placeholder values from `.env.example` are enough for it to succeed.

## Related

- [Commands](commands.md) · [Troubleshooting](troubleshooting.md)

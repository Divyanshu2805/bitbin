# Billing Flow

BitBin has two plans. Pro is sold through Stripe Checkout in subscription mode, and managed in the Stripe Customer Portal.

| | Free | Pro |
|---|---|---|
| Price | $0 | $8 / month or $72 / year |
| Items | 50 | Unlimited |
| Collections | 3 | Unlimited |
| File and image items | ✗ | ✓ |
| AI features | ✗ | ✓ |
| Export | JSON | JSON + ZIP (with files) |

Limits are enforced on the server — see [plan enforcement](../security-model.md#plan-enforcement). The UI only mirrors them.

## Checkout

1. "Upgrade" on `/upgrade` or `/settings` posts `{ plan: 'monthly' | 'yearly' }` to `POST /api/stripe/checkout`.
2. The handler maps the plan to `STRIPE_PRICE_ID_MONTHLY` / `_YEARLY` (`400` for anything else), then finds the user's Stripe customer — or creates one with `metadata.userId` and saves `stripeCustomerId`.
3. It creates a Checkout Session (`mode: 'subscription'`, metadata `{ userId, app: 'bitbin' }`), with `success_url` `/settings?upgraded=true` and `cancel_url` `/settings`, and returns its URL. The browser redirects to Stripe.
4. Back on `/settings?upgraded=true`, the page shows a "Welcome to BitBin Pro!" toast.

## Webhooks

Stripe calls `POST /api/webhooks/stripe`. The handler reads the raw body, verifies the `stripe-signature` header with `STRIPE_WEBHOOK_SECRET` (`400` on failure), then:

| Event | Effect |
|---|---|
| `checkout.session.completed` | Skipped unless `metadata.app` is `bitbin`. Otherwise finds the user by `metadata.userId`; sets `isPro = true`, saves the customer and subscription ids |
| `invoice.paid` | `isPro = true` for the user with that customer id (renewals) |
| `invoice.payment_failed` | Logged only |
| `customer.subscription.updated` | `isPro` = status is `active` or `trialing` |
| `customer.subscription.deleted` | `isPro = false`, clears `stripeSubscriptionId` |

A handler error returns `500`, so Stripe retries. Events aren't de-duplicated or ordered — see [known gaps](../../known-gaps.md).

## Sharing a Stripe account with other apps

Stripe sends every event to every webhook endpoint on the account, so if another app uses the same account (or sandbox), BitBin receives its events too.

- Invoice and subscription events are matched by `stripeCustomerId`. Another app's customers never match a BitBin user, so those events change nothing.
- Checkout events are matched by `metadata.userId`, a common field name. BitBin tags its own sessions with `metadata.app = "bitbin"` (`STRIPE_APP_TAG` in `src/lib/stripe.ts`), and the webhook returns `200` without doing anything for checkouts without the tag. Before the tag, a foreign checkout made the handler throw and return `500` — and Stripe retries failing endpoints for days and can eventually disable them.

A separate Stripe account per app is still the cleanest setup: the tag can't stop *other* apps from receiving BitBin's events.

## Reaching the session

`isPro` lives only in the database. The `jwt` callback re-reads it every time the session is evaluated, so the next request after a webhook sees the new plan — no sign-out, no cache to bust. See [ADR 0003](../decisions/0003-jwt-sessions-with-live-plan.md).

## Managing the subscription

"Manage subscription" calls `POST /api/stripe/portal`, which creates a Customer Portal session for the saved `stripeCustomerId` (`400` if there isn't one) with `return_url` `/settings`. Cancelling in the portal ends in `customer.subscription.updated` / `.deleted`.

## Local testing

```bash
stripe login        # choose the account BitBin uses
stripe listen \
  --events checkout.session.completed,invoice.paid,invoice.payment_failed,customer.subscription.updated,customer.subscription.deleted \
  --forward-to localhost:3000/api/webhooks/stripe
```

Copy the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET`. `--events` limits forwarding to the five events BitBin handles. Pay with `4242 4242 4242 4242`, any future date and any CVC.

To test delivery without a checkout, run `stripe trigger checkout.session.completed`. The generated session has no `app` tag, so the webhook should answer `200` and leave every user unchanged.

## Stripe dashboard setup

1. Create a product **BitBin Pro** with two recurring prices ($8 monthly, $72 yearly); put the price ids in `STRIPE_PRICE_ID_MONTHLY` and `STRIPE_PRICE_ID_YEARLY`.
2. Enable the Customer Portal (Settings → Billing → Customer portal).
3. In production, add a webhook endpoint for `https://YOUR_DOMAIN/api/webhooks/stripe` subscribed to the five events above.

## Related

- [Billing endpoints](../README.md)
- [Stripe integration plan](../design-notes/stripe-integration-plan.md) — the original design write-up.

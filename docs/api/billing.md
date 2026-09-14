# Billing Endpoints

Route handlers for Stripe. The end-to-end flow — including how a webhook's change reaches the session — is in the [billing flow](../architecture/flows/billing.md).

## `POST /api/stripe/checkout`

Session required. `{ "plan": "monthly" | "yearly" }`.

| Status | When |
|---|---|
| `200` | `{ url }` — the Checkout Session URL; redirect the browser to it |
| `400` | `plan` missing or not `monthly` / `yearly` (or its price id isn't configured) |
| `401` | No session |
| `500` | Stripe error |

Creates the Stripe customer on first use (`metadata.userId`) and saves `stripeCustomerId`. The session's metadata is `{ userId, app: 'bitbin' }`. Success returns to `/settings?upgraded=true`, cancel to `/settings`.

## `POST /api/stripe/portal`

Session required, no body.

| Status | When |
|---|---|
| `200` | `{ url }` — the Customer Portal URL |
| `400` | "No billing account found" — the user has no `stripeCustomerId` |
| `401` | No session |
| `500` | Stripe error |

## `POST /api/webhooks/stripe`

Called by Stripe, not the browser. No session — authenticity comes from the `stripe-signature` header, verified against `STRIPE_WEBHOOK_SECRET` on the raw request body.

| Status | When |
|---|---|
| `200` | `{ received: true }` — handled, or an event type BitBin ignores |
| `400` | Missing `stripe-signature`, or verification failed |
| `500` | A handler threw — Stripe retries the event |

| Event | Effect on `users` |
|---|---|
| `checkout.session.completed` | Ignored unless `metadata.app` is `bitbin` (`STRIPE_APP_TAG`). Then by `metadata.userId`: `isPro = true`, `stripeCustomerId`, `stripeSubscriptionId` |
| `invoice.paid` | By customer id: `isPro = true` |
| `invoice.payment_failed` | Nothing — logged |
| `customer.subscription.updated` | By customer id: `isPro` = status `active` or `trialing` |
| `customer.subscription.deleted` | By customer id: `isPro = false`, `stripeSubscriptionId = null` |

The endpoint must be subscribed to exactly these five events in the Stripe dashboard.

## Related

- [Deployment — provider callbacks](../deployment.md)
- [Known gaps](../known-gaps/constraints-and-trade-offs.md)

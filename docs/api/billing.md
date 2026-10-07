# Billing Endpoints

Route handlers for Stripe. The end-to-end flow — including how a webhook's change reaches the session — is in the [billing flow](../architecture/flows/billing.md).

## `POST /api/stripe/checkout`

Session required. `{ "plan": "monthly" | "yearly" }`.

| Status | When |
|---|---|
| `200` | `{ url }` — the Checkout Session URL; redirect the browser to it |
| `400` | `plan` missing or not `monthly` / `yearly` (or its price id isn't configured) |
| `401` | No session |
| `403` | The public demo account, which can't be upgraded, or a request a browser says came from another site |
| `409` | The user is already Pro. A second subscription would bill them twice; manage it in the portal |
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
| `checkout.session.completed` | Ignored unless `metadata.app` is `bitbin` (`STRIPE_APP_TAG`). Then saves `stripeCustomerId` on the user in `metadata.userId` (a no-op if they've since deleted their account) and syncs the plan |
| `invoice.paid` | Syncs the plan for that customer |
| `invoice.payment_failed` | Nothing — logged |
| `customer.subscription.updated` / `.deleted` | Syncs the plan for that customer |

**Syncing the plan** lists the customer's subscriptions from Stripe and sets `isPro` to whether one is `active` or `trialing`, with `stripeSubscriptionId` set to that subscription (or `null`). The event only says *whose* plan changed; the state comes from Stripe, so a retried or out-of-order event (a late `invoice.paid` after a cancellation) can't leave the wrong plan. If the Stripe call fails the handler returns `500` and Stripe retries.

The endpoint must be subscribed to exactly these five events in the Stripe dashboard.

## Related

- [Deployment — provider callbacks](../deployment/providers.md#stripe)
- [Known gaps](../known-gaps/constraints-and-trade-offs.md)

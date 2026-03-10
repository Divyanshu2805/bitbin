# Billing

BitBin has two plans. Pro is sold through Stripe Checkout (subscription mode),
and users manage it in the Stripe Customer Portal.

| | Free | Pro |
| --- | --- | --- |
| Price | $0 | $8 / month or $72 / year |
| Items | 50 | Unlimited |
| Collections | 3 | Unlimited |
| File & image items | ✗ | ✓ |
| AI features | ✗ | ✓ |
| Export | JSON | JSON + ZIP (with files) |

Limits are enforced server-side in `src/lib/usage.ts` (`MAX_ITEMS`,
`MAX_COLLECTIONS`) and by `isPro` checks in actions and route handlers. The UI
only mirrors them.

## Flow

```
/upgrade or /settings → "Upgrade"
   └── POST /api/stripe/checkout { plan: "monthly" | "yearly" }
          ├── find or create Stripe customer (metadata.userId)
          ├── save stripeCustomerId on the user
          └── Checkout Session (metadata: userId, app: "bitbin") → redirect to Stripe

Stripe → POST /api/webhooks/stripe (signature verified with STRIPE_WEBHOOK_SECRET)
   ├── checkout.session.completed      → isPro = true, store subscription id
   │                                      (skipped unless metadata.app is "bitbin")
   ├── invoice.paid                    → isPro = true (renewals)
   ├── invoice.payment_failed          → logged
   ├── customer.subscription.updated   → isPro = status is active/trialing
   └── customer.subscription.deleted   → isPro = false, clear subscription id

Back in the app: /settings?upgraded=true → "Welcome to BitBin Pro!" toast
```

`isPro` is re-read from the database on every JWT refresh
(`src/auth.ts`), so a webhook update reaches the session without a sign-out.

"Manage subscription" calls `POST /api/stripe/portal`, which returns a Customer
Portal URL for the saved `stripeCustomerId`.

## Sharing a Stripe account with other apps

Stripe sends every event to every webhook endpoint on the account. If another
app uses the same account (or sandbox), BitBin receives that app's events too.

- Invoice and subscription events are matched by `stripeCustomerId`. Other
  apps' customers never match a BitBin user, so those events change nothing.
- Checkout events are matched by `metadata.userId`, a common field name.
  BitBin tags its own checkout sessions with `metadata.app = "bitbin"`
  (`STRIPE_APP_TAG` in `src/lib/stripe.ts`), and the webhook returns 200
  without doing anything for checkouts that lack the tag. Without this, a
  foreign checkout would make the handler throw and return 500, and Stripe
  retries failing endpoints for days and can eventually disable them.

A separate Stripe account per app is still the cleanest setup, since the
tag can't stop *other* apps from receiving BitBin's events.

## Local testing

```bash
stripe login        # choose the account BitBin uses
stripe listen \
  --events checkout.session.completed,invoice.paid,invoice.payment_failed,customer.subscription.updated,customer.subscription.deleted \
  --forward-to localhost:3000/api/webhooks/stripe
# copy the whsec_... it prints into STRIPE_WEBHOOK_SECRET
```

`--events` limits forwarding to the five events BitBin handles. Passing
`--api-key "$STRIPE_SECRET_KEY"` instead of `stripe login` guarantees the CLI
listens to the same account as the app.

Use card `4242 4242 4242 4242`, any future date and any CVC.

To test delivery without a checkout, run `stripe trigger
checkout.session.completed`. The generated session has no `app` tag, so the
webhook should answer 200 and leave every user unchanged.

## Stripe dashboard setup

1. Create a product **BitBin Pro** with two recurring prices ($8 monthly,
   $72 yearly). Copy the price ids into `STRIPE_PRICE_ID_MONTHLY` and
   `STRIPE_PRICE_ID_YEARLY`.
2. Enable the Customer Portal (Settings → Billing → Customer portal).
3. In production, add a webhook endpoint for
   `https://YOUR_DOMAIN/api/webhooks/stripe` subscribed to the five events above.

The full design notes are in [stripe-integration-plan.md](stripe-integration-plan.md).

# Design Notes

The longer write-ups from when major features were planned. They record the options that were weighed and the reasoning at the time, and are kept as history — **they are not updated as the code changes**. Where a note and the code (or the rest of these docs) disagree, the code and the current docs win.

| Note | Planned | Current behaviour |
|---|---|---|
| [Item CRUD architecture](item-crud-architecture.md) | The unified create / read / update / delete design for all seven item types | [Items flow](../flows/items.md), [item types](../../schema/item-types.md) |
| [AI integration plan](ai-integration-plan.md) | Model choice, SDK setup, the four AI features, gating and cost control | [AI features flow](../flows/ai-features.md) |
| [Stripe integration plan](stripe-integration-plan.md) | Checkout, the Customer Portal, webhooks and plan limits | [Billing flow](../flows/billing.md) |

Decisions that still shape the code are recorded as [architecture decisions](../decisions/README.md).

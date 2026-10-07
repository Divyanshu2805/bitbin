import { prisma } from '@/lib/prisma';

/** The plan flag alone, for pages and routes that gate on Pro. */
export async function getUserPlan(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isPro: true },
  });
}

/** What starting a checkout needs. */
export async function getCheckoutRecord(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true, email: true, isPro: true },
  });
}

/** The Stripe customer for the billing portal, or null when the user never paid. */
export async function getStripeCustomerId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
  return user?.stripeCustomerId ?? null;
}

export async function setStripeCustomerId(userId: string, customerId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customerId },
  });
}

/**
 * Attach a Stripe customer to the user a checkout was created for. `updateMany`: the user may
 * have deleted their account before the event arrives, and throwing would make Stripe retry.
 */
export async function linkStripeCustomer(userId: string, customerId: string) {
  await prisma.user.updateMany({
    where: { id: userId },
    data: { stripeCustomerId: customerId },
  });
}

/** Set the plan of whoever owns this Stripe customer. */
export async function setPlanForCustomer(customerId: string, isPro: boolean, subscriptionId: string | null) {
  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: { isPro, stripeSubscriptionId: subscriptionId },
  });
}

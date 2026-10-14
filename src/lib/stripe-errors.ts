/**
 * True when Stripe says the customer we sent doesn't exist (`No such customer`). It happens when
 * a stored id came from another Stripe account or mode, or the customer was deleted in the dashboard.
 */
export function isMissingCustomerError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const { code, param } = error as { code?: unknown; param?: unknown }
  return code === 'resource_missing' && param === 'customer'
}

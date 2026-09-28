// Free plan limits. Enforced on the server in lib/usage.ts; kept here so client
// components (the sidebar's usage meter) can show them without importing Prisma.
export const MAX_ITEMS = 50
export const MAX_COLLECTIONS = 3

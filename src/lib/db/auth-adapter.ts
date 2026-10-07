import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

/** The NextAuth adapter that stores users and OAuth accounts (the only place the client is handed to a library). */
export function createAuthAdapter() {
  return PrismaAdapter(prisma);
}

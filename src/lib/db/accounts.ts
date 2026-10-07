import { prisma } from '@/lib/prisma';

/**
 * Account queries for the sign-in, registration, password and deletion flows. The email-based
 * lookups serve the public auth endpoints, where there is no session yet: they identify the
 * account by an address the caller proved (a token, a password) or is trying to claim.
 */

/** The full user row for an email address (sign-in, register, forgot password, resend). */
export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

/** The full user row for an id (the OAuth sign-in callback). */
export async function findUserById(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

/** The id and password hash, to check the current password before changing it. */
export async function getPasswordRecord(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true },
  });
}

/**
 * Set a new password hash. Bumping `sessionVersion` signs out every session issued before it,
 * including the caller's own.
 */
export async function setPasswordAndRevokeSessions(userId: string, passwordHash: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { password: passwordHash, sessionVersion: { increment: 1 } },
  });
}

/** What account deletion needs: the password to confirm it and the subscription to cancel. */
export async function getDeletionRecord(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { password: true, stripeSubscriptionId: true },
  });
}

/** Delete the user; the schema cascades to everything they own. */
export async function deleteUser(userId: string) {
  await prisma.user.delete({ where: { id: userId } });
}

export interface NewUser {
  name: string | null;
  email: string;
  passwordHash: string;
  emailVerified: Date | null;
}

export async function createUser(data: NewUser) {
  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: data.passwordHash,
      emailVerified: data.emailVerified,
    },
  });
}

/** Re-registering an unverified address replaces the name and password: the latest owner of the mailbox wins. */
export async function replaceUnverifiedRegistration(userId: string, name: string | null, passwordHash: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { name, password: passwordHash },
  });
}

export async function markEmailVerified(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: new Date() },
  });
}

/** Delete a pending account whose verification email could not be sent. */
export async function deleteUserQuietly(userId: string) {
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}

/** What the session callbacks re-read on every evaluation: the plan and the session version. */
export async function getSessionState(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { isPro: true, sessionVersion: true },
  });
}

/** Remove the provider link the adapter just created for a sign-in we are refusing. */
export async function deleteOAuthLink(userId: string, provider: string | undefined) {
  await prisma.account.deleteMany({ where: { userId, provider } });
}

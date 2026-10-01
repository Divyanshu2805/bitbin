/**
 * Plan limits that must hold under concurrency: the count and the insert run
 * in one transaction, after taking a lock on the user's row. Two simultaneous
 * creates for the same user queue behind the lock, so the second one sees the
 * first one's row and can't push a Free account past its cap.
 */

/** Thrown inside a transaction when the user is already at their plan's cap. */
export class LimitReachedError extends Error {
  constructor(public readonly resource: 'items' | 'collections') {
    super(`${resource} limit reached`);
    this.name = 'LimitReachedError';
  }
}

/** The part of a Prisma transaction client the lock needs. */
interface RawQueryClient {
  $queryRaw: (query: TemplateStringsArray, ...values: unknown[]) => PromiseLike<unknown>;
}

/** Serialise concurrent limit checks for one user until the transaction ends. */
export async function lockUserForLimit(tx: RawQueryClient, userId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "users" WHERE id = ${userId} FOR UPDATE`;
}

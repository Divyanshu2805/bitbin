import { prisma } from '@/lib/prisma';

/**
 * Every stored-file URL any item points at, across all users. Not scoped to a user on purpose: the
 * orphan sweeper needs the whole picture, because a file is an orphan only if *nobody* references it.
 * Never call this from a request a user makes.
 */
export async function getAllReferencedFileUrls(): Promise<string[]> {
  const rows = await prisma.item.findMany({
    where: { fileUrl: { not: null } },
    select: { fileUrl: true },
  });
  return rows.flatMap((row) => (row.fileUrl ? [row.fileUrl] : []));
}

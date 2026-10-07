import { prisma } from '@/lib/prisma';
import {
  type EditorPreferences,
  mergeWithDefaults,
} from '@/lib/constants/editor';

export interface DashboardUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

/**
 * Get user by ID with fields needed for dashboard layout
 */
export async function getUserById(userId: string): Promise<DashboardUser | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true },
  });
}

export interface UserWithSettings extends DashboardUser {
  hasPassword: boolean;
  createdAt: Date;
  editorPreferences: EditorPreferences;
}

/**
 * Get user by ID with fields needed for profile/settings pages
 */
export async function getUserWithSettings(userId: string): Promise<UserWithSettings | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      password: true,
      createdAt: true,
      editorPreferences: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    hasPassword: !!user.password,
    createdAt: user.createdAt,
    editorPreferences: mergeWithDefaults(user.editorPreferences as Partial<EditorPreferences> | null),
  };
}

/**
 * Rename the user. Returns the saved name, or null when the user no longer
 * exists (a JWT can outlive its account).
 */
export async function updateUserName(userId: string, name: string): Promise<string | null> {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { name },
      select: { name: true },
    });
    return user.name ?? name;
  } catch {
    return null;
  }
}

/**
 * Update user's editor preferences
 */
export async function updateEditorPreferences(
  userId: string,
  preferences: EditorPreferences
): Promise<boolean> {
  try {
    // Convert to plain JSON object for Prisma
    const jsonPreferences = JSON.parse(JSON.stringify(preferences));
    await prisma.user.update({
      where: { id: userId },
      data: { editorPreferences: jsonPreferences },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * End every session this user has, on every device: a token carries the `sessionVersion` it was
 * issued with, and bumping it makes the `jwt` callback reject all older ones.
 */
export async function revokeUserSessions(userId: string): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { sessionVersion: { increment: 1 } },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get user's editor preferences
 */
export async function getEditorPreferences(userId: string): Promise<EditorPreferences> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { editorPreferences: true },
  });

  return mergeWithDefaults(user?.editorPreferences as Partial<EditorPreferences> | null);
}

export interface ProfileStats {
  totalItems: number;
  totalCollections: number;
  itemTypeBreakdown: { name: string; icon: string; color: string; count: number }[];
}

/**
 * Totals and the per-type item counts for the profile page
 */
export async function getProfileStats(userId: string): Promise<ProfileStats> {
  const [itemCounts, itemTypes, totalItems, totalCollections] = await Promise.all([
    prisma.item.groupBy({
      by: ['itemTypeId'],
      where: { userId },
      _count: { id: true },
    }),
    prisma.itemType.findMany({ where: { isSystem: true } }),
    prisma.item.count({ where: { userId } }),
    prisma.collection.count({ where: { userId } }),
  ]);

  const typeCountMap = new Map(itemCounts.map((c) => [c.itemTypeId, c._count.id]));
  return {
    totalItems,
    totalCollections,
    itemTypeBreakdown: itemTypes.map((type) => ({
      name: type.name,
      icon: type.icon,
      color: type.color,
      count: typeCountMap.get(type.id) || 0,
    })),
  };
}

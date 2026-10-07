import { countItems } from '@/lib/db/items'
import { countCollections } from '@/lib/db/collections'
import { MAX_ITEMS, MAX_COLLECTIONS } from '@/lib/constants/plan'

export { MAX_ITEMS, MAX_COLLECTIONS }

interface UserUsage {
  itemCount: number
  collectionCount: number
  canCreateItem: boolean
  canCreateCollection: boolean
  maxItems: number
  maxCollections: number
}

export async function getUserUsage(
  userId: string,
  isPro: boolean
): Promise<UserUsage> {
  const [itemCount, collectionCount] = await Promise.all([
    countItems(userId),
    countCollections(userId),
  ])

  return {
    itemCount,
    collectionCount,
    canCreateItem: isPro || itemCount < MAX_ITEMS,
    canCreateCollection: isPro || collectionCount < MAX_COLLECTIONS,
    maxItems: isPro ? Infinity : MAX_ITEMS,
    maxCollections: isPro ? Infinity : MAX_COLLECTIONS,
  }
}

export async function canCreateItem(
  userId: string,
  isPro: boolean
): Promise<boolean> {
  if (isPro) return true
  const count = await countItems(userId)
  return count < MAX_ITEMS
}

export async function canCreateCollection(
  userId: string,
  isPro: boolean
): Promise<boolean> {
  if (isPro) return true
  const count = await countCollections(userId)
  return count < MAX_COLLECTIONS
}

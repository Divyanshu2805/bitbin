import { redirect } from "next/navigation";
import { ViewToggle } from "@/components/shared/view-toggle";
import { auth } from "@/auth";
import PageHeader from "@/components/shared/page-header";
import EmptyState from "@/components/shared/empty-state";
import FavoritesItemList from "@/components/favorites/favorites-item-list";
import FavoritesCollectionList from "@/components/favorites/favorites-collection-list";
import { getFavoriteCollections } from "@/lib/db/collections";
import { getFavoriteItems } from "@/lib/db/items";
import { getUserById } from "@/lib/db/users";
import { Star } from "lucide-react";

export default async function FavoritesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const user = await getUserById(session.user.id);

  if (!user) {
    redirect("/sign-in");
  }

  const [favoriteItems, favoriteCollections] = await Promise.all([
    getFavoriteItems(user.id),
    getFavoriteCollections(user.id),
  ]);

  const totalFavorites = favoriteItems.length + favoriteCollections.length;
  const hasNoFavorites = totalFavorites === 0;

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-10">
        {/* Header */}
        <PageHeader
          path="favorites"
          title="Favorites"
          count={totalFavorites}
          description="Everything you've starred, items and collections, in one place."
          icon={
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/10 shadow-[0_10px_30px_-12px_#fbbf24]">
              <Star className="h-5 w-5 fill-amber-400 text-amber-500 dark:text-amber-400" />
            </span>
          }
        >
          <ViewToggle />
        </PageHeader>

        {hasNoFavorites ? (
          <EmptyState
            title="No favorites yet"
            description="Star items or collections and they'll be waiting for you here."
          />
        ) : (
          <div className="space-y-10">
            {favoriteItems.length > 0 && (
              <FavoritesItemList items={favoriteItems} />
            )}

            {favoriteCollections.length > 0 && (
              <FavoritesCollectionList collections={favoriteCollections} />
            )}
          </div>
        )}
      </div>
    </>
  );
}

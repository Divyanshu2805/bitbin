"use client";

import { useMemo, useState } from "react";
import SortableSection from "@/components/shared/sortable-section";
import FavoriteCollectionRow from "@/components/favorites/favorite-collection-row";
import type { FavoriteCollection } from "@/lib/db/collections";

type SortKey = "name-asc" | "name-desc" | "date-desc" | "date-asc";

const SORT_OPTIONS = [
  { value: "date-desc", label: "Newest" },
  { value: "date-asc", label: "Oldest" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
];

interface FavoritesCollectionListProps {
  collections: FavoriteCollection[];
}

function sortCollections(
  collections: FavoriteCollection[],
  sort: SortKey
): FavoriteCollection[] {
  return [...collections].sort((a, b) => {
    switch (sort) {
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "date-desc":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case "date-asc":
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      default:
        return 0;
    }
  });
}

export default function FavoritesCollectionList({
  collections,
}: FavoritesCollectionListProps) {
  const [sort, setSort] = useState<SortKey>("date-desc");
  const sorted = useMemo(
    () => sortCollections(collections, sort),
    [collections, sort]
  );

  return (
    <SortableSection
      title="Collections"
      count={collections.length}
      sort={sort}
      onSortChange={(v) => setSort(v as SortKey)}
      options={SORT_OPTIONS}
    >
      {sorted.map((collection) => (
        <FavoriteCollectionRow key={collection.id} collection={collection} />
      ))}
    </SortableSection>
  );
}

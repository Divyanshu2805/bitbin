-- Card lists: an index in list order, (userId, isPinned, updatedAt, id), lets a page start at its
-- cursor and stop after one page of rows instead of reading and sorting every row of the list. It
-- covers what (userId, isPinned) served, so that index goes. (userId, itemTypeId) lets the count by
-- type that every list page and the sidebar run read only the index.
-- Backward compatible: the old code reads the same tables and simply gets other plans.

-- CreateIndex
CREATE INDEX "items_userId_isPinned_updatedAt_id_idx" ON "items"("userId", "isPinned", "updatedAt", "id");

-- CreateIndex
CREATE INDEX "items_userId_itemTypeId_idx" ON "items"("userId", "itemTypeId");

-- CreateIndex
CREATE INDEX "collections_userId_isPinned_updatedAt_id_idx" ON "collections"("userId", "isPinned", "updatedAt", "id");

-- DropIndex
DROP INDEX "items_userId_isPinned_idx";

-- DropIndex
DROP INDEX "collections_userId_isPinned_idx";

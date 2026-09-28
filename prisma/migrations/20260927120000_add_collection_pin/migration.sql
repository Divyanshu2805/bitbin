-- AlterTable
ALTER TABLE "collections" ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "collections_userId_isPinned_idx" ON "collections"("userId", "isPinned");

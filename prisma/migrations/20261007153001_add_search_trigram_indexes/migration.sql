-- Trigram search: pg_trgm lets a GIN index serve "contains" matches (ILIKE '%text%'), which the
-- search palette runs on titles, content, descriptions, URLs, tag names and collection names.
-- Safe to run twice and backward compatible: the old code simply doesn't use the indexes.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex
CREATE INDEX "collections_name_trgm_idx" ON "collections" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "items_title_trgm_idx" ON "items" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "items_content_trgm_idx" ON "items" USING GIN ("content" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "items_description_trgm_idx" ON "items" USING GIN ("description" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "items_url_trgm_idx" ON "items" USING GIN ("url" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "tags_name_trgm_idx" ON "tags" USING GIN ("name" gin_trgm_ops);

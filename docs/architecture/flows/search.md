# Search Flow

Press <kbd>⌘</kbd>+<kbd>K</kbd> (macOS) or <kbd>Ctrl</kbd>+<kbd>K</kbd> (Windows / Linux) anywhere in the app, or click the search bar in the top bar.

## How it works

```
SearchProvider (mounted by the signed-in layout, src/app/(app)/layout.tsx)
   └── owns "is the palette open" and the keyboard shortcut. Loads nothing.

CommandPalette (cmdk dialog) → PaletteBody (mounted only while open)
   └── you type → 150 ms pause → searchLibrary(text)       server action
          ├── nothing typed: getRecentSearchableItems (8) + getRecentSearchableCollections (5)
          └── text typed:    searchItems (20)             + searchCollections (8)   src/lib/db/search.ts
   └── the answer replaces the list; an older answer that arrives late is dropped
```

- **The database does the matching.** `searchItems` is one query: a case-insensitive "contains" (`ILIKE '%text%'`) over the title, content, description, URL and tag names, scoped by `userId`. Items whose **title** matches come first, then the most recently edited. `#react` looks only at tags. Collections match on name.
- **Indexed.** GIN trigram indexes (`pg_trgm`) on those columns make `ILIKE '%…%'` use an index; they come from the `add_search_trigram_indexes` migration and are declared in `schema.prisma` so Prisma doesn't treat them as drift. Without the migration the search still works, just by scanning the user's rows.
- **Literal matching.** `%`, `_` and `\` in what you type are escaped (`containsPattern`), so "50%" finds "50%", not everything starting "50". The text is bound as a query parameter, never concatenated into the SQL.
- **Only a handful of rows leave the database**, and an item's preview is `left(content, 101)` cut in SQL, so the full text of an item is never loaded to draw a one-line preview.
- **Rate limited**: 240 searches a minute per user (the `search` limit), far more than typing produces.
- While a newer search is in flight the old results stay up, dimmed. `shouldFilter={false}` tells cmdk not to filter the server's answer again.
- Results are grouped into **Items** and **Collections**. Selecting an item opens it in the drawer; selecting a collection navigates to `/collections/[id]`. Each opening of the palette starts with an empty box and fresh results, so nothing you just saved is missing.

## Files

| File | Role |
|---|---|
| `src/actions/search.ts` | `searchLibrary`: session, validation, rate limit |
| `src/lib/db/search.ts` | The queries, `containsPattern`, `parseSearch` |
| `src/components/search/search-provider.tsx` | Open state and the keyboard shortcut |
| `src/components/search/command-palette.tsx` | UI, debounce, stale-answer handling |
| `src/components/ui/command.tsx` | shadcn wrapper around `cmdk` |

## Limitations

- It is a substring match, not fuzzy: "dbnc" won't find "debounce". (cmdk's fuzzy matching was too loose, so the original palette was substring-only too.)
- Ranking is simple: title matches first, then recency. There is no relevance score across content, description and tags.
- Searches under three characters can't use the trigram index and scan the user's rows; that is fine at personal-library sizes.

## Related

- [Constraints and trade-offs](../../known-gaps/constraints-and-trade-offs.md#data-and-scale)

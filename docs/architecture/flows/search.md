# Search Flow

Press <kbd>⌘</kbd>+<kbd>K</kbd> (macOS) or <kbd>Ctrl</kbd>+<kbd>K</kbd> (Windows / Linux) anywhere in the app, or click the search bar in the top bar.

## How it works

```
SearchProvider (mounted by the signed-in layout, src/app/(app)/layout.tsx)
   └── getSearchData()  — server action
          ├── getSearchableItems(userId)        id, title, type, icon, colour, preview, tags
          └── getSearchableCollections(userId)  id, name, itemCount
   └── keeps the result in context

CommandPalette (cmdk dialog)
   └── filters client-side as you type — no server round-trips
```

- **Prefetched** when the layout mounts, so opening the palette is instant, and **refreshed** each time it opens (see below), so new items show up without a reload.
- **Strict filter.** cmdk's default fuzzy matching was too loose ("abc" matched "a…b…c"), so `strictFilter` requires the query to appear as a contiguous, case-insensitive substring.
- Results are grouped into **Items** and **Collections**. Selecting an item opens it in the drawer; selecting a collection navigates to `/collections/[id]`.
- An item's preview is the first 100 characters of its content, description or URL.

## Files

| File | Role |
|---|---|
| `src/actions/search.ts` | `getSearchData` |
| `src/components/search/search-provider.tsx` | Context, keyboard shortcut, prefetch |
| `src/components/search/command-palette.tsx` | UI and filter |
| `src/components/ui/command.tsx` | shadcn wrapper around `cmdk` |

## Limitations

- The index is reloaded each time the palette opens (unless it was loaded in the last two seconds), quietly, with the old results still showing, so an item you just created, renamed or deleted is found without a reload. It's still one request that sends every item and collection to the browser, which is fine for hundreds of items and not for tens of thousands.
- The previews come from `left(content, 101)` in SQL, so the full text of every item is never loaded to build a one-line preview.
- Every item and collection the user has is sent to the browser. That's fine at Free-plan sizes; a Pro account with thousands of items pays for it on each load and refresh. Server-side search is on the [known-gaps list](../../known-gaps/constraints-and-trade-offs.md#data-and-scale).

## Related

- [Known gaps](../../known-gaps/not-yet-built.md)

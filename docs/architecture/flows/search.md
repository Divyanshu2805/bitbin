# Search Flow

Press <kbd>⌘</kbd>+<kbd>K</kbd> (macOS) or <kbd>Ctrl</kbd>+<kbd>K</kbd> (Windows / Linux) anywhere in the app, or click the search bar in the top bar.

## How it works

```
SearchProvider (mounted by the dashboard layout)
   └── getSearchData()  — server action
          ├── getSearchableItems(userId)        id, title, type, icon, colour, preview
          └── getSearchableCollections(userId)  id, name, itemCount
   └── keeps the result in context

CommandPalette (cmdk dialog)
   └── filters client-side as you type — no server round-trips
```

- **Prefetched once** when the layout mounts, so opening the palette is instant.
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

- The index isn't refreshed after a mutation. `SearchProvider` exposes `refreshSearchData`, but nothing calls it, so items created, renamed or deleted since the page loaded don't show up correctly until a reload.
- Every item and collection the user has is sent to the browser. That's fine at Free-plan sizes; a Pro account with thousands of items pays for it on every page load.

## Related

- [Known gaps](../../known-gaps.md)

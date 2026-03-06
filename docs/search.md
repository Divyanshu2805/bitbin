# Search (command palette)

Press <kbd>⌘</kbd>+<kbd>K</kbd> (macOS) or <kbd>Ctrl</kbd>+<kbd>K</kbd>
(Windows/Linux) anywhere in the app, or click the search bar in the top bar.

## How it works

```
SearchProvider (mount)
   └── getSearchData()  ── server action
          ├── getSearchableItems(userId)        id, title, type, icon, color, preview
          └── getSearchableCollections(userId)  id, name, itemCount
   └── keeps the result in context

CommandPalette (cmdk dialog)
   └── filters client-side as you type (no server round-trips)
```

- **Prefetched once** when the dashboard layout mounts, so opening the
  palette is instant.
- **Strict filter**: cmdk's default fuzzy matching was too loose ("abc"
  matched "a…b…c"), so `strictFilter` requires the query to appear as a
  contiguous, case-insensitive substring.
- Results are grouped into **Items** and **Collections**.
- Selecting an item opens it in the drawer. Selecting a collection navigates to
  `/collections/[id]`.

## Files

| File | Role |
| --- | --- |
| `src/actions/search.ts` | `getSearchData` action |
| `src/components/search/search-provider.tsx` | Context, keyboard shortcut, prefetch |
| `src/components/search/command-palette.tsx` | UI and filter |
| `src/components/ui/command.tsx` | shadcn wrapper around `cmdk` |

## Limitations

- Search data is fetched on mount. Items created in another tab won't appear
  until the page reloads.
- The content preview is the first 100 characters of content, description or URL.

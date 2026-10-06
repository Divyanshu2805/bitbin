# Key Abstractions

The handful of concepts worth knowing by name before reading the code.

## Item

Anything a user saves: a snippet, prompt, command, note, file, image or link. One `items` row, whose **content type** decides which columns hold the payload — `content` for `TEXT`, `fileUrl` / `fileName` / `fileSize` for `FILE`, `url` for `URL`. Items are pinned and favorited with two booleans, tagged, and placed in any number of collections. See [items](flows/items.md).

## Item type

What kind of thing an item is. Seven **system types** (`isSystem = true`, `userId = null`) are seeded and shared by everyone; each has a Lucide icon name and a colour. The type decides the content type, the editor (Monaco for types with a language — snippets and commands — markdown for the other text types), the route (`/items/snippets`, …) and whether the item is Pro-only (files and images). The schema allows per-user custom types, but nothing in the app creates them yet. See [item types](../schema/item-types.md).

## Collection

A named group of items. Membership is many-to-many through `item_collections`, so one item can be in several collections, and deleting a collection never deletes items. A collection's colour isn't stored — it's the **dominant colour**, the colour of the most common item type among a sample of its items. See [collections](flows/collections.md).

## Tag

A name shared across all users — `tags.name` is globally unique and case-sensitive, so `React` and `react` are different tags. Items connect to tags with `connectOrCreate`; tags are never deleted, even when no item uses them.

## Plan (Free / Pro)

`users.isPro`, set only by Stripe webhooks. Pro removes the 50-item and 3-collection limits and unlocks files, images, AI and ZIP export. The flag is re-read into the session on every request, so the rest of the app just checks `session.user.isPro`. See [billing](flows/billing.md).

## ActionResult

The return shape of every server action — `{ success, data?, error?, fieldErrors? }`. Actions never throw to the client. See [cross-cutting concerns](cross-cutting-concerns.md#action-results-and-errors).

## Session

A NextAuth JWT carrying the user's id, `isPro` and `sessionVersion`. `getAuthedSession()` in actions and `auth()` everywhere else are the only ways code learns who the caller is.

## API token

A personal access token (`bb_…`, stored only as a SHA-256 hash, expiring, revocable) that lets the browser extension and the desktop app call `/api/v1` as its owner. Cookies are never accepted there. See the [token API](../api/token-api.md).

## The demo account

`demo@bitbin.dev`, a public sandbox whose password is published. It works like any Free account except that it can't change itself (`isDemoEmail`), and a daily cron restores its library. See [ADR 0008](decisions/0008-public-demo-account-as-a-locked-sandbox.md).

## Editor preferences

Per-user Monaco settings — font size, tab size, word wrap, minimap, theme (`vs-dark`, `monokai`, `github-dark`; the light app theme overrides it with `github-light`) — stored as JSON in `users.editorPreferences`, merged over defaults from `src/lib/constants/editor.ts`, and provided to the editors by `EditorPreferencesProvider`.

## The drawer

The panel that shows and edits one item, opened from any card, row or search result: centered over the page (content on the left; tags, collections and dates in a column on the right), full screen with the expand button or `M`, and always full screen on phones. `ItemDrawerProvider` holds which item is open; the drawer loads the full item through `GET /api/items/[id]`.

## Related

- [Data model](../schema/README.md)
- [Where do I change…?](where-to-change.md)

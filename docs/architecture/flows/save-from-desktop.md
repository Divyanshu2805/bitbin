# Save from the Desktop (tray app)

How the clipboard becomes a BitBin item without opening a browser. The app lives in [`desktop/`](../../../desktop/README.md). The server side is the same [token API](../../api/token-api.md) the [browser extension](save-from-extension.md) uses, so it adds no routes, tables or rate limits.

## Installing and connecting

Until builds are published, users run it from source or build an installer (`npm run dist` in `desktop/`). There is no download in Settings and no automatic update.

1. A Pro user creates a token in **Settings → Browser extension**. The desktop app takes the same `bb_…` token; it appears in that list like any other, and revoking it there signs the app out on its next request.
2. The settings window opens on first run. **Connect** checks the format, calls `GET /api/v1/me` with the token, and only then stores it. Where the OS offers a keychain, `src/config.js` stores it encrypted with `safeStorage`. Otherwise it is held in memory until quit.
3. Which site it talks to is chosen from a fixed list. Local development is on the list only when running from source (`app.isPackaged` is false).

## Saving

```
Ctrl+Alt+B (global), the tray icon, or a second launch of the app
  → main.js awaits the clipboard text (cut at 200,000 characters; an unreadable clipboard gives a blank form)
  → prefillFrom guesses the type: lone URL → link, shell line → command, code → snippet, else note
  → capture window opens, centred on the screen under the pointer
  → GET  /api/v1/collections           (picker; remembers the last one used)
  → POST /api/v1/ai/tags + /ai/description   (optional "✦ Suggest": both at once; tags merge in,
                                             the description fills the field if it's empty)
  → POST /api/v1/items                 → createItemForUser → lib/db createItem
```

- **Everything that touches the network runs in the main process.** The capture page calls named IPC handlers (`capture:collections`, `capture:suggest`, `capture:save`). The token never reaches a page, and `buildItemBody` rebuilds each request from known fields.
- **Type guessing is `desktop/src/guess.js`**, a copy of the extension's `lib.js`. There is no language picker: a snippet or command sent without `language` gets one detected on the server.
- **The window is reused.** Closing it hides it. Each time it's shown, the main process sends `capture:open` and the page resets the form from a fresh clipboard read.
- **Errors** reach the page as `{ ok: false, error, status }`. A `401` or `403` shows the "connect" panel again.

## Differences from the extension

| | Extension | Desktop |
|---|---|---|
| Source of the text | The page's selection, plus its heading, title and URL | The clipboard, nothing else, so no "Saved from …" description |
| Trigger | Browser shortcut, context menu | Global shortcut, tray icon |
| Language picker | Yes, pre-filled by `guessLanguage` | No; detected by the API |
| Install | ZIP from Settings | Build from `desktop/` |

## Constraints

- Text only. Files and images can't be created through the token API.
- The clipboard read is asynchronous in Electron 44 and must be awaited; see the [known limits](../../../desktop/README.md#known-limits).
- Unsigned builds and no auto-update ([known gaps](../../known-gaps/not-yet-built.md#roadmap)).

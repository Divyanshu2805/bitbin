# Save from the Desktop (tray app)

How the clipboard becomes a BitBin item without opening a browser. The app lives in [`desktop/`](../../../desktop/README.md). The server side is the [token API](../../api/token-api.md) the [browser extension](save-from-extension.md) uses, plus `POST /api/v1/files` for files and images.

## Installing and connecting

**Settings → Desktop app** links to the newest GitHub Release's `BitBin-Setup.exe` (Windows). A tag `desktop-v*` runs `.github/workflows/desktop-release.yml`, which tests, builds the unsigned installer and publishes it. macOS and Linux run from source (`npm start` in `desktop/`). There is no automatic update.

1. A Pro user creates a token in **Settings → Browser extension** with the *Save items* and *Save files and images* permissions. The desktop app takes the same `bb_…` token; it appears in that list like any other, and revoking it there signs the app out on its next request.
2. The settings window opens on first run. **Connect** checks the format, calls `GET /api/v1/me` with the token, and only then stores it. Where the OS offers a keychain, `src/config.js` stores it encrypted with `safeStorage`. Otherwise it is held in memory until quit.
3. Which site it talks to is chosen from a fixed list. Local development is on the list only when running from source (`app.isPackaged` is false).

## Saving

```
Ctrl+Alt+B (global), the tray icon, or a second launch of the app
  → main.js awaits the clipboard text (cut at 200,000 characters; an unreadable clipboard gives a blank form);
    with no text, a copied image becomes the attachment (PNG, `clipboard-<date>.png`)
  → prefillFrom guesses the type: lone URL → link, shell line → command, code → snippet, else note
  → capture window opens, centred on the screen under the pointer
  → GET  /api/v1/collections           (picker; remembers the last one used)
  → POST /api/v1/ai/tags + /ai/description   (optional "✦ Suggest": both at once; tags merge in,
                                             the description fills the field if it's empty)
  → POST /api/v1/items                 → createItemForUser → lib/db createItem
  → or, with a file attached (picker, drop, or the clipboard image):
    POST /api/v1/files (multipart)     → ingestFile (the web upload's checks) → createItemForUser
```

- **Everything that touches the network runs in the main process.** The capture page calls named IPC handlers (`capture:collections`, `capture:suggest`, `capture:save`, `capture:pick-file`, `capture:attach`). The token never reaches a page, and `buildItemBody` / `buildFileForm` rebuild each request from known fields.
- **A file's bytes stay in the main process.** The page is told only its name, type and size. A dropped file is read by the page (it has no path) and handed over once; the main process re-checks the extension and size (`src/files.js`, the server's rules capped at 4 MB) before holding it, and the server checks again.
- **Type guessing is `desktop/src/guess.js`**, a copy of the extension's `lib.js`. There is no language picker: a snippet or command sent without `language` gets one detected on the server.
- **The window is reused.** Closing it hides it. Each time it's shown, the main process sends `capture:open` and the page resets the form from a fresh clipboard read.
- **Errors** reach the page as `{ ok: false, error, status }`. A `401` or `403` shows the "connect" panel again.

## Differences from the extension

| | Extension | Desktop |
|---|---|---|
| Source of the text | The page's selection, plus its heading, title and URL | The clipboard, nothing else, so no "Saved from …" description |
| Trigger | Browser shortcut, context menu | Global shortcut, tray icon |
| Language picker | Yes, pre-filled by `guessLanguage` | No; detected by the API |
| Files and images | No | Yes: the file picker, a drop, or a copied screenshot |
| Install | ZIP from Settings | Installer from Settings (Windows); source elsewhere |

## Constraints

- Files and images stop at 4 MB, under the hosts' request-body limit of about 4.5 MB (the server's own caps are 5 MB for images, 10 MB for files).
- The clipboard read is asynchronous in Electron 44 and must be awaited; see the [known limits](../../../desktop/README.md#known-limits).
- Unsigned builds, so SmartScreen warns on first launch, and no auto-update.

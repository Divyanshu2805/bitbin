# Save from Anywhere (browser extension)

How a selection on any web page becomes a BitBin item. The extension lives in [`extension/`](../../../extension/README.md). The server side is the [token API](../../api/token-api.md), and the reasoning is in [ADR 0007](../decisions/0007-token-api-for-the-browser-extension.md).

## Installing

Until the extension is on the Chrome Web Store, users install it from BitBin:

1. **Settings → Browser extension → Download extension** calls `GET /api/extension/download` (Pro). It returns a ZIP built from `extension/` by `src/lib/extension-package.ts`, with the localhost entries removed in production.
2. The user unzips it, turns on Developer mode in `chrome://extensions`, and clicks **Load unpacked** on the `bitbin-extension` folder. On install, `background.js` opens the options page.
3. There are no automatic updates. After an extension change is deployed, users download again and replace the folder's contents, then click reload on the extension's card. Bump `version` in `manifest.json` with every extension change so the file name shows which one they have.

## Connecting

1. A user on Pro opens **Settings → Browser extension** (`components/settings/extension-settings.tsx`) and creates a token. The `createApiToken` action (`src/actions/api-tokens.ts`) checks Pro, allows at most 10 tokens, generates `bb_…` with `generateApiToken` (`src/lib/api-tokens.ts`), and stores only its SHA-256 hash and display prefix in `api_tokens`.
2. The token is shown once. The user pastes it into the extension's options page, which calls `GET /api/v1/me` to check it and saves it in `chrome.storage.local`.

## Saving

```
Ctrl+Shift+B (or the context menu)
  → popup.js reads the selection, page title and URL from the active tab (chrome.scripting)
  → guesses the type: lone URL → link, shell line → command, code → snippet, else note
  → GET  /api/v1/collections          (picker; remembers the last one used)
  → POST /api/v1/ai/tags              (optional, "✦ Suggest")
  → POST /api/v1/items                → createItemForUser → lib/db createItem
```

- The shortcut is the extension's `_execute_action` command, so it opens the popup directly. Users can change it at `chrome://extensions/shortcuts`.
- The context-menu entry (`background.js`) stores the selection in `chrome.storage.session`, then opens the popup. Where `chrome.action.openPopup` isn't available, it opens the popup in a small window instead. This also covers pages where scripts can't run, such as PDFs.
- **Title:** for snippets and commands, it's the nearest `h1`–`h3` above the selection, then the page title without the site name (`How to read a file - Stack Overflow` → `How to read a file`). A first line of code rarely makes a good name. Notes and prompts use their first line when it's short.
- **Language:** snippets get a language picker, pre-filled by `guessLanguage` in `lib.js`. Its values mirror `LANGUAGES` in `src/lib/constants/editor.ts`, so the app highlights the snippet correctly. Commands are saved as `bash`.
- For text types, the page URL is saved as the description (`Saved from …`). For links, it's the item's `url`.

## On the server

Each `/api/v1` request goes through `authenticateApiRequest` (`src/lib/api-auth.ts`):

1. Read `Authorization: Bearer bb_…`, or return `401`.
2. Hash it and look it up (`findApiTokenByHash`), or return `401`.
3. Check the owner's `isPro` from that same query, or return `403`.
4. Apply the `api` rate limit (60 a minute per user), or return `429`.
5. Update `lastUsedAt` if it's more than a minute old (best effort).

After that, the handler works with the token owner's id exactly as an action works with the session's.

## Revoking and downgrades

- **Revoke** in Settings deletes the row, and the next request gets `401`. Revoking works on any plan.
- **Cancelling Pro** doesn't delete tokens, but every request returns `403` until the user is Pro again.
- **Deleting the account** cascades to its tokens.

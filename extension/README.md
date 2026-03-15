# BitBin browser extension

Save selected text from any page to BitBin with a shortcut. Chrome and Edge, Manifest V3. Requires BitBin Pro.

Plain JavaScript with no build step. The folder is excluded from the Next app's TypeScript, ESLint and Vitest config.

| File | Does |
|---|---|
| `manifest.json` | Permissions, the `Ctrl+Shift+B` / `⌘+Shift+B` shortcut (`_execute_action`), host permissions for the live site and `localhost:3000` |
| `popup.html` / `popup.js` | Reads the selection and the heading above it, guesses the type (and the language for snippets), collection picker, tags, AI tag suggestions, save |
| `options.html` / `options.js` | Site (production or local) and API token; checks the token with `/api/v1/me` |
| `background.js` | The "Save selection to BitBin" context-menu entry |
| `lib.js` | Settings storage, the API client, type, language and title guessing. `LANGUAGES` mirrors `src/lib/constants/editor.ts`, so keep the two in sync |
| `styles.css`, `icons/` | Graphite and lime, matching the app |

## How users install it

Pro users download it from **Settings → Browser extension → Download extension** (`GET /api/extension/download`). The ZIP is built from this folder at runtime, without this README, and in production without the localhost entries. They unzip it and load the `bitbin-extension` folder unpacked. The same steps are shown next to the button.

**When you change the extension**, bump `version` in `manifest.json`. The download's file name comes from it, and it's how users tell whether they have the latest.

## Load it locally

1. Open `chrome://extensions` (or `edge://extensions`) and turn on **Developer mode**.
2. Click **Load unpacked** and choose this `extension/` folder. The options page opens.
3. In BitBin (as a Pro user), go to **Settings → Browser extension**, create a token and copy it.
4. In the options page, pick the site (use **Local development** with `npm run dev`), paste the token and click **Save and test**.
5. Select text on any page and press **Ctrl+Shift+B**, or right-click it and choose **Save selection to BitBin**.

After editing a file, click the reload icon on the extension's card in `chrome://extensions`.

## Shortcut

The suggested key is `Ctrl+Shift+B` (`⌘+Shift+B` on macOS). Chrome also uses that key to show or hide the bookmarks bar. If Chrome doesn't assign it, or another extension already has it, the options page shows "not set". Pick a key at `chrome://extensions/shortcuts`.

## API

It talks only to the [token API](../docs/api/token-api.md) (`/api/v1/me`, `/collections`, `/items`, `/ai/tags`) with `Authorization: Bearer bb_…`. The token is kept in `chrome.storage.local` on this device.

## Adding another site

`host_permissions` lists the sites the extension may call. To use another deployment, add its origin there and to `BASE_URLS` in `lib.js`.

## Publishing

Not on the stores yet; users download it from Settings (above). To publish on the Chrome Web Store: zip this folder's contents, pay the one-time developer fee, and submit it for review. Remove `http://localhost:3000/*` from `host_permissions` and the local option from `BASE_URLS` before submitting.

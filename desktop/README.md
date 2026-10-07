# BitBin desktop

A tray app for Windows, macOS and Linux. Press a system-wide shortcut (`Ctrl+Alt+B`, `⌘⌥B` on macOS) and the clipboard opens in a small window, ready to save as a BitBin item: text becomes a snippet, command, note or link, and a copied screenshot or an attached file becomes an image or file item. Requires BitBin Pro.

Electron, plain JavaScript (CommonJS), no build step. The folder has its own `package.json` and is excluded from the Next app's TypeScript and ESLint config, and from Vitest. It talks only to the [token API](../docs/api/token-api.md).

| File | Does |
|---|---|
| `main.js` | The tray icon and menu, the global shortcut, the two windows, the `bitbin-app://` protocol that serves `renderer/`, and every IPC handler |
| `preload.js` | The only bridge to the pages: named calls on `window.bitbin`, never `ipcRenderer` or the token |
| `src/api.js` | The token API client (`Authorization: Bearer`, no cookies, no redirects, 20 s timeout) and the request-body builders that pass on only known fields |
| `src/config.js` | Settings in `config.json` under the user-data folder. The token is encrypted with Electron `safeStorage` (DPAPI, Keychain, libsecret); with no keychain it lives in memory until quit |
| `src/files.js` | Which files can be attached (the server's extension and size rules, capped at 4 MB because hosts refuse larger request bodies), the multipart form for `POST /api/v1/files`, and the clipboard-image file name |
| `src/guess.js` | Type and title guessing for the clipboard text. Mirrors `extension/lib.js`; keep the two in sync. No language guessing here: the API detects it for snippets and commands |
| `renderer/` | `capture.html` / `capture.js` (the save window), `settings.html` / `settings.js` (a two-column window that sizes itself to its content), shared `styles.css` (the website's graphite and lime tokens, thin scrollbars), `fonts/` (Geist and JetBrains Mono, copied from `src/app/fonts`; recopy if the website's change) |
| `assets/` | `icon.png` and the tray icons, rendered from `src/app/icon.svg` |

## Run it

```bash
cd desktop
npm install
npm start
```

If Electron's binary didn't download during `npm install`, run `node node_modules/electron/install.js`.

1. In BitBin (as a Pro user), go to **Settings → Browser extension** and create a token with the **Save items** and **Save files and images** permissions (a token created before the second one existed can't upload; create a new one).
2. The settings window opens on first run. Paste the token and click **Connect** (pick **Local development** with `npm run dev`; that option exists only when running from source).
3. Copy some text, or a screenshot, anywhere and press `Ctrl+Alt+B`, or click the tray icon. To save a file, click **Attach a file or image** in the window or drop a file on it.

The tray menu has **Save clipboard to BitBin**, **New item** (a blank form), **Open BitBin**, **Settings**, **Start at login** (installed build only) and **Quit**. Closing a window hides it; the app keeps running in the tray. Starting BitBin a second time opens the capture window instead of a second app.

## Test it

```bash
npm test
```

Runs the `node:test` suites in `src/` (type guessing, the API client and body builders, the config store). The windows, tray and shortcut aren't unit-tested: run the app and try them.

## Package it

```bash
npm run pack   # unpacked app in dist/
npm run dist   # installer: NSIS on Windows, DMG on macOS, AppImage on Linux
```

`npm run dist` writes `dist/BitBin-Setup.exe` (about 110 MB; a one-click, per-user NSIS installer, no admin rights needed; the name has no version so `releases/latest/download/BitBin-Setup.exe` always points at the newest) and the unpacked app in `dist/win-unpacked/`. `dist/` is git-ignored. A packaged build offers only the production site, and enables **Start at login**. Verified on Windows 11; the macOS and Linux targets haven't been built.

Builds are unsigned, so Windows SmartScreen and macOS Gatekeeper warn on first launch (Settings tells people to choose More info, then Run anyway). There is no auto-update: users install a new build over the old one.

### Releasing

BitBin's **Settings → Desktop app** links to the newest GitHub Release. To publish one, bump `version` in `package.json` (the settings window shows it), commit, then push a tag:

```bash
git tag desktop-v0.2.0 && git push origin desktop-v0.2.0
```

`.github/workflows/desktop-release.yml` runs the tests, builds the Windows installer on a Windows runner and attaches `BitBin-Setup.exe` to a new release. Only Windows is built there; macOS and Linux run from source.

## Security notes

- The token stays in the main process. Pages call named IPC handlers that return `{ ok, data }` or `{ ok: false, error, status }`, and handlers answer only frames loaded from `bitbin-app://app/`.
- Pages run with `contextIsolation`, `sandbox` and no Node, under a CSP that allows only their own scripts and styles. They can't navigate or open windows.
- `settings:connect` accepts only a site from the offered list and a token shaped like `bb_…`, and checks it with `GET /api/v1/me` before storing it.
- Request bodies are rebuilt from known fields in the main process, so a page can't send anything else to the API.
- "Open BitBin" always opens the configured site's `/dashboard` or `/settings`, nothing else.

## Known limits

- Electron 44's clipboard API is promise-based (`await clipboard.readText()`). Calling it as if it returned a string throws in the main process, and an uncaught error there opens a modal dialog that freezes the whole tray. `main.js` awaits it, falls back to an empty form if the read fails, and logs uncaught errors instead of showing that dialog.
- The classifier is the extension's, so it has its quirks: three lines starting with `export` read as a shell command, not a snippet.
- Windows may refuse a shortcut another app already holds; the settings window reports it and keeps the old one.
- Files and images go through `POST /api/v1/files` and stop at 4 MB (the server allows 5 MB for images and 10 MB for files, but hosts refuse request bodies over about 4.5 MB). A copied image is saved as a PNG; only the first dropped file is attached.
- No automatic updates, and the builds aren't signed. Only a Windows installer is published.

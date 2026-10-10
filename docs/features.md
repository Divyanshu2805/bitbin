# Features

Everything BitBin does for the person using it, by area, with the limits that apply. How each feature is built is in the [architecture](architecture/README.md) and [API reference](api/README.md); the measured figures are on [project metrics](metrics.md).

## Plans

| | Free | Pro ($8 / month or $72 / year) |
|---|---|---|
| Items | 50 | Unlimited |
| Collections | 3 | Unlimited |
| Snippets, prompts, commands, notes, links | ✓ | ✓ |
| Files (10 MB) and images (5 MB) | | ✓ |
| AI helpers (20 requests an hour) | | ✓ |
| API tokens, browser extension, desktop app | | ✓ |
| ⌘K search, tags, favorites, pins, tag management | ✓ | ✓ |
| JSON export and import | ✓ | ✓ |
| ZIP export and import (with files) | | ✓ |

Every limit is enforced on the server; the interface only mirrors it. Payments go through Stripe Checkout, and the subscription is managed in the Stripe Customer Portal. The live site runs Stripe in test mode, so the card `4242 4242 4242 4242` upgrades an account and no money moves.

## Items

Seven item types, each with its own page (`/items/snippets`, `/items/prompts`, …), icon and colour:

| Type | Holds | Editor |
|---|---|---|
| Snippet | Code | Monaco, with a language for highlighting |
| Prompt | AI prompts and templates | Markdown with a GitHub-flavoured preview |
| Command | Shell commands and scripts | Monaco |
| Note | Notes and reference material | Markdown |
| File (Pro) | PDF, TXT, MD, JSON, YAML, XML, CSV, TOML, INI, up to 10 MB | Upload, with a PDF or text preview |
| Image (Pro) | PNG, JPEG, GIF, WebP, SVG, up to 5 MB | Upload, with an image viewer |
| Link | A URL | URL field |

- **Every item** has a title (200 characters), an optional description (1,000), up to 20 tags of 50 characters, any number of collections, and a favorite and a pinned flag. Text content holds up to 500,000 characters.
- **Language detection.** Pasting code into a snippet or command picks its language (31 languages, plus plain text, in the picker); one saved without a language gets one detected on the server.
- **The drawer** opens any item from a card, a row or a search result: content on the left, tags, collections and dates on the right. It edits in place, copies content or description, goes full screen with `M` (always full screen on phones), and saves with `⌘S`.
- **Cards and rows.** Grid or list view, remembered per browser. Pinned items come first on every list, then the most recently edited. Lists are paginated 21 to a page.
- **Drag and drop.** Drag an item card or row onto a collection in the sidebar, or onto a collection card, to add it there.
- **Copy** buttons on every card copy the content or URL.

## Collections

- Named groups of items, with an optional description. An item can be in many collections, and deleting a collection keeps its items.
- **Favorite** a collection to keep it in the sidebar; **pin** it to list it first.
- A collection's colour is the colour of its most common item type, so it changes with its contents.
- The collection page shows items as cards, images as thumbnails and files as rows.
- **Export one collection** as JSON (anyone) or ZIP with its files (Pro), from the collection's ⋯ menu.

## Search

- <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>K</kbd> or <kbd>/</kbd> opens the palette from anywhere in the app. It searches titles, content, descriptions, URLs and tags as you type, on the server, so something saved a second ago is found.
- Title matches come first, then the most recently edited. `#react` searches tags only. With nothing typed, it shows the latest items and collections.
- Up to 20 items and 8 collections per search; choosing an item opens it in the drawer.

## Tags

- Tags are added in the item forms, suggested by AI (Pro), or saved from the extension and the desktop app.
- **Settings → Tags** lists every tag with how many items carry it. Renaming a tag to one that already exists merges the two; deleting a tag removes it from your items and keeps the items.

## AI helpers (Pro)

| Helper | Where | Result |
|---|---|---|
| Suggest tags | Item forms, the extension and the desktop app (✦ Suggest) | 3–5 lowercase tags to accept or dismiss one by one |
| Generate description | The description field | One or two sentences |
| Explain this code | Snippets and commands, in the drawer | A markdown explanation beside the code, kept in the browser for next time |
| Optimize prompt | Prompts, in the drawer | A rewritten prompt to accept or discard |

The first 2,000 characters of an item are sent. Any OpenAI-compatible provider works; the default model is `gpt-5-nano`.

## Save from anywhere (Pro)

Two companion apps save into BitBin without opening it, through the [token API](api/token-api.md).

| | Browser extension | Desktop tray app |
|---|---|---|
| Platform | Chrome and Edge (Manifest V3) | Windows installer; macOS and Linux from source (Electron) |
| Trigger | <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>B</kbd>, or right-click → *Save selection to BitBin* | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>B</kbd> from any app, or the tray icon |
| Saves | The selected text, titled from the page's heading, with a link back | The clipboard (text or a copied image), or an attached file |
| Types | Snippet, command, note, prompt or link, guessed from the text | The same, plus files and images |
| Extras | Collection picker, tags, language picker, ✦ Suggest | Collection picker, tags, ✦ Suggest, start at login, a changeable shortcut |
| Install | Download from **Settings → Browser extension**, load unpacked | Download from **Settings → Desktop app**, or run from [`desktop/`](../desktop/README.md) |

**API tokens** (Settings → Browser extension) connect them: `bb_…` tokens shown once, stored hashed, expiring after 30, 90 or 365 days, revocable, at most 10 per account, and limited to the permissions chosen when they are made: *List collections*, *Save items*, *Save files and images* and *AI suggestions*.

## Import and export

| | Format | Plan |
|---|---|---|
| Export the library | JSON: every item and collection, portable between accounts | Free and Pro |
| | ZIP: the JSON, the text items as readable files (`snippets/`, `prompts/`, `commands/`, `notes/`, `links.md`) and every uploaded file | Pro |
| Export one collection | The same two formats, for that collection and its items | Free (JSON), Pro (ZIP) |
| Import | A JSON export (up to 5,000 entries) | Free and Pro |
| | A ZIP export, files included (up to 4 MB and 100 files) | Pro |

An import shows a preview first (counts by type, collections, tags), can skip items you already have, keeps the original dates, and either completes or changes nothing. Free plan limits apply to imports too.

## Accounts

- **Sign in** with email and password (verified by email) or GitHub. A GitHub sign-in for an email that already has a password account is refused rather than linked.
- **Password reset** by email (the link lasts an hour and works once). **Change password** in Settings signs out every device.
- **Sign out everywhere** ends every session on every device. Sessions otherwise last 14 days.
- **Profile** shows usage by type and lets you rename yourself in place.
- **Delete account** cancels the subscription, deletes every uploaded file, then the account and everything in it.
- **Editor preferences**: font size, tab size, word wrap, minimap and theme (`vs-dark`, `monokai`, `github-dark`; the light app theme uses `github-light`).

## The demo account

`demo@bitbin.dev` / `12345678` signs anyone straight in as a Free user with a sample library (three collections, eighteen items). It is shared, so it can't change its password, name or plan, delete itself, save links, save items over 5,000 characters, or import, and its library is restored every day at 21:00 UTC.

## Interface

- Dark "graphite and lime" theme by default, light theme available. Light-theme contrast is checked against WCAG AA by a test.
- A collapsible sidebar (`[`) with the seven types, favorite and recent collections, and a usage meter for Free accounts; a sheet on phones.
- Page slides between routes, scroll reveals on the homepage, and motion that turns off under `prefers-reduced-motion`.
- Works at phone width with no horizontal scroll; every control is reachable by keyboard.

### Keyboard shortcuts

`?` shows them all in the app.

| Keys | Action |
|---|---|
| <kbd>⌘</kbd> <kbd>K</kbd>, <kbd>/</kbd> | Search |
| <kbd>N</kbd> | New item (of the page's type on a type page) |
| <kbd>C</kbd> | New collection |
| <kbd>[</kbd> | Collapse or expand the sidebar |
| <kbd>G</kbd> then <kbd>D</kbd> / <kbd>F</kbd> / <kbd>C</kbd> / <kbd>P</kbd> / <kbd>S</kbd> / <kbd>U</kbd> | Dashboard, favorites, collections, profile, settings, upgrade |
| <kbd>1</kbd> – <kbd>7</kbd> | A type's page |
| <kbd>E</kbd> / <kbd>F</kbd> / <kbd>P</kbd> / <kbd>M</kbd> / <kbd>⌫</kbd> | With an item open: edit, favorite, pin, full screen, delete |
| <kbd>⌘</kbd> <kbd>S</kbd> | Save while editing |
| <kbd>E</kbd> | On a collection page: edit the collection |

## Public pages

The homepage, sign-in and registration pages, and the [Privacy Policy](https://bitbin.divyanshuagrahari.dev/privacy) and [Terms of Service](https://bitbin.divyanshuagrahari.dev/terms). `robots.txt`, a sitemap, Open Graph and Twitter preview images and icons are generated from `src/lib/site.ts`; signed-in pages are kept out of search engines.

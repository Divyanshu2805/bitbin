# App Behavior

Things that look like bugs but are intended — or at least known and accepted.

| You see | Why |
|---|---|
| Another user's item id returns `404` / "Item not found or access denied" | Deliberate: a row that isn't yours is reported exactly like a missing one, so ids can't be probed |
| "Forgot password" says a link was sent for an email that has no account | Deliberate: the response never reveals whether an account exists |
| GitHub sign-in fails with `OAuthAccountNotLinked` | That email already has a password account; BitBin doesn't link the two. Sign in with the password |
| A user who just paid is still Free for a moment | `isPro` only changes when the webhook arrives. The next request after that sees Pro |
| ⌘K search doesn't find "dbnc" for "debounce" | It is a substring match on the server, not fuzzy matching; title matches come first, then the most recently edited |
| An image URL from the database returns `403` when opened directly | Deliberate: the bucket is private. Files are only readable through `/api/download/…` by their signed-in owner |
| Tags differ only by case (`React`, `react`) | Tag names are case-sensitive; AI-suggested tags are lowercased, typed ones aren't |
| Importing the same export twice duplicates items | Only when **Skip duplicates** is off. With it on, items matching on title, type and content (a link's URL, a file's name) are skipped |
| A JSON import into another account brings file items without their files | A JSON export only names files; an account can't point at another account's storage. Import the ZIP export (Pro) to bring the files too |
| Renaming a tag to an existing name merged them | Deliberate: an item that had both keeps one, and the old tag disappears |
| An import stops part-way through a Free account's items | Free limits apply to imports; the result reports how many were skipped |
| Imported file and image items for a Free user are missing | They're skipped — files and images are Pro |
| Rate limits don't apply locally | Without the `UPSTASH_*` variables, rate limiting is off in development (in production a weaker in-memory limiter takes over) |
| An API token stops working with `401` | It expired: tokens last 30, 90 or 365 days. Create a new one in **Settings → Browser extension** |
| The extension's ✦ Suggest or the desktop app's attach button answers with a permission error | The token was created without that permission (*AI suggestions*, *Save files and images*) |
| You can't change the demo account's password or name, delete it or upgrade it | It's the public demo account (`demo@bitbin.dev`): its login is published, so the account itself is locked, and a daily job puts its library back to the seeded one |
| Registering an email that's already taken looks like it worked | Deliberate: the answer is the same for every address so it can't reveal who has an account. No email arrives for a verified account; an unverified one gets a new verification email and the newly chosen password |
| Changing your password signs you out | Deliberate: it bumps `sessionVersion`, which ends every session, this one included |
| A Pro user gets "already subscribed" starting a checkout | Deliberate: checkout answers `409` for a Pro user so they can't be billed twice |
| An upload is refused although the type looks right | The bytes are checked against the extension (a `.png` must be a PNG, a `.svg` can't hold script) |
| Deleting a collection keeps its items | Collections are groupings; items belong to the user, not the collection |
| Only test cards work when upgrading on the live site | Production runs on Stripe test-mode keys until the account can go live — see [Stripe test mode in production](../deployment/providers.md#stripe-test-mode-in-production) |
| `stripe trigger checkout.session.completed` changes nothing | Deliberate: the generated session has no `metadata.app = "bitbin"` tag, so the webhook answers `200` and skips it |
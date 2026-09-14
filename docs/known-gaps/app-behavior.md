# App Behavior

Things that look like bugs but are intended — or at least known and accepted.

| You see | Why |
|---|---|
| Another user's item id returns `404` / "Item not found or access denied" | Deliberate: a row that isn't yours is reported exactly like a missing one, so ids can't be probed |
| "Forgot password" says a link was sent for an email that has no account | Deliberate: the response never reveals whether an account exists |
| GitHub sign-in fails with `OAuthAccountNotLinked` | That email already has a password account; BitBin doesn't link the two. Sign in with the password |
| A user who just paid is still Free for a moment | `isPro` only changes when the webhook arrives. The next request after that sees Pro |
| A new item doesn't show in ⌘K search | The index is loaded once per page load — [search](../architecture/flows/search.md#limitations) |
| An image opens without signing in | The R2 bucket is public; the download proxy's owner check only applies to downloads through BitBin |
| Tags differ only by case (`React`, `react`) | Tag names are case-sensitive; AI-suggested tags are lowercased, typed ones aren't |
| Importing the same export twice duplicates items | Only when **Skip duplicates** is off. With it on, items matching on title, type and content (or URL) are skipped |
| An import stops part-way through a Free account's items | Free limits apply to imports; the result reports how many were skipped |
| Imported file and image items for a Free user are missing | They're skipped — files and images are Pro |
| Rate limits don't apply locally | Without the `UPSTASH_*` variables, rate limiting is disabled (fails open) |
| Deleting a collection keeps its items | Collections are groupings; items belong to the user, not the collection |
| Only test cards work when upgrading on the live site | Production runs on Stripe test-mode keys until the account can go live — [known gaps](not-yet-built.md#accounts-and-billing) |
| Verification emails reach you but nobody else | `FROM_EMAIL` is unset, so Resend's sandbox sender is used; it only delivers to the Resend account owner |
| `stripe trigger checkout.session.completed` changes nothing | Deliberate: the generated session has no `metadata.app = "bitbin"` tag, so the webhook answers `200` and skips it |
| Registration works without email and sign-in is immediate | `SKIP_EMAIL_VERIFICATION="true"` — a development setting that must be off in production |

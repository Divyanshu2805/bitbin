# Tooling and CI Pitfalls

## The coverage report is generated, so lint must ignore it

`npm run test:coverage` writes `coverage/` (git-ignored), including JavaScript that ESLint would flag. `eslint.config.mjs` lists `coverage/**` in its ignores. Without that, running lint after the tests locally shows warnings that CI, which starts clean, never would.

## The coverage floor measures server code only

`vitest.config.ts` includes `src/actions`, `src/lib` and `src/app/api`. Adding a file there that no test imports lowers the percentage and can fail CI even though no test broke: write its tests in the same change. Don't widen the `include` to components without tests for them, and don't lower the thresholds to get a change through.

## CI builds with placeholder variables

The workflow gives `npm run build` dummy values (`DATABASE_URL`, `AUTH_SECRET`, the Stripe, Resend and OpenAI keys). The build only needs them to exist: nothing contacts a service at build time and every test mocks its dependencies. A new environment variable read at **module load** (not inside a function) needs a placeholder in `.github/workflows/ci.yml`, or the build fails in CI while working locally.

## The audit fails on high and critical only

`npm audit --omit=dev --audit-level=high` runs on every push. A new *moderate* advisory is reported in the log but doesn't fail the run; a high or critical one in a production dependency does. Fix it by upgrading, not by loosening the level. Full `npm audit` (without `--omit=dev`) still lists advisories in development tooling that npm can only "fix" with a downgrade; they don't ship.

## `.npmrc` sets `legacy-peer-deps`

`@vercel/analytics` declares a non-optional `nuxt` peer the app never uses, and a plain install would pull in about 440 packages for it. `.npmrc` sets `legacy-peer-deps=true`, and both Vercel and `npm ci` in CI honour it. Removing the setting brings the tree, and its audit findings, back.

## Line endings churn the lockfile

`package-lock.json` is committed with CRLF line endings. npm rewrites it with the platform's endings, so `npm install` on a machine that disagrees shows thousands of changed lines in `git diff` for a one-line change. Check `git diff --stat` after installing a package; if the whole file changed, convert it back to the repository's endings before committing.

## CI doesn't gate the deploy

Vercel builds every push to `main` on its own. A red CI run doesn't stop that deploy, so treat a failure as something to fix at once, not something that was prevented. See [ADR 0009](../../architecture/decisions/0009-ci-checks-and-a-coverage-floor.md).

## Lighthouse numbers need a production build

Measure with `npm run build && npm run start`, not `npm run dev`: the dev server is unminified and slow, and its numbers say little. Locally the Vercel analytics script doesn't exist, so "best practices" shows one console error that won't appear in production. To audit signed-in pages, sign in first and pass the `authjs.session-token` cookie to the audit.

## File-name case only matters on Vercel

Windows and macOS file systems ignore case, Vercel's Linux build doesn't. An import of `./AiSection` for a file named `AISection.tsx` works locally and breaks the production build (it has happened once). After renaming a file, check the import paths, and use `git mv` so Git records the new case.

## Vercel refuses request bodies over about 4.5 MB

A serverless function never sees a larger request; the platform answers `413` first. That is why a ZIP import stops at 4 MB (`MAX_IMPORT_ZIP_BYTES`) and the desktop app at 4 MB per file. The web uploader posts to a function too, so on Vercel a file between about 4.5 MB and the 10 MB the upload rules allow is refused by the platform before BitBin's own checks run (it is listed in [constraints](../../known-gaps/constraints-and-trade-offs.md#storage)). Moving more bytes needs a direct-to-storage upload with a presigned URL, not a bigger limit in the code.

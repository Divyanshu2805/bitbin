# Results

## Search and paging on a million items

Measured on a local PostgreSQL container holding 1,000,000 synthetic items across 181 accounts: one account with 100,000 items (40,003 of them snippets) and 180 with 5,000 each. Item text is random words, about 30% common programming words. Each query ran inside `EXPLAIN ANALYZE`, one warm-up and then the median of 9, and every before and after pair was checked to return the same rows.

| What improved | From | To | What changed |
|---|---|---|---|
| Search for a rare word, 100K-item account | 311 ms | 0.11 ms | Search split so the trigram indexes serve it |
| Search by tag name, 100K-item account | 344 ms | 33 ms | Same |
| Search for a common word, 100K-item account | 351 ms | 189 ms | Same |
| Snippets list, page 90% deep, 100K-item account | 45.6 ms | 9.3 ms | Cursor pages instead of `OFFSET` |

### Round one: cursor pages and indexed search

Database execution time.

| Account | Query | Before | After |
|---|---|---|---|
| 100K | Snippets list, 90% deep | 45.63 ms | 9.26 ms |
| 100K | Snippets list, 50% deep | 40.41 ms | 18.03 ms |
| 100K | Snippets list, page 1 | 19.84 ms | 19.90 ms |
| 100K | Search, rare word (5 matches) | 310.70 ms | 0.11 ms |
| 100K | Search, tag name | 344.03 ms | 32.95 ms |
| 100K | Search, common word (15,106 matches) | 351.16 ms | 188.92 ms |
| 5K | Snippets list, 90% deep | 2.26 ms | 0.59 ms |
| 5K | Search, rare word | 17.74 ms | 0.17 ms |
| 5K | Search, common word | 20.83 ms | 10.78 ms |

Tag-name search in a 5,000-item account went from 20.76 to 34.80 ms in this round. The second round looks the matching tags up first, which brought it to 12.6 ms.

### Round two: an index in list order, tags looked up first

Time through the app's own query functions, Prisma included, same data.

| Account | Query | Before | After |
|---|---|---|---|
| 100K | Snippets, page 1 | 30.15 ms | 5.52 ms |
| 100K | Snippets, next page 90% down | 18.76 ms | 4.04 ms |
| 100K | Snippets, previous page 90% down | 32.62 ms | 3.84 ms |
| 100K | Search, common word | 207.44 ms | 117.22 ms |
| 100K | Search, one letter | 382.78 ms | 323.99 ms |
| 5K | Search, tag name | 37.39 ms | 12.57 ms |
| 5K | Search, one letter | 34.84 ms | 10.16 ms |

Whole lists were walked forward and back with both versions, and the two outputs were byte-identical.

## Tests

| Suite | Count |
|---|---|
| Vitest (actions, library code, every route handler) | 1,007 tests in 83 files |
| Desktop app (`node:test`) | 46 |

Coverage over `src/actions`, `src/lib` and `src/app/api`: 85.9% statements, 86.0% branches, 86.0% lines, 76.9% functions. CI fails below 80 / 80 / 80 / 70.

## Lighthouse

Production build, signed-in pages measured with a demo session.

| | |
|---|---|
| Accessibility | 100 on all 12 pages measured |
| SEO | 100 |
| Best practices | 96 (the Vercel analytics script is absent on localhost) |
| Performance | 80 to 95, on localhost with simulated throttling |

No page scrolls sideways at 375 px, and the theme's colours are held to WCAG AA contrast by a test.

## Security

| | |
|---|---|
| Production dependency vulnerabilities | 0 (`npm audit --omit=dev`) |
| Third-party scripts allowed in a page | 0 |
| Public objects in file storage | 0 |
| Photo metadata kept after upload | None |

# Changelog

## 1.0.0 — 2026-03-08

First public release of BitBin.

### Features
- Seven item types: snippets, prompts, commands, notes, files, images, links
- Collections with many-to-many item membership, favorites and dominant colors
- Pinned and favorite items, tags, pagination
- Monaco code editor and GFM markdown editor with per-user editor preferences
- ⌘K command palette search across items and collections
- Email/password + GitHub auth, email verification, password reset
- Rate limiting on auth, uploads and AI (Upstash)
- File and image uploads on Cloudflare R2 (Pro)
- AI auto-tagging, descriptions, code explanation and prompt optimizer (Pro)
- Stripe subscriptions with checkout, customer portal and webhooks
- JSON export/import, ZIP export with files (Pro)

### Design
- New "graphite + lime" dark theme with Manrope / Space Grotesk / JetBrains Mono
- BitBin logo mark and favicon
- Redesigned homepage: before/after hero, item marquee, bento feature grid,
  animated pricing card
- Split-screen auth pages with an animated terminal showcase
- Shared sidebar navigation for desktop and mobile, with an Overview section
- Animated stat counters, card hover states, staggered list entrances,
  shimmer skeletons, empty states and a custom 404 page
- Respects `prefers-reduced-motion`

### Docs
- Full documentation set in `docs/`

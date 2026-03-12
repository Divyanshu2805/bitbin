# Changelog

## 1.0.1 — 2026-03-12

Fixes found while deploying to https://bitbin.divyanshuagrahari.dev.

### Fixed
- GitHub sign-in failed with `unexpected "iss" (issuer)`; the GitHub provider
  now sets GitHub's issuer explicitly
- Verification emails were sent from an unverified domain; the sender is now
  configurable with `FROM_EMAIL` and defaults to Resend's sandbox sender
- Leftover `.env.example` placeholders or an invalid Upstash URL crashed
  registration; rate limiting now fails open in both cases
- Checkouts from other apps sharing a Stripe account made the webhook return
  500; BitBin now tags its own checkouts and skips the rest

### Added
- Support for OpenAI-compatible AI providers such as OpenRouter
  (`OPENAI_BASE_URL`, `AI_MODEL`)
- Tests for rate limiting without a usable Upstash config

### Docs
- Custom-domain deployment guide (Vercel, Cloudflare DNS, Resend domain)
- New environment variables, filtered Stripe webhook forwarding
- Known gaps and roadmap

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

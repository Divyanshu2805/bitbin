# Security Policy

## Reporting a vulnerability

Please **don't open a public issue** for a security problem. Report it privately through GitHub's [security advisories](https://github.com/Divyanshu2805/bitbin/security/advisories/new) for this repository, with:

- what the issue is and where (route, action or file),
- how to reproduce it,
- what an attacker could do with it.

You'll get an acknowledgement within a few days. Please give a reasonable window for a fix before disclosing publicly.

## Scope

In scope: the BitBin application in this repository — authentication and sessions, access to other users' items, collections or files, plan and rate-limit bypasses, the Stripe webhook, and anything that leaks secrets.

Out of scope: vulnerabilities in the hosted providers themselves (Vercel, Neon, Cloudflare, Stripe, Upstash, Resend, OpenAI, GitHub), and denial of service through volume.

## Known issues

Weaknesses already identified are listed under [security in known gaps](docs/known-gaps/not-yet-built.md#security) — no need to report those, though fixes are welcome.

## How BitBin is secured

The [security model](docs/architecture/security-model.md) describes tenancy, sessions, what protects each route, plan enforcement and secrets; the [security guardrails](docs/README.md) are the rules changes must keep.

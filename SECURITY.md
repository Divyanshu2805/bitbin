# Security Policy

## Reporting a vulnerability

Please **don't open a public issue** for a security problem. Report it privately through GitHub: on the repository's **Security** tab, choose **Report a vulnerability**.

Include what you found, how to reproduce it, and the impact you expect. You'll get an acknowledgement, and a fix or mitigation will be coordinated with you before any details are made public.

## Scope

In scope:

- this repository's code, including the browser extension (`extension/`) and the desktop app (`desktop/`);
- the live site at `bitbin.divyanshuagrahari.dev` and its token API (`/api/v1`).

Please don't run automated scanners or load tests against the live site, access other users' data, or disrupt the service. The shared demo account (`demo@bitbin.dev`) is public by design and reset daily; its published password is not a finding. The site uses Stripe test mode, so no real payments are processed.

## Security model

How BitBin isolates users' data, authenticates sessions and API tokens, protects files, and limits abuse is described in the [security model](docs/architecture/security-model.md). The rules every change must respect are in the [security guardrails](docs/practices/security-guardrails.md).

# Getting started

## Requirements

- Node.js 20+
- npm 10+
- A PostgreSQL database (a free [Neon](https://neon.tech) project works well)

Optional, depending on which features you want working locally:

- GitHub OAuth app (GitHub sign-in)
- Resend account (verification / reset emails)
- Upstash Redis (rate limiting)
- Cloudflare R2 bucket (file & image uploads)
- Stripe account in test mode (Pro upgrades)
- OpenAI API key (AI features)

## 1. Install

```bash
git clone https://github.com/Divyanshu2805/bitbin.git
cd bitbin
npm install
```

## 2. Configure

```bash
cp .env.example .env
```

At minimum set `DATABASE_URL` and `AUTH_SECRET` (`npx auth secret` prints one).
Keep `SKIP_EMAIL_VERIFICATION="true"` while developing so you can sign in
without a Resend key. The full list is in
[environment-variables.md](environment-variables.md).

## 3. Database

```bash
npx prisma migrate dev   # applies prisma/migrations and generates the client
npm run db:seed          # system item types + a demo account
```

The seed creates a demo user you can sign in with:

| Email | Password |
| --- | --- |
| `demo@bitbin.dev` | `12345678` |

> Never use `prisma db push` in this project. Schema changes go through
> migrations (`npm run db:migrate`). The `db:push` script is disabled on purpose.

## 4. Run

```bash
npm run dev
```

- Marketing page: <http://localhost:3000>
- Dashboard: <http://localhost:3000/dashboard> (requires sign-in)

## Useful scripts

```bash
npm run test        # unit tests
npm run lint        # eslint
npm run db:studio   # browse the database
npm run db:test     # quick connectivity check against DATABASE_URL
npm run db:cleanup  # remove all non-demo users (dev only)
```

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `PrismaClientInitializationError` | Check `DATABASE_URL`, make sure `?sslmode=require` is present for Neon |
| "Please verify your email" on sign-in | Set `SKIP_EMAIL_VERIFICATION="true"` or configure Resend |
| GitHub sign-in loops back to `/sign-in` | Callback URL in the GitHub app must be `http://localhost:3000/api/auth/callback/github` |
| Uploads fail with 500 | R2 variables missing, or the bucket has no public URL |
| AI buttons return an error | `OPENAI_API_KEY` missing, or the user isn't Pro |

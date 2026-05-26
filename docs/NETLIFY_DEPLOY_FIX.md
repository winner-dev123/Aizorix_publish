# Fixing "La IA no pudo responder" on Netlify

That message means the AI endpoint reached the server but `orchestrate()` threw.
On a fresh Netlify deploy the cause is almost always **the database**, then env vars.

## Root cause

`DATABASE_URL` was `postgresql://…@localhost:5433/…` — your local Docker Postgres.
Netlify functions run in the cloud and **cannot reach localhost**, so every Prisma
query fails. (`.env` is also never uploaded to Netlify — env vars live in the
dashboard.)

## What was fixed in code (already done)

- `prisma/schema.prisma` → added `binaryTargets = ["native","rhel-openssl-1.0.x","rhel-openssl-3.0.x"]` so Prisma's query engine loads on Netlify's Lambda runtime.
- `package.json` → `build` now runs `prisma generate && next build`.
- `netlify.toml` → added (Next.js runtime plugin, Node 20, build command).
- `/api/chat/landing` → set `DIAG_ERRORS=1` in Netlify env to see the real error in the response while debugging.

## What you must do (config — 4 steps)

### 1. Provision a hosted Postgres
Easiest free option: **Neon** (neon.tech) or **Supabase**. Create a database and
copy its connection string. Use the **pooled** URL (Neon: "Pooled connection";
Supabase: the `:6543` pgbouncer URL) so serverless doesn't exhaust connections.
It must include SSL, e.g.:

```
postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

### 2. Run migrations + seed against that DB (from your machine)

```bash
# point at the hosted DB just for these commands
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require" npx prisma migrate deploy
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require" npm run db:seed
```

The seed creates the demo clinic (`bellem`) the chat needs.

### 3. Set environment variables in Netlify
Site settings → Environment variables → add:

| Key | Value |
|---|---|
| `DATABASE_URL` | the hosted pooled URL from step 1 |
| `OPENAI_API_KEY` | your `sk-…` key |
| `AUTH_SECRET` | a random 32+ char string (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | `https://YOUR-SITE.netlify.app` |
| `DEMO_CLINIC_SLUG` | `bellem` (optional, makes clinic resolution explicit) |
| `DIAG_ERRORS` | `1` (optional, TEMPORARY — remove after debugging) |

### 4. Redeploy
Trigger a new deploy (clear cache). The build now runs `prisma generate` with the
Netlify binary target, and the functions connect to the hosted DB.

## Verify it works
- Open the site, talk to the AI bubble → you should get a real GPT reply.
- If it still fails with `DIAG_ERRORS=1`, the `detail` field in the response tells
  you exactly what's wrong:
  - `Can't reach database server` → DATABASE_URL wrong/not pooled/SSL missing.
  - `OPENAI_API_KEY is not set` → add the key in Netlify env.
  - `Query engine … could not be found` → redeploy with cache cleared (binaryTargets).
  - `No hay clínica de demo configurada` → run the seed (step 2).
- Remove `DIAG_ERRORS` once fixed.

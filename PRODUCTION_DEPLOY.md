# Aizorix — Production deployment guide

Checklist for taking Aizorix from `npm run dev` on a laptop to a live multi-tenant SaaS that answers real WhatsApp messages. Pair this with [HANDOFF.md](HANDOFF.md) for the architecture context.

> **Status today:** Phase 1-6 shipped locally. 89 vitest tests pass against a Docker Postgres. Sign-in works in dev via console-logged magic links. WhatsApp uses the in-process stub. **Nothing in this app has been deployed to production yet.** This doc is the punch list to do that.

---

## 1. What you're deploying

Three pieces, each with a separate decision:

| Piece | What it is | Sample choices |
|---|---|---|
| **Next.js app** | The server that handles `/app/*` dashboard, `/api/*` routes, and the WhatsApp webhook | Vercel · Fly.io · Railway · Render · self-hosted on a VPS |
| **Postgres database** | Multi-tenant data store. Same schema as dev (Prisma migrations are authoritative) | Supabase · Neon · Railway · Fly Postgres · self-hosted |
| **Email + WhatsApp providers** | Magic-link delivery + inbound/outbound WhatsApp | SMTP: SendGrid · Mailgun · Postmark · Resend. WhatsApp: Twilio |

Pick a hosting bundle that keeps Next.js and Postgres in the same region — the dashboard does heavy Prisma work per page render and cross-region latency stacks up.

---

## 2. Required env vars (production)

Every variable from `.env.example`, with prod-specific guidance. Set these in your host's secret manager — **never commit them**.

```env
# ---- Database ----
# Production Postgres connection string. SSL strongly recommended.
DATABASE_URL="postgresql://USER:PASS@HOST:5432/aizorix?schema=public&sslmode=require"

# ---- AI (OpenAI) — billed to the CLIENT's account, not yours ----
OPENAI_API_KEY="sk-proj-..."   # production key from the client's OpenAI account
OPENAI_MODEL="gpt-4.1-mini"    # don't bump models without re-running the orchestrate integration tests

# ---- NextAuth ----
# REQUIRED. Generate ONCE per environment and never rotate without invalidating sessions.
AUTH_SECRET="$(openssl rand -base64 32)"
# In production the dev fallback in src/auth.config.ts is disabled — if AUTH_SECRET
# is empty, /signin throws MissingSecret. This is intentional.

# Required when NODE_ENV=production so the proxy and Auth.js callbacks build
# absolute URLs correctly. Set it to your canonical https URL — NO trailing slash.
AUTH_URL="https://app.yourclinicdomain.com"
NEXTAUTH_URL="https://app.yourclinicdomain.com"   # belt-and-suspenders for older callsites

# ---- SMTP (magic-link email) ----
# REQUIRED in prod. If unset, sign-in succeeds but no email is sent and the
# user never gets the link.
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"                    # SendGrid uses literally "apikey"
SMTP_PASSWORD="SG.xxxxxx"             # SendGrid API key
EMAIL_FROM="no-reply@yourclinicdomain.com"   # MUST be a domain you control with SPF + DKIM configured

# ---- WhatsApp (Twilio) ----
# When all three are set, getWhatsAppProvider() returns TwilioWhatsAppProvider
# automatically. With any of them missing, you fall back to the stub — fine
# for staging, broken in prod.
TWILIO_ACCOUNT_SID="ACxxxxx"
TWILIO_AUTH_TOKEN="xxxxx"            # used to verify the X-Twilio-Signature header
TWILIO_WHATSAPP_FROM="whatsapp:+34911000000"

# ---- Tenant defaults (rarely changed in prod) ----
DEFAULT_CLINIC_SLUG="bellem"
DEFAULT_TIMEZONE="Europe/Madrid"

# ---- Node mode ----
NODE_ENV="production"
```

**`AUTH_SECRET` generation:** on any unix machine, `openssl rand -base64 32`. Save it in the host's secret manager. Anyone with this value can mint sessions; treat it like a database password.

---

## 3. External service setup

### 3.1 Postgres

1. Provision Postgres 16+ (the schema uses `EXTRACT(ISODOW …)` and other features the metrics queries depend on).
2. Apply migrations against the prod DB:
   ```bash
   DATABASE_URL="postgresql://..." npx prisma migrate deploy
   DATABASE_URL="postgresql://..." npx prisma generate
   ```
3. Seed the first tenant — but **edit `prisma/seed.ts` first** so the seeded `admin@bellem.demo` is replaced with the real owner email and the clinic name reflects the actual client. The seed is `upsert`-based and safe to re-run.
   ```bash
   DATABASE_URL="postgresql://..." npm run db:seed
   ```
4. Configure automatic backups (your host's snapshot feature, or a `pg_dump` cron to S3). The app does not back itself up.

### 3.2 SMTP

Pick one provider — Postmark and Resend have the cleanest deliverability for transactional emails like magic links.

1. Verify the **sending domain** (DNS records for SPF + DKIM + DMARC). Without this, magic-link emails will land in spam.
2. Get the SMTP host/port/credentials and fill the `SMTP_*` env vars.
3. Send yourself a test sign-in *before* onboarding a real clinic. The `[auth] Magic link for …` line still logs to stdout in prod — useful for the first smoke test.

### 3.3 Twilio (WhatsApp Business)

This is the longest piece — Twilio requires Meta business verification and a 1–3 day approval window for production WhatsApp senders. Plan accordingly.

1. **Twilio account** with a paid plan. Trial accounts can only message pre-approved numbers — useless for real clinics.
2. **Apply for WhatsApp Business through Twilio** (Console → Messaging → Senders → WhatsApp). Requires the clinic's Facebook Business Manager ID. Meta approves the brand + display name + category.
3. Once approved, you get a sender like `whatsapp:+34911000000`. Set that as `TWILIO_WHATSAPP_FROM` and also as `Clinic.whatsappNumber` for the relevant clinic row:
   ```bash
   psql $DATABASE_URL -c "UPDATE \"Clinic\" SET \"whatsappNumber\" = '+34911000000' WHERE slug = 'bellem';"
   ```
4. **Configure the inbound webhook** in the Twilio console → your WhatsApp sender → "When a message comes in" → POST `https://app.yourclinicdomain.com/api/webhooks/whatsapp` (content-type `application/x-www-form-urlencoded`).
5. The webhook handler verifies `X-Twilio-Signature` against `TWILIO_AUTH_TOKEN` automatically once the env var is set ([src/app/api/webhooks/whatsapp/route.ts:36-48](src/app/api/webhooks/whatsapp/route.ts#L36)). If signature verification fails, the request returns 403 and you'll see it in your logs.

### 3.4 OpenAI

1. The **client** creates their own OpenAI account and adds a billing method. The `OPENAI_API_KEY` is theirs — your role is only to plumb it in.
2. Warn the client: a brand-new OpenAI account often returns `insufficient_quota` (HTTP 429) for several hours after funding before the credits "stick" — set the billing first, then test.
3. Set a hard usage limit in OpenAI's dashboard for safety. A runaway loop in tool-use could otherwise burn through tokens overnight.

---

## 4. Hosting options

### Vercel (simplest for Next.js)
- Connect the GitHub repo, set the env vars in the project settings.
- `npm run build` works out of the box; Vercel will run `prisma generate` because it's in `postinstall`.
- **Migrations:** Vercel doesn't run them automatically. Either run `npx prisma migrate deploy` from your laptop against the prod DB, or add a deploy hook (e.g. a GitHub Action).
- **Edge runtime:** `src/proxy.ts` already runs on the edge; everything else runs on Node functions.
- **Cold starts** can be noticeable on the conversations page (Prisma + NextAuth). Consider `fluid: true` / `region: cdg1` / etc. close to your Postgres.

### Fly.io (good if you self-host Postgres in Fly too)
- One `fly.toml`, one `flyctl deploy`. Same region for app + DB.
- Run migrations as part of the release command:
  ```toml
  [deploy]
  release_command = "npx prisma migrate deploy"
  ```

### Self-host (VPS + Docker)
- More work, but cheapest for a single tenant.
- Use a process manager (PM2 / systemd) + a reverse proxy (Caddy / Nginx) for TLS.
- You're responsible for backups, monitoring, OS patches.

### What NOT to do
- Don't run Postgres on the same machine as the app behind a single point of failure unless backups are bullet-proof. The conversation history is unrecoverable from anywhere else.
- Don't deploy to a host that auto-sleeps the process (e.g. free-tier hobby plans) — Twilio retries on timeout but the patient will see lag.

---

## 5. First-time deploy checklist

In order. Do not skip.

- [ ] `AUTH_SECRET` generated and set in the host's secret manager
- [ ] Postgres provisioned, `DATABASE_URL` set, `prisma migrate deploy` succeeds
- [ ] `prisma/seed.ts` reviewed (owner email + clinic name reflect the real client) and run
- [ ] SMTP provider verified (SPF + DKIM + DMARC), `SMTP_*` env vars set
- [ ] Send-yourself sign-in test works: open `/signin`, click link, land on `/app`
- [ ] Twilio WhatsApp sender approved, `TWILIO_*` env vars set, `Clinic.whatsappNumber` matches sender
- [ ] Twilio webhook URL configured in console, signature verification tested by sending a manual WhatsApp message
- [ ] OpenAI key set with a hard spend cap configured
- [ ] First seeded user can sign in, see the dashboard, send a manual reply through the composer
- [ ] Inbound WhatsApp → AI books an appointment → outbound reply arrives on the patient's phone
- [ ] Server logs are being collected somewhere durable (host's log retention, or shipped to Datadog/Logtail/etc.)

---

## 6. Pre-flight: code-level checks

Before pushing the "deploy" button:

```bash
npm run typecheck       # → clean
npm run lint            # → clean
npm test                # → Test Files 13 passed (13) | Tests 89 passed (89)
npm run build           # → no errors, no missing env warnings
```

Inspect the build output for anything routed to the Edge runtime that shouldn't be — only `src/proxy.ts` should be on the edge.

---

## 7. Known production gaps (not yet implemented)

| Gap | Risk | Mitigation today |
|---|---|---|
| **No rate limiting on `/api/webhooks/whatsapp`** | A spoofed Twilio signature could keep getting rejected for free, but a *valid* signature + flooded inbound could rack up OpenAI cost | OpenAI hard spend cap; Twilio sender-allowlist if needed |
| **No rate limiting on `/api/chat`** | Production gates it by session+clinicId, so an authenticated user could still spam | Add a per-conversation cooldown if abused |
| **No observability/metrics export** | Hard to spot a regression | Ship app logs to Logtail/Datadog/etc. Watch the `[/api/webhooks/whatsapp]` and `[auth]` log lines |
| **No automatic Prisma migration on deploy** | Forgetting `migrate deploy` means a broken release | Add a CI step or hosting release-command |
| **No staff signup flow** | Owner adds users by hand (custom Auth.js adapter rejects unknown emails) | This is intentional — see [HANDOFF.md §8.3](HANDOFF.md#8) |
| **No automated DB backups** | Conversation history loss on host incident | Whatever your host offers + a daily `pg_dump` to off-host storage |
| **No `/health` endpoint** | Load balancers can't tell if the app is up | Use Next.js's `/api/auth/csrf` (always returns 200 if Auth.js is working) as a poor man's check, or add one |
| **AI demo at `/app/ai`** | Still client-side mock — doesn't reflect real bot behavior | Acceptable for now (see [HANDOFF.md §8.6](HANDOFF.md#8)). Don't show prospective clients without disclaiming. |

---

## 8. Multi-tenant onboarding (after first clinic is live)

To add a second clinic to the same deployment:

1. Insert the new `Clinic` row server-side:
   ```ts
   await prisma.clinic.create({
     data: {
       name: "Clínica Nueva",
       slug: "nueva",
       timezone: "Europe/Madrid",
       locale: "es-ES",
       whatsappNumber: "+34922000000",
     },
   });
   ```
2. Create the OWNER user for that clinic in the DB.
3. Provision treatments, technicians, and business hours via the dashboard (`/app/settings/*`) or by extending `prisma/seed.ts` for them.
4. Configure a **second Twilio sender** for that clinic and update its `whatsappNumber` to match.
5. The webhook routes by `whatsappNumber` automatically — no code change required.

---

## 9. Rolling back

If a deploy goes wrong:

- **Code**: roll back via your host's previous-deploy button.
- **Database migration**: Prisma migrations are forward-only. If a migration breaks production, restore the most recent DB snapshot **and** revert the migration directory in code together. This is why backups matter.
- **Twilio webhook**: temporarily point the webhook URL at a known-good static `200 OK` endpoint to stop OpenAI charges while you fix the app. Inbound messages will queue silently on Twilio for a short window.

---

## 10. Cost ballpark (per clinic, per month)

Very rough; depends entirely on volume.

| Item | Monthly estimate |
|---|---|
| Vercel Hobby / Fly Hobby app | $0–$20 |
| Postgres (Neon Free / Supabase Free) | $0–$25 |
| Twilio WhatsApp (per Meta-conversation pricing) | $0.005–$0.08 per conversation |
| OpenAI `gpt-4.1-mini` | ~$0.001 per 4-turn booking |
| SMTP (Resend free / SendGrid Essentials) | $0–$15 |
| Domain + TLS | $10/year |

For a single Bellem-scale clinic with ~300 conversations/month, expect ~$30–$50/month all-in. Scaling factor is mostly Twilio.

---

## 11. Decisions still open (need clinic-owner input)

These need product/business answers before they unblock more work:

- **Pricing/billing model** — drives the `Facturación` settings sub-page and a possible Stripe integration.
- **Module structure** — what does "Módulos contratados" actually toggle?
- **Staff invite UX** — see [HANDOFF.md §8](HANDOFF.md#8). Three reasonable options; pick one.
- **Lead vs Patient** — current code uses Patient-direct; the `Lead` model is unused. Either remove it or wire `find_or_create_patient` to use it.

---

## Quick reference

| Action | Command |
|---|---|
| Apply prod migrations | `DATABASE_URL=… npx prisma migrate deploy` |
| Seed first tenant | `DATABASE_URL=… npm run db:seed` |
| Generate AUTH_SECRET | `openssl rand -base64 32` |
| Health-check the webhook | curl with a valid `X-Twilio-Signature` (see [src/server/whatsapp/twilio.ts](src/server/whatsapp/twilio.ts) for the algorithm) |
| Inspect the last tool trace | `npx tsx scripts/last-tools.ts "<phoneE164>"` |
| Trigger a dev sign-in (no SMTP) | sign in at `/signin`, copy the magic link from the dev terminal |

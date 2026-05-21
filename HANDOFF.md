# Aizorix SaaS — Handoff Status

Last updated: 2026-05-20 (Phase 5 complete).

This document captures everything needed to resume work in a fresh session. The project has been taken from scratch through five phases: a booking engine, an AI orchestrator, a WhatsApp webhook, a live dashboard, and (this session) Phase 5 — manual reply, pause-bot toggle, real-data dashboard pages, and production hardening. All ship with passing tests and at least one live-validated path.

---

> **For going live:** see [PRODUCTION_DEPLOY.md](PRODUCTION_DEPLOY.md) — covers env vars, external service setup (Twilio, SMTP, OpenAI), hosting options, the first-deploy checklist, and known production gaps. This handoff stays focused on dev + code state.

## 1. Project summary

Aizorix is a multi-tenant AI-powered receptionist for aesthetic clinics. It replaces an n8n + Google Sheets prototype with a typed, transactional system. The first tenant is **Clínica Estética Bellem** (Madrid). Patients message a WhatsApp number; an LLM with tool access manages information, bookings, reschedules, cancellations, and human escalation in Spanish. Staff supervise through a dashboard, can manually reply, can pause the bot per conversation, and resolve escalations explicitly.

The OpenAI account that pays for inference is the **client's**, not the developer's.

---

## 2. Current state by phase

### Phase 1 — Booking engine + database
- **Schema** ([prisma/schema.prisma](prisma/schema.prisma)): 16 domain models — Clinic, User, Patient, Treatment, TreatmentCategory, Technician, TechnicianTreatment, Appointment, BlockedSlot, ClinicBusinessHours, Conversation, Message, AiMemory, HumanHandoff, ClinicStrategyRule, WhatsAppIntegration — plus NextAuth's Account / Session / VerificationToken (19 total). The `Lead` model was removed in Phase 6.3 (was unused; orchestrator creates Patient directly).
- **Pure engines** (no DB):
  - [src/server/availability/slots.ts](src/server/availability/slots.ts) — 30-min slot generator, lead-time aware, midday-break safe.
  - [src/server/availability/business-hours.ts](src/server/availability/business-hours.ts) — DST-aware window expansion in `Europe/Madrid`.
  - [src/server/treatments/match.ts](src/server/treatments/match.ts) — accent-folding token scorer with `EXACT | AMBIGUOUS | NEEDS_VALUATION | NOT_FOUND` outcomes.
  - [src/server/technicians/assign.ts](src/server/technicians/assign.ts) — eligibility ranker (exclusive > requested > preferred > primary > prioritySensitive-last).
- **Transactional services**:
  - [src/server/booking/book.ts](src/server/booking/book.ts) — Serializable-isolation booking with overlap detection, business-hours, eligibility, exclusivity, and lead-time validation.
  - [src/server/booking/cancel.ts](src/server/booking/cancel.ts), [reschedule.ts](src/server/booking/reschedule.ts).
- **Bellem seed** ([prisma/seed.ts](prisma/seed.ts)):
  - 1 clinic, 8 treatments, 3 technicians (Diana, Isis, Leo), business hours per-spec.
  - Eligibility rules:
    - Microblading → **Leo exclusive**.
    - Depilación con hilo → **Leo excluded**.
    - Limpieza facial, Diseño cejas, Valoración → Leo `isFallbackOnly` (hidden unless primaries unavailable).

### Phase 2 — AI orchestrator
- **Provider-neutral LLM layer** ([src/server/ai/client.ts](src/server/ai/client.ts)). `LLMClient` interface, `LLMMessage`, `LLMToolCall`, `LLMResponse`.
- **OpenAI adapter** ([src/server/ai/openai.ts](src/server/ai/openai.ts)) — default model `gpt-4.1-mini`, overridable via `OPENAI_MODEL`.
- **8 tools** the LLM can call ([src/server/ai/tools.ts](src/server/ai/tools.ts)):
  1. `find_treatment` · 2. `find_availability` (local-time-only) · 3. `book_appointment` · 4. `cancel_appointment` · 5. `reschedule_appointment` · 6. `find_or_create_patient` · 7. `set_memory` · 8. `escalate_to_human` (now also sets `botPaused: true` — see §7).
- **Orchestrator** ([src/server/ai/orchestrate.ts](src/server/ai/orchestrate.ts)):
  - Loads/creates Conversation, replays last 12 USER/ASSISTANT messages.
  - **Short-circuits if `conversation.botPaused === true`** — records the inbound USER message, returns `accion: "PAUSED"`, empty `respuesta`, so the webhook stays quiet.
  - Otherwise loops on tool_use up to 6 iterations.
  - Persists transcript + full tool trace (input + result) into Message.metadata for debugging.
- **System prompt** ([src/server/ai/prompt.ts](src/server/ai/prompt.ts)) — Spanish, strict rules about local time and technician IDs.

### Phase 3 — WhatsApp webhook
- **Provider-neutral WhatsApp layer** ([src/server/whatsapp/client.ts](src/server/whatsapp/client.ts)) — `WhatsAppProvider` interface, `InboundMessage`, `OutboundMessage`, `OutboundResult`.
- **Stub adapter** ([src/server/whatsapp/stub.ts](src/server/whatsapp/stub.ts)) — logs to console + retains history. Default when no Twilio env is set.
- **Twilio adapter** ([src/server/whatsapp/twilio.ts](src/server/whatsapp/twilio.ts)) — HMAC-SHA1 signature verification, REST send.
- **Webhook route** ([src/app/api/webhooks/whatsapp/route.ts](src/app/api/webhooks/whatsapp/route.ts)) — verifies signature → parses Twilio form payload → resolves clinic by `whatsappNumber` → calls `orchestrate` → **skips outbound send when `accion === "PAUSED"` or `respuesta` is empty** → otherwise sends via active provider.
- **Clinic routing**: `Clinic.whatsappNumber` (E.164, unique). Bellem seeded with `+34911000000`.

### Phase 4 — Dashboard wiring
- **Auth** ([src/auth.ts](src/auth.ts) + [src/auth.config.ts](src/auth.config.ts)):
  - NextAuth v5, JWT sessions, email magic-link via Nodemailer.
  - Dev: when `SMTP_HOST` unset, the magic link is printed to the server console. A **placeholder `server: { host: "localhost", port: 25 }`** is passed because Auth.js's Nodemailer constructor throws if `!config.server` (this is the structural fix that unblocked all routes — see §7).
  - **Custom Prisma adapter** ([src/auth.ts:7-22](src/auth.ts#L7-L22)) overrides `getUserByEmail` to use `findFirst({ email })`. The default `@auth/prisma-adapter` does `findUnique({ where: { email } })` which our multi-tenant schema (`@@unique([clinicId, email])`) rejects.
  - Split config (edge-safe `auth.config.ts` for the proxy + full `auth.ts` for handlers) avoids the edge-runtime/`stream` error.
- **Proxy** ([src/proxy.ts](src/proxy.ts)) — Next.js 16's `proxy.ts` replaces `middleware.ts`. Gates `/app/*` only.
- **Sign-in page** ([src/app/signin/page.tsx](src/app/signin/page.tsx)).

### Phase 5 — Manual reply, pause-bot, real-data dashboards (THIS SESSION)
- **Manual reply composer** ([src/components/dashboard/handoff-actions.tsx](src/components/dashboard/handoff-actions.tsx)) — textarea + Enviar + "Marcar resuelto" + pause/resume toggle. Always visible; only the resolve button is gated on having an open handoff. Cmd/Ctrl+Enter submits.
- **Server actions** ([src/server/actions/appointments.ts](src/server/actions/appointments.ts)):
  - `cancelAppointmentAction`, `rescheduleAppointmentAction` (unchanged from Phase 4).
  - `resolveHandoffAction` — when the last open handoff is resolved, clears **both** `requiresHuman` and `botPaused`.
  - `sendManualReplyAction` — clinic-scoped; loads conversation + clinic, sends via `getWhatsAppProvider()`, persists an outbound `ASSISTANT` Message with `metadata.source: "manual"` + actorUserId + providerMessageId.
  - `setBotPausedAction` — clinic-scoped flip of `Conversation.botPaused`.
- **Pause-bot column** — `Conversation.botPaused` (Boolean, default false). Migration: `20260520191535_conversation_bot_paused`. `escalate_to_human` tool sets it; staff toggle directly; resolve clears it.
- **All dashboard pages now hit real Prisma** (`mock-data.ts` deleted):
  - `/app` (home) — real KPIs + next 5 appointments + recent conversations + AI 30-day performance.
  - `/app/agenda` — 7-day grid + upcoming list + inline cancel/reschedule (from Phase 4).
  - `/app/conversations` — inbox + transcript + manual composer + pause toggle (from Phase 4, extended here).
  - `/app/clients` — list (from Phase 4).
  - `/app/clients/[id]` — profile + appointments + conversations + LTV from completed appointments.
  - `/app/pipeline` — 5-bucket funnel (Nuevo / Contactado / Cita agendada / Cliente activo / Inactivo) derived from `Patient.status` + relations.
  - `/app/campaigns` — 6 templates, real audience counts per template, real segment breakdown. Split server shell + client view.
  - `/app/metrics` — KPIs with MoM deltas, last-30d funnel, top 4 staff by revenue, peak day, star treatment.
  - `/app/settings` — real clinic header (name, timezone, locale, WhatsApp number, lead minutes) + counts of staff/treatments/technicians/business-hours rows. SECTIONS nav cards kept as nav placeholders.
  - `/app/ai` — real treatments drive the demo bot's matching + descriptions (`botMessage`/`description`/`price`).
- **All queries scoped by `clinicId`** — see [src/server/dashboard/queries.ts](src/server/dashboard/queries.ts). New helpers: `getHomeDashboard`, `getPatientDetail`, `getPipelinePatients`, `getCampaignAudienceCounts`, `getMetricsOverview`, `getClinicOverview`.
- **`/api/chat` production auth-gate** — open in dev (curl-testable), requires session + matching clinicId in production. See [src/app/api/chat/route.ts](src/app/api/chat/route.ts).

---

## 3. Tech stack (concrete)

| Layer | Choice |
|---|---|
| Runtime | Node 22 (nvm), Linux |
| Framework | Next.js **16.2.6**, App Router, React 19, Turbopack dev |
| DB | Postgres 16 in Docker on **localhost:5433** (clashes with system Postgres on 5432) |
| ORM | Prisma 6.19.3, client cached on `globalThis.__prisma` in [src/server/db.ts](src/server/db.ts) |
| Auth | NextAuth v5 (Auth.js), JWT strategy, Nodemailer email provider, **custom adapter override for multi-tenant email** |
| LLM | OpenAI `gpt-4.1-mini` via `openai` 6.x. Provider-neutral interface in `LLMClient` |
| WhatsApp | Twilio adapter + in-process stub. Webhook receives Twilio's form-encoded shape |
| Tests | Vitest 3, `setupFiles: ["dotenv/config"]`, **`fileParallelism: false`** (SSI race fix), integration tests gated by `DATABASE_URL` |
| Styling | Tailwind 4, custom Aizorix design tokens |

---

## 4. Repository map (key files)

```
prisma/
  schema.prisma                            # 16 domain models + 3 NextAuth tables
  seed.ts                                  # Bellem demo data (idempotent upsert)
  migrations/
    20260520111357_init/
    20260520121500_clinic_whatsapp_number/
    20260520140000_nextauth/
    20260520191535_conversation_bot_paused/   # Phase 5

src/
  auth.ts                                  # Full NextAuth config + custom email adapter
  auth.config.ts                           # Edge-safe NextAuth config
  proxy.ts                                 # Replaces middleware.ts (Next.js 16)

  app/
    signin/page.tsx
    app/                                   # Authenticated dashboard
      page.tsx                             # Live (home — real KPIs)
      agenda/page.tsx                      # Live
      conversations/page.tsx               # Live (+ manual composer + pause toggle)
      clients/page.tsx                     # Live
      clients/[id]/page.tsx                # Live (Phase 5)
      pipeline/page.tsx                    # Live (Phase 5)
      campaigns/page.tsx                   # Live (Phase 5 — server shell)
      metrics/page.tsx                     # Live (Phase 5 — aggregations)
      settings/page.tsx                    # Live (Phase 5)
      settings/clinic/page.tsx             # Live (Phase 6.0)
      settings/hours/page.tsx              # Live (Phase 6.1)
      settings/ai/page.tsx                 # Live (Phase 6.2)
      settings/staff/page.tsx              # Live (Phase 6.4)
      ai/page.tsx                          # Live (Phase 6.5 — modo simulado/real toggle)
    api/
      auth/[...nextauth]/route.ts
      chat/route.ts                        # /api/chat — open in dev, auth-gated in prod
      health/route.ts                      # Phase 6.6 — liveness + DB readiness probe
      metrics/route.ts                     # Phase 6.8 — Prom exposition, METRICS_AUTH_TOKEN bearer gate
      webhooks/whatsapp/route.ts           # Phase 3 webhook (skips send when paused, rate-limited, instrumented)
      clinics/[clinicId]/availability/route.ts
      clinics/[clinicId]/appointments/route.ts
      appointments/[id]/route.ts

  server/
    db.ts
    errors.ts
    rate-limit.ts                          # Phase 6.6 — token bucket (in-memory, single-instance)
    metrics.ts                             # Phase 6.8 — counter registry + Prom exposition
    availability/                          # Phase 1 engine
    booking/                               # Phase 1 transactional services
    treatments/match.ts
    technicians/assign.ts
    ai/
      client.ts                            # LLMClient interface
      openai.ts
      prompt.ts
      tools.ts                             # 8 tools; escalate_to_human pauses bot
      orchestrate.ts                       # Short-circuits when botPaused
      types.ts                             # Action union now includes "PAUSED"
    whatsapp/
      client.ts, stub.ts, twilio.ts, index.ts
    actions/
      appointments.ts                      # 5 actions (incl. sendManualReply, setBotPaused)
      clinic.ts                            # 3 actions: updateClinic, updateBusinessHours, updateAiConfig
      staff.ts                             # 3 actions: invite, setActive, setRole
      ai-demo.ts                           # 2 actions: runDemoTurn, clearDemoConversation
    dashboard/
      queries.ts                           # 12 shared Prisma queries (clinic-scoped)

  components/
    dashboard/
      appointment-controls.tsx             # Cancel / reschedule (client)
      handoff-actions.tsx                  # Composer + pause toggle + resolve (client)
      campaigns-view.tsx                   # Campaigns UI (client)
      ai-demo.tsx                          # AI receptionist demo (client)
    crm/
    ui/

  lib/
    utils.ts                               # formatEUR, cn, formatNumber

scripts/                                   # tsx helpers for debugging
  print-ids.ts, list-appts.ts, delete-appt.ts, reset-phone.ts, last-tools.ts
  create-clinic.ts                         # Phase 6.7 — bootstrap new clinic + OWNER user

docker-compose.yml                         # Postgres 16 on host port 5433
.env.example
.env                                       # Local (NOT committed)
HANDOFF.md                                 # This file
.gitignore                                 # !.env.example exception added Phase 5
```

---

## 5. Environment + commands

### .env

```
# Postgres (host port remapped to 5433 because system Postgres lives on 5432)
DATABASE_URL="postgresql://aizorix:aizorix_dev@localhost:5433/aizorix?schema=public"

# OpenAI — client's account, must have billing credit
OPENAI_API_KEY="sk-proj-..."
OPENAI_MODEL="gpt-4.1-mini"

# NextAuth — required, generate with: openssl rand -base64 32
AUTH_SECRET="..."

# SMTP — unset = dev mode (magic link logs to console)
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASSWORD=""
EMAIL_FROM="no-reply@aizorix.dev"

# Twilio — unset = stub provider
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_WHATSAPP_FROM="whatsapp:+34911000000"

# Defaults
DEFAULT_CLINIC_SLUG="bellem"
DEFAULT_TIMEZONE="Europe/Madrid"
```

### Bootstrapping a fresh checkout

```bash
npm install
cp .env.example .env
# fill OPENAI_API_KEY and AUTH_SECRET in .env

npm run db:up                      # docker compose postgres:16 on 5433
npx prisma migrate deploy          # apply all migrations
npx prisma generate
npm run db:seed                    # idempotent Bellem seed

npm test                           # 124 tests pass (20 files)
npm run dev                        # http://localhost:3000
```

### Common dev commands

| Command | What |
|---|---|
| `npm run dev` | Next.js with Turbopack |
| `npm test` | All vitest — runs **sequentially** to avoid SSI conflicts (see §7) |
| `npm run typecheck` | tsc --noEmit |
| `npm run lint` | eslint |
| `npm run db:up` | Start postgres container |
| `npm run db:down` | Stop container |
| `npm run db:migrate` | `prisma migrate dev` — needs TTY (use `migrate deploy` non-interactively) |
| `npm run db:seed` | Upsert Bellem data |
| `npm run db:studio` | Prisma Studio on :5555 |
| `npm run db:ids` | Print clinic/treatment/technician IDs |
| `npm run create:clinic -- --slug <s> --name <n> --owner-email <e>` | Bootstrap a new clinic + initial OWNER user (Phase 6.7) |
| `npm run db:reset` | `prisma migrate reset --force` (destructive) |
| `npx tsx scripts/list-appts.ts <yyyy-mm-dd>` | List appointments on a date |
| `npx tsx scripts/last-tools.ts "<phoneE164>"` | Show last conversation's tool trace |
| `npx tsx scripts/reset-phone.ts "<phoneE164>"` | Wipe patient + conversation |
| `npx tsx scripts/delete-appt.ts <ISO or id>` | Delete an appointment |

### Dev sign-in flow

`SMTP_HOST` is unset locally → the magic-link email is printed to the **dev-server terminal** (not sent). Open `/signin`, enter `admin@bellem.demo` (seeded OWNER), submit, then copy the URL from the terminal into the browser. NextAuth's Nodemailer constructor needs a truthy `server` config to load at all — see §7 for the structural fix.

### Curl smoke tests

```bash
# Chat orchestrator (open in dev, auth-required in production)
curl -s -X POST http://localhost:3000/api/chat \
  -H 'content-type: application/json' \
  -d '{"clinicId":"<bellem-id>","externalChatId":"+34611555010","fromName":"Lucía","message":"Quiero limpieza facial el martes a las 10."}' | jq

# WhatsApp webhook (Twilio shape, no signature in dev)
curl -s -X POST http://localhost:3000/api/webhooks/whatsapp \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-urlencode 'From=whatsapp:+34611555011' \
  --data-urlencode 'To=whatsapp:+34911000000' \
  --data-urlencode 'Body=Hola, quiero cita el martes a las 10' \
  --data-urlencode 'ProfileName=Lucía' \
  --data-urlencode 'MessageSid=SMtest' | jq
```

### Bellem IDs (currently seeded)

Use `npm run db:ids` to refresh — values change every reseed.

- Clinic: `cmpdyt1qd0000ca5siq6hgb2o`
- Treatments: see `db:ids` output (slugs are stable)
- Technicians: **stable IDs**
  - `tech-diana-bellem`
  - `tech-isis-bellem`
  - `tech-leo-bellem`

---

## 6. Testing

| Suite | Tests | Notes |
|---|---|---|
| `availability.test.ts` | 17 | Pure slot generator |
| `treatments.test.ts` | 7 | matchTreatment ranking |
| `technicians.test.ts` | 11 | Assignment ranking |
| `booking.integration.test.ts` | 6 | Real-DB transactions (overlap, business hours, exclusivity) |
| `parse-clinic-time.test.ts` | 4 | Local-vs-UTC ISO parsing |
| `orchestrate.integration.test.ts` | 1 | Scripted LLM mock + real DB |
| `twilio.test.ts` | 6 | Signature verify + inbound parse |
| `webhook.integration.test.ts` | 1 | Full inbound→orchestrate→stub-outbound |
| `orchestrate.pause.integration.test.ts` | 2 | Phase 5 — paused-bot short-circuit + escalate sets both flags |
| `queries.integration.test.ts` | 7 | Phase 5 — shape + clinic-scoping for the 6 dashboard query helpers |
| `prompt.test.ts` | 7 | Phase 6.2 — tone branches + INSTRUCCIONES ADICIONALES block (pure unit test) |
| `clinic.actions.integration.test.ts` | 12 | Phase 6 — settings actions: auth gate, role gate, validation, WHATSAPP_TAKEN, overlap detection, replace-all, trim+null |
| `dashboard.actions.integration.test.ts` | 8 | Phase 5 — manual reply + pause-bot actions: auth gate, clinic scope, NO_CLINIC_NUMBER, metadata.source persistence, paused-flag flips |
| `staff.actions.integration.test.ts` | 13 | Phase 6.4 — invite/active/role actions: auth & role gates, ALREADY_ACTIVE, reactivate path, signIn-failure soft error, SELF_LOCKOUT, LAST_OWNER guards, non-OWNER can't touch OWNER |
| `rate-limit.test.ts` | 4 | Phase 6.6 — token-bucket: burst capacity, refill over time, cap at capacity, per-key isolation |
| `ai-demo.actions.integration.test.ts` | 6 | Phase 6.5 — runDemoTurn + clearDemoConversation: auth gate, validation, WEB-channel persistence, idempotent clear |
| `health/__tests__/route.test.ts` | 1 | Phase 6.6 — /api/health returns 200 + sensible shape when DB reachable |
| `webhook/__tests__/rate-limit.test.ts` | 2 | Phase 6.6 — verifies limiter is actually wired into the WhatsApp webhook (429 after capacity, per-sender isolation) |
| `metrics.test.ts` | 5 | Phase 6.8 — counter registry: increment, label-bucketing, HELP+TYPE preamble, label-order canonicalization, escaping |
| `metrics/__tests__/route.test.ts` | 4 | Phase 6.8 — /api/metrics: Prom format, METRICS_AUTH_TOKEN gating (404 when missing/wrong, 200 with correct bearer) |
| **TOTAL** | **124** | |

Integration tests gate on `process.env.DATABASE_URL` and `RUN_DB_TESTS !== "0"`. Vitest loads `.env` via `setupFiles: ["dotenv/config"]`. **`fileParallelism: false`** in [vitest.config.ts](vitest.config.ts) prevents the SSI race that makes parallel integration tests conflict on the same tables — see §7. Action tests mock `next/cache` because `revalidatePath` requires Next.js's static-generation store, which isn't available in vitest.

---

## 7. Lessons learned + non-obvious gotchas

### LLM timezone bug (the most important one)
- **Symptom**: bookings landed at the wrong hour because the LLM was getting `startsAtISO: "...T08:00:00.000Z"` from `find_availability` and then sending `"...T08:00:00"` to `book_appointment` — stripping the `Z` and shifting the time.
- **Fix structurally** in [src/server/ai/tools.ts](src/server/ai/tools.ts):
  - `find_availability` no longer emits UTC fields. Only `startsAtLocal`, `endsAtLocal`, `humanLocal`.
  - `book_appointment` accepts `startsAtLocal` (server interprets as clinic-local).
  - System prompt forbids `Z` and tells the model to copy `startsAtLocal` verbatim.
- **Rule of thumb**: never expose two different time representations of the same value to an LLM. Pick one and stick with it.

### Auth.js MissingSecret on a fresh clone (Phase 5)
- **Symptom**: visiting `/signin` on a newly-cloned repo throws `MissingSecret` because the developer hasn't run `openssl rand -base64 32` yet.
- **Fix** in [src/auth.config.ts](src/auth.config.ts): if `AUTH_SECRET` is unset *and* `NODE_ENV !== "production"`, fall back to a stable dev-only string and `console.warn` loudly at module-eval time. In production, the secret stays `undefined` so NextAuth still fails correctly. Lets newcomers `git clone && npm run dev` without an extra step, but you should still set a real secret before any real use.

### Auth.js Nodemailer construction throws on falsy `server` (Phase 5)
- **Symptom**: every `/app/*` and `/api/*` route 500'd with `AuthError: Nodemailer requires a 'server' configuration`. Manifested as "Compiling /" hanging forever in Turbopack because the error fired at module-eval time during graph construction.
- **Cause**: `@auth/core/providers/nodemailer.js` does `if (!config.server) throw …` *before* calling our overridden `sendVerificationRequest`. Passing `server: undefined` when `SMTP_HOST` is unset trips the validator.
- **Fix** in [src/auth.ts](src/auth.ts): pass a placeholder `{ host: "localhost", port: 25 }` for `server` when `SMTP_HOST` is unset. The override `sendVerificationRequest` never touches the configured transport in dev.

### Prisma adapter assumes globally unique `User.email` (Phase 5)
- **Symptom**: sign-in submit POSTed 500 with `Invalid prisma.user.findUnique() — Argument 'where' needs at least one of 'id' or 'clinicId_email'`.
- **Cause**: `@auth/prisma-adapter`'s `getUserByEmail` calls `prisma.user.findUnique({ where: { email } })`. Our schema has `@@unique([clinicId, email])`, not a singular `email @unique`.
- **Fix** in [src/auth.ts](src/auth.ts): wrap `PrismaAdapter(prisma)` with `aizorixAdapter()` that overrides `getUserByEmail` to `findFirst({ where: { email, active: true } })`. Self-service signup is disabled — only seeded users can sign in.

### Cross-origin dev warnings from VM LAN IP (Phase 5)
- Accessing the dev server from the VM's network IP (e.g. `192.168.170.129`) instead of `localhost` triggered Next.js 16's `Blocked cross-origin request to Next.js dev resource …`. Added `allowedDevOrigins: ["192.168.170.129"]` to [next.config.ts](next.config.ts).

### Postgres SSI conflict between parallel integration tests (Phase 5)
- **Symptom**: `npm test` started failing intermittently with `Transaction failed due to a write conflict or a deadlock` once integration tests grew. Individual test files passed; the suite failed.
- **Cause**: `booking.integration.test.ts` and `webhook.integration.test.ts` both touch `Appointment` under Serializable isolation. Vitest runs test files in parallel workers by default, so SSI's predicate locking aborts one.
- **Fix**: `fileParallelism: false` in [vitest.config.ts](vitest.config.ts). Suite now runs sequentially in ~5s.

### Postgres port collision
- The dev VM has system Postgres 16 listening on **5432**. Docker container is mapped to **5433** in [docker-compose.yml](docker-compose.yml). `.env` must use `localhost:5433`.

### Prisma `migrate dev` needs a TTY
- The Bash tool can't run it interactively. Use `--create-only` (if no warnings) or **hand-write the SQL** under `prisma/migrations/<timestamp>_<name>/migration.sql` and run `prisma migrate deploy`. Hand-written migrations to date:
  - `20260520121500_clinic_whatsapp_number` — adds `Clinic.whatsappNumber`.
  - `20260520140000_nextauth` — Account/Session/VerificationToken + nullable `User.name` + `emailVerified` + `image`.
  - `20260520191535_conversation_bot_paused` — adds `Conversation.botPaused`.
  - `20260521015528_clinic_ai_config` — adds `AiTone` enum + `Clinic.aiTone`/`Clinic.aiGuidance`.
  - `20260521040112_remove_unused_lead_model` — drops the unused `Lead` table + the `leadId` columns on `Conversation` and `HumanHandoff`.

### Next.js 16 deprecations / breaking
- `middleware.ts` → **`proxy.ts`** (renamed file at `src/proxy.ts`).
- Edge runtime can't import Node-only modules. NextAuth v5 **must** be split: edge-safe `auth.config.ts` (no providers) + full `auth.ts` (with adapter + Nodemailer).

### `.env*` glob and `.env.example` (Phase 5)
- The original `.gitignore` had `.env*` which also matches `.env.example`. Added `!.env.example` exception so the env-template stays tracked.

### Heredoc + tsx + relative TS import
- `npx tsx <<EOF ... EOF` with `import { prisma } from "./src/server/db"` doesn't always resolve ESM correctly. Use scripts under `scripts/` instead.

### Smart-quote keys
- Both Anthropic and OpenAI keys can carry smart quotes if copied from a webpage. Pre-flight check:
  ```bash
  source .env && echo "len=${#OPENAI_API_KEY} prefix=${OPENAI_API_KEY:0:14}"
  ```

### OpenAI billing
- New accounts return `insufficient_quota` with `429` even with a valid key until billing is funded. Mention to clients up front.

### LLM behavioral note
- `gpt-4.1-mini` defaults to a confirmation step before booking. It will say "¿confirmas?" rather than auto-book on a preference statement like "prefiero Diana a las 10". This is correct, safer behavior; don't try to tune it away.

### Browser-extension hydration warnings
- Bitwarden / 1Password content scripts inject attributes on `<body>` (`bis_register`, `__processed_…`) before React hydrates. Causes a React "hydration mismatch" warning in the dev console. Harmless. Disable the extension on `localhost` if it bothers you.

---

## 8. What's NOT yet built

Phase 1-5 closed out the original §8 punch list. Phase 6 added settings sub-pages and full test coverage of the new + existing action layer. Remaining items:

1. **Real Twilio provisioning** — webhook is wired but no real number is connected. Dev mode uses the stub.
2. **Real SMTP** — dev mode logs the magic link to the console. For production, fill in `SMTP_HOST`.
3. **Multi-tenant self-service signup** — Users are inserted server-side by the clinic owner; signup is not self-service. Custom adapter rejects unknown emails.
4. **Sub-pages under settings** — `/app/settings/clinic`, `/app/settings/hours`, `/app/settings/ai`, and `/app/settings/staff` (invite/role/active with magic-link email on creation, SELF_LOCKOUT + LAST_OWNER guards) are live, all OWNER+ADMIN gated. The remaining two cards (Módulos / Facturación) still say "Próximamente".
5. **Módulos contratados** and **Facturación** settings cards — still "Próximamente" because both need product/business decisions (what's a module? what's the pricing model?) before they can be coded.

---

## 9. How to resume in a new session

### First-time setup if cloning fresh
1. `npm install`
2. `cp .env.example .env`, fill `OPENAI_API_KEY` and `AUTH_SECRET`
3. `npm run db:up`
4. `npx prisma migrate deploy && npx prisma generate`
5. `npm run db:seed`
6. `npm test` — expect **89 / 89 passing**

### If continuing in the existing directory
- `npm run db:up` (idempotent)
- `npm test` to confirm green (124 tests, runs sequentially)
- `npm run dev` and open [http://localhost:3000/app](http://localhost:3000/app)

### To sign in (dev)
1. Open `/signin`, enter `admin@bellem.demo` (seeded OWNER), submit.
2. **Read the dev-server terminal** — the magic link is printed to stdout (no SMTP in dev).
3. Paste the URL into the browser → lands on `/app`.

### To verify the pause-bot flow
1. Trigger an escalation:
   ```bash
   curl -s -X POST http://localhost:3000/api/chat \
     -H 'content-type: application/json' \
     -d '{"clinicId":"<bellem-id>","externalChatId":"+34611555099","fromName":"Lucía","message":"Quiero hablar con una persona urgentemente."}' | jq
   ```
   `escalate_to_human` fires → `requiresHuman: true`, `botPaused: true`.
2. Open `/app/conversations`, filter "Necesitan ayuda", select Lucía's thread.
3. Composer shows "Bot pausado · respondes tú". Send a manual reply — stub logs it to the dev terminal.
4. Send another inbound curl for the same patient — the dev terminal shows the inbound was recorded but no outbound reply was sent (because `botPaused`).
5. Click **Marcar resuelto** — both flags clear, bot resumes on next inbound.

### To pick up Phase 6 (suggested next)
1. Tests for the Phase 5 code: composer + setBotPausedAction + every dashboard query.
2. Real Twilio + SMTP provisioning.
3. Settings sub-pages (clinic edit, staff CRUD, business hours editor, AI tone config).
4. Self-service signup (rework the custom adapter; gate by invite code).
5. Either remove `Lead` from the schema or actually use it.

### To onboard a real Twilio number
1. Provision a WhatsApp-enabled Twilio Messaging Service.
2. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` in `.env`.
3. Update the clinic row: `prisma.clinic.update({ where:{slug:"bellem"}, data:{ whatsappNumber:"<E.164 of the Twilio number>" } })`.
4. In the Twilio Console, set the inbound webhook URL to `https://<public host>/api/webhooks/whatsapp` (use ngrok in dev: `ngrok http 3000`).
5. Restart dev — `getWhatsAppProvider()` will return Twilio automatically.

### To debug a bad bot response
1. `npx tsx scripts/last-tools.ts "<phone>"` shows the full tool trace.
2. Read the assistant message text plus every `{ name, input, result }` of the tool calls that produced it.
3. If `find_availability` returned wrong slots, double-check the `fromLocal` / `toLocal` range and the clinic's business hours.
4. If `book_appointment` returned an error code, the prompt rules explain how the bot is supposed to recover; if it doesn't, the prompt may need to be sharpened.

---

## 10. Open architectural decisions made

For continuity, the principal choices baked in:

- **Provider-neutral interfaces** for LLM (`LLMClient`) and WhatsApp (`WhatsAppProvider`). Vendor lock-in is contained to one adapter file per integration.
- **Local-time-only at the LLM boundary**. UTC is server-internal. This was the structural fix for the timezone bug.
- **JWT NextAuth sessions** (not database) — required for edge-runtime middleware. Clinic info baked into the token on sign-in.
- **Custom email adapter override** — `getUserByEmail` does `findFirst` (the schema's email uniqueness is per-clinic). Future-you: any other adapter method that assumes global unique email needs the same treatment.
- **`Conversation.requiresHuman` flags the inbox; `Conversation.botPaused` controls the bot.** They move together when the AI escalates, but staff can pause without escalating (and the manual composer is always visible regardless).
- **All booking writes go through `bookAppointment()`** with Serializable isolation. Dashboard server actions reuse it. The webhook reuses it through the orchestrator.
- **Tests use Prisma + real Postgres**, not mocks, for anything touching the transaction. Mocked LLM client, never mocked DB. `fileParallelism: false` keeps SSI conflicts from making the suite flaky.
- **`/api/chat` is open in dev, gated in prod** by NODE_ENV — curl smoke tests still work locally; production deploys can't be probed by unauthenticated callers.
- **No staff signup**. Users are inserted server-side by the clinic owner; magic-link sign-in just unlocks access.

---

## Quick health check

If everything is wired correctly, this is what passes:

```bash
npm run typecheck   # → clean
npm run lint        # → clean
npm test            # → Test Files 20 passed (20) | Tests 124 passed (124)
```

If any of these fail, that's the first thing to fix before reading further.

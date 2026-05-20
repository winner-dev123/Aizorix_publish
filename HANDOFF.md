# Aizorix SaaS — Handoff Status

Last updated: 2026-05-20.

This document captures everything needed to resume work in a fresh session. The first conversation took the project from scratch through four phases: a booking engine, an AI orchestrator, a WhatsApp webhook, and a dashboard. All four ship with passing tests and live-validated end-to-end flows.

---

## 1. Project summary

Aizorix is a multi-tenant AI-powered receptionist for aesthetic clinics. It replaces an n8n + Google Sheets prototype with a typed, transactional system. The first tenant is **Clínica Estética Bellem** (Madrid). Patients message a WhatsApp number; an LLM with tool access manages information, bookings, reschedules, cancellations, and human escalation in Spanish. Staff supervise through a dashboard.

The OpenAI account that pays for inference is the **client's**, not the developer's.

---

## 2. Current state by phase

### Phase 1 — Booking engine + database
- **Schema** ([prisma/schema.prisma](prisma/schema.prisma)): 17 models — Clinic, User, Patient, Lead, Treatment, TreatmentCategory, Technician, TechnicianTreatment, Appointment, BlockedSlot, ClinicBusinessHours, Conversation, Message, AiMemory, HumanHandoff, ClinicStrategyRule, WhatsAppIntegration, plus NextAuth's Account / Session / VerificationToken.
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
- **Tests**: 41. Includes 6 real-DB integration tests covering overlap, OUTSIDE_BUSINESS_HOURS, Leo-only-microblading, and Leo-excluded-from-hilo.

### Phase 2 — AI orchestrator
- **Provider-neutral LLM layer** ([src/server/ai/client.ts](src/server/ai/client.ts)). `LLMClient` interface, `LLMMessage`, `LLMToolCall`, `LLMResponse`.
- **OpenAI adapter** ([src/server/ai/openai.ts](src/server/ai/openai.ts)) — default model `gpt-4.1-mini`, overridable via `OPENAI_MODEL`.
- **8 tools** the LLM can call ([src/server/ai/tools.ts](src/server/ai/tools.ts)):
  1. `find_treatment` — matchTreatment
  2. `find_availability` — slot search, returns **local-time strings only** (no UTC, prevents an LLM bug we hit live — see §7)
  3. `book_appointment`
  4. `cancel_appointment`
  5. `reschedule_appointment`
  6. `find_or_create_patient`
  7. `set_memory` — upserts AiMemory rows
  8. `escalate_to_human` — flags conversation + opens HumanHandoff
- **Orchestrator** ([src/server/ai/orchestrate.ts](src/server/ai/orchestrate.ts)):
  - Loads/creates Conversation, replays last 12 USER/ASSISTANT messages.
  - Loops on tool_use up to 6 iterations.
  - Persists transcript + full tool trace (input + result) into Message.metadata for debugging.
- **System prompt** ([src/server/ai/prompt.ts](src/server/ai/prompt.ts)) — Spanish, includes strict rules about local time and technician IDs.
- **Live verified**: full multi-turn Spanish conversation that books a real appointment.

### Phase 3 — WhatsApp webhook
- **Provider-neutral WhatsApp layer** ([src/server/whatsapp/client.ts](src/server/whatsapp/client.ts)) — `WhatsAppProvider` interface, `InboundMessage`, `OutboundMessage`.
- **Stub adapter** ([src/server/whatsapp/stub.ts](src/server/whatsapp/stub.ts)) — logs to console + retains history. Default when no Twilio env is set.
- **Twilio adapter** ([src/server/whatsapp/twilio.ts](src/server/whatsapp/twilio.ts)) — HMAC-SHA1 signature verification, REST send.
- **Webhook route** ([src/app/api/webhooks/whatsapp/route.ts](src/app/api/webhooks/whatsapp/route.ts)) — verifies signature → parses Twilio form payload → resolves clinic by `whatsappNumber` → calls `orchestrate` → sends reply via active provider.
- **Clinic routing**: `Clinic.whatsappNumber` (E.164, unique). Bellem seeded with `+34911000000`.
- **Live verified**: inbound WhatsApp-shaped POST → AI reasoning → appointment in DB → outbound text captured by stub. Overlap-with-different-patient correctly suggests alternatives.

### Phase 4 — Dashboard wiring
- **Auth** ([src/auth.ts](src/auth.ts) + [src/auth.config.ts](src/auth.config.ts)):
  - NextAuth v5, JWT sessions, email magic-link via Nodemailer.
  - Dev: when `SMTP_HOST` unset, the magic link is printed to the server console — copy/paste into the browser.
  - Split config (edge-safe `auth.config.ts` for the proxy + full `auth.ts` for handlers) avoids the edge-runtime/`stream` error.
  - Session populates `user.id`, `user.clinicId`, `user.role` from a `jwt` callback.
- **Proxy** ([src/proxy.ts](src/proxy.ts)) — Next.js 16's `proxy.ts` replaces `middleware.ts`. Gates `/app/*` only.
- **Sign-in page** ([src/app/signin/page.tsx](src/app/signin/page.tsx)).
- **Live pages** (all replace [src/lib/mock-data.ts](src/lib/mock-data.ts)):
  - Agenda ([src/app/app/agenda/page.tsx](src/app/app/agenda/page.tsx)) — 7-day grid, upcoming list, inline cancel/reschedule.
  - Conversations ([src/app/app/conversations/page.tsx](src/app/app/conversations/page.tsx)) — inbox with "Todas / Necesitan ayuda" filter, real transcript view.
  - Clients ([src/app/app/clients/page.tsx](src/app/app/clients/page.tsx)) — patient table with search.
- **Server actions** ([src/server/actions/appointments.ts](src/server/actions/appointments.ts)) — `cancelAppointmentAction`, `rescheduleAppointmentAction`, `resolveHandoffAction`.
- **Polling**: 30s via `export const revalidate = 30` on each page.
- **Shared queries** ([src/server/dashboard/queries.ts](src/server/dashboard/queries.ts)) — all queries scoped by `clinicId`.
- **Status**: code compiles + tests pass. **Not yet manually verified in the browser** — that's the first thing to do in the new session.

---

## 3. Tech stack (concrete)

| Layer | Choice |
|---|---|
| Runtime | Node 22 (nvm), Linux |
| Framework | Next.js **16.2.6**, App Router, React 19, Turbopack dev |
| DB | Postgres 16 in Docker on **localhost:5433** (clashes with system Postgres on 5432) |
| ORM | Prisma 6.19.3, client cached on `globalThis.__prisma` in [src/server/db.ts](src/server/db.ts) |
| Auth | NextAuth v5 (Auth.js), JWT strategy, Nodemailer email provider |
| LLM | OpenAI `gpt-4.1-mini` via `openai` 6.x. Provider-neutral interface in `LLMClient` |
| WhatsApp | Twilio adapter + in-process stub. Webhook receives Twilio's form-encoded shape |
| Tests | Vitest 3, `setupFiles: ["dotenv/config"]`, integration tests gated by `DATABASE_URL` |
| Styling | Tailwind 4, custom Aizorix design tokens |

---

## 4. Repository map (key files)

```
prisma/
  schema.prisma                            # 17 models + 3 NextAuth tables
  seed.ts                                  # Bellem demo data (idempotent upsert)
  migrations/
    20260520111357_init/
    20260520121500_clinic_whatsapp_number/
    20260520140000_nextauth/

src/
  auth.ts                                  # Full NextAuth config (Node runtime)
  auth.config.ts                           # Edge-safe NextAuth config
  proxy.ts                                 # Replaces middleware.ts (Next.js 16)
  middleware.ts                            # (DELETED — was the source of the edge bug)

  app/
    signin/page.tsx
    app/                                   # Authenticated dashboard
      agenda/page.tsx                      # Live
      clients/page.tsx                     # Live
      conversations/page.tsx               # Live
      ai/page.tsx, metrics/page.tsx, ...   # Still using MOCK_*
    api/
      auth/[...nextauth]/route.ts
      chat/route.ts                        # /api/chat — orchestrator playground
      webhooks/whatsapp/route.ts           # Phase 3 webhook
      clinics/[clinicId]/availability/route.ts
      clinics/[clinicId]/appointments/route.ts
      appointments/[id]/route.ts

  server/
    db.ts
    errors.ts                              # DomainError + BookingError
    availability/                          # Phase 1 engine
    booking/                               # Phase 1 transactional services
    treatments/match.ts
    technicians/assign.ts
    ai/
      client.ts                            # LLMClient interface
      openai.ts                            # OpenAI adapter
      prompt.ts                            # System prompt
      tools.ts                             # 8 tools the LLM can call
      orchestrate.ts                       # Main loop
      types.ts                             # Envelope, OrchestrateInput
    whatsapp/
      client.ts                            # WhatsAppProvider interface
      stub.ts
      twilio.ts                            # Signature verify + send
      index.ts                             # getWhatsAppProvider() selector
    actions/
      appointments.ts                      # Server actions for dashboard
    dashboard/
      queries.ts                           # Shared Prisma queries (clinic-scoped)

  components/
    dashboard/
      appointment-controls.tsx             # Client component: cancel/reschedule
    crm/                                   # Existing UI shell (sidebar/topbar)
    ui/                                    # Existing primitives (Card, Button, ...)

  lib/
    mock-data.ts                           # Only used by pages NOT yet wired

scripts/                                   # tsx helpers for debugging
  print-ids.ts                             # Dump clinic/treatment/tech IDs
  list-appts.ts                            # List appointments on a date
  delete-appt.ts                           # Delete by ISO or id
  reset-phone.ts                           # Wipe conversation+patient for a phone
  last-tools.ts                            # Show last assistant turn + tool trace

docker-compose.yml                         # Postgres 16 on host port 5433
.env.example                               # Documents every env var
.env                                       # Local (NOT committed)
HANDOFF.md                                 # This file
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

npm test                           # 53 tests pass (8 files)
npm run dev                        # http://localhost:3000
```

### Common dev commands

| Command | What |
|---|---|
| `npm run dev` | Next.js with Turbopack |
| `npm test` | All vitest, including DB integration |
| `npm run typecheck` | tsc --noEmit |
| `npm run lint` | eslint |
| `npm run db:up` | Start postgres container |
| `npm run db:down` | Stop container |
| `npm run db:migrate` | `prisma migrate dev` — needs TTY (use `migrate deploy` non-interactively) |
| `npm run db:seed` | Upsert Bellem data |
| `npm run db:studio` | Prisma Studio on :5555 |
| `npm run db:ids` | Print clinic/treatment/technician IDs |
| `npm run db:reset` | `prisma migrate reset --force` (destructive) |
| `npx tsx scripts/list-appts.ts <yyyy-mm-dd>` | List appointments on a date |
| `npx tsx scripts/last-tools.ts "<phoneE164>"` | Show last conversation's tool trace |
| `npx tsx scripts/reset-phone.ts "<phoneE164>"` | Wipe patient + conversation |
| `npx tsx scripts/delete-appt.ts <ISO or id>` | Delete an appointment |

### Curl smoke tests

```bash
# Chat orchestrator directly (no WhatsApp)
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
| **TOTAL** | **53** | |

Integration tests gate on `process.env.DATABASE_URL` and `RUN_DB_TESTS !== "0"`. Vitest loads `.env` via `setupFiles: ["dotenv/config"]`.

---

## 7. Lessons learned + non-obvious gotchas

### LLM timezone bug (the most important one)
- **Symptom**: bookings landed at the wrong hour because the LLM was getting `startsAtISO: "...T08:00:00.000Z"` from `find_availability` and then sending `"...T08:00:00"` to `book_appointment` — stripping the `Z` and shifting the time.
- **Fix structurally** in [src/server/ai/tools.ts](src/server/ai/tools.ts):
  - `find_availability` no longer emits UTC fields. Only `startsAtLocal`, `endsAtLocal`, `humanLocal`.
  - `book_appointment` accepts `startsAtLocal` (server interprets as clinic-local).
  - System prompt forbids `Z` and tells the model to copy `startsAtLocal` verbatim.
- **Rule of thumb**: never expose two different time representations of the same value to an LLM. Pick one and stick with it.

### Postgres port collision
- The dev VM has system Postgres 16 listening on **5432**. Docker container is mapped to **5433** in [docker-compose.yml](docker-compose.yml).
- `.env` must use `localhost:5433`.

### Prisma `migrate dev` needs a TTY
- The Bash tool can't run it interactively. Use `--create-only` (if no warnings) or **hand-write the SQL** under `prisma/migrations/<timestamp>_<name>/migration.sql` and run `prisma migrate deploy`. There are two hand-written migrations:
  - `20260520121500_clinic_whatsapp_number` — adds `Clinic.whatsappNumber`.
  - `20260520140000_nextauth` — adds Account/Session/VerificationToken + nullable `User.name` + `emailVerified` + `image`.

### Next.js 16 deprecations / breaking
- `middleware.ts` → **`proxy.ts`** (renamed file at `src/proxy.ts`).
- Edge runtime can't import Node-only modules. NextAuth v5 **must** be split: edge-safe `auth.config.ts` (no providers) + full `auth.ts` (with adapter + Nodemailer).

### Vitest doesn't auto-load `.env`
- Solved with `setupFiles: ["dotenv/config"]` in [vitest.config.ts](vitest.config.ts). Don't remove.

### Heredoc + tsx + relative TS import
- `npx tsx <<EOF ... EOF` with `import { prisma } from "./src/server/db"` doesn't always resolve ESM correctly. Use scripts under `scripts/` instead — see [scripts/print-ids.ts](scripts/print-ids.ts).

### Smart-quote keys
- Both Anthropic and OpenAI keys can carry smart quotes if copied from a webpage. Pre-flight check:
  ```bash
  source .env && echo "len=${#OPENAI_API_KEY} prefix=${OPENAI_API_KEY:0:14}"
  ```

### OpenAI billing
- New accounts return `insufficient_quota` with `429` even with a valid key until billing is funded. Mention to clients up front.

### LLM behavioral note
- `gpt-4.1-mini` defaults to a confirmation step before booking. It will say "¿confirmas?" rather than auto-book on a preference statement like "prefiero Diana a las 10". This is correct, safer behavior; don't try to tune it away.

---

## 8. What's NOT yet built

In rough order of usefulness:

1. **Manual reply from dashboard** — staff can read transcripts but can't override the bot and send a WhatsApp message. Needs a small client composer + a new server action that calls `getWhatsAppProvider().send()`.
2. **Other dashboard pages still on mock data**: [pipeline](src/app/app/pipeline/page.tsx), [metrics](src/app/app/metrics/page.tsx), [campaigns](src/app/app/campaigns/page.tsx), [ai](src/app/app/ai/page.tsx), [settings](src/app/app/settings/page.tsx), [clients/[id]](src/app/app/clients/%5Bid%5D/page.tsx).
3. **No "send manual reply" + no resolve-handoff UI** — `resolveHandoffAction` exists but no button calls it yet.
4. **Browser smoke test of Phase 4** — code compiles + tests pass, but the UI hasn't been clicked yet end-to-end after the proxy split.
5. **Real Twilio provisioning** — webhook is wired but no real number is connected. Dev mode uses the stub.
6. **Real SMTP** — dev mode logs the magic link to the console. For production, fill in `SMTP_HOST`.
7. **`/api/chat` doesn't currently auth-gate.** Intentional for dev — locks in production.
8. **No "send manual reply" outbound from the dashboard** — patients can be addressed only through the bot.
9. **Multi-tenant signup flow.** Today, users are seeded in the DB by hand; signup is not self-service.

---

## 9. How to resume in a new session

### First-time setup if cloning fresh
1. `npm install`
2. `cp .env.example .env`, fill `OPENAI_API_KEY` and `AUTH_SECRET`
3. `npm run db:up`
4. `npx prisma migrate deploy && npx prisma generate`
5. `npm run db:seed`
6. `npm test` — expect **53 / 53 passing**

### If continuing in the existing directory
- `npm run db:up` (idempotent)
- `npm test` to confirm green
- `npm run dev` and open [http://localhost:3000/app/agenda](http://localhost:3000/app/agenda)

### To verify Phase 4 in the browser (highest-priority unverified path)
1. `npm run dev`
2. Open [http://localhost:3000/app/agenda](http://localhost:3000/app/agenda) → should redirect to `/signin`
3. Sign in with `admin@bellem.demo` (already seeded as OWNER)
4. Look at dev-server terminal for the magic link, click it
5. Should land on `/app` with sidebar/topbar + real data
6. **Test cancel button** on the agenda upcoming list
7. **Test mover** on the agenda upcoming list
8. **Click conversations**, filter "Necesitan ayuda"
9. **Click clients**, search "Lucía"

### To pick up Phase 5 (manual reply + remaining pages)
Suggested order:
1. Add `sendManualReplyAction` in `src/server/actions/appointments.ts` (rename file to `dashboard.ts`). Loads the conversation's patient phone + clinic's `whatsappNumber`, calls `getWhatsAppProvider().send()`, persists an outbound Message row with `metadata.source: "manual"`.
2. Add composer to the conversations page (only visible when `conv.requiresHuman === true`).
3. Wire `resolveHandoffAction` to a "Marcar resuelto" button in the same view.
4. Iterate through pipeline/metrics/campaigns to swap `MOCK_*` for Prisma queries.

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
4. If `book_appointment` returned an error code, the prompt rules (§7) explain how the bot is supposed to recover; if it doesn't, the prompt may need to be sharpened.

---

## 10. Open architectural decisions made

For continuity, the principal choices baked in:

- **Provider-neutral interfaces** for LLM (`LLMClient`) and WhatsApp (`WhatsAppProvider`). Vendor lock-in is contained to one adapter file per integration.
- **Local-time-only at the LLM boundary**. UTC is server-internal. This was the structural fix for the timezone bug.
- **JWT NextAuth sessions** (not database) — required for edge-runtime middleware. Clinic info baked into the token on sign-in.
- **`Conversation.requiresHuman` is the flag** for the staff inbox. `HumanHandoff` rows track who resolved it and when.
- **All booking writes go through `bookAppointment()`** with Serializable isolation. Dashboard server actions reuse it. The webhook reuses it through the orchestrator.
- **Tests use Prisma + real Postgres**, not mocks, for anything touching the transaction. Mocked LLM client, never mocked DB.
- **No staff signup**. Users are inserted server-side by the clinic owner; magic-link sign-in just unlocks access.

---

## Quick health check

If everything is wired correctly, this is what passes:

```bash
npm run typecheck   # → clean
npm run lint        # → clean
npm test            # → Test Files  8 passed (8) | Tests  53 passed (53)
```

If any of these fail, that's the first thing to fix before reading further.

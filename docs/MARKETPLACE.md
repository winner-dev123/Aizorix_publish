# Aizorix Marketplace — Architecture & Implementation Plan

> Design doc for the new **client ↔ technician marketplace** product. Lives
> alongside the existing per-clinic AI receptionist (`/app/*`) and the
> platform admin (`/admin/*`); reuses ~60 % of the current infra
> (auth primitives, AI orchestrator, audit log, theme/i18n, admin shell).
>
> Status: design approved, not yet implemented. The smallest viable starting
> slice is **the schema migration + matching SQL** (see §12).

---

## 0. Build strategy

The marketplace is a *different product shape* from the existing per-clinic
CRM. The chosen path is **build alongside, not pivot in place**:

| Option | Cost | Trade-off |
|---|---|---|
| Pivot existing CRM | 2–3 weeks refactor | Breaks current customer flow |
| **Build alongside** (chosen) | 4–6 weeks net-new | Shares auth, AI, admin, audit; doesn't touch CRM tables |
| Greenfield repo | 8–12 weeks | Loses every existing primitive |

All net-new tables are prefixed `Marketplace*` so they never collide with
the existing `Patient` / `Technician` / `Clinic` models.

---

## 1. System architecture

```
                       Client web (Next.js)              Technician web (Next.js)
                              │                                  │
                              │  /m/* routes                     │  /tech/* routes
                              │  client cookie session           │  technician cookie session
                              ▼                                  ▼
   ┌─────────────────────────────────────────────────────────────────────────┐
   │                  Next.js 16 — single deploy on Netlify                  │
   │                                                                         │
   │   • Existing CRM       (/app/*           — clinic users)               │
   │   • Existing admin     (/admin/*         — platform admins)            │
   │   • NEW marketplace    (/m/*             — clients)                    │
   │   • NEW technician     (/tech/*          — independent technicians)    │
   │   • NEW public REST    (/api/v1/* + /api/v1/marketplace/*)             │
   │                                                                         │
   │   server actions ─┐                                                     │
   │   API routes    ──┼─→ Prisma                                            │
   │   webhooks      ──┘                                                     │
   └────────────────────────┬─────────────────────┬──────────────────────────┘
                            │                     │
                            ▼                     ▼
              ┌──────────────────────┐   ┌──────────────────────┐
              │  PostgreSQL (Neon)   │   │  Redis (Upstash)     │
              │  + pgvector ext.     │   │  job queue, rate     │
              │                      │   │  limits, hot caches  │
              └──────────────────────┘   └──────────────────────┘
                            │
                            ▼
              ┌──────────────────────┐   ┌──────────────────────┐
              │  OpenAI / Anthropic  │   │  S3 (or R2)          │
              │  • embeddings        │   │  technician docs     │
              │  • chat completion   │   │  (presigned URLs)    │
              └──────────────────────┘   └──────────────────────┘
```

**Stack decisions (vs. the "preferred" list in the brief):**

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (already in place) | Server components co-locate data; one runtime serves all surfaces |
| DB | **PostgreSQL + pgvector** | One database for relational *and* vector search — Pinecone is overkill at MVP; pgvector handles ~1 M chunks at solid latency |
| Jobs | **pg-boss** for MVP → migrate to **BullMQ** at scale | pg-boss = zero new infra. The Redis instance you'll need anyway for rate-limits/caches can host BullMQ later when job volume justifies it |
| Storage | **Cloudflare R2** (S3-compatible) | No egress fees — cheaper than S3 for read-heavy doc serving |
| Auth | **NextAuth** (clients + technicians) + the existing `PlatformAdmin` cookie | One library to maintain, three roles via discriminator |
| AI | **OpenAI** GPT-4.1-mini + `text-embedding-3-small` | Same provider keeps one API key + one billing line |
| Vector index | **pgvector HNSW** on `DocumentChunk.embedding` | Single SQL query joins chunks + technicians + ranking — no second store to keep in sync |

---

## 2. Database schema

Below is the **net-new Prisma schema** to add on top of the existing one.
All existing tables (`Clinic`, `Patient`, `Technician`, `Appointment`, …)
stay untouched.

```prisma
// ============================================================
//  MARKETPLACE — client ↔ technician matching
// ============================================================

enum MarketplaceUserType {
  CLIENT
  TECHNICIAN
  PLATFORM_ADMIN   // mirrors existing PlatformAdmin (separate auth flow)
}

enum TechnicianTier {
  STANDARD
  PREMIUM
}

enum TechnicianStatus {
  PENDING       // signed up, not yet approved by admin
  ACTIVE        // verified, visible in search
  SUSPENDED     // admin-disabled
  ARCHIVED      // self-removed
}

enum AvailabilityStatus {
  AVAILABLE
  BUSY
  AWAY
  OFFLINE
}

enum DocumentStatus {
  PENDING        // uploaded, not yet processed
  EXTRACTING     // text extraction in flight
  CHUNKING       // splitting + embedding
  READY          // searchable
  FAILED
}

enum NotificationChannel {
  IN_APP
  EMAIL
  PUSH
  SMS
}

enum NotificationKind {
  CLIENT_INQUIRY
  AI_RECOMMENDATION
  SCHEDULE_REMINDER
  PREMIUM_EXPIRING
  ADMIN_ANNOUNCEMENT
  REPORT_READY
}

enum ScheduleKind {
  AVAILABILITY_WINDOW
  APPOINTMENT
  REPORT_RUN
  DOC_INDEX_REFRESH
  PREMIUM_EXPIRY
  REMINDER_FOLLOWUP
}

enum ScheduleStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  FAILED
  CANCELED
}

// ────────────────────────── Identities ──────────────────────────

model MarketplaceClient {
  id                String   @id @default(cuid())
  email             String   @unique
  emailVerified     DateTime?
  name              String?
  phone             String?
  avatarUrl         String?
  locale            String   @default("es")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  lastActiveAt      DateTime?

  questions         ClientQuestion[]
  notifications     Notification[]    @relation("ClientNotifications")
  appointments      MarketplaceAppointment[]

  @@index([lastActiveAt])
}

model MarketplaceTechnician {
  id                  String   @id @default(cuid())
  email               String   @unique
  emailVerified       DateTime?
  name                String
  phone               String?
  avatarUrl           String?
  locale              String   @default("es")

  tier                TechnicianTier   @default(STANDARD)
  status              TechnicianStatus @default(PENDING)
  availability        AvailabilityStatus @default(OFFLINE)

  /// Denormalised for hot-path read; recomputed by a job. Breakdown lives
  /// in RankingSnapshot for explainability.
  rankingScore        Float    @default(0)
  rankingUpdatedAt    DateTime?

  /// Admin escape hatch — boost / penalty applied on top of computed score.
  adminBoost          Float    @default(0)

  /// Premium expiry — readable by anyone; daily job flips tier→STANDARD past this.
  premiumExpiresAt    DateTime?

  profile             TechnicianProfile?
  onboarding          TechnicianOnboarding?
  documents           TechnicianDocument[]
  rankingSnapshots    RankingSnapshot[]
  availabilityWindows TechnicianAvailability[]
  receivedInquiries   ClientQuestion[]      @relation("InquiriesToTechnician")
  recommendations     TechnicianRecommendation[]
  notifications       Notification[]        @relation("TechnicianNotifications")
  appointments        MarketplaceAppointment[]
  subscriptions       Subscription[]
  reviews             TechnicianReview[]

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  lastActiveAt        DateTime?

  @@index([status, tier, rankingScore(sort: Desc)])  // primary listing query
  @@index([premiumExpiresAt])
}

model TechnicianProfile {
  technicianId    String   @id
  headline        String           // shown in search results (max ~120 chars)
  bio             String?
  yearsExperience Int?
  city            String?
  country         String?
  /// Service category keys: ["plumbing","emergency","gas-certified"].
  categories      String[]
  /// Free-form tags surfaced to clients + AI matching.
  tags            String[]
  /// Spoken languages (BCP-47): ["es","en","ca"].
  languages       String[]
  hourlyRateCents Int?
  /// Profile-completeness percentage (recomputed by trigger or job).
  completeness    Int      @default(0)

  technician      MarketplaceTechnician @relation(fields: [technicianId], references: [id], onDelete: Cascade)

  @@index([categories])
  @@index([city, country])
}

model TechnicianOnboarding {
  technicianId           String   @id
  /// Long-form description of services. Embedded for AI matching.
  services               String?
  /// Pricing, availability rules, special offers.
  notes                  String?
  /// FAQ pairs as JSON [{ q, a }] — embedded individually.
  faqs                   Json?
  /// SLA promise in minutes — used by ranking.
  responsePromiseMinutes Int?
  /// Cached embedding of services + notes + faqs so matching skips re-embedding.
  embedding              Unsupported("vector(1536)")?
  embeddingUpdatedAt     DateTime?

  technician             MarketplaceTechnician @relation(fields: [technicianId], references: [id], onDelete: Cascade)
}

// ────────────────────────── Premium / Subscriptions ──────────────────────────

model Subscription {
  id                 String   @id @default(cuid())
  technicianId       String
  externalId         String?  @unique     // Stripe id, nullable for manual upgrades
  plan               String              // "premium-monthly", "premium-annual"
  status             String              // "active", "past_due", "canceled"
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  cancelAt           DateTime?
  createdAt          DateTime @default(now())

  technician         MarketplaceTechnician @relation(fields: [technicianId], references: [id], onDelete: Cascade)

  @@index([technicianId, status])
  @@index([currentPeriodEnd])
}

model PremiumBadge {
  /// Append-only log of badge grants/revocations for audit.
  id           String   @id @default(cuid())
  technicianId String
  granted      Boolean         // true = granted, false = revoked
  reason       String          // "subscription:active", "admin:manual", "expiry"
  actorAdminId String?
  createdAt    DateTime @default(now())

  @@index([technicianId, createdAt])
}

// ────────────────────────── Documents + vector chunks ──────────────────────────

model TechnicianDocument {
  id             String   @id @default(cuid())
  technicianId   String
  filename       String
  mimeType       String
  sizeBytes      Int
  /// Path/key in R2/S3, not a public URL — fetched via presigned read.
  storageKey     String
  status         DocumentStatus  @default(PENDING)
  /// SHA-256 of bytes — skip re-processing on duplicate upload.
  contentHash    String
  title          String?
  /// Error detail when status=FAILED so admins/technicians can debug.
  errorMessage   String?
  uploadedAt     DateTime @default(now())
  processedAt    DateTime?

  technician     MarketplaceTechnician @relation(fields: [technicianId], references: [id], onDelete: Cascade)
  chunks         DocumentChunk[]

  @@unique([technicianId, contentHash])  // idempotency on re-upload
  @@index([status])
  @@index([technicianId, uploadedAt(sort: Desc)])
}

model DocumentChunk {
  id           String   @id @default(cuid())
  documentId   String
  technicianId String          // denormalised for fast filtered vector search
  ord          Int             // chunk position (0-indexed) — for citation
  text         String          // plain text, ~500 tokens after splitting
  embedding    Unsupported("vector(1536)")

  document     TechnicianDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@index([documentId, ord])
  // HNSW vector index declared in raw migration (Prisma doesn't model it):
  //   CREATE INDEX document_chunk_embedding_hnsw
  //     ON "DocumentChunk" USING hnsw (embedding vector_cosine_ops);
}

// ────────────────────────── AI conversation flow ──────────────────────────

model ClientQuestion {
  id                 String   @id @default(cuid())
  clientId           String
  text               String
  inferredCategories String[]
  urgency            String?               // "low" | "normal" | "high" | "emergency"
  embedding          Unsupported("vector(1536)")?
  pickedTechnicianId String?
  createdAt          DateTime @default(now())

  client             MarketplaceClient @relation(fields: [clientId], references: [id], onDelete: Cascade)
  pickedTechnician   MarketplaceTechnician? @relation("InquiriesToTechnician", fields: [pickedTechnicianId], references: [id], onDelete: SetNull)
  aiResponses        AiResponse[]
  recommendations    TechnicianRecommendation[]

  @@index([clientId, createdAt(sort: Desc)])
  @@index([pickedTechnicianId])
}

model AiResponse {
  id               String   @id @default(cuid())
  questionId       String
  text             String              // body shown to client
  model            String              // for cost/latency telemetry
  promptTokens     Int
  completionTokens Int
  latencyMs        Int
  /// JSON list of `{ chunkId, score }` actually surfaced to the model.
  sourceChunks     Json?
  createdAt        DateTime @default(now())

  question         ClientQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)
}

model TechnicianRecommendation {
  id           String   @id @default(cuid())
  questionId   String
  technicianId String
  score        Float           // 0-1 relevance (semantic + ranking blend)
  position     Int             // 0-based — used for CTR
  clicked      Boolean  @default(false)
  contacted    Boolean  @default(false)
  createdAt    DateTime @default(now())

  question     ClientQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)
  technician   MarketplaceTechnician @relation(fields: [technicianId], references: [id], onDelete: Cascade)

  @@unique([questionId, technicianId])
  @@index([technicianId, createdAt(sort: Desc)])
}

// ────────────────────────── Ranking (append-only snapshots) ──────────────────────────

model RankingSnapshot {
  id                   String   @id @default(cuid())
  technicianId         String
  premiumPoints        Float
  completenessPoints   Float
  responseSpeedPoints  Float
  ratingPoints         Float
  jobsPoints           Float
  aiRelevancePoints    Float
  adminBoostPoints     Float
  inactivityPenalty    Float
  totalScore           Float
  /// Snapshot of inputs that produced the score (denormalised, useful for
  /// "explain why my rank changed" UI for technicians).
  inputs               Json
  computedAt           DateTime @default(now())

  technician           MarketplaceTechnician @relation(fields: [technicianId], references: [id], onDelete: Cascade)

  @@index([technicianId, computedAt(sort: Desc)])
}

model TechnicianReview {
  id           String   @id @default(cuid())
  technicianId String
  clientId     String?              // null for admin-curated reviews
  rating       Int                  // 1..5
  text         String?
  status       String   @default("PENDING")   // PENDING | APPROVED | REJECTED
  createdAt    DateTime @default(now())

  technician   MarketplaceTechnician @relation(fields: [technicianId], references: [id], onDelete: Cascade)

  @@index([technicianId, status])
}

// ────────────────────────── Schedules ──────────────────────────

model TechnicianAvailability {
  /// Weekly schedule used by clients to see when a technician is reachable
  /// and by ranking to penalise "offline always".
  id           String   @id @default(cuid())
  technicianId String
  dayOfWeek    Int                   // 0..6
  startMinutes Int                   // 0..1439 local
  endMinutes   Int

  technician   MarketplaceTechnician @relation(fields: [technicianId], references: [id], onDelete: Cascade)

  @@index([technicianId, dayOfWeek])
}

model MarketplaceAppointment {
  id           String   @id @default(cuid())
  technicianId String
  clientId     String
  startAt      DateTime
  endAt        DateTime
  status       String   @default("CONFIRMED")  // CONFIRMED | CANCELED | COMPLETED | NO_SHOW
  notes        String?

  technician   MarketplaceTechnician @relation(fields: [technicianId], references: [id], onDelete: Cascade)
  client       MarketplaceClient     @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@index([technicianId, startAt])
  @@index([clientId, startAt])
}

model ScheduledStatus {
  /// Unified status table for everything time-bound admins want to see:
  /// doc indexing, reports, premium expiry, reminders.
  id           String         @id @default(cuid())
  kind         ScheduleKind
  status       ScheduleStatus @default(SCHEDULED)
  /// Subject id — meaning depends on `kind`. For DOC_INDEX_REFRESH it's a
  /// TechnicianDocument id, for PREMIUM_EXPIRY a MarketplaceTechnician id.
  subjectId    String
  scheduledFor DateTime
  startedAt    DateTime?
  completedAt  DateTime?
  errorMessage String?
  meta         Json?

  @@index([status, scheduledFor])
  @@index([kind, subjectId])
}

// ────────────────────────── Notifications ──────────────────────────

model Notification {
  id           String              @id @default(cuid())
  kind         NotificationKind
  channel      NotificationChannel @default(IN_APP)
  /// Exactly one of these is set — disambiguated at insertion.
  clientId     String?
  technicianId String?
  title        String
  body         String?
  href         String?
  deliveredAt  DateTime?
  failedReason String?
  readAt       DateTime?
  createdAt    DateTime            @default(now())

  client       MarketplaceClient?      @relation("ClientNotifications", fields: [clientId], references: [id], onDelete: Cascade)
  technician   MarketplaceTechnician?  @relation("TechnicianNotifications", fields: [technicianId], references: [id], onDelete: Cascade)

  @@index([clientId, createdAt(sort: Desc)])
  @@index([technicianId, createdAt(sort: Desc)])
}

// ────────────────────────── Reports ──────────────────────────

model Report {
  /// Stored as a JSON blob so the schema can evolve without migrations.
  id           String   @id @default(cuid())
  kind         String              // "platform-daily", "technician-monthly", …
  technicianId String?             // NULL for platform-wide
  periodStart  DateTime
  periodEnd    DateTime
  data         Json
  createdAt    DateTime @default(now())

  @@index([technicianId, kind, periodStart(sort: Desc)])
  @@index([kind, periodStart(sort: Desc)])
}

model SystemJob {
  /// Convenience surface over pg-boss for the admin UI — pg-boss owns the
  /// queue, we mirror state here for audit + dashboards.
  id         String   @id @default(cuid())
  name       String              // "doc.index", "ranking.recompute", "report.platform.daily"
  status     String              // "queued", "active", "completed", "failed"
  payload    Json?
  result     Json?
  error      String?
  startedAt  DateTime?
  finishedAt DateTime?
  createdAt  DateTime @default(now())

  @@index([status, createdAt])
  @@index([name, createdAt(sort: Desc)])
}
```

**Audit log**: reuse the existing `AuditLog` table; make `clinicId` nullable
so marketplace events (no clinic) fit. Add a migration to drop the
`NOT NULL` constraint.

**Migration extras** (raw SQL, since Prisma doesn't model these):

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE INDEX document_chunk_embedding_hnsw
  ON "DocumentChunk"
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX technician_onboarding_embedding_hnsw
  ON "TechnicianOnboarding"
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX client_question_embedding_hnsw
  ON "ClientQuestion"
  USING hnsw (embedding vector_cosine_ops);
```

---

## 3. Permission matrix

| Resource | Admin | Client | Technician (STANDARD) | Technician (PREMIUM) |
|---|---|---|---|---|
| All technicians (list) | ✓ | ✓ public profiles only | ✗ self only | ✗ self only |
| Technician private (onboarding/notes) | ✓ | ✗ | ✓ self | ✓ self |
| All clients (list) | ✓ | ✗ self only | ✗ only clients who contacted them | ✗ only clients who contacted them |
| Client question (read) | ✓ | ✓ own | ✓ if pickedTechnicianId = self | ✓ if pickedTechnicianId = self |
| AI response logs | ✓ all | ✓ own | ✓ where own technician was recommended | ✓ |
| Recommendations | ✓ all | ✓ own | ✓ where own technician was rec'd | ✓ |
| Ranking score (read) | ✓ all + breakdown | ✗ | ✓ own + breakdown | ✓ own + breakdown |
| Ranking — admin boost | ✓ write | ✗ | ✗ | ✗ |
| Premium badge (grant/revoke) | ✓ | ✗ | ✗ | ✗ |
| Subscription (read) | ✓ all | ✗ | ✓ own | ✓ own |
| Upload documents | ✓ on behalf | ✗ | ✗ **blocked at backend** | ✓ |
| Read own documents | ✓ all | ✗ | ✓ self (none expected) | ✓ self |
| Other technicians' documents | ✓ | ✗ | ✗ | ✗ (AI may surface content but not the doc itself) |
| Schedules — own | ✓ all | ✓ own appointments | ✓ self | ✓ self |
| Schedules — others' | ✓ | ✗ | ✗ | ✗ |
| Reports — platform-wide | ✓ | ✗ | ✗ | ✗ |
| Reports — own performance | ✓ all | ✗ | ✓ self | ✓ self |
| Notifications — own | ✓ all | ✓ own | ✓ own | ✓ own |
| System jobs / scheduled statuses | ✓ all | ✗ | ✗ self-relevant only | ✗ self-relevant only |
| Suspend/approve technician | ✓ | ✗ | ✗ | ✗ |
| Edit own profile | ✓ all | ✓ own | ✓ self | ✓ self |

**Enforcement model**:

- Every server action / API route ends with a guard call:
  `requireRole(session, "admin" | "client" | "technician")` returning a typed context.
- Tenant filter is `where: { … }` — the guard returns the scoped id
  (e.g. `technicianId`) and every query *must* include it. Add a Vitest
  unit test per route that asserts cross-tenant access returns 404.
- Premium-gated routes (e.g. document upload) re-check `tier === "PREMIUM"`
  server-side. Frontend hiding the button is UX, not security.

---

## 4. API routes

### Client surface — `/api/v1/m/*`

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/m/ask` | Submit a client question → AI response + recommendations |
| GET | `/api/v1/m/questions` | List own past questions |
| GET | `/api/v1/m/questions/:id` | Question + AI response + recommendations |
| POST | `/api/v1/m/questions/:id/click/:technicianId` | Record click for CTR |
| POST | `/api/v1/m/contact` | Notify a technician + open a thread |
| GET | `/api/v1/m/technicians/:id` | Public profile (heavy denorm) |
| GET | `/api/v1/m/technicians?category=…&q=…` | Browse (Premium-first, ranked) |
| GET | `/api/v1/m/notifications` | Own notifications |

### Technician surface — `/api/v1/tech/*`

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/tech/me` | Own profile + tier + status + score |
| PATCH | `/api/v1/tech/me/profile` | Update marketing profile |
| PATCH | `/api/v1/tech/me/onboarding` | Update private onboarding — triggers re-embedding |
| GET | `/api/v1/tech/me/inquiries` | Clients who contacted me |
| GET | `/api/v1/tech/me/inquiries/:id` | Single inquiry thread (filtered by `pickedTechnicianId = self`) |
| POST | `/api/v1/tech/me/inquiries/:id/reply` | Reply to a client |
| GET | `/api/v1/tech/me/ranking` | Own score + latest breakdown |
| GET | `/api/v1/tech/me/reports?period=…` | Own performance reports |
| GET | `/api/v1/tech/me/notifications` | Own notifications |
| POST | `/api/v1/tech/me/documents` | **PREMIUM only** — presigned upload URL |
| GET | `/api/v1/tech/me/documents` | List own docs + status |
| DELETE | `/api/v1/tech/me/documents/:id` | Remove a doc (cascades chunks) |
| PATCH | `/api/v1/tech/me/availability` | Weekly windows + AVAILABLE/BUSY/AWAY flag |

### Admin surface — `/api/v1/admin/*` (gated by existing `PlatformAdmin` cookie)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/dashboard` | KPI bundle (counts, conversion, errors) |
| GET | `/api/v1/admin/technicians` | List + filter (tier, status) |
| PATCH | `/api/v1/admin/technicians/:id` | Status (APPROVE / SUSPEND), admin boost, manual badge |
| GET | `/api/v1/admin/clients` | List |
| GET | `/api/v1/admin/ai-logs` | AI responses + token usage |
| GET | `/api/v1/admin/scheduled` | All scheduled statuses |
| GET | `/api/v1/admin/reports/platform` | Platform-wide reports |
| POST | `/api/v1/admin/ranking/recompute` | Manually trigger a ranking pass |
| GET | `/api/v1/admin/jobs` | pg-boss queue surface |
| POST | `/api/v1/admin/notifications` | Broadcast |

### Public REST API (already built)

Reuse the existing `azx_live_…` Bearer-token model from
[../src/server/api-auth.ts](../src/server/api-auth.ts). Add token scopes:

- `marketplace:tech:read` — list public technicians
- `marketplace:client:write` — push a client question via API (e.g. embed widget)
- `full` — still grants everything for backward compat

---

## 5. AI recommendation flow

```
Client submits a question
        │
        ▼
POST /api/v1/m/ask
        │
        ▼
1. Persist ClientQuestion (no embedding yet)
        │
        ▼
2. Single OpenAI call (low-cost):
   "Classify this question. Return JSON:
    { categories: string[], urgency: ..., language: ..., needsClarification: bool }"
        │
        ▼
3. If needsClarification → return clarifying question to client, no recs yet.
   Else → update ClientQuestion.{inferredCategories, urgency}.
        │
        ▼
4. Embed the question (text-embedding-3-small) → 1536-dim vector.
   Save as ClientQuestion.embedding.
        │
        ▼
5. Candidate pool (one SQL query):
   SELECT t.id, t.tier, t.rankingScore,
          MIN(o.embedding <=> $1) AS onboarding_distance,
          MIN(dc.embedding <=> $1) AS doc_distance
     FROM "MarketplaceTechnician" t
     LEFT JOIN "TechnicianOnboarding"  o  ON o.technicianId  = t.id
     LEFT JOIN "DocumentChunk"        dc ON dc.technicianId = t.id
     WHERE t.status = 'ACTIVE'
       AND t.availability != 'OFFLINE'
       AND (
         t.categories && $categories::text[]   -- overlap any category
         OR onboarding_distance < 0.35
         OR doc_distance       < 0.35
       )
     GROUP BY t.id
     ORDER BY
       t.tier = 'PREMIUM' DESC,                -- premium-first ALWAYS
       (t.rankingScore * 0.5
        + (1 - LEAST(COALESCE(onboarding_distance, 1),
                     COALESCE(doc_distance, 1))) * 0.5) DESC
     LIMIT 10;
        │
        ▼
6. For each candidate, fetch the TOP-K most-relevant chunks (k≈4 across the
   candidate's docs + onboarding). Build a context block per technician:
        "TECHNICIAN: <name>
         CATEGORIES: ...
         ONBOARDING: <relevant excerpt>
         FROM DOCUMENTS: <chunk 1> ... <chunk K>"
        │
        ▼
7. Generation call (GPT-4.1-mini). System prompt enforces:
     - Recommend only from the candidate list (no hallucinated technicians).
     - Cite which technician fits, in 1-2 sentences each.
     - Never expose chunk text from non-candidate technicians.
     - Detect language from question; respond in same language.
   Returns reply text + ordered technician list with relevance scores.
        │
        ▼
8. Persist:
     • AiResponse (text, tokens, latency, sourceChunks)
     • TechnicianRecommendation rows (questionId, technicianId, score, position)
        │
        ▼
9. Return to client:
   { reply, recommendations: [{ technicianId, name, headline, score, badge, … }] }
```

**Privacy guarantees built into the prompt**:

- System prompt explicitly says: *"You may only reference content from the
  candidate technicians provided in this turn. Do not name or describe any
  technician outside this list. Do not reveal contents of private
  onboarding fields unless paraphrasing as a recommendation."*
- The candidate filter at step 5 is the only way chunks enter the model's
  context. Cross-technician leakage is impossible because no other
  technician's chunks are in the prompt.

---

## 6. Document upload → indexing flow

```
Technician (PREMIUM) clicks "Upload"
        │
        ▼
POST /api/v1/tech/me/documents
   body: { filename, mimeType, sizeBytes }
        │
        ▼
Server checks:
   • tier === "PREMIUM"          (403 otherwise)
   • sizeBytes <= 20 MB
   • mimeType in {pdf, docx, txt, md}
   • technician hasn't exceeded plan quota
        │
        ▼
Insert TechnicianDocument row with status=PENDING + a presigned PUT URL.
        │
        ▼
Client uploads bytes directly to R2/S3 (skips Next.js — saves bandwidth).
        │
        ▼
PUT /api/v1/tech/me/documents/:id/complete   (called after upload finishes)
   Enqueue pg-boss job: "doc.index" { documentId }
   Create ScheduledStatus { kind: DOC_INDEX_REFRESH, subjectId: docId }
        │
        ▼
Worker picks up the job:
   1. Update status=EXTRACTING
   2. Fetch from R2 → temp file
   3. Extract text:
        • pdf  → pdf-parse
        • docx → mammoth
        • txt/md → readFile
   4. status=CHUNKING
   5. Split into ~500-token chunks with 50-token overlap (langchain-style).
   6. For each chunk batch (100 at a time):
        embed via openai.embeddings.create({ model: "text-embedding-3-small" })
        bulk insert DocumentChunk rows
   7. status=READY, processedAt = now()
        │
        ▼
Audit log + notify technician ("Your document is ready").
        │
        ▼
On failure at any step: status=FAILED with errorMessage, notify technician,
job retried by pg-boss up to 3× with exponential backoff.
```

---

## 7. Ranking algorithm

Implemented in a single function `computeRanking(technicianId, inputs)`
that returns a `RankingSnapshot`. Triggered by:

- `ranking.recompute.one` job after relevant input changes (profile update,
  doc upload completes, review approved, manual boost)
- `ranking.recompute.all` daily cron — full sweep

```ts
// src/server/marketplace/ranking.ts
const WEIGHTS = {
  premium:           30,
  completeness:      20,   // 0..1 scaled
  responseSpeed:     15,   // inverse of median reply minutes, capped
  rating:            20,   // (avgRating - 1) / 4 * weight
  jobs:              15,   // logarithmic — diminishing returns
  aiRelevance:       30,   // rolling 30-day avg cosine similarity
  inactivityPenalty: -20,
};

function compute(inputs: RankingInputs): RankingSnapshot {
  return {
    premiumPoints:       inputs.tier === "PREMIUM" ? WEIGHTS.premium : 0,
    completenessPoints:  inputs.profileCompleteness * WEIGHTS.completeness,
    responseSpeedPoints: Math.min(1, 60 / Math.max(15, inputs.medianResponseMinutes ?? 999)) * WEIGHTS.responseSpeed,
    ratingPoints:        ((inputs.avgRating ?? 3) - 1) / 4 * WEIGHTS.rating,
    jobsPoints:          Math.log10(1 + (inputs.completedJobs ?? 0)) * WEIGHTS.jobs,
    aiRelevancePoints:   (inputs.rollingAiRelevance ?? 0) * WEIGHTS.aiRelevance,
    adminBoostPoints:    inputs.adminBoost,
    inactivityPenalty:   inputs.daysSinceActive > 14 ? WEIGHTS.inactivityPenalty : 0,
    totalScore:          /* sum of above */,
    inputs,
  };
}
```

**Why flexible**: weights live in a single `WEIGHTS` const exported from
one module. Future "experiment with new formula" workflows can write to a
`RankingFormula` table without touching code.

**Listing query then uses**:
`ORDER BY tier = 'PREMIUM' DESC, rankingScore DESC` — Premium tier
*always* sorts above STANDARD regardless of score, then score within tier.

---

## 8. Reporting system

Reports are pre-computed daily and stored as JSON blobs in `Report`.
Three kinds:

| Kind | Scope | Cron |
|---|---|---|
| `platform-daily` | platform-wide | nightly at 02:00 UTC |
| `technician-monthly` | per-technician | 1st of month |
| `technician-rolling-7d` | per-technician | nightly |

Each `data` blob has a stable shape so the UI can render without a schema
migration:

```ts
type PlatformDaily = {
  generatedAt: string;
  questions: {
    total: number;
    byUrgency: Record<string, number>;
    topCategories: { key: string; count: number }[];
  };
  recommendations: { total: number; clickThroughRate: number; contactRate: number };
  technicians: { active: number; pending: number; premium: number; standard: number };
  ai: { totalTokens: number; medianLatencyMs: number; errorCount: number };
  jobs: { failed: number; succeeded: number; pendingOldest: string | null };
  notifications: { sent: number; failed: number };
};
```

The admin dashboard reads the *latest* `platform-daily` row instead of
computing live — keeps page-load fast even with millions of historical
rows.

---

## 9. Scheduled job inventory

| Job name | Trigger | Frequency |
|---|---|---|
| `doc.index` | document upload completes | event |
| `embedding.refresh` | technician edits onboarding | event (debounced 5 min) |
| `ranking.recompute.one` | profile / doc / review change | event |
| `ranking.recompute.all` | cron | daily 01:00 |
| `report.platform.daily` | cron | daily 02:00 |
| `report.technician.daily` | cron, fanned out per tech | daily 02:15 |
| `premium.expiry.check` | cron | hourly |
| `notification.deliver` | event | event |
| `notification.retry` | failed deliveries | every 10 min |
| `availability.reaper` | mark inactive if no ping in 24h | hourly |
| `cleanup.failed-docs` | pg-boss housekeeping | weekly |

All run on **pg-boss** for MVP; the admin "Scheduled statuses" page reads
from `ScheduledStatus` + `SystemJob`.

---

## 10. Frontend route map

### Client app — `/m/*`
```
/m                           landing + "ask a question" hero
/m/ask                       full ask form
/m/results/:questionId       AI reply + recommended technicians
/m/technicians/:id           public technician profile
/m/inbox                     past questions & threads
/m/inbox/:questionId         conversation with a technician
/m/notifications
/m/account
/m/signin
```

### Technician app — `/tech/*`
```
/tech                         dashboard (inquiries, score, badge)
/tech/inquiries               list (filterable)
/tech/inquiries/:id           single thread
/tech/profile                 public profile editor
/tech/onboarding              private onboarding editor (drives AI embedding)
/tech/availability            weekly schedule + AVAILABLE/BUSY/AWAY toggle
/tech/documents               PREMIUM ONLY — upload + list + status
/tech/ranking                 score breakdown + 30-day chart
/tech/reports                 own performance
/tech/premium                 upgrade page + subscription mgmt
/tech/notifications
/tech/signin
```

### Admin app — `/admin/*` (extending what's already built)
```
/admin                          dashboard (current)
/admin/clinics                  current
/admin/patients                 current
/admin/technicians               current
                                ── NEW additions ──
/admin/marketplace              marketplace dashboard
/admin/marketplace/technicians  manage tier, status, boost, badge
/admin/marketplace/clients
/admin/marketplace/inquiries
/admin/marketplace/ai-logs
/admin/marketplace/documents    cross-technician
/admin/marketplace/ranking      explain a score; recompute
/admin/marketplace/scheduled    all ScheduledStatus rows
/admin/marketplace/reports
/admin/marketplace/jobs         pg-boss surface
/admin/marketplace/subscriptions
/admin/marketplace/notifications
```

---

## 11. Implementation roadmap

### MVP (4–6 weeks, single dev)

The MVP is what gets the loop end-to-end: a client asks → AI recommends →
premium-first ranking → client contacts → technician responds.

**Week 1 — Foundation**
- Migrate schema (run `prisma migrate dev` with the block above + enable pgvector)
- Add `Role` discriminator to auth: extend NextAuth so `signIn` can route to
  client/technician
- Build `/m/signin` + `/tech/signin` + client/technician session shapes
- Permission helpers: `requireClient()`, `requireTechnician()`,
  `requirePremiumTechnician()`

**Week 2 — Client question loop**
- `POST /api/v1/m/ask` (classify → embed → match → respond)
- `/m/ask` + `/m/results/:id` pages
- AI matching SQL with pgvector
- TechnicianRecommendation persistence

**Week 3 — Technician workspace + private onboarding**
- `/tech/profile`, `/tech/onboarding` editors
- Onboarding embedding job (pg-boss)
- `/tech/inquiries` with strict `pickedTechnicianId = self` filter
- Reply flow

**Week 4 — Ranking + premium**
- `computeRanking()` + the cron
- Stripe-or-manual Premium toggle (admin can flip the tier flag for MVP —
  Stripe can come later)
- Premium-first sort in listing query
- `/tech/ranking` page with breakdown
- Admin gets: `/admin/marketplace/technicians` to approve PENDING, set boost,
  toggle tier

**Week 5 — Documents (Premium only)**
- R2/S3 presigned upload
- `doc.index` pipeline (pdf-parse + mammoth)
- DocumentChunk + HNSW index
- AI matching reads from chunks
- `/tech/documents` UI

**Week 6 — Reporting + notifications + polish**
- Daily report cron + Report table
- Notifications inbox per role
- Admin `/admin/marketplace/*` pages
- Audit log integration
- End-to-end smoke tests

### Post-MVP (next quarter)

- Reviews (`TechnicianReview` is in schema; needs UI + moderation)
- Real-time inquiry inbox (Pusher or SSE for the technician inbox)
- Stripe subscription provider integration (replace manual tier toggle)
- AI cost guardrails per technician
- Embed widget for technicians to put on their own websites
- Multi-language UI (extend existing i18n dictionaries to client/tech surfaces)
- Mobile app — point at the existing public REST API

### Future improvements

- Re-rank with a small fine-tuned cross-encoder (better than pure cosine)
- Conversation summarisation for long threads
- AI-generated technician profile suggestions from their docs (Premium upsell)
- Marketplace SEO pages (public profiles indexed by Google)
- Multi-region (regional Postgres + R2)
- Background-job dashboard with retry/cancel from admin

---

## 12. Smallest meaningful starting slice

Smallest meaningful slice that proves the loop: **the Prisma schema
migration + the classify→embed→match→respond SQL**. Once that's in place,
every other piece is additive UI/jobs on top of a working data layer.

Recommended order to start coding:

1. Write the migration (Prisma + raw `CREATE EXTENSION` + HNSW index SQL).
2. Write `src/server/marketplace/match.ts` — the matching function with
   tests against a seed of 10 fake technicians.
3. Write `src/server/marketplace/ranking.ts` — the formula with tests.
4. Stand up the `/api/v1/m/ask` endpoint using the existing `api-auth`
   pattern from [../src/server/api-auth.ts](../src/server/api-auth.ts).

Once `/api/v1/m/ask` returns a ranked list, every later piece (technician
dashboard, documents, reporting) plugs into a working core.

---

## 13. Open questions

1. **Anonymous ask vs. signed-in ask** — can clients submit a question
   without an account and only sign up at the "contact" step? This affects
   whether `MarketplaceClient.email` is `NOT NULL` and whether
   `ClientQuestion.clientId` is required.
2. **Geo scoping** — is matching global or per-city? If per-city, the
   listing query gets a `city` filter and we need to handle "no technicians
   nearby" gracefully.
3. **Languages** — should the AI always respond in the client's language
   even if no candidate technician speaks it? Current proposal: yes, with
   a flag on each rec saying "language match".
4. **Premium pricing model** — flat fee, percentage of jobs, lead-based?
   Affects the `Subscription` table fields.
5. **Document quota for Premium** — per-doc, per-page, per-MB? Determines
   whether we need a `usage` table.

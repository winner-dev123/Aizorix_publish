# Aizorix Public REST API — v1

The public REST API exposes Aizorix domain operations (patients,
appointments, treatments, technicians, conversations) to external
clients — CRM connectors, mobile apps, partner integrations.

It's the gateway for the **Base Espejo** hybrid-CRM strategy: external
systems push contacts here, pull conversations and appointments here,
and the Aizorix internal frontend continues to use its own server
actions in parallel. Both surfaces read/write the same Postgres
database.

---

## Base URL

```
https://aizorix.ai/api/v1
```

(Locally, `http://localhost:3000/api/v1`.)

---

## Authentication

Every endpoint requires a Bearer token:

```http
Authorization: Bearer azx_live_<random>
```

### Token properties

- **Per clinic.** Each token belongs to exactly one clinic and the API
  surface is automatically scoped to that clinic. Cross-clinic data is
  unreachable — even if a token is misused, it can't see anyone else's
  records.
- **Stored hashed.** Only `SHA-256(rawToken)` sits in the DB. The raw
  value is shown to the user once at creation and never recoverable. If
  it's lost, generate a new one and revoke the old one.
- **Auditable.** Every API call writes to `audit_log` with
  `metadata.via = "api-token:<name>"`, so the operator can see which
  token did what.
- **Revokable.** Delete the token row → it stops working immediately
  (no caching).
- **Optionally expiring.** Tokens can carry an `expiresAt`; the
  middleware returns `401 token_expired` after that date.

### Scopes (future-proofing)

v1 ships with a single scope, `full` — full read/write across the
clinic's data. The schema and middleware (`requireScope`) already
support finer-grained scopes; adding `patients:read`, `appointments:write`,
etc. is additive and won't break existing tokens.

### Creating a token (until the UI ships)

For now, tokens are minted directly via the database. A self-service
settings page is on the roadmap.

```ts
import { generateRawToken, hashToken, tokenPrefix } from "@/server/api-auth";
import { prisma } from "@/server/db";

const raw = generateRawToken();
await prisma.apiToken.create({
  data: {
    clinicId: "<clinic-id>",
    tokenHash: hashToken(raw),
    prefix: tokenPrefix(raw),
    name: "HubSpot prod",
    scopes: ["full"],
  },
});
console.log(raw); // SHOW ONCE — store this securely; it's not recoverable.
```

---

## Error shape

Every non-2xx response follows the same shape:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Body failed validation",
    "issues": [{ "path": "phone", "message": "Invalid" }]
  }
}
```

| Status | When                                                         | Common `code`s                 |
| ------ | ------------------------------------------------------------ | ------------------------------ |
| 400    | Malformed request (bad JSON, missing content-type)           | `invalid_json`                 |
| 401    | Authentication failed (missing/invalid/expired token)        | `missing_token`, `invalid_token`, `token_expired` |
| 403    | Authenticated but lacking the required scope                 | `missing_scope`                |
| 404    | Resource doesn't exist or isn't visible to this token's clinic | `not_found`                    |
| 409    | Conflict (e.g. duplicate phone)                              | `already_exists`               |
| 422    | Request body fails Zod validation                            | `validation_failed`            |
| 429    | Rate limited (planned — not yet enforced)                    | `rate_limited`                 |
| 500    | Bug. Safe to retry idempotently.                             | `internal_error`               |

Clients should treat unknown `code` values as opaque — only the HTTP
status is part of the contract.

---

## Endpoints

### `POST /api/v1/patients` — create a patient

Creates a new patient in the authenticated token's clinic. The endpoint
that a CRM connector calls when a new contact appears in the source
system.

**Request body**

| Field       | Type                    | Required | Notes                                    |
| ----------- | ----------------------- | -------- | ---------------------------------------- |
| `firstName` | string (1–120)          | ✓        |                                          |
| `phone`     | string (E.164)          | ✓        | `+34611000000` — see the regex `^\+\d{8,15}$` |
| `lastName`  | string (0–120)          |          |                                          |
| `email`     | string (RFC 5322)       |          | lowercased server-side                   |
| `dob`       | string (`YYYY-MM-DD`)   |          | date only, no time                       |
| `notes`     | string (0–2000)         |          |                                          |
| `source`    | string (0–60)           |          | shown as "Origen" in the CRM. Defaults to `"api"`. |

**Response 201**

```json
{
  "id": "clxxxxx",
  "firstName": "Laura",
  "lastName": "García",
  "phone": "+34611000099",
  "email": "laura@example.com",
  "dob": "1990-04-12",
  "notes": null,
  "source": "hubspot",
  "status": "LEAD",
  "createdAt": "2026-05-30T12:34:56.000Z"
}
```

**Duplicate phone** → `409 already_exists` with `error.patientId`
pointing at the existing record. Treat as success in idempotent sync
flows.

**Example: curl**

```bash
curl -X POST https://aizorix.ai/api/v1/patients \
  -H "Authorization: Bearer azx_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Laura",
    "lastName": "García",
    "phone": "+34611000099",
    "email": "laura@example.com",
    "source": "hubspot"
  }'
```

---

## Roadmap

The following endpoints are next; each will follow the same
auth / validation / audit pattern established by `POST /api/v1/patients`:

- `GET    /api/v1/patients?q=…&limit=…&cursor=…` — list/search
- `GET    /api/v1/patients/{id}` — read
- `PATCH  /api/v1/patients/{id}` — update
- `DELETE /api/v1/patients/{id}` — soft-delete
- `GET    /api/v1/appointments?from=…&to=…&technicianId=…`
- `POST   /api/v1/appointments`
- `GET    /api/v1/treatments`
- `GET    /api/v1/technicians`
- `GET    /api/v1/conversations`
- `POST   /api/v1/conversations/{id}/messages`

Plus operational additions:

- Per-token rate limiting (already infrastructure-ready via
  `src/server/rate-limit.ts`)
- Webhooks the other direction — Aizorix → external systems on
  patient/appointment/conversation events
- OpenAPI 3.1 spec at `/api/v1/openapi.json`
- A self-service token management UI at `/app/settings/api`

---

## Versioning

`v1` is stable. Breaking changes (renamed fields, removed endpoints,
changed status codes) ship as `v2` at a new path. Additive changes
(new optional fields, new endpoints) ship in place.

When `v2` lands, `v1` remains supported for at least 6 months with a
deprecation header (`Sunset:` per RFC 8594) on every response.

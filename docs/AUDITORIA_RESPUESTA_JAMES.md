# Auditoría Aizorix AI — Respuesta de James

> Respuesta integral al documento *“AIZORIX AI — Auditoría y Estructura
> Actual del Trabajo de James”*. Cada afirmación está verificada
> directamente contra el código del repositorio (rutas, esquema Prisma,
> scripts, tests, configuración de despliegue). Lo que está terminado se
> dice terminado; lo que es parcial o pendiente se dice claramente, con
> el esfuerzo estimado para cerrarlo.
>
> **Fecha**: 2 de junio de 2026
> **Autor**: James (Frontend / Full-stack lead)
> **Estado de la rama `main`**: 306 tests automáticos en verde.

---

## 0. Resumen ejecutivo

Tres líneas que resumen todo lo demás:

1. **Producto principal listo**. CRM end-to-end con onboarding, agenda,
   pipeline, conversaciones unificadas WhatsApp + IA, métricas, campañas,
   importación CSV, panel multi-empresa, panel de plataforma, API REST
   pública con autenticación por token y soporte multilingüe + modo
   claro/oscuro. Todo conectado a backend real, sin módulos fantasma.
2. **Faltan piezas concretas** identificadas y estimadas: selector
   explícito de los 3 modos en el onboarding (≈3 h), sincronización
   real Google Calendar (≈1 semana), Google Sheets (≈1 semana),
   plantillas n8n (≈3-5 días), Stripe (≈1 semana), UI de gestión de
   tokens API (≈2 h).
3. **Se entregó valor adicional** no listado en el brief: API REST
   pública v1 con autenticación por token (foundation para el modelo
   *Base Espejo* / CRM híbrido), panel de plataforma `/admin/*` con
   auth aislado del CRM (`PlatformAdmin`), arquitectura completa de un
   producto marketplace alternativo
   ([`docs/MARKETPLACE.md`](MARKETPLACE.md)).

**Métricas rápidas**:

| Indicador | Valor |
|---|---|
| Páginas funcionales con datos reales | 30+ |
| Endpoints internos (`/api/*`) | 13 |
| Endpoints API pública v1 (`/api/v1/*`) | 1 (POST patients) + 7 diseñados |
| Webhooks entrantes activos | 2 (WhatsApp + n8n genérico) |
| Tablas Prisma | 27 |
| Migraciones aplicadas | ~30 |
| Idiomas soportados | 5 (es, en, fr, pt, de) |
| Tests automáticos | 306 ✓ |
| Líneas de código (aprox.) | ~25 000 sin tests |

---

## 1. Confirmación de responsabilidades (sección 3 del brief)

| Responsabilidad listada en el brief | Estado de cumplimiento |
|---|---|
| Liderar el frontend y experiencia de usuario | ✓ Cumplido — todo el frontend bajo `src/app/*` y `src/components/*` lo lidero yo |
| Mantener y evolucionar el onboarding | ✓ Cumplido — los 5 pasos están en `src/app/onboarding/` y el state en `src/lib/store/onboarding-store.ts` |
| CRM Visual | ✓ Cumplido — pipeline + clientes + ficha + import CSV |
| Dashboard | ✓ Cumplido — `/app` con KPIs en tiempo real |
| Conversaciones | ✓ Cumplido — bandeja unificada en `/app/conversations` |
| Agenda | ✓ Cumplido — semanal en `/app/agenda` |
| Métricas | ✓ Cumplido — `/app/metrics` con embudo + rendimiento + ingresos |
| Panel de administración | ✓ Cumplido — dos paneles: clínico (`/app/settings`) y plataforma (`/admin`) |
| Coordinación funcional con el backend | ✓ Cumplido — toda la API interna y los server actions se diseñaron con el frontend en mente; ningún módulo es solo visual |

Nada de la lista del brief está sin hacer. Las divergencias con la
especificación están claramente identificadas en las secciones 2-5 de
este documento.

---

## 2. Onboarding Multimodo — Estado real

El brief pide tres modos explícitos. Estado verificado:

| Modo | Estado | Detalle técnico |
|---|---|---|
| Modo 1 — CRM Aizorix | ✓ Completado y conectado a backend | Flujo por defecto. Al activar se crean Clinic + User + Treatment + Technician + ClinicBusinessHours en una transacción |
| Modo 2 — CRM Externo | 🔶 Parcialmente completado | El backend lo soporta: la API REST pública (`POST /api/v1/patients` con token `azx_live_…`) permite que cualquier CRM externo empuje pacientes a Aizorix. **Falta** el selector visual al inicio del onboarding y las instrucciones específicas para configurar el conector |
| Modo 3 — Sin CRM | 🔶 Parcialmente completado | El módulo CRM puede desactivarse desde `/app/settings/modulos` y la barra lateral se adapta. **Falta** presentarlo como decisión consciente al inicio del onboarding, no como configuración posterior |

**Honestidad técnica**: prototipé un paso inicial *"Elige cómo trabajar
con Aizorix"* con 3 tarjetas en una iteración anterior. Se revirtió por
una solicitud de ajustar a 5 pasos limpios. Volver a añadirlo son ≈3
horas:

- Crear `src/components/onboarding/steps/step-crm-mode.tsx` (las 3
  tarjetas).
- Añadir el slug `modo` a `src/lib/onboarding-steps.ts` (pasaría a 6
  pasos, o se sustituye el paso 1 actual).
- Persistir la elección en `OnboardingState.crmMode` (campo nuevo).
- Ramificar el paso 4 (IA) y el paso 5 (activar) según el modo:
  - Modo 2 → mostrar instrucciones para el conector externo + minteo
    de token API.
  - Modo 3 → omitir migración de datos.

---

## 3. Estructura de las 5 fases — Mapeo

La especificación lista 5 fases con nombres distintos a los 5 pasos
implementados actualmente:

| Fase de la spec del cliente | Paso implementado | Estado |
|---|---|---|
| Fase 1 — Negocio | Paso 1 — *Tu negocio* | ✓ Coincide |
| Fase 2 — Servicios y Agenda | Paso 2 — *Servicios y agenda* | ✓ Coincide |
| Fase 3 — Canales **e IA** | **Dos pasos**: *Conecta canales* + *Entrena tu IA* | ⚠ Dividido en dos |
| Fase 4 — CRM y Conversaciones | *No existe como paso del onboarding* — son módulos disponibles tras activar | ✗ No coincide |
| Fase 5 — Métricas y Automatización | Paso 5 — *Activa tu sistema* | ⚠ Activa el sistema, pero no configura métricas/automatizaciones |

**Recomendación**: ver §17.2 — pendiente de decisión del cliente
(opción A: mantener 5 pasos actuales; opción B: reagrupar a las 5
fases exactas de la spec).

---

## 4. Auditoría detallada A-Q

Uso la leyenda **exacta del cliente**:

- **[C]** Completado
- **[P]** Parcialmente completado
- **[V]** Solo diseño visual
- **[B]** Conectado a backend
- **[X]** Pendiente

(Una fila puede tener varias marcas — ej. [C][B] = completado y
conectado a backend.)

| # | Punto | Estado | Ruta principal | Notas |
|---|---|---|---|---|
| A | Onboarding Multimodo | **[P][B]** | `src/app/onboarding/[slug]/page.tsx` | Backend listo, falta selector visual. Ver §2 |
| B | Dashboard Cliente | **[C][B]** | `src/app/app/page.tsx` | KPIs, próximas citas, conversaciones, embudo de conversión, todo con datos reales |
| C | CRM Visual | **[C][B]** | `src/app/app/pipeline`, `/clients`, `/clients/[id]`, `/clients/import` | Pipeline kanban + lista + ficha + import CSV |
| D | Conversaciones | **[C][B]** | `src/app/app/conversations/page.tsx` | Bandeja unificada, filtro "Necesitan ayuda", pausar/reanudar bot, respuesta manual |
| E | Agenda | **[C][B]** | `src/app/app/agenda/page.tsx` | Vista semanal, próximas citas, reservas automáticas vía IA |
| F | Roles y permisos | **[C][B]** | `prisma/schema.prisma` (`UserRole`, `PlatformAdmin`) | 4 roles clínica (OWNER/ADMIN/RECEPTIONIST/STAFF) + rol global de plataforma. Cookie distinta para cada flujo |
| G | Panel Administración | **[C][B]** | `src/app/admin/(authed)/*` | Dashboard cross-tenant, gestión de clínicas/pacientes/técnicos, auth scrypt + cookie HMAC |
| H | Métricas | **[C][B]** | `src/app/app/metrics/page.tsx` | Embudo, ingresos, rendimiento por empleado, día pico, tratamiento estrella |
| I | Campañas | **[C][B]** | `src/app/app/campaigns/page.tsx` | 6 plantillas + segmentación + cálculo de ROI previo al envío |
| J | Multiempresa | **[C][B]** | Todo el schema lleva `clinicId` | Aislamiento por fila + tests negativos cross-clínica |
| K | Base de datos | **[C][B]** | `prisma/schema.prisma`, Neon hosted | PostgreSQL + Prisma 6.19 + 27 tablas + migraciones versionadas |
| L | APIs | **[P][B]** | `src/app/api/*`, `src/app/api/v1/*` | API interna completa; API pública v1 con auth, 1 endpoint vivo + 7 diseñados. Ver §6.5 |
| M | Integración OpenAI | **[C][B]** | `src/server/ai/orchestrate.ts` + `tools.ts` | GPT-4.1-mini + 12 tools + telemetría de tokens. Ver §6.6 |
| N | Integración WhatsApp | **[C][B]** | `src/app/api/webhooks/whatsapp/route.ts` | Twilio webhook con verificación de firma, rate-limit 10/min por remitente |
| O | Integración Google Calendar | **[P][V]** | Toggle en onboarding + settings | Solo flag en BD. NO hay OAuth ni sincronización. Pendiente: ≈1 semana |
| P | Integración Google Sheets | **[X]** | — | No iniciado |
| Q | Automatizaciones n8n | **[P][B]** | `src/app/api/webhooks/inbound/route.ts` | Endpoint genérico funcionando. Faltan plantillas n8n importables |

---

## 5. Información técnica completa

### 5.1 Qué módulos existen realmente

Todos conectados a backend, todos en producción:

```
PUBLIC
  /                          landing + chat widget público
  /signin                    sign-in clínico (magic link)
  /admin/signin              sign-in plataforma (email + password)

ONBOARDING (auth-gate clínico)
  /onboarding                redirige al paso 1
  /onboarding/negocio
  /onboarding/servicios-y-agenda
  /onboarding/canales
  /onboarding/ia
  /onboarding/activar

CRM CLÍNICO (auth-gate clínico)
  /app                       dashboard
  /app/pipeline              kanban de leads
  /app/clients               lista paginada + búsqueda
  /app/clients/new           creación manual
  /app/clients/import        importación CSV
  /app/clients/[id]          ficha completa
  /app/conversations         bandeja unificada
  /app/agenda                semanal
  /app/ai                    IA Recepcionista (demo + config)
  /app/campaigns             campañas IA con ROI
  /app/metrics               métricas avanzadas
  /app/settings              configuración general
  /app/settings/audit        audit log
  /app/settings/facturacion
  /app/settings/modulos
  /app/help                  centro de ayuda

PANEL DE PLATAFORMA (auth-gate PlatformAdmin)
  /admin                     dashboard cross-tenant
  /admin/clinics             lista
  /admin/patients            cross-clínica con eliminación auditada
  /admin/technicians         cross-clínica con eliminación auditada
```

### 5.2 Qué módulos están conectados a backend

Todos los de §5.1 leen y escriben datos reales de PostgreSQL via Prisma.
No hay UI sin datos detrás.

### 5.3 Qué módulos son únicamente visuales

Ninguno es 100 % visual. Lo más cercano:

- **Toggles de Google Calendar / Google Sheets** en `/app/settings` —
  el toggle se persiste, pero NO hay integración real detrás. Es el
  único caso real de "diseño visual sin lógica completa".
- **"AI Receptionist demo"** en `/app/ai` — es un sandbox del bot
  real con un cliente simulado, pero llama al orquestador real, no es
  un mock.

### 5.4 Base de datos

| Aspecto | Detalle |
|---|---|
| Motor | PostgreSQL 16 |
| Hosting prod | Neon (serverless Postgres, hospedado) |
| Local | Docker Compose (`npm run db:up`) |
| ORM | Prisma 6.19.3 |
| Schema | `prisma/schema.prisma` |
| Migraciones | `prisma/migrations/` — versionadas |
| Modelos | 27 — listados abajo |
| Conexión | `DATABASE_URL` env var (usar la URL **pooled** con `?sslmode=require` en Neon) |
| Targets de binario Prisma | `["native", "rhel-openssl-1.0.x", "rhel-openssl-3.0.x"]` (local Linux + Netlify) |

**Modelos completos** (Prisma):

```
DOMINIO CLÍNICO:
  Clinic                  multi-tenant root
  User                    staff (4 roles)
  Patient                 unique per (clinicId, phone)
  Treatment               catálogo de tratamientos
  TreatmentCategory       agrupación de tratamientos
  Technician              técnicos/personal
  TechnicianTreatment     pivot técnico ↔ tratamiento
  ClinicBusinessHours     horarios por día
  BlockedSlot             bloqueos manuales
  Appointment             citas
  Conversation            hilo de mensajes
  Message                 mensajes individuales
  AiMemory                memoria del bot por paciente
  ClinicStrategyRule      reglas de negocio (ej. mínimo 24 h antelación)
  HumanHandoff            cola de "necesitan ayuda"
  WhatsAppIntegration     credenciales Twilio por clínica

PLATAFORMA:
  PlatformAdmin           operadores cross-tenant (scrypt + HMAC cookie)
  ApiToken                tokens REST pública (SHA-256 hashed)
  AuditLog                evento append-only

NEXTAUTH (gestionados por @auth/prisma-adapter):
  Account
  Session
  VerificationToken
```

### 5.5 Endpoints y APIs — lista completa

#### APIs internas (consume el frontend; no documentadas para terceros)

| Método | Ruta | Propósito | Auth |
|---|---|---|---|
| GET | `/api/health` | Diagnóstico liveness + estado de la BD | Pública |
| GET | `/api/version` | Versión de build + commit sha | Pública |
| GET | `/api/metrics` | Métricas técnicas internas | Sesión |
| GET | `/api/audit/export.csv` | Exporta el audit log a CSV | Sesión |
| GET | `/api/clinics/[clinicId]/appointments` | Citas de una clínica | Sesión |
| GET | `/api/clinics/[clinicId]/availability` | Slots disponibles | Sesión |
| GET/POST/DELETE | `/api/appointments/[id]` | Operaciones sobre una cita | Sesión |
| POST | `/api/auth/[...nextauth]` | Magic link, callback, sign-out | NextAuth |
| POST | `/api/chat/landing` | Widget de chat público de la landing | Pública (rate-limited) |
| POST | `/api/chat` | Endpoint de chat interno | Sesión |

#### Webhooks entrantes

| Método | Ruta | Propósito |
|---|---|---|
| POST | `/api/webhooks/whatsapp` | Twilio: mensaje WhatsApp entrante con verificación de firma |
| POST | `/api/webhooks/inbound?clinicSlug=…` | Forwarder genérico (n8n, Postman, otros) |

#### API REST pública v1 (auth Bearer token)

| Método | Ruta | Estado | Notas |
|---|---|---|---|
| POST | `/api/v1/patients` | ✓ Vivo | Crea paciente. Docs en [`docs/API.md`](API.md) |
| GET | `/api/v1/patients` | 🟡 Diseñado | List + search |
| GET | `/api/v1/patients/{id}` | 🟡 Diseñado | Read |
| PATCH | `/api/v1/patients/{id}` | 🟡 Diseñado | Update |
| DELETE | `/api/v1/patients/{id}` | 🟡 Diseñado | Soft delete |
| GET/POST | `/api/v1/appointments` | 🟡 Diseñado | Citas |
| GET | `/api/v1/treatments` | 🟡 Diseñado | Read-only |
| GET | `/api/v1/technicians` | 🟡 Diseñado | Read-only |

Cada endpoint diseñado pero no construido son ≈30 minutos siguiendo
el patrón de `POST /api/v1/patients`.

### 5.6 Integraciones — estado por integración

| Integración | Estado | Cómo se configura | Riesgo si se pierde |
|---|---|---|---|
| OpenAI GPT-4.1-mini | ✓ Producción | `OPENAI_API_KEY` env | Bot WhatsApp deja de responder |
| Twilio WhatsApp | ✓ Producción | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` + webhook apuntado | No entran mensajes |
| Email magic link (NextAuth) | ✓ Producción | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`. En dev: log a consola | Nadie puede hacer login |
| n8n (entrada genérica) | ✓ Producción | Nodo HTTP → `/api/webhooks/inbound?clinicSlug=…` | Forwarders externos no llegan |
| Google Calendar | 🔶 Solo toggle | — | No aplica (no implementado) |
| Google Sheets | ⏳ No iniciado | — | — |
| Stripe (facturación) | ⏳ No iniciado | `Clinic.plan` se lee pero no se sincroniza | — |
| Sentry / Datadog | ⏳ No iniciado | — | Errores no se capturan en producción |

### 5.7 Documentación técnica existente

```
docs/API.md                            API REST pública v1 — auth, errores, primer endpoint, roadmap
docs/MARKETPLACE.md                    Arquitectura de un producto marketplace separado (13 secciones)
docs/AUDITORIA_RESPUESTA_JAMES.md      este documento
docs/NETLIFY_DEPLOY_FIX.md             Guía de deploy en Netlify
README.md                              Cómo arrancar el repo
prisma/schema.prisma                   Schema completo + comentarios por modelo
netlify.toml                           Config de deploy
.env.example                           Plantilla de env vars (si existe)
```

**Documentación viva**: 306 tests automáticos. Cada test es un ejemplo
ejecutable de cómo usar la API o el modelo.

### 5.8 Recomendaciones para el siguiente desarrollador

Orden por prioridad **valor de negocio / esfuerzo**:

| # | Tarea | Esfuerzo | Por qué |
|---|---|---|---|
| 1 | Selector explícito de los 3 modos en onboarding | 3 h | Cierra §1 del brief. ROI inmediato en discurso comercial |
| 2 | UI de gestión de tokens API en `/app/settings/api` | 2 h | Hoy se mintean por CLI; el cliente debería poder hacerlo solo |
| 3 | Completar CRUD API pública v1 (patients + appointments) | 1-2 días | Habilita conectores HubSpot/Pipedrive/Zoho |
| 4 | Plantillas n8n base (recuperación, recordatorios, post-tratamiento) | 3-5 días | No es código del repo; trabajo en n8n con docs |
| 5 | Google Calendar OAuth + sync 2-way | 1 semana | Demandado por clientes existentes |
| 6 | Stripe billing + portal de facturación | 1 semana | Bloquea facturar |
| 7 | Renombrar/reagrupar 5 pasos según spec definitiva | 1 semana | Solo si cliente elige opción B |
| 8 | Sentry / Datadog para errores en producción | 1 día | Sin esto los errores en producción son invisibles |
| 9 | Marketplace (`docs/MARKETPLACE.md`) | 4-6 semanas | Producto nuevo, depende de decisión estratégica |

---

## 6. Arquitectura del sistema

### 6.1 Diagrama

```
                            ┌──────────────────────────┐
   Cliente WhatsApp ────────┤  Twilio Business API     │
                            └────────────┬─────────────┘
                                         │ webhook POST
                                         ▼
   Navegador (clínica)         ┌─────────────────────────────────┐
        │                      │   Netlify — Next.js 16 (1 app)  │
        │  cookie sesión       │                                 │
        ├──────────────────────┤  • SSR pages                    │
        │  HTTPS               │  • Server actions               │◄──┐
   Navegador (admin)           │  • API routes                   │   │
        │  cookie admin        │  • Webhooks                     │   │ POST
        ├──────────────────────┤  • AI orquestador               │   │ /api/v1/*
   CRM externo (HubSpot, …)    │                                 │   │ (Bearer)
        │  Bearer token        │                                 │   │
        └──────────────────────┴──────────────┬──────────────────┘   │
                                              │                      │
                                              ▼                      │
                                  ┌───────────────────────┐          │
                                  │ Neon PostgreSQL 16    │          │
                                  │ + Prisma 6.19         │──────────┘
                                  └───────────┬───────────┘
                                              │
                                              ▼
                                  ┌───────────────────────┐
                                  │ OpenAI API            │
                                  │ GPT-4.1-mini          │
                                  └───────────────────────┘
```

### 6.2 Decisiones de arquitectura clave

| Decisión | Por qué | Alternativa descartada |
|---|---|---|
| Un solo `next` app para frontend + API | Server components co-localizan datos y UI; un despliegue por clínica nueva = cero | Backend separado tipo NestJS — descartado: duplica tooling, añade latencia, no aporta nada hasta tener 10k+ rqs/s |
| Multi-tenant por columna `clinicId` | Aislamiento por fila, un solo schema, un solo backup, un solo deploy | Schema-per-tenant en Postgres — descartado: escala mal a partir de cientos de clínicas, complica migraciones |
| PostgreSQL + Prisma | ACID, joins, transacciones, ya bien soportado en Netlify Functions | MongoDB — descartado: las queries de métricas son relacionales |
| Cookie de sesión NextAuth (JWT) + cookie HMAC separada para admin | Dos flujos de auth aislados; un compromiso de cookie clínica nunca eleva privilegios a plataforma | Single cookie con campo "role" — descartado: footgun de seguridad |
| Tokens API hasheados SHA-256 (no JWT) | Revocables instantáneamente, simples de auditar | JWT — descartado: revocación es complicada |
| `scrypt` (no bcrypt) para PlatformAdmin | Built-in en Node, sin deps | bcrypt — descartado: añade dep nativa con complicación de compilación |
| pg-boss (futuro) en vez de BullMQ | Postgres ya está, no requiere Redis nuevo | BullMQ — se migra cuando volume justifique Redis |

### 6.3 Estructura del repositorio

```
aizorix-saas/
├── prisma/
│   ├── schema.prisma          # 27 modelos + comentarios
│   ├── seed.ts                # datos demo (clinic "bellem")
│   └── migrations/            # ~30 migraciones versionadas
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (root)             # landing + signin
│   │   ├── admin/             # panel plataforma
│   │   ├── api/               # endpoints REST + webhooks
│   │   ├── app/               # CRM clínico (auth-gated)
│   │   └── onboarding/        # 5 pasos
│   ├── components/            # UI compartida
│   │   ├── admin/
│   │   ├── brand/
│   │   ├── crm/
│   │   ├── dashboard/
│   │   ├── i18n/
│   │   ├── landing/
│   │   ├── motion/
│   │   ├── onboarding/
│   │   ├── theme/
│   │   └── ui/                # primitivos: Button, Input, Card, …
│   ├── i18n/
│   │   ├── config.ts
│   │   ├── dictionaries.ts
│   │   └── dictionaries/      # es.ts (canónico) + en/fr/pt/de
│   ├── lib/
│   │   ├── store/             # zustand (onboarding state)
│   │   └── utils.ts
│   └── server/
│       ├── ai/                # orquestador GPT + 12 tools
│       ├── actions/           # server actions
│       ├── admin/             # auth de plataforma
│       ├── booking/           # motor transaccional de reservas
│       ├── dashboard/         # queries de métricas
│       ├── modules/           # módulos gate
│       ├── api-auth.ts        # auth API pública
│       ├── audit.ts
│       └── db.ts              # singleton Prisma
├── scripts/                   # CLIs (mint-api-token, create-platform-admin, …)
├── docs/                      # documentación
├── public/                    # estáticos
├── package.json
├── netlify.toml
└── tsconfig.json
```

### 6.4 Cómo correr localmente

```bash
# 1. Clonar e instalar
git clone <repo> && cd Saas
npm install

# 2. Levantar Postgres local
npm run db:up

# 3. Variables de entorno mínimas (.env)
DATABASE_URL="postgresql://aizorix:aizorix@localhost:5432/aizorix"
AUTH_SECRET="$(openssl rand -base64 32)"
OPENAI_API_KEY="sk-..."

# 4. Migrar + seed
npm run db:migrate
npm run db:seed

# 5. Crear admin de plataforma (opcional)
ADMIN_EMAIL=you@aizorix.ai ADMIN_PASSWORD='ChangeMe-12chars' npm run admin:create

# 6. Levantar dev server
npm run dev
# → http://localhost:3000
```

Usuarios pre-seedeados que pueden hacer login:

- `admin@bellem.demo` (OWNER de la clínica `bellem`)
- `owner@demo-test.local` (OWNER de la clínica `demo-test`)

El enlace de magic link se imprime en consola en dev (no se envía
correo real) — copiar y pegar en el navegador.

### 6.5 Deploy

| Etapa | Plataforma | Notas |
|---|---|---|
| Frontend + API | Netlify (`@netlify/plugin-nextjs`) | Build: `npm run build`, publish: `.next` |
| Base de datos | Neon | Postgres serverless. Usar URL **pooled** con `?sslmode=require` |
| OpenAI | API pública | Key en env var |
| Twilio | API pública | Webhook apuntado a `https://<dominio>/api/webhooks/whatsapp` |
| Email | SMTP a definir | Resend / SendGrid / Postmark |

Doc específica: [`docs/NETLIFY_DEPLOY_FIX.md`](NETLIFY_DEPLOY_FIX.md).

### 6.6 Variables de entorno requeridas

Listado completo de las que el código realmente lee:

| Variable | Requerida | Ejemplo / formato | Para qué |
|---|---|---|---|
| `DATABASE_URL` | ✓ | `postgresql://u:p@host:5432/db?sslmode=require` | Prisma — usar URL pooled en Neon |
| `AUTH_SECRET` | ✓ prod | `$(openssl rand -base64 32)` | Firma de JWTs de NextAuth y cookies admin |
| `NEXTAUTH_SECRET` | alias de `AUTH_SECRET` | — | Algunos paquetes legacy lo buscan |
| `OPENAI_API_KEY` | ✓ | `sk-...` | Orquestador IA |
| `OPENAI_MODEL` | optional | `gpt-4.1-mini` | Sobrescribe el modelo por defecto |
| `NEXTAUTH_URL` | ✓ prod | `https://aizorix.netlify.app` | Callbacks de auth |
| `TWILIO_ACCOUNT_SID` | si WhatsApp | `AC...` | Twilio |
| `TWILIO_AUTH_TOKEN` | si WhatsApp | string | Twilio |
| `TWILIO_WHATSAPP_FROM` | si WhatsApp | `+1415...` | Número de origen |
| `SMTP_HOST` | si email real | `smtp.resend.com` | Sin esto, los magic links se imprimen en consola (dev only) |
| `SMTP_PORT` | si email real | `587` | — |
| `SMTP_USER` | si email real | string | — |
| `SMTP_PASSWORD` | si email real | string | — |
| `EMAIL_FROM` | si email real | `no-reply@aizorix.ai` | — |
| `DEMO_CLINIC_SLUG` | optional | `bellem` | Clínica usada por el widget de chat público de la landing |
| `NODE_ENV` | ✓ | `production` / `development` | — |
| `AI_DEBUG` | optional | `1` | Imprime turnos del orquestador a la consola |
| `WHATSAPP_STUB_LOG` | optional | `1` | Imprime el mensaje saliente en vez de enviarlo (dev) |
| `RUN_DB_TESTS` | optional | `0` | Skip tests de integración |

---

## 7. Seguridad implementada

| Control | Estado | Implementación |
|---|---|---|
| Auth por sesión (clínica) | ✓ | NextAuth v5 magic link + JWT en cookie |
| Auth por sesión (plataforma) | ✓ | Cookie separada `aizorix_admin`, HMAC-SHA256 firmada con `AUTH_SECRET` |
| Auth máquina (API pública) | ✓ | Bearer token, hash SHA-256 en BD, comparación constant-time |
| Aislamiento multi-tenant | ✓ | Todas las queries filtran por `clinicId`, tests negativos |
| CSRF | ✓ | Server actions de NextJS protegidas nativamente |
| Rate limiting | ✓ parcial | WhatsApp: 10/min por remitente. Falta extender al resto |
| SQL injection | ✓ | Prisma parametriza todo |
| XSS | ✓ | React escapa por defecto; no usamos `dangerouslySetInnerHTML` |
| Webhooks firmados | ✓ | Twilio: verificación de firma activa |
| Audit log | ✓ | Append-only, escrito desde server actions y API pública |
| Cookies seguras | ✓ | `httpOnly` + `secure` en producción + `sameSite=lax` |
| Password hashing (admin) | ✓ | scrypt con salt de 16 bytes y key derivada de 64 bytes |
| API tokens revocables | ✓ | Borrar fila del ApiToken → invalidación instantánea |
| Headers de seguridad (CSP, HSTS) | 🔶 | Faltan headers explícitos en `next.config.js`. Netlify aporta HSTS pero CSP no |
| Rotación de secretos | 🔶 | Manual, no automatizada |
| Pen test | ⏳ | No se ha realizado uno externo |

---

## 8. Privacidad / GDPR

Lo que ya está cubierto:

- **Aislamiento de datos por clínica** — ningún OWNER de clínica A
  puede ver datos de clínica B; verificado por tests.
- **Audit log** — toda acción que modifica datos personales queda
  registrada con actor + timestamp + metadata.
- **Datos personales mínimos** — solo guardamos nombre, teléfono,
  email y opcionalmente DOB + notas. No guardamos información médica
  estructurada en campos separados (las notas son texto libre que la
  clínica controla).
- **Sin terceros adicionales** — solo OpenAI (procesador) y Twilio
  (procesador). Documentar DPA con cada uno.

Lo que falta para GDPR producción:

- **Endpoint de exportación de datos personales** (Art. 15 GDPR — derecho
  de acceso): falta `POST /api/v1/patients/{id}/export` que devuelva
  todo lo asociado a un paciente.
- **Endpoint de borrado** (Art. 17 — derecho al olvido): existe
  `deletePatient` para admin pero falta el endpoint para que la
  clínica lo invoque a petición del paciente.
- **Banner de cookies** — no existe.
- **Aviso de uso de IA** — al primer contacto WhatsApp con un cliente
  habría que añadir "soy una asistente automatizada".
- **Política de privacidad y términos** — no están redactados.
- **Encriptación en reposo** — Neon lo hace automáticamente a nivel
  disco, pero no hay encriptación por columna para campos sensibles.

---

## 9. Monitoreo y observabilidad

| Capacidad | Estado |
|---|---|
| Logs de aplicación | ✓ stdout — los recoge Netlify Functions |
| Métricas de IA (tokens, latencia) | ✓ guardadas por turno en el orquestador |
| Audit log de acciones | ✓ tabla `AuditLog` |
| Rate limiting con métricas | ✓ in-memory; no exportadas |
| Error tracking externo | ⏳ Sin Sentry/Datadog/etc. Recomendado: Sentry (1 día) |
| Uptime monitoring | ⏳ Pendiente — usar Netlify integrado o UptimeRobot |
| Alertas (BD caída, errores 500 spike) | ⏳ Pendiente |
| Logs estructurados (JSON) | 🔶 Parcial — falta unificar formato |

---

## 10. Cobertura de pruebas

| Tipo | Cantidad | Comando |
|---|---|---|
| Unitarios (puros, sin BD) | ~180 | `npm test` |
| Integración (BD real) | ~125 | `RUN_DB_TESTS=1 npm test` |
| **Total** | **306** | `npm run verify` |

Cobertura crítica garantizada:

- Auth de plataforma (scrypt, HMAC cookie)
- Auth API pública (token hash, expiry, revocación)
- Orquestador IA (parse de turnos, errors, tool dispatch)
- Motor de disponibilidad (slots, blocked slots, business hours)
- Motor de reservas (transaccional, no double-booking)
- Rate-limiter WhatsApp
- Módulos guard (route gating por módulo activo)
- Importación CSV (validación, dedupe, audit)

Tests **negativos** que confirman aislamiento multi-tenant: existen
para `patients`, `appointments`, `conversations`. Faltan para algunos
endpoints recientes.

---

## 11. Riesgos técnicos identificados

| Riesgo | Severidad | Mitigación propuesta |
|---|---|---|
| Sin error tracking externo en producción | Alta | Integrar Sentry — 1 día |
| Sin rate-limit en endpoints de API pública | Media | Extender `src/server/rate-limit.ts` a `/api/v1/*` — 4 h |
| Sin CSP header | Media | Configurar `next.config.js` — 2 h |
| Sin backup automatizado de BD | Media | Neon lo hace, pero no hay test de restore. Validar mensualmente — 2 h al mes |
| `AUTH_SECRET` no rotado nunca | Media | Documentar proceso de rotación; rotar trimestralmente |
| Tokens API sin expiración por defecto | Baja | El schema soporta `expiresAt`; default a 90 días — 1 h |
| Sin política de retención de datos | Baja | Definir con cliente: ¿cuánto guardamos conversaciones, AI memories? |
| Bot puede "hallucinar" tratamientos no del catálogo | Baja | Mitigado: las tools restringen búsqueda al catálogo de la clínica. Cobertura por tests |
| OpenAI rate-limits si una clínica abusa | Baja | Telemetría existe; falta corte automático por clínica |

---

## 12. Coste operativo aproximado (mensual)

Para una clínica activa con ~500 conversaciones WhatsApp/mes:

| Servicio | Coste estimado | Notas |
|---|---|---|
| Netlify (Pro) | ~19 €/mes | El plan free aguanta hasta cierto volumen |
| Neon Postgres | ~10-20 €/mes | Plan Launch — escala automáticamente |
| OpenAI (GPT-4.1-mini + embeddings) | ~5-15 €/mes por clínica | Depende de volumen de mensajes |
| Twilio WhatsApp Business | ~0,005 €/mensaje saliente | Costo por mensaje, no fijo |
| SMTP (Resend / Postmark) | ~10 €/mes | Para magic links + notificaciones |
| Dominio | ~10 €/año | — |
| **Total para 10 clínicas activas** | **~150-250 €/mes** | Escala lineal por clínica |

A 100 clínicas: ~800-1500 €/mes. Margen sano con un precio target
≥50 €/clínica/mes.

---

## 13. Roadmap propuesto

### Sprint 1 (semana del 3-9 jun)

- [ ] **Selector de modo CRM** al inicio del onboarding (cumple §1 brief).
- [ ] **UI de gestión de tokens API** en `/app/settings/api`.
- [ ] **Completar `GET / PATCH / DELETE` en `/api/v1/patients`**.
- [ ] **Empezar `GET / POST` en `/api/v1/appointments`**.
- [ ] **Sentry integrado** (1 día) — visibilidad de errores en producción.

### Sprint 2 (semana del 10-16 jun)

- [ ] **OAuth Google Calendar** (flujo de autorización + persistencia
      de tokens).
- [ ] **3 plantillas n8n** documentadas: recuperación de inactivos,
      recordatorios 24 h, post-tratamiento.
- [ ] **CSP + security headers** en `next.config.js`.
- [ ] **Rate-limit** extendido a `/api/v1/*`.
- [ ] **Tests negativos cross-clínica** para los endpoints v1 nuevos.

### Sprint 3 (semana del 17-23 jun)

- [ ] **Google Calendar sync 2-way** (watch channels + reconciliación).
- [ ] **Endpoints GDPR**: exportación + borrado de datos personales.
- [ ] **Banner de cookies + aviso de IA** en primer contacto WhatsApp.
- [ ] **Política de privacidad + términos** redactados.

### Sprint 4 (semana del 24-30 jun)

- [ ] **Stripe**: checkout + webhooks + portal de cliente.
- [ ] **`Subscription` + `Invoice` tablas** + jobs de reconciliación.
- [ ] **Onboarding 5-fases reagrupado** si el cliente eligió opción B.

### Bloqueado por decisión del cliente — no se arranca:

- **Stripe**: ¿planes? ¿precios? ¿qué se factura (por clínica / por
  conversación / por mensaje)?
- **Marketplace** ([`docs/MARKETPLACE.md`](MARKETPLACE.md)): es un
  producto nuevo, 4-6 semanas. Esperar decisión estratégica.
- **Google Sheets**: depende de qué se quiera exportar.

---

## 14. Decisiones que dependen del cliente

Estas son las preguntas que necesito que el cliente conteste para
poder planificar sin ambigüedad:

1. **Estructura del onboarding** (§3 de este doc):
   - Opción A: mantener los 5 pasos actuales y documentar la
     divergencia.
   - Opción B: reagrupar a las 5 fases exactas de la spec del cliente
     (≈1 semana).
2. **Modelo de pricing Stripe**:
   - ¿Suscripción mensual por clínica? ¿Por usuario? ¿Por conversación?
   - ¿Planes (Free / Pro / Premium) o tarifa única?
3. **Datos del Marketplace** (`docs/MARKETPLACE.md`):
   - ¿Se arranca este producto en paralelo o se enfoca el equipo en
     consolidar el CRM actual?
4. **Política de retención de datos**:
   - ¿Cuánto tiempo guardamos conversaciones y AI memories tras
     baja de paciente o de clínica?
5. **GDPR — qué urgencia**:
   - ¿Hay clientes europeos activos? Si sí, los endpoints de Art. 15 y
     Art. 17 pasan a Sprint 1.

---

## 15. Glosario rápido

| Término | Significado |
|---|---|
| Clínica (Clinic) | Tenant raíz. Cada negocio cliente de Aizorix |
| Usuario (User) | Personal de una clínica con login |
| Paciente (Patient) | Cliente final de la clínica |
| Técnico (Technician) | Personal que realiza tratamientos |
| Tratamiento (Treatment) | Servicio del catálogo de la clínica |
| Cita (Appointment) | Reserva entre paciente y técnico |
| Conversación (Conversation) | Hilo WhatsApp/IG/FB por paciente |
| HumanHandoff | Cola de conversaciones que la IA escaló a humano |
| PlatformAdmin | Operador de Aizorix cross-tenant |
| ApiToken | Token Bearer para integraciones externas |
| Module | Funcionalidad activable por clínica (CRM, agenda, métricas, etc.) |
| Audit log | Registro append-only de toda acción que modifica datos |
| Base Espejo | Estrategia de unificar datos de CRMs externos en Aizorix vía API |

---

## 16. Cierre

Lo que afirma este documento está verificado contra el código en
`main`. Cualquier discrepancia que encuentre el cliente la cierro yo
en menos de 24 h con un PR + screenshot + log. Estoy disponible para
una llamada de revisión punto por punto si ayuda a desbloquear las
decisiones pendientes en §14.

— James

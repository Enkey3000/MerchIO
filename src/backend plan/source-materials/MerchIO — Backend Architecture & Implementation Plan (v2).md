# MerchIO — Backend Architecture & Implementation Plan (v2)

Prepared for CodeByXO · Reflects the current web app, public homepage, React Native mobile app and Electron desktop app

> **What changed since v1.** The product is now named MerchIO and has four working front ends (web app, homepage, mobile, desktop). All of them run business rules **in the client**, from one shared JavaScript engine, with data in localStorage, AsyncStorage or a local file. This plan moves those rules to a server, keeps the clients fast and offline-capable, and gives every platform the same API. “Native backend” means the on-device layer (local DB, sync, secure storage, OS integrations) in front of that central backend.

---

## 0. Baseline: what exists today and what it implies

| Asset | Current state | Backend implication |
| --- | --- | --- |
| Web app (`merchio-app.html`) | Single file; global state object saved to localStorage; validation, stock effects, workflows, scheduler and chatbot all in the browser | Extract the rules into a shared domain package; the server becomes the authority |
| Shared engine (`engine.js`) | Same rules ported into the mobile app (AsyncStorage) | Becomes `packages/domain`, used by API, workers and offline clients |
| Desktop (Electron) | Same app plus a local data file, native notifications, file dialogs | Local file becomes an offline cache that syncs |
| Mobile (Expo) | Generic list/form engine driven by module schemas | Reuse the schemas to generate forms, validation and API routes |
| Homepage | Contact, trial and newsletter forms write leads and subscribers into the shared store | Replace with a public, rate-limited API |
| Test suites (≈60 checks) | Cover orders→stock, workflows, validation, CSV, persistence, scheduler | Reuse as golden contract tests so server behaviour matches the prototypes exactly |

**Modules (21):** Core: Dashboard, Notifications, Inventory, Orders, Email Marketing, Workflows, Support Tickets, Chart & Dashboard Builder, Settings, Team & Users. Optional (switchable per tenant): Trending, Supply Chains, Text Marketing, Social Media, Account Management, Sales Pipeline, Deals & Schedules, Data Entry, Appointments, Chatbots, FAQs & Q&As (merged), Subscription, plus the Extras (Newsflash, Resources, Community).

**Rules the server must own** (today enforced in the browser):

| Rule | Where it must live |
| --- | --- |
| Fulfilling an order decrements stock; cancelling restocks; no over-fulfilment | One database transaction with a row lock on the stock row |
| SKU, account name, team email, FAQ question and record email are unique; appointment slots cannot double-book | Database unique constraints plus domain validation |
| Text campaigns need opt-out language, consent and quiet hours | Server-side compliance service (cannot be bypassed by a client) |
| Plan limits (for example 3 seats on Starter) | Entitlement service read by every write path |
| Workflows fire on events (order placed, stock low, ticket created, deal won, new lead) | Durable event outbox plus workflow workers |
| Scheduled campaigns and posts publish when due | Repeatable queue jobs, not a browser timer |
| Ticket SLA due dates by priority (4h / 24h / 72h) | Domain service, stored on the ticket |
| Website leads and subscribers become notifications and trigger workflows | Public API creates records directly |

---

## 1. Guiding Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Architecture | Modular monolith, split later | One deployable; module boundaries already match the menu |
| Language | TypeScript end to end | The existing engine is JavaScript and ports directly |
| Contract | REST + OpenAPI 3.1; WebSocket/SSE for realtime | Generates typed clients for web, RN, Electron, Swift, Kotlin, C# |
| Domain model | Module schemas (fields, validation, actions) defined once in `packages/domain` | Generates Zod validators, OpenAPI, form configs and migrations; removes drift between clients |
| Tenancy | Shared database, `tenant_id` on every row, Postgres Row-Level Security | Strong isolation, low cost |
| Client data | Local-first with sync | Desktop and mobile already work offline; keep that |
| Async work | Queue-based workers | Campaigns, imports, workflows and sync must not block requests |
| Hosting | Containers on AWS (ECS Fargate) or Kubernetes; managed Postgres and Redis | Portable, scalable, infrastructure as code |

---

## 2. Tech Stack

| Layer | Technology |
| --- | --- |
| Runtime / language | Node.js 22 LTS, TypeScript 5 (strict) |
| Framework | NestJS on Fastify (modules, DI, guards, interceptors) |
| Validation | Zod, generated from module schemas |
| ORM / migrations | Drizzle (SQL-first) or Prisma |
| Database | PostgreSQL 16 (JSONB for custom fields and workflow definitions, `pg_trgm` for search, RLS) |
| Cache / limits / pub-sub | Redis 7 |
| Queue / scheduler | BullMQ with repeatable jobs |
| Files | S3-compatible storage (imports, exports, attachments, chart images) |
| Realtime | WebSocket gateway with SSE fallback |
| Auth | Own auth module (Argon2id, JWT + rotating refresh) with OIDC/SSO; consider Auth0, Clerk or Keycloak if you prefer buying |
| API docs | OpenAPI generated by `@nestjs/swagger`, served at `/docs` |
| Payments | Stripe (Billing, Checkout, Portal, webhooks) |
| Email / SMS | Amazon SES or SendGrid; Twilio (US 10DLC registration needed) |
| Social / commerce / shipping | Meta Graph, LinkedIn, X APIs; Shopify, WooCommerce; EasyPost or Shippo |
| Chatbot | LLM behind an `AiService` adapter, retrieval over FAQs & Q&As and live order data |
| Push | FCM (Android, web), APNs (iOS/macOS); Windows and Linux use realtime channel + native notifications |

---

## 3. Tools Required

| Area | Tools |
| --- | --- |
| Repo / build | pnpm workspaces, Turborepo, ESLint, Prettier, commitlint |
| Local dev | Docker Compose (Postgres, Redis, MinIO, Mailpit, Stripe CLI), seed script reproducing the prototype sample data |
| API tooling | Bruno or Postman collections, OpenAPI linter (Spectral), `openapi-typescript` and `openapi-generator` for clients |
| Testing | Vitest, Supertest, Testcontainers, Schemathesis, Playwright (web and Electron), Maestro or Detox (mobile), k6 (load) |
| CI/CD | GitHub Actions, Docker, Terraform, optional Argo CD, EAS (mobile), electron-builder (desktop) |
| Observability | OpenTelemetry, Sentry, Prometheus + Grafana, pino JSON logs to Loki or CloudWatch |
| Security | Dependabot, Snyk, CodeQL, Trivy, gitleaks, OWASP ZAP, AWS Secrets Manager or Vault |

---

## 4. Project Structure

```
merchio/
├─ apps/
│  ├─ api/                 # NestJS HTTP + WebSocket
│  │  └─ src/{common,config,database,realtime}
│  │     └─ modules/
│  │        auth  tenants  notifications  trending  newsflash  billing
│  │        inventory  orders  supply-chain  email-marketing  sms-marketing  social
│  │        accounts  sales  deals  data-processing  scheduling  workflows
│  │        support  chatbots  knowledge(FAQ + Q&A)  community  settings
│  │        analytics  files  public(site forms)  sync
│  ├─ worker/              # BullMQ processors: email, sms, import, workflow, scheduler, sync, reports
│  ├─ web/                 # app (split out of the single HTML file)
│  ├─ site/                # public homepage
│  ├─ mobile/              # Expo / React Native
│  └─ desktop/             # Electron shell
├─ packages/
│  ├─ domain/              # module schemas, validation, rules, automation engine (from engine.js)
│  ├─ api-client/          # generated TypeScript client
│  ├─ sync/                # local-first sync client used by web, mobile, desktop
│  ├─ ui/                  # logo-based design tokens (navy #003d81, royal #0176d5, sky #01b4fe)
│  └─ config/
├─ native/                 # windows  macos  linux  android  ios (Sections 12–13)
├─ infra/{terraform,docker,k8s}
├─ docs/                   # ADRs, runbooks
└─ .github/workflows/
```

Each API module follows `controller → service → repository → schemas → events → tests`. Modules talk through services or domain events, never through each other’s tables.

---

## 5. Backend Architecture

```
 web / desktop / mobile / native / homepage
            │ HTTPS (REST + WS)
     CDN + WAF → load balancer
            │
   API (stateless pods) ──► Redis (cache, limits, pub-sub)
            │           ──► PostgreSQL (RLS, primary + replica)
            │           ──► S3 (files)
            │ outbox + enqueue
        BullMQ queues
            │
   Workers: email · sms · social · import · workflow · scheduler · sync · reports
            │
   Stripe · SES · Twilio · Shopify · carriers · LLM
```

### 5.1 Request lifecycle

1. WAF and rate limiter. 2. Auth guard loads user, tenant, role. 3. Tenant interceptor sets `app.tenant_id` so RLS applies. 4. Permission guard checks `module:action`. 5. Zod validation from the module schema. 6. Service runs in a transaction. 7. Domain events are written to an **outbox** in the same transaction. 8. Audit interceptor records the change (this is today’s activity log).

### 5.2 Domain actions

The prototype’s row buttons become explicit commands so rules stay on the server: `POST /orders/:id/actions/advance`, `…/cancel`, `/inventory/:id/actions/restock`, `/campaigns/:id/actions/send`, `/leads/:id/actions/convert`, `/tickets/:id/actions/escalate`. Each returns the updated record plus any side effects (stock change, notification).

### 5.3 Automation engine

- Triggers map one-to-one to today’s events: `orders.created`, `orders.fulfilled`, `inventory.low`, `tickets.created`, `deals.won`, `leads.created`, `records.created`.
- A relay reads the outbox, finds active workflows for the tenant and enqueues one job per match with idempotency key `workflow_id:event_id`.
- Actions: notify team, queue email, create follow-up ticket, call webhook, wait. Retries with backoff and a dead-letter queue; every run and step is logged for the visual builder.

### 5.4 Scheduler

Repeatable job every minute finds campaigns and posts with status Scheduled and a due date, claims them with `SELECT … FOR UPDATE SKIP LOCKED`, sends, and records results. Replaces the browser timer.

### 5.5 Public API for the homepage

`POST /public/leads`, `/public/trials`, `/public/subscribers` with captcha, honeypot field, per-IP limits, disposable-email filtering and double opt-in for the newsletter. Records are created with `source = website` and trigger `leads.created`.

### 5.6 Data model (key tables)

| Area | Tables |
| --- | --- |
| Identity | tenants, users, memberships, roles, sessions, devices, api\_keys, audit\_logs |
| Billing | plans, subscriptions, invoices, entitlements, usage\_records |
| Commerce | products, stock\_movements, orders, order\_lines, suppliers, shipments |
| Marketing | contacts, subscribers, consents, campaigns, campaign\_recipients, social\_accounts, social\_posts |
| Sales | accounts, leads, deals, pipeline\_stages, activities |
| Operations | import\_jobs, import\_rows, appointments, workflows, workflow\_versions, workflow\_runs |
| Support | tickets, ticket\_comments, sla\_policies, bots, conversations, kb\_entries (FAQ and Q&A, `kind` column) |
| Platform | notifications, notification\_prefs, news\_items, community\_posts, tenant\_modules, outbox\_events |
| Analytics | datasets, dataset\_rows, charts, dashboards, dashboard\_widgets |

Conventions: UUIDv7 keys, `tenant_id` first in composite indexes, money as integer minor units + currency, soft deletes, `version` column for optimistic concurrency, `updated_at` plus a monotonic `change_seq` for sync.

### 5.7 Reliability targets

p95 API latency under 300 ms, 99.9% availability, RPO 5 min, RTO 1 hour; read replica for analytics; monthly partitions for stock movements, audit and workflow logs.

---

## 6. Security Measures

**Identity and sessions**

- Argon2id passwords, breached-password check, lockout with progressive delay.
- Short-lived access tokens (10–15 min) and rotating refresh tokens with reuse detection.
- OAuth 2.1 / OIDC with PKCE for SSO and for every native client, always via the system browser.
- TOTP and passkeys (WebAuthn); step-up authentication for billing, API keys and bulk export.
- Token storage: httpOnly cookie on web; Keychain / Keystore on mobile; Electron `safeStorage` (OS credential vault) on desktop. Never store tokens in the data file or localStorage on native clients.

**Authorization and tenancy**

- RBAC (Super Admin, Admin, Manager, Sales Rep, Support Agent, Viewer) with per-module permissions, plus tenant-level module switches.
- Postgres RLS as a second wall; negative tests on every table.
- Scoped API keys, hashed at rest, shown once, per-key limits and IP allowlists.

**Application**

- OWASP ASVS L2 baseline and API Top 10 review each release; parameterized queries only.
- **CSV and import hardening:** size and row limits, type sniffing, malware scan, and neutralise spreadsheet formulas (cells starting with =, +, - or @) on export so exported files cannot run code in Excel.
- CORS allowlist, CSRF protection for cookie flows, strict CSP. The web app and Electron renderer currently allow inline scripts; the refactor to modules should remove that need and tighten the policy.
- Webhook signature and replay checks (Stripe, Twilio, Shopify); outgoing webhooks signed with HMAC; SSRF egress allowlist.
- Public forms: captcha, honeypot, rate limits, no personal data in URLs.

**Data protection and compliance**

- TLS everywhere, HSTS; encryption at rest with KMS; field-level encryption for integration tokens.
- Stripe-hosted fields only (PCI SAQ-A).
- GDPR/CCPA export and delete endpoints; retention policies; consent log.
- SMS and email: TCPA and CAN-SPAM consent records, STOP handling, quiet hours (8am–9pm recipient time), sender identification.
- Immutable audit log for admin and export actions; encrypted, restore-tested backups.

**Native clients**

- Electron: context isolation, sandbox, no Node in the page, validated IPC, signed updates. Mobile: certificate pinning with rotation plan, jailbreak/root signals as advisory, no secrets in the bundle, biometric re-auth for sensitive actions.

**Operations**

- Dependency, container and secret scanning in CI; least-privilege IAM; private subnets; incident runbook; annual penetration test; SOC 2 readiness roadmap.

---

## 7. Implementation Plan: Wiring the Backend to the Front Ends

### 7.1 Strategy: strangler, not rewrite

The prototypes keep working while each module moves behind the API.

1. **Extract the domain package.** Move seed shapes, module schemas, validation, `stockFx`, SLA, compliance and the automation map out of `engine.js` into `packages/domain` with TypeScript types and tests. Client and server import the same code.
2. **Introduce a data adapter** in every client with one interface (`list, get, create, update, remove, runAction, subscribe`). `LocalAdapter` is today’s behaviour; `RemoteAdapter` calls the API through the generated client; `SyncAdapter` wraps a local SQLite cache for native apps.
3. **Flip modules one at a time** behind per-tenant feature flags. Parity is proven by running the existing prototype test suites against the API.
4. **Split the web app** from one HTML file into a Vite project (routes per module, TanStack Query for server state, small store for theme and UI state). The mobile engine and desktop renderer follow.

### 7.2 Phased delivery

| Phase | Weeks | Backend | Front-end wiring |
| --- | --- | --- | --- |
| 0. Foundations | 1–2 | Monorepo, CI/CD, Docker Compose, domain package extracted, OpenAPI skeleton, golden tests from prototypes | Adapter interface in web, mobile, desktop |
| 1. Identity and tenancy | 3–4 | Auth, sessions, 2FA, tenants, RBAC, RLS, audit log | Login/signup on all clients; Team & Users page; token storage per platform |
| 2. Commerce core | 5–8 | Inventory, orders, stock transactions, suppliers, carrier adapter | Inventory and Orders pages; Advance/Cancel/Restock actions; low-stock alerts |
| 3. Realtime and notifications | 9 | Outbox, WebSocket, in-app feed, push, preferences | Bell badge, Notifications page, desktop native notifications, mobile push |
| 4. Workflows and scheduler | 10–11 | Event relay, workflow runs, repeatable scheduler jobs | Workflow page (Test run, Pause/Resume), run history |
| 5. Marketing | 12–15 | Contacts, subscribers, consents, email, SMS compliance, social adapters | Campaign pages; Send and Publish actions; real recipient counts |
| 6. Sales and CRM | 16–18 | Accounts, leads, deals, convert actions | Pipeline (drag-and-drop on web, Next stage on mobile), deals, accounts |
| 7. Support and knowledge | 19–21 | Tickets with SLA and threads, KB (FAQ + Q&A), chatbot with retrieval | Ticket thread, assignee, chatbot, FAQs & Q&As |
| 8. Operations | 22–23 | Imports with validation report, appointments with conflict checks | Data Entry import, calendar, appointment forms |
| 9. Analytics | 24–25 | Datasets, upload parsing, safe query builder, chart and dashboard APIs | Chart builder reads real datasets; saved dashboards |
| 10. Billing | 26 | Stripe plans, portal, webhooks, entitlements | Subscription page, seat and usage limits enforced server-side |
| 11. Public site API | 27 | Public endpoints, captcha, double opt-in | Homepage forms call the API instead of local storage |
| 12. Offline sync and native shells | 28–30 | Delta sync, mutation queue, conflict handling, device registry | Desktop cache and mobile cache switch to SyncAdapter |
| 13. Hardening | 31–32 | Load tests, pen-test fixes, runbooks, backups, SOC 2 prep | Accessibility, empty/error states, localisation |

### 7.3 API conventions

- Base `/api/v1`; JSON; cursor pagination (`?cursor=&limit=`); filters `?filter[status]=`; sort `?sort=-created_at`.
- Error shape `{ error: { code, message, details, requestId } }`.
- `Idempotency-Key` on creates and actions; `If-Match` / ETag for edits.
- Realtime events named `module.entity.verb`, for example `orders.order.updated`.
- Field validation errors use the same messages the clients show today.

### 7.4 Endpoint map (by module)

| Module | Primary endpoints |
| --- | --- |
| Dashboard | `GET /dashboard/summary`, `/dashboard/kpis` |
| Notifications | `GET /notifications`, `POST /notifications/read-all`, `PUT /notifications/preferences`, `GET /activity` |
| Inventory | CRUD `/products`, `POST /products/import`, `POST /products/:id/actions/restock`, `GET /stock/alerts` |
| Orders | CRUD `/orders`, \`POST /orders/:id/actions/advance |
| Supply chains | CRUD `/suppliers`, `/purchase-orders`, `GET /shipments/inbound` |
| Email / Text / Social | CRUD `/campaigns?channel=`, \`POST /campaigns/:id/actions/send |
| Accounts, Pipeline, Deals | CRUD `/accounts`, `/leads`, `/deals`; `POST /leads/:id/actions/convert`, `PATCH /leads/:id/stage` |
| Data Entry | `POST /imports`, `GET /imports/:id/report`, CRUD `/records`, `GET /records/export` |
| Appointments | CRUD `/appointments`, `GET /availability` |
| Workflows | CRUD `/workflows`, `POST /workflows/:id/actions/test`, `GET /workflow-runs` |
| Tickets | CRUD `/tickets`, `POST /tickets/:id/comments`, \`…/actions/resolve |
| Chatbots, FAQs & Q&As | `POST /bots/:id/chat` (streamed), CRUD `/kb` with \`kind=faq |
| Subscription | `GET /billing/subscription`, `POST /billing/checkout-session`, `/billing/portal-session`, `GET /billing/usage` |
| Settings / Team | `/settings`, `/tenant/modules`, `/integrations`, `/api-keys`, `/team/members`, `/team/invitations`, `/me` |
| Charts | `/datasets`, `/charts`, `/dashboards`, `POST /charts/:id/export` |
| Public site | `POST /public/leads`, `/public/trials`, `/public/subscribers` |
| Sync | `GET /sync?since=`, `POST /sync/push`, `POST /devices` |

### 7.5 Migrating existing local data

Every client already has Backup and Restore. Add `POST /migrations/local-import`: accepts the exported JSON, validates it with the domain package, remaps ids, skips duplicates by SKU and email, and returns a report like the current CSV import report. On first sign-in each client offers “Upload your local data”. Seed data is never imported.

### 7.6 Environments and release

Local → preview per pull request → staging (anonymised data) → production. Rolling or blue/green deploys, expand/contract migrations, feature flags for unfinished modules, `X-Client-Version` with a minimum-version floor so old desktop and mobile builds are prompted to update.

---

## 8. Testing Plan Checklist

### 8.1 Parity with the prototypes (run first)

- [ ] The existing web, mobile-engine and desktop suites pass unchanged against `packages/domain`
- [ ] Same suites run through the HTTP API in CI and match client-side results
- [ ] Order fulfil/cancel stock effects, over-fulfil block, low-stock events
- [ ] SMS blocked without opt-out wording; recipients computed from contacts and subscribers
- [ ] Scheduler publishes due items exactly once, even with several workers

### 8.2 Unit and integration

- [ ] Services, validators and permission matrix (80%+ on business logic)
- [ ] Repositories on real Postgres through Testcontainers
- [ ] RLS: tenant A can never read or write tenant B (negative tests on every table)
- [ ] Queue processors with Redis: retries, idempotency, dead-letter behaviour
- [ ] Stripe, Twilio, SES, Shopify adapters against sandboxes or recorded fixtures
- [ ] Webhook receivers reject bad signatures and replays

### 8.3 API and contract

- [ ] OpenAPI lints clean; breaking-change diff in CI
- [ ] Schemathesis fuzzing on all endpoints
- [ ] Pagination, filtering, sorting and error shapes consistent
- [ ] Concurrent actions: two clients advancing the same order, only one wins

### 8.4 End to end

- [ ] Sign up → 2FA → invite teammate → role enforcement → seat limit on Starter
- [ ] Import products → low stock → workflow creates ticket → notification on every device
- [ ] Order placed → workflow → confirmation → fulfil → stock changes → tracking
- [ ] Homepage lead → appears in Pipeline with source Website → notification → automation
- [ ] Campaign create → segment → schedule → send → metrics → unsubscribe honoured
- [ ] Ticket → assign → reply → escalate → resolve; chatbot hand-off opens a ticket
- [ ] Dataset upload → chart → dashboard → share link → export
- [ ] Upgrade, downgrade, failed payment, cancellation; entitlements update immediately
- [ ] Dark mode and module toggles persist across devices

### 8.5 Security

- [ ] ZAP baseline in CI; API Top 10 review each release
- [ ] Token reuse detection, session revocation, lockout
- [ ] Horizontal and vertical privilege escalation per role
- [ ] Injection, XSS, CSRF, SSRF, path traversal, upload abuse
- [ ] CSV formula injection neutralised on export; oversized and malformed imports rejected
- [ ] Public form abuse: captcha bypass attempts, rate limits, spam floods
- [ ] Secrets and dependency scans clean; external penetration test fixed before launch

### 8.6 Performance and resilience

- [ ] k6: target concurrency met with p95 under 300 ms
- [ ] 1M-row import and 500K-recipient campaign without memory spikes
- [ ] EXPLAIN review and indexes on every list endpoint
- [ ] Chaos: Redis down, DB failover, provider outage, worker crash mid-job
- [ ] Backup restore drill and disaster-recovery rehearsal

### 8.7 Sync and offline

- [ ] Edit offline on desktop and mobile, reconnect, no duplicates, no lost edits
- [ ] Conflicts: stock counts and orders flagged for review; tickets and notes merge by field
- [ ] Clock skew, interrupted sync, large backlog, schema upgrade with queued mutations

### 8.8 Platform clients

- [ ] Web: Chrome, Safari, Firefox, Edge; mobile browsers
- [ ] Desktop: Windows 10/11, macOS (Intel and Apple Silicon), Ubuntu and Fedora; installer, auto-update, rollback, deep links, tray, notifications
- [ ] Mobile: current and previous two OS versions, low-end devices, poor networks, push, deep links, biometric unlock
- [ ] Compliance: GDPR/CCPA export and delete, consent log, quiet hours; WCAG 2.2 AA

### 8.9 Release gates

- [ ] CI green (lint, types, unit, integration, contract, security)
- [ ] Staging smoke suite and synthetic monitors passing
- [ ] Rollback plan and reversible migrations confirmed; runbooks and alerts in place

---

## 9. Shared Client Strategy and Sync Protocol

- **Generated SDKs:** TypeScript for web, RN and Electron; Swift, Kotlin and C# generated from the same OpenAPI file for native apps.
- **Auth:** OAuth 2.1 + PKCE through the system browser; one auth module per client; secure storage per platform.
- **Pull:** `GET /sync?since=<change_seq>` returns created, updated and deleted records per entity the user may see.
- **Push:** `POST /sync/push` accepts a batched, idempotent mutation queue, each item with `client_mutation_id`, entity, base `version` and payload. The server replies per item: applied, rejected (with the validation message) or conflict.
- **Conflicts:** last-writer-wins for low-risk fields; field-level merge for notes and tickets; stock counts, order status and plan changes are server-authoritative and returned as conflicts for the user to review.
- **Realtime:** the WebSocket tells clients to pull; push notifications wake mobile apps.
- **Theming:** design tokens in `packages/ui` exported as JSON for every platform (logo navy, royal and sky blues).

---

## 10. Cross-Platform Backend Plan: Desktop (Windows / macOS / Linux)

**Recommended: keep Electron** (already built); evaluate Tauri 2 later if installer size becomes a concern.

| Concern | Plan |
| --- | --- |
| Local data | Replace the single JSON file with SQLite (`better-sqlite3`) in the main process: cache tables plus a mutation queue; keep the daily JSON backups |
| Sync engine | Runs in the main process, shared `packages/sync`; backoff, online/offline detection, pull on WebSocket nudge |
| Auth | PKCE in the system browser with a `merchio://auth` redirect; tokens in `safeStorage`; refresh handled in main, never exposed to the page |
| Bridge | Extend `window.desktop` with typed calls (`api.request`, `sync.status`); the renderer never gets raw tokens |
| Notifications | Server events over WebSocket → native notifications; click deep-links with `merchio://orders/…` |
| Files | Native dialogs for CSV, backup and attachments; uploads go through presigned URLs |
| Updates | `electron-updater` with signed releases on S3 or GitHub, staged rollout, server-enforced minimum version |
| Packaging | NSIS or MSIX (Windows, EV or Azure Trusted Signing), notarised DMG (macOS), AppImage, deb and Flatpak (Linux) |
| Hardening | Sandbox, context isolation, strict CSP once inline scripts are removed, no remote code, certificate validation with optional pinning |

---

## 11. Cross-Platform Backend Plan: Mobile (Android / iOS)

**Recommended: keep React Native with Expo** (already built); it shares schemas, validation and the generated client with web and desktop.

| Concern | Plan |
| --- | --- |
| Networking | Generated TypeScript client, TanStack Query with persistence, retry with backoff |
| Local database | `expo-sqlite` (or WatermelonDB) replaces AsyncStorage for records; AsyncStorage keeps small preferences |
| Secure storage | `expo-secure-store` (Keychain / Keystore) for tokens |
| Auth | `expo-auth-session` with PKCE; biometric unlock gates the refresh token |
| Push | `expo-notifications` with FCM and APNs; actions such as reply to ticket or advance order |
| Background | Background fetch and task manager for sync; WorkManager and BGTaskScheduler underneath |
| Scanning | Camera barcode scanning for inventory counts and fulfilment |
| Deep links | Universal Links and App Links into orders, tickets and campaigns |
| Offline | Offline-first for orders, stock counts, ticket replies, appointments |
| Release | EAS Build and Submit, OTA updates for JavaScript-only fixes, staged rollouts, store privacy forms |
| Security | Certificate pinning with rotation, screenshot blocking on sensitive screens, biometric re-auth for billing and API keys |

---

## 12. Native Backend Plan: Desktop

Choose this path for deep OS integration or best performance. Each app shares only the API contract (generated client) and the sync protocol.

|  | Windows | macOS | Linux |
| --- | --- | --- | --- |
| Language / UI | C# (.NET 8), WinUI 3 | Swift, SwiftUI (AppKit where needed) | Rust + GTK4 / libadwaita, or C++ / Qt 6 |
| Networking | NSwag or openapi-generator client, HttpClient + Polly | swift-openapi-generator over URLSession | Generated Rust client (reqwest) or Qt Network |
| Local data | SQLite + SQLCipher (EF Core) | SwiftData or GRDB (SQLCipher if needed) | SQLite + SQLCipher |
| Secrets | Credential Locker / DPAPI, Windows Hello | Keychain, Touch ID | Secret Service (libsecret) |
| Background | Windows Service or background task for sync; toast notifications | Login item / XPC helper; UserNotifications; menu bar extra | systemd user service; libnotify / XDG portals |
| Auth | System browser + PKCE | ASWebAuthenticationSession | System browser + loopback redirect |
| Distribution | MSIX, Microsoft Store, WinGet | Notarised DMG, Mac App Store, Sparkle | Flatpak first, then deb, rpm, AppImage |

Three codebases triple UI and test work. Go native on the single platform where customers cluster (often Windows for back-office and warehouse use).

---

## 13. Native Backend Plan: Mobile

|  | Android (Kotlin) | iOS (Swift) |
| --- | --- | --- |
| UI | Jetpack Compose, Material 3 | SwiftUI |
| Architecture | MVVM/MVI, Hilt, Coroutines and Flow | MVVM, Observation, Swift Concurrency |
| Networking | Retrofit/OkHttp or Ktor with generated client; pinning in OkHttp | swift-openapi-generator client; pinning via URLSessionDelegate |
| Local data | Room over SQLite (SQLCipher optional), DataStore | SwiftData or GRDB, file protection class complete |
| Secrets | Android Keystore, Tink, BiometricPrompt | Keychain (this-device-only), Face ID / Touch ID |
| Background | WorkManager for sync and uploads | BGTaskScheduler, silent pushes, background URLSession |
| Push | FCM with a channel per module | APNs with notification service extensions and actions |
| Scanning | CameraX + ML Kit | VisionKit DataScanner |
| Auth | AppAuth or Custom Tabs + PKCE | ASWebAuthenticationSession + PKCE, Sign in with Apple if other social logins exist |
| Integrity / extras | Play Integrity API | App Attest; widgets, App Intents, Live Activities for order tracking |
| Distribution | Play Console tracks | TestFlight, App Store review checklist |

Best performance and platform polish at the cost of two codebases. Sensible path: React Native for breadth, native modules only for scanning, widgets and heavy offline screens, and full native only if measured needs justify it.

---

## 14. Rollout Order

Web, Electron and React Native already exist as prototypes. Switch each to the API one module at a time (Section 7), add sync (Section 9), and build native apps only where measured needs justify the extra codebases.

---

## 15. Risks and Open Decisions

| Risk / decision | Mitigation |
| --- | --- |
| Breadth (21 modules) | Ship in the phased order; optional modules stay behind flags and tenant switches |
| Rules drift between client and server | Single `packages/domain`; golden tests from the prototypes |
| SMS compliance delays (10DLC) | Start registration in Phase 0 |
| Social API approvals and limits | Adapters with graceful degradation; keep publishing simulated until approved |
| Offline conflicts | Limit offline writes to a defined set in v1; server-authoritative for stock and status |
| Multi-tenant leaks | RLS plus negative tests as a mandatory CI gate |
| Auth: build vs buy | One-week spike; record as ADR |
| ORM and framework choice | Spike in Phase 0; record as ADR |
| Cloud provider | Terraform modules keep it reversible |

---

## 16. Immediate Next Steps

1. Approve the stack and the modular-monolith decision (ADR-001).
2. Create the monorepo and extract `packages/domain` from the shared engine, with the existing tests moved over.
3. Stand up Docker Compose and CI.
4. Build Phase 1 (auth, tenants, RBAC, RLS) and add login to the web, mobile and desktop shells.
5. Generate the OpenAPI client and flip the first module (Inventory and Orders) behind a feature flag.
6. Start SMS 10DLC registration, Stripe account setup and social API app reviews in parallel.

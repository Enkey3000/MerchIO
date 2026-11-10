# MerchIO — Architecture Document

Document 03 of the MerchIO documentation chain · Version 0.9 (draft for review) · 7 November 2026

| Field | Value |
| --- | --- |
| Document ID | ARC-001 |
| Status | In review |
| Owner | Architect / tech lead |
| Reviewers | Security lead, backend, front-end, mobile and desktop leads, DevOps, QA |
| Based on | PRD-001, SRS-001, TM-001 (threat model v0.1), Backend Plan v2, `cursorrules.md`, `cursorsecurityrules.md` |
| Feeds | Security Measures, OpenAPI, Test Plan, Release Plan, PoC plan, RTM |

**Tags.** **DECIDED**: already fixed by the backend plan, SRS or rule files. **PROPOSED**: my recommendation, will become an ADR on approval. **OPEN**: needs a spike or PoC before it can be decided. Section 14 lists every ADR with its status.

---

## 1. Purpose and scope

This document describes how MerchIO is built so that the SRS requirements are met and the threats in TM-001 are controlled. It covers the MVP (web app, public site, API, workers, data stores, providers) and the V1 clients (Electron desktop, React Native mobile, sync). Views follow the C4 model (context, containers, components) plus data, runtime, deployment and quality views.

---

## 2. Architectural drivers

| ID | Driver | Source | Architectural consequence |
| --- | --- | --- | --- |
| AD-01 | One tenant must never see another tenant’s data | FR-TEN-002, THR-001 | Shared database with row-level security, tenant context set per transaction, cross-tenant tests on every table |
| AD-02 | Stock and order correctness | BR-STK-001 to -004, FR-ORD-004 to -007 | Stock ledger changed only inside one transaction with row locks; server is the only authority |
| AD-03 | The same rules everywhere (the audit found rules copied three times) | S-01 | One shared domain package used by API, workers and every client |
| AD-04 | Desktop and mobile work offline | NFR-OFF-001 | Local-first clients with a delta sync protocol |
| AD-05 | Automation must be reliable and not duplicate effects | FR-WFL-004, NFR-REL-001 | Transactional outbox, idempotent jobs, retries and dead-letter queues |
| AD-06 | Messaging compliance cannot be bypassed | BR-MSG-001 to -004, THR-015 | Compliance and consent services on the server, applied before every send |
| AD-07 | Security, audit and privacy | NFR-SEC-001 to -006, FR-AUD-001 to -005 | Defence in depth, append-only audit, encryption, telemetry scrubbing |
| AD-08 | Small team, fast delivery, large scope | RISK-01 | Modular monolith, managed cloud services, widely used technology |
| AD-09 | Availability and recovery | NFR-AVL-001, NFR-BKP-001 | Stateless services, multi-zone data stores, point-in-time recovery, rehearsed restores |
| AD-10 | Performance at the design load | NFR-PERF-001 to -005 | Indexed tenant-first queries, server-side pagination, read models for the dashboard, queues for heavy work |
| AD-11 | Accessibility and internationalisation | NFR-ACC-001, NFR-I18N-001 | Shared accessible component library, design tokens, externalised strings |
| AD-12 | Several clients on one contract | BG-04 | OpenAPI-first with generated clients |
| AD-13 | Cost control for an early-stage product | Business constraint | Right-sized managed services; scale workers independently; avoid premature microservices |

---

## 3. Architecture principles

| ID | Principle | Meaning in practice |
| --- | --- | --- |
| AP-01 | **Modular monolith first** | One deployable API, strict module boundaries; extract a service only when load or team size demands it (ADR-001) |
| AP-02 | **Server is the authority** | Clients give fast feedback; the server decides and enforces |
| AP-03 | **Contract first** | OpenAPI is changed before code; clients are generated |
| AP-04 | **One domain package** | Business rules exist once, in pure TypeScript, with golden tests |
| AP-05 | **Tenant isolation in depth** | Token-derived tenant, application checks and database row-level security together |
| AP-06 | **Events through an outbox** | Side effects are driven by events written in the same transaction as the change |
| AP-07 | **Idempotent by design** | Every write endpoint and job can be repeated without repeating effects |
| AP-08 | **Async by default for side effects** | Email, imports, workflows and sync run in queues, not in the request |
| AP-09 | **Stateless compute** | State in PostgreSQL, Redis and object storage only |
| AP-10 | **Observable and auditable** | Structured logs, traces, metrics, append-only audit |
| AP-11 | **Secure by default** | Default deny, least privilege, secrets from a manager, scrubbed telemetry |
| AP-12 | **Boring technology** | Prefer mature, well-supported tools; every new dependency needs justification |
| AP-13 | **Decide in writing** | Significant choices are recorded as ADRs |

---

## 4. System context (C4 level 1)

```
                     +------------------------------+
  Store owner,       |                              |      Stripe (billing)
  ops, marketer,     |           MerchIO            |<---> Email provider (SES / SendGrid)
  sales, support,    |  commerce operations platform|<---> Captcha provider
  admins  ---------->|                              |<---> OIDC providers (Google, Microsoft)
  (web, desktop,     |  API + workers + data stores |<---> Push services (FCM, APNs)   [V1]
   mobile)           |                              |<---> Carriers (EasyPost/Shippo)  [V1]
  Website visitors ->|                              |<---> Twilio (SMS)                [V1]
  (public forms)     +---------------+--------------+
                                     |
                       Observability (Sentry, OpenTelemetry backend)
```

| External party | Relationship |
| --- | --- |
| Tenant users | Use web, desktop and mobile apps; authenticate with MerchIO (and optionally SSO) |
| Website visitors | Submit contact, trial and newsletter forms to the public API |
| Stripe | Subscription and payment; MerchIO receives signed webhooks |
| Email provider | Sends campaign and ticket emails; returns delivery events |
| Captcha provider | Verifies public form submissions |
| Identity providers | Optional single sign-on |
| Push, carriers, Twilio | V1 integrations behind adapters |
| Observability services | Receive scrubbed logs, traces and errors |

---

## 5. Container view (C4 level 2)

```
  [Web app SPA] [Desktop: Electron] [Mobile: React Native] [Public site]
        |              |                    |                   |
        +-------- HTTPS / WebSocket --------+-----------+       |
                         |                              |       |
                 [CDN + WAF] ----------------------------+------+
                         |
                 [API  (NestJS/Fastify)]  <---->  [Redis: cache, rate limits, pub/sub, BullMQ]
                  |  auth | modules | realtime gateway
                  |                       
                  +--> [PostgreSQL (RLS)]  primary + read replica
                  +--> [Object storage]    imports, exports, attachments
                  +--> outbox -----> [Worker(s): workflow, email, import, scheduler, sync, reports]
                                          |
                                          +--> Stripe, email provider, carriers, push, Twilio
```

| Container | Technology | Responsibility | Scaling | Phase |
| --- | --- | --- | --- | --- |
| Web app | React, Vite, TypeScript, TanStack Query | Primary user interface; accessible, responsive | CDN-served static assets | MVP |
| Public site | Static site with a small script calling the public API | Marketing, lead capture | CDN | MVP |
| API | Node.js 22, NestJS on Fastify | REST API, authentication, authorisation, validation, domain actions, WebSocket gateway, public API | Horizontal, stateless | MVP |
| Worker | Node.js, BullMQ processors | Workflows, email sending, imports, scheduler, report jobs, webhook processing | Horizontal per queue | MVP |
| PostgreSQL 16 | Managed (RDS or equivalent) | System of record, row-level security, outbox, audit, stock ledger | Vertical plus read replica; partitioning for large tables | MVP |
| Redis 7 | Managed | Queues, rate limits, cache, real-time fan-out | Managed cluster | MVP |
| Object storage | S3-compatible | Uploads, exports, attachments, chart images | Managed | MVP |
| Desktop app | Electron (current major), local SQLite, sync engine | Warehouse and back-office client with offline queue and native features | Client | V1 |
| Mobile app | React Native with Expo (current SDK), local SQLite, secure store | On-the-go client with offline queue and push | Client | V1 |
| Identity | Own auth module (ADR-009 OPEN: build or buy) | Sign-in, sessions, MFA, SSO | With API | MVP |
| Observability | OpenTelemetry, Sentry, metrics and log store | Traces, errors, metrics, alerts | Managed | MVP |

---

## 6. Component view of the API (C4 level 3)

Each module lives under `apps/api/src/modules/<name>` with `controller → service → repository → schemas → events → tests`. Modules call each other only through exported services or events.

| Module | Responsibilities | Owns (tables) | Publishes | Consumes / depends on |
| --- | --- | --- | --- | --- |
| auth | Registration, sign-in, MFA, tokens, reset, SSO, step-up | users, credentials, sessions, mfa | `auth.*` audit events | tenants, audit |
| tenants | Workspaces, memberships, module switches, lifecycle | tenants, memberships, tenant\_modules | `tenant.*` | auth |
| team | Invitations, roles, seat checks | invitations | `team.*` | tenants, billing |
| settings | Workspace profile, integrations, API keys, webhooks, export and delete requests | settings, integrations, api\_keys | `settings.*` | tenants, files |
| billing | Plans, entitlements, usage, Stripe checkout and webhooks | plans, subscriptions, entitlements, usage\_records | `billing.*` | tenants, settings |
| inventory | Products, stock ledger, restock, import | products, stock\_movements | `inventory.low`, `inventory.changed` | billing (limits), files |
| orders | Orders, lines, transitions, stock effects | orders, order\_lines, order\_events | `orders.created`, `orders.fulfilled`, `orders.cancelled` | inventory, billing |
| notifications | Feed, preferences, real-time delivery | notifications, notification\_prefs | none | consumes all domain events |
| workflows | Definitions, matching, runs, retries | workflows, workflow\_versions, workflow\_runs, workflow\_steps | `workflow.*` | outbox relay, email, tickets, notifications |
| tickets | Tickets, thread, deadlines, escalation | tickets, ticket\_comments | `tickets.created`, `tickets.escalated`, `tickets.overdue` | team, notifications, email |
| email-marketing | Contacts, consent, campaigns, sending, events | contacts, consents, campaigns, campaign\_recipients, campaign\_events | `email.*` | provider adapter, compliance, scheduler |
| compliance | Consent checks, suppression, quiet-hours rules, send caps | suppressions, send\_caps | none | email-marketing, workflows |
| dashboard | KPI read models | read-model tables, counters | none | orders, inventory, tickets, email |
| charts | Datasets, charts, dashboards, safe query builder | datasets, charts, dashboards | none | files, dashboard |
| public | Lead, trial and newsletter endpoints, captcha, double opt-in | leads, subscribers | `leads.created` | email-marketing, notifications |
| sync (V1) | Delta pull, mutation push, device registry | devices, mutation\_log | none | domain package, all modules |
| audit | Append-only audit and integrity check | audit\_logs | none | all modules |
| files | Presigned upload and download, scanning | file\_objects | `files.scanned` | object storage |
| realtime | WebSocket gateway, subscriptions per tenant and user | none | none | Redis pub/sub |
| outbox | Relay from outbox table to queues | outbox\_events | none | all modules |

**Dependency rule:** lower-level modules (auth, tenants, audit, files) never depend on feature modules; feature modules never read each other’s tables.

---

## 7. Shared domain package (`packages/domain`)

**Decided (AP-04, ADR-010).** Pure TypeScript with no framework, database, network or UI imports.

| Part | Content |
| --- | --- |
| Module schemas | For each module: fields, types, labels, validation, relations, actions; source of Zod validators, OpenAPI schemas, form and list definitions |
| Rules | Stock effects, uniqueness, SLA calculation, plan limits, consent and quiet-hours checks, workflow matching and chain-depth rules |
| Automation map | Event names, trigger and action definitions |
| Value objects | Money (minor units plus currency), UTC timestamps, UUIDv7 ids |
| Golden tests | The prototype test suites turned into the shared parity tests that the server and all clients must pass |

**How it is used.** The API and workers import it for authoritative decisions. Web, desktop and mobile import it for instant validation and form generation. A change to a rule is a change to this package, which updates every consumer and runs the golden tests. Versioned with the monorepo; breaking changes require a major bump and a client minimum-version update (FR-SYNC-007).

---

## 8. Data architecture

### 8.1 Tenancy model (DECIDED)

One PostgreSQL database and schema shared by all workspaces. Every tenant-owned row carries `tenant_id`. Isolation is enforced three times: the tenant is taken from the verified session (never from request content), application services always filter by it, and PostgreSQL row-level security rejects anything else.

```sql
-- every tenant table
alter table orders enable row level security;
alter table orders force row level security;
create policy tenant_isolation on orders
  using (tenant_id = current_setting('app.tenant_id')::uuid)
  with check (tenant_id = current_setting('app.tenant_id')::uuid);
-- per transaction, set by the API before any query
select set_config('app.tenant_id', $1, true);
```

- The application connects with a role that **cannot bypass** row-level security; migrations use a separate role.
- Connection pooling runs in transaction mode so the tenant setting never leaks between requests.
- A very large tenant can later move to its own database (tenant routing table). **OPEN**, only if measured need.

### 8.2 Conventions (DECIDED)

| Topic | Rule |
| --- | --- |
| Keys | UUIDv7 `id`; every tenant table also has `tenant_id` |
| Columns on every table | `created_at`, `updated_at` (UTC `timestamptz`), `version` (integer, optimistic concurrency), `deleted_at` (soft delete), `change_seq` (bigint, monotonic, for sync) |
| Money | `bigint` minor units plus `currency char(3)` on the record |
| Case-insensitive uniqueness | Unique indexes on `(tenant_id, lower(value))` for SKU, member email, contact email, order number |
| Indexes | Composite indexes start with `tenant_id`, then the filter and sort columns |
| Flexible data | JSONB only for custom fields and workflow definitions, never for core attributes |
| Constraints | Check, unique and foreign-key constraints wherever the database can enforce a rule |

### 8.3 Core relationships

```
tenants 1--n memberships n--1 users
tenants 1--n products 1--n stock_movements
tenants 1--n orders 1--n order_lines n--1 products
tenants 1--n contacts 1--n consents ;  campaigns 1--n campaign_recipients n--1 contacts
tenants 1--n workflows 1--n workflow_versions 1--n workflow_runs 1--n workflow_steps
tenants 1--n tickets 1--n ticket_comments ;  tickets n--1 memberships (assignee)
tenants 1--n notifications n--1 users ;  tenants 1--n audit_logs ;  tenants 1--n outbox_events
```

### 8.4 Stock ledger design

- `stock_movements` is append-only (reason, quantity, reference, actor, time). `products.stock_on_hand` is updated **in the same transaction**, protected by a check constraint (never below zero).
- Orders record `stock_applied` per line so that a cancellation restores only what was applied (BR-STK-003).
- Fulfilment locks the affected product rows in a fixed order (by product id) to avoid deadlocks, checks every line, then writes all movements and the status change together (flow 9.1).
- A low-stock event is raised when a movement crosses the reorder point from above (BR-STK-004).

### 8.5 Order numbers

A per-workspace counter row is incremented with `update … returning` inside the order-creation transaction. Numbers are unique and ordered; gaps may occur after rollbacks and are acceptable.

### 8.6 Outbox (DECIDED, ADR-008)

`outbox_events(id, tenant_id, type, payload, created_at, processed_at, attempts)` is written in the same transaction as the business change. A relay claims unprocessed rows with `FOR UPDATE SKIP LOCKED`, publishes them to queues and marks them processed. Start with polling every second; move to change-data-capture only if latency requires it (**OPEN**). Processed rows are removed after 30 days.

### 8.7 Audit (DECIDED)

`audit_logs` is written by the audit module only. The application role has `INSERT` but no `UPDATE` or `DELETE`. Each record stores a hash of its content and the previous record’s hash per workspace so alterations can be detected (FR-AUD-005, THR-021). Monthly partitions; archive to write-once storage is **OPEN** (TQ-12).

### 8.8 Dashboard read models

Counters (orders by status, revenue by month, open tickets, low-stock count) are updated by event handlers and reconciled by a nightly job. This meets the 60-second freshness target without heavy queries (FR-DSH-004, NFR-PERF-002).

### 8.9 Search

PostgreSQL `pg_trgm` and GIN indexes cover list search per workspace. A dedicated search engine is introduced only if measurements show a need. **PROPOSED**

### 8.10 Partitioning and retention

Monthly partitions for `stock_movements`, `audit_logs`, `workflow_steps`, `notifications` and `campaign_events`. Retention jobs drop expired partitions or rows according to the data dictionary (SRS section 6). Erasure requests run as background jobs that remove or anonymise personal data and record the action.

### 8.11 Backup and recovery (DECIDED)

Multi-zone primary with automatic failover, point-in-time recovery (recovery point 5 minutes), daily snapshots copied to a second location, versioned object storage, restore drills at least quarterly (NFR-BKP-001). Region and residency are **OPEN** (PRD Q-05).

---

## 9. Key runtime flows

### 9.1 Advance an order to Fulfilled (FR-ORD-004 to -007, AC-ORD-004 to -006)

1. Client calls `POST /orders/{id}/actions/advance` with `Idempotency-Key` and `If-Match`.
2. API authenticates, sets the tenant, checks permission `orders:advance`, validates input.
3. Transaction starts; the order row is locked; status and version are checked (a mismatch returns conflict).
4. Product rows for all lines are locked in id order; the domain rule checks stock.
5. If any line is short, the transaction rolls back with a message naming the product (nothing changes).
6. Otherwise stock movements, new stock levels, `stock_applied`, status and audit record are written, plus outbox events `orders.fulfilled` and, if crossed, `inventory.low`.
7. Commit; response returns the updated order and side effects. The relay then drives notifications and workflows.

### 9.2 Workflow execution (FR-WFL-004 to -007)

1. The relay publishes an event to the workflow queue.
2. The matcher finds Active workflows of that tenant for the trigger and checks conditions and chain depth.
3. For each match a job is queued with key `workflow_id:event_id`; duplicates are discarded.
4. The worker runs each action through its adapter (notify, queue email through compliance, create ticket), logging every step.
5. A failure is retried with exponential backoff up to 5 times, then moved to the dead-letter queue and an admin notification is created.

### 9.3 Scheduled campaign send (BR-SCH-001, FR-EML-007)

1. Every minute the scheduler selects due campaigns with `FOR UPDATE SKIP LOCKED` and marks them Sending.
2. The compliance service builds the recipient list (consented, not unsubscribed or suppressed), applies send caps and verifies the sending domain.
3. Recipients are written to `campaign_recipients` and queued in batches with message idempotency keys.
4. Provider events (delivered, bounced, complaint, unsubscribed) arrive by signed webhook and update recipients and suppressions.

### 9.4 Sign-in and token refresh (FR-AUTH-003, AC-AUTH-003)

1. Credentials and MFA are verified; sessions get a token family id.
2. The API issues a 15-minute access token and a rotating refresh token stored as a hash.
3. On refresh, the presented token is looked up; if it was already used, the whole family is revoked and a security event is recorded; otherwise it is replaced.
4. Web uses httpOnly cookies; native clients keep tokens in the operating-system secure store.

### 9.5 Public lead capture (FR-PUB-001 to -006)

1. The form posts to the public API with the captcha token and honeypot field.
2. The API checks rate limits, validates the captcha and input, and discards spam silently.
3. A lead (source Website) is created, the `leads.created` event goes to the outbox; for newsletters a double opt-in email is sent and consent is recorded on confirmation.

### 9.6 Stripe webhook (FR-BIL-005)

1. The webhook endpoint reads the raw body, verifies signature and timestamp, and rejects stale or invalid requests.
2. The event id is stored; repeated ids are ignored.
3. The event is applied to subscription state and entitlements in one transaction; an audit record and admin notification follow.

### 9.7 Sync (V1, FR-SYNC-001 to -007)

1. **Pull:** the client sends its last `change_seq`; the API returns changes for data the user may see, within the tenant.
2. **Push:** the client sends queued mutations with client ids and base versions; the API applies each through the same domain rules as REST.
3. Each item returns applied, rejected (with the validation message) or conflict; replays return the earlier result.
4. Server-authoritative fields (stock, status, plan) are never taken from the client; conflicts are shown to the user.

### 9.8 Unsubscribe (FR-EML-004)

The link carries a signed token. The API validates it, records the unsubscribe and suppression immediately, cancels queued messages to that contact and writes an audit entry.

---

## 10. Cross-cutting design

| Topic | Design |
| --- | --- |
| API style | REST under `/api/v1`, OpenAPI 3.1 as the contract; action endpoints for domain commands; cursor pagination (limit at most 100); error shape `{ error: { code, message, details, requestId } }` |
| Idempotency | `Idempotency-Key` stored with a request hash and the stored response for 24 hours; a repeat returns the stored response |
| Concurrency | `version` column and `ETag` / `If-Match`; conflicts return 409 |
| Rate limits and quotas | Redis token buckets per IP, user, tenant and API key; stricter on auth, public forms and exports; per-workspace quotas for requests, imports, queue depth, workflow runs and sends (SEC-API-09, -10) |
| Caching | Redis for read-mostly lookups (permissions, plan entitlements) with short expiry and explicit invalidation; no caching of tenant data across tenants |
| Real-time | WebSocket gateway; clients connect with a short-lived ticket; rooms per tenant and user; Redis pub/sub fans events out across API instances; clients fall back to polling |
| Background jobs | BullMQ queues listed below; at-least-once delivery with idempotent handlers |
| Configuration | Typed, validated environment configuration; secrets only from the secret manager |
| Feature flags | Tenant module switches (FR-TEN-005) plus release flags (Unleash or OpenFeature) |
| Observability | Structured JSON logs with request, tenant and user ids; OpenTelemetry traces across API and workers; metrics for latency, errors, queue depth, job age; Sentry for errors; telemetry scrubbed before leaving the service (SEC-LOG-04) |
| Error handling | Typed errors mapped to HTTP codes in one place; no swallowed exceptions; user-safe messages |
| Time and language | All times UTC; formatting in the workspace time zone and locale on the client; strings externalised |

**Queue catalogue**

| Queue | Producers | Concurrency | Retries | Notes |
| --- | --- | --- | --- | --- |
| `outbox-relay` | Relay | 1 per instance | n/a | Claims rows with skip-locked |
| `workflow` | Relay | 20 | 5, exponential | Dead-letter queue and admin alert |
| `email` | Workflows, campaigns, tickets | 10 | 5, exponential | Per-workspace send caps |
| `import` | Import endpoints | 4 | 2 | Streams files; progress events |
| `webhook-in` | Webhook endpoints | 10 | 5 | Deduplicates by event id |
| `maintenance` | Scheduler | 2 | 3 | Retention, reconciliation, erasure |
| `reports` | Charts and export | 2 | 2 | Time-limited signed downloads |

---

## 11. Client architecture

### 11.1 Shared building blocks (DECIDED)

| Package | Role |
| --- | --- |
| `packages/domain` | Rules, schemas, validation (section 7) |
| `packages/api-client` | TypeScript client generated from OpenAPI; the only way clients call the API |
| `packages/sync` | Local-first sync client (queue, cursors, conflict handling) for desktop and mobile |
| `packages/ui` | Design tokens from the logo (navy `#003d81`, royal `#0176d5`, sky `#01b4fe`), accessible components, i18n helpers |

Every client reads and writes data through a **DataAdapter** interface (`list`, `get`, `create`, `update`, `remove`, `runAction`, `subscribe`) with three implementations: `RemoteAdapter` (REST, web), `SyncAdapter` (local database plus sync, desktop and mobile) and `LocalAdapter` (tests and demos). Screens never touch storage or `fetch` directly (RULE-FE-02).

### 11.2 Web app (MVP)

- React, Vite, TypeScript; route per module with lazy loading; TanStack Query for server state; a small store for theme and layout.
- Sign-in with httpOnly cookies; WebSocket for notifications; strict Content-Security-Policy with nonces (no inline scripts), self-hosted fonts and libraries.
- Forms and lists generated from the module schemas; WCAG 2.2 AA components; error boundaries and loading, empty and error states everywhere.

### 11.3 Desktop app (V1)

```
[Renderer: the web app, sandboxed] --typed bridge (contextBridge)--> [Preload] --validated IPC--> [Main process]
   Main process: auth (PKCE, safeStorage) | sync engine + encrypted SQLite | notifications, tray, badge
                 file dialogs | deep links (merchio://) | auto-update (signed) | permission handler (deny all)
```

- The renderer is the same web build, running through the `SyncAdapter`; no separate business logic.
- The main process owns everything that touches the operating system. Every IPC handler checks the sender and validates the payload with a schema (SEC-DESK-03).
- Data at rest: SQLite encrypted with a key held in the operating-system credential store (TQ-05 decides whether this is mandatory in V1). Atomic writes, validation on load, quarantine and restore from backup (THR-019).
- Electron runs on the latest supported major; fuses and permission handlers configured (SEC-DESK-05, -09).

### 11.4 Mobile app (V1)

- React Native with the current Expo SDK; TanStack Query; `expo-sqlite` for records, `expo-secure-store` for tokens, `expo-auth-session` for PKCE, `expo-notifications` for push, background fetch for sync.
- Offline queue with the shared sync package; `FlatList` for lists; keyboard-aware forms; safe-area handling; system theme; accessibility labels on every control.

### 11.5 Sync architecture (V1)

| Aspect | Design |
| --- | --- |
| Cursor | Per-entity `change_seq`; the client stores the highest seen value |
| Scope | Products and open work in full; completed orders and tickets for the last 90 days; older data on demand, to bound device storage |
| Deletes | Soft-delete markers (tombstones) are synced |
| Mutations | Queued locally with `client_mutation_id`, entity, base version and payload; sent in order |
| Server response | Per item: applied, rejected with message, or conflict |
| Conflict classes | Server-authoritative: stock, order status, plan data (client shows the server value and asks). Field-level merge: notes, ticket text. Last-writer-wins: low-risk display fields |
| Security | Same permissions and domain rules as REST; replayed ids return the original result; server-controlled fields ignored (THR-014) |
| First sync | Paged initial download with progress; resumable |

---

## 12. Integration architecture

Each external service sits behind a **port** with swappable adapters, so providers can change without touching domain code.

| Port | Adapters | Notes |
| --- | --- | --- |
| EmailProvider | Amazon SES (default), SendGrid | Delivery events through signed webhooks; suppression handling |
| BillingProvider | Stripe | Checkout and Customer Portal; webhook verification |
| CaptchaProvider | Cloudflare Turnstile or hCaptcha | Verified on every public submission |
| IdentityProvider | Google, Microsoft (OIDC) | Optional single sign-on (Q-06) |
| PushProvider (V1) | FCM, APNs | Device tokens per user and device |
| CarrierProvider (V1) | EasyPost or Shippo | Tracking status |
| SmsProvider (V1) | Twilio | Compliance rules apply first |
| LlmProvider (V1) | Chosen later | Workspace-scoped retrieval only (SEC-APP-10) |

**Resilience pattern for every adapter:** timeouts, retries with backoff for idempotent calls, circuit breaker, a bulkhead (separate concurrency pool) per provider, credentials encrypted per workspace or per platform, sandbox mode for tests, and contract tests against recorded provider fixtures.

**Inbound webhooks:** raw-body signature check, timestamp tolerance, event-id deduplication, then asynchronous processing on the `webhook-in` queue.

---

## 13. Deployment architecture

**Proposed on AWS (ADR-014).** Another provider is acceptable if the Terraform modules are kept portable.

```
Users --> [Route 53] --> [CloudFront + WAF] --> static web app (S3)
                               |
                         [Application Load Balancer] (public subnets)
                               |
   private subnets:   [ECS Fargate: api x2+]   [ECS Fargate: worker x2+]
                               |                        |
                 [RDS PostgreSQL Multi-AZ + read replica]   [ElastiCache Redis]
                 [S3 buckets: uploads, exports]   [Secrets Manager]  [KMS keys]
   outbound only via NAT to: Stripe, SES, captcha, push, carriers
   observability: OpenTelemetry collector, CloudWatch or Grafana stack, Sentry
```

| Environment | Purpose | Data | Notes |
| --- | --- | --- | --- |
| Local | Development | Synthetic seed data (never in production) | Docker Compose: Postgres, Redis, MinIO, mail catcher, Stripe CLI |
| Preview | One per pull request | Synthetic | Ephemeral, destroyed on merge |
| Staging | Production-like, release rehearsals, pen test | Anonymised or synthetic only | Same topology, smaller |
| Production | Customers | Real | Multi-zone, alerting, backups |

**Pipeline:** pull request → typecheck, lint, unit, integration (Testcontainers), contract, SAST, dependency, secret and container scans, SBOM → build signed images → deploy to staging → smoke and end-to-end tests → manual approval → rolling or blue/green deploy to production with automatic rollback on error-rate alarms. Database migrations use expand and contract so rollback is safe.

**Initial sizing (PROPOSED, to be validated by load test against NFR-PERF-001):** API 2 tasks (1 vCPU, 2 GB), workers 2 tasks (1 vCPU, 2 GB), PostgreSQL 2 vCPU and 8 GB with Multi-AZ and one read replica, Redis two small nodes. Scale tasks on CPU and queue depth.

**Disaster recovery:** multi-zone failover for the database and compute; snapshots copied to a second location; runbook with a one-hour recovery target; restore drill each quarter. Region choice and residency are **OPEN** (Q-05).

---

## 14. Quality attribute scenarios

| ID | Scenario | Response and measure | Main tactics | Traces to |
| --- | --- | --- | --- | --- |
| QAS-01 | A user of workspace B requests an id from workspace A | Not found; no data returned; attempt logged; 0 leaks in the negative test suite | Tenant from token, RLS, object-level checks | AD-01, THR-001 |
| QAS-02 | Two users fulfil the same order at once | One success, one conflict; stock reduced once; no deadlock under 100 concurrent attempts | Row locks in fixed order, version check, idempotency | AD-02, FR-ORD-006 |
| QAS-03 | An API instance fails during peak load | Traffic shifts automatically; error rate under 1 percent for under 1 minute | Stateless tasks, health checks, multi-zone | AD-09, NFR-AVL-001 |
| QAS-04 | 100 requests per second sustained across 1,000 workspaces | p95 under 300 ms reads and 500 ms writes | Indexes, pagination, caching, queues | AD-10, NFR-PERF-001 |
| QAS-05 | A desktop user works offline for a day, then reconnects | Sync completes within 30 seconds; no lost edits; conflicts listed | Mutation queue, versions, conflict classes | AD-04, NFR-OFF-001 |
| QAS-06 | A stolen refresh token is used after the real client refreshed | Request refused; token family revoked; alert raised within 1 minute | Rotation with reuse detection, security events | THR-002 |
| QAS-07 | The database is corrupted by a faulty deployment | Service restored to within 5 minutes of data loss in under 1 hour | PITR, expand and contract migrations, runbook | NFR-AVL-001, NFR-BKP-001 |
| QAS-08 | A developer adds a new module | No change to other modules; contract and tests added; completes within 2 days | Module boundaries, domain package, generators | AD-08, AP-01 |
| QAS-09 | A campaign is scheduled and the worker restarts mid-send | Each recipient is emailed exactly once | Skip-locked claim, message idempotency keys | BR-SCH-001, BR-MSG-004 |
| QAS-10 | An abusive workspace triggers thousands of workflow runs | Caps stop the run; other workspaces unaffected; admins alerted | Per-workspace quotas, queue limits | THR-022, THR-023 |

---

## 15. Decision log (ADRs)

Full ADR files live in `docs/03-architecture/adr/`. This table is the index.

| ADR | Decision | Status | Alternatives considered | Rationale |
| --- | --- | --- | --- | --- |
| ADR-001 | Modular monolith | Accepted | Microservices | Small team, simple operations; clear seams for later extraction |
| ADR-002 | TypeScript on Node.js 22 LTS everywhere | Accepted | Go, Java, Python | One language across server and clients; shared domain package |
| ADR-003 | NestJS on Fastify | Accepted | Express, Fastify only | Modules, dependency injection, guards; mature ecosystem |
| ADR-004 | PostgreSQL 16 with shared schema and row-level security | Accepted | Schema per tenant, database per tenant | Strong isolation with low cost; revisit for very large tenants |
| ADR-005 | ORM: Drizzle or Prisma | Proposed (spike) | Raw SQL | Decide after a one-week spike on migrations, RLS support and performance |
| ADR-006 | BullMQ on Redis for queues and schedules | Accepted | SQS, RabbitMQ, database queue | Fast to build; repeatable jobs; fits Node |
| ADR-007 | REST with OpenAPI 3.1, contract first | Accepted | GraphQL, tRPC | Native clients and partners need a standard contract |
| ADR-008 | Transactional outbox with polling relay | Accepted | Direct publish, change-data-capture | Reliable and simple; CDC later if needed |
| ADR-009 | Authentication: build own module or buy (Auth0, Clerk, Keycloak) | Open (spike) | Both | Compare security, cost, SSO, MFA, passkeys, data residency |
| ADR-010 | Shared domain package | Accepted | Per-client logic | Removes the triple-copy problem found in the audit |
| ADR-011 | Local-first clients with `change_seq` delta sync | Accepted | Server-only with caching | Required for offline desktop and mobile |
| ADR-012 | Keep Electron for desktop; upgrade to current major | Accepted | Tauri | Already built; shared web renderer; revisit if size matters |
| ADR-013 | React Native with Expo for mobile | Accepted | Flutter, fully native | Shares schemas and client code with web |
| ADR-014 | AWS with ECS Fargate, RDS, ElastiCache, S3 | Proposed | GCP, Azure, Kubernetes | Managed services reduce operations; keep Terraform portable |
| ADR-015 | OpenTelemetry, Sentry and a managed metrics stack | Proposed | Vendor-specific agents | Standard telemetry, scrubbing before export |
| ADR-016 | Stripe for billing | Accepted | Paddle, others | Hosted card handling keeps PCI scope at SAQ-A |
| ADR-017 | Amazon SES as the default email provider | Proposed | SendGrid, Postmark | Cost and AWS fit; adapter keeps choice open |
| ADR-018 | React, Vite and TanStack Query for web | Accepted | Next.js, Vue | Matches existing code and the React Native client |
| ADR-019 | WebSocket gateway with Redis pub/sub | Accepted | Server-sent events, polling only | Two-way channel and fan-out across instances |
| ADR-020 | Search with `pg_trgm` first | Proposed | OpenSearch | Fewer moving parts until measurements demand more |

---

## 16. Risks and proofs of concept

| ID | Architectural risk | Proof of concept | Success criteria |
| --- | --- | --- | --- |
| AR-01 | Shared domain package cannot serve server and all clients cleanly | POC-01: package used by API, web, desktop and mobile with golden tests | Same results on all four; build and bundle sizes acceptable |
| AR-02 | Row-level security with pooling leaks tenant context or is slow | POC-02: RLS on core tables with transaction pooling and load test | Zero cross-tenant reads in negative tests; under 10 percent overhead |
| AR-03 | Offline sync produces duplicates or lost edits | POC-03: sync between desktop and mobile with conflict cases | Replay and conflict tests pass; resume after interruption |
| AR-04 | Outbox, workflows or scheduler fire twice or not at all | POC-04: concurrent relay and scheduler workers | Exactly-once effects across 10,000 events with worker restarts |
| AR-05 | Provider constraints (email domain, SMS registration) delay delivery | POC-05: SES sandbox with consent, suppression and bounce handling | End-to-end send with compliance checks |
| AR-06 | Native sign-in and secure token storage prove awkward | POC-06: PKCE on Electron and Expo with secure storage and refresh rotation | Sign-in, refresh, revoke on both platforms |
| AR-07 | Build-versus-buy decision for authentication | Spike under ADR-009 | Decision memo with cost and risk comparison |
| AR-08 | Capacity assumptions wrong | Load test at the design load | Meets NFR-PERF-001 with the initial sizing |

---

## 17. Coverage of the SRS by the architecture

| SRS area | Components | Key decisions |
| --- | --- | --- |
| AUTH, TEN, AUD | auth, tenants, audit; Postgres RLS | ADR-004, ADR-009 |
| TEAM, SET, BIL | team, settings, billing (entitlements) | ADR-016 |
| INV, ORD | inventory, orders; stock ledger | Sections 8.4, 9.1 |
| NOT | notifications, realtime | ADR-019 |
| WFL | workflows, outbox relay, queues | ADR-006, ADR-008 |
| TKT | tickets | Section 6 |
| EML | email-marketing, compliance, scheduler | Sections 9.3, 12 |
| DSH, CHT | dashboard read models, charts with allowlisted query builder | Section 8.8 |
| PUB | public module | Section 9.5 |
| SYNC | sync module, `packages/sync` | ADR-011, section 11.5 |
| NFR-PERF, AVL, BKP | Sections 8, 13, 14 | ADR-014 |
| NFR-ACC, I18N | `packages/ui`, client rules | ADR-018 |

---

## 18. Open items and approval

| # | Open item | Decide by | Owner |
| --- | --- | --- | --- |
| 1 | ORM choice (ADR-005) and authentication build or buy (ADR-009) | End of Wave 2 spikes | Architect |
| 2 | Region and data residency (Q-05); cloud provider confirmation (ADR-014) | Before staging setup | Product owner, architect |
| 3 | Desktop local database encryption in V1 (TQ-05) | Workshop | Security lead |
| 4 | Audit archive to write-once storage (TQ-12) | Workshop | Security lead |
| 5 | Change-data-capture for the outbox, dedicated database for very large tenants, search engine | Only if measurements require | Architect |
| 6 | Initial sizing validated by load test | After POC-04 and POC-02 | DevOps |

| Role | Name | Decision | Date |
| --- | --- | --- | --- |
| Architect |  |  |  |
| Security lead |  |  |  |
| Tech lead |  |  |  |

Change log: 0.9, 7 November 2026, first draft from PRD-001, SRS-001, TM-001, backend plan v2 and the rule files.

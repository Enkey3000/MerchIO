# Roadmap

**Status:** proposed sequencing based on the supplied PRD and backend plan. Dates and durations are intentionally omitted: the source materials do not establish approved capacity, owners, or a committed schedule. No milestone in this roadmap is represented as completed.

## Phase 0 — Baseline and decisions

**Goal:** convert the prototype package into an approved, testable product baseline.

- Validate target merchant segment, pilot geography, pricing, must-have integrations, and data residency.
- Review PRD/SRS scope and readiness audit; assign owners and approval status.
- Decide framework, ORM, identity approach, cloud/region, and repository structure through short spikes and ADRs.
- Inventory prototype business rules and tests; establish golden examples and an accessibility baseline.

**Exit gate:** owner-approved MVP scope, architecture decisions, risk register, and measurable pilot plan.

## Phase 1 — Secure platform foundation

**Goal:** implement identity, workspace membership, role checks, audit, and tenant isolation.

- Build a shared domain package and API contract before wiring production clients.
- Add database migrations, tenant context, row-level security, and negative cross-tenant tests.
- Add session lifecycle, MFA, permission checks, structured logging, and secret handling.
- Set up CI, deployment environments, backups, observability, incident procedures, and restore drills.

**Exit gate:** authorization and tenant-isolation tests pass; no unresolved critical/high security findings; restore and rollback procedures demonstrated.

## Phase 2 — Core commerce loop

**Goal:** support products, stock, orders, notifications, and dashboard summaries.

- Implement product catalog, import validation, stock ledger, and order state transitions.
- Make fulfillment/cancellation transactional, idempotent, and safe under concurrent requests.
- Add transactional outbox, worker processing, audit trail, and observable failures.
- Connect the web prototype to server-owned APIs one module at a time.

**Exit gate:** order-to-stock acceptance tests pass, including concurrency, retries, and rollback; pilot users can perform core work without local-only sample state.

## Phase 3 — MVP operations and pilot

**Goal:** add workspace administration, tickets, limited workflows, compliant email prerequisites, and pilot operations.

- Add plan entitlements, support tickets/SLA behavior, basic workflow definitions and history.
- Implement consent, unsubscribe, suppression, provider callbacks, and approved email sending.
- Recruit pilot merchants; run onboarding, support, and privacy workflows with real operators.
- Measure activation, stock accuracy, response times, and workflow reliability against agreed baselines.

**Exit gate:** owner-approved UAT; critical MVP requirements verified; legal/compliance review complete for launch jurisdictions; operational runbooks and support ownership in place.

## Phase 4 — V1 clients and integrations

**Goal:** validate desktop/mobile use cases and add offline behavior only where needed.

- Package supported Electron and React Native clients and use OS-supported secure credential storage.
- Implement a versioned sync protocol with retries, conflict handling, schema upgrades, and telemetry.
- Add provider integrations such as SMS, push, shipping, or social publishing only after consent, approval, and reliability checks.

**Exit gate:** platform-specific acceptance, store/signing readiness, sync conflict tests, and measured customer need.

## Phase 5 — Expansion

**Goal:** extend into deeper supply-chain, analytics, automation, and native integrations based on evidence.

- Prioritize modules from usage and support evidence rather than the prototype menu alone.
- Scale read models, queues, partitions, and service boundaries only when measured bottlenecks justify them.
- Revisit native clients or service extraction only after a documented cost/benefit decision.

## Cross-cutting release gates

- Security: threat review, dependency and secret scanning, authorization/tenant-negative tests, and independent testing for the release risk.
- Data integrity: migration/rollback review, idempotency and concurrency tests, verified backup restore.
- Quality: unit, integration, API contract, accessibility, and targeted end-to-end coverage.
- Operations: dashboards, alerts, incident owner, support process, and rollback rehearsal.
- Compliance: consent and suppression behavior, privacy notices, retention, export/deletion, and jurisdictional review.

## Risks to manage

Scope breadth, unvalidated demand, client/server rule drift, cross-tenant exposure, messaging-provider approval delays, offline conflict complexity, and unclear legal ownership can all delay launch. The readiness audit in the preserved source materials identifies concrete prototype and security gaps; close and retest those findings before claiming production readiness.

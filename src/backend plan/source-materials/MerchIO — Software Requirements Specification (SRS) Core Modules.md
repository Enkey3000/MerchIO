# MerchIO — Software Requirements Specification (SRS): Core Modules

Document 02 of the MerchIO documentation chain · Version 0.9 (draft for review) · 7 November 2026

| Field | Value |
| --- | --- |
| Document ID | SRS-001 |
| Status | In review |
| Based on | PRD-001 v0.9 |
| Structure | Follows ISO/IEC/IEEE 29148 |
| Owner | Tech lead, with product owner |
| Reviewers | QA lead, security lead, UX |
| Feeds | Architecture, Security Measures, OpenAPI, Test Plan, Test Cases, UAT, RTM |

**Reading note.** Requirements marked **\[OPEN\]** depend on an open PRD question (Q-nn) and may change. Everything else is ready for review.

---

## 1. Introduction

### 1.1 Purpose

This SRS states what the MerchIO platform shall do and how well, for the foundation services and the ten core modules defined in the PRD. It is the contract for design, security controls, API definition, testing and acceptance.

### 1.2 Scope

**In scope (this version):** accounts and sign-in (AUTH), workspaces and tenancy (TEN), audit (AUD), Team & Users (TEAM), Settings (SET), plans and limits (BIL), Inventory (INV), Orders (ORD), Notifications (NOT), Workflows (WFL), Support Tickets (TKT), Email Marketing (EML), Dashboard (DSH), basic Chart & Dashboard Builder (CHT), public website lead capture (PUB), and the sync interface for V1 clients (SYNC).

**Out of scope (separate SRS addendum, v1.1):** Text Marketing, Social Media, Accounts, Sales Pipeline, Deals & Schedules, Data Entry & Processing, Appointments, Chatbots, FAQs & Q&As, Supply Chains, Trending, Newsflash, Resources, Community.

### 1.3 Definitions

| Term | Meaning |
| --- | --- |
| Tenant / workspace | One customer business and all of its data, isolated from every other tenant |
| User | A person with an account; may belong to several workspaces |
| Membership | A user’s link to a workspace with one role |
| Role | Super Admin, Admin, Manager, Sales Rep, Support Agent, Viewer |
| SKU | Stock-keeping unit, the unique product code within a tenant |
| Stock movement | An immutable record that changes a product’s stock (order fulfilled, cancelled, restock, adjustment, import) |
| Workflow | A rule: when a trigger event happens, run one or more actions |
| Outbox | A durable list of events written in the same transaction as the change that caused them |
| SLA due time | The deadline for a ticket, set from its priority |
| Consent | A recorded permission from a contact to receive messages, with source, time and wording |
| Entitlement | A limit or feature a plan allows (seats, orders, contacts) |

### 1.4 Conventions

- **SHALL** = mandatory; **SHOULD** = recommended; **MAY** = optional.
- **Pri:** M = Must, S = Should, C = Could (MoSCoW). **Ph:** MVP or V1.
- **Ver:** verification method: T = test, I = inspection, A = analysis, D = demonstration.
- **ID format:** `FR-<MODULE>-nnn` functional; `NFR-<AREA>-nnn` non-functional; `BR-<AREA>-nnn` business rule; `DR-nnn` data; `EXT-nn` external interface. IDs never change meaning once baselined.
- Every requirement is atomic, testable and traces to a PRD epic (column Source).

### 1.5 References

PRD-001; Backend Plan v2; Readiness Audit (51 findings); Documentation Plan; `cursorrules.md`; `cursorsecurityrules.md`.

---

## 2. Overall description

### 2.1 System context

```
Users (web, desktop, mobile) ──► MerchIO API ──► PostgreSQL, Redis, file storage
Public website ──► Public API ──► (same core)           │
Workers (workflows, scheduler, email, imports) ◄── outbox events
        └──► Stripe · email provider · captcha · (V1: Twilio, push, carriers)
```

### 2.2 User classes

Personas PER-OWNER, PER-OPS, PER-MKT, PER-SALES, PER-SUP, PER-ADMIN (PRD section 4) map to the six workspace roles. PER-PLAT (platform administrator) uses internal tooling that is outside this SRS.

### 2.3 Operating environment

Clients: current browsers, then Electron desktop and React Native mobile (V1). Server: Node.js 22, TypeScript, NestJS, PostgreSQL 16 with row-level security, Redis 7, queue workers. Hosting: containers on one cloud provider.

### 2.4 Constraints

GDPR, CCPA, TCPA, CAN-SPAM; PCI SAQ-A (card data only in Stripe components); WCAG 2.2 AA; TypeScript strict; one shared domain package for rules used by server and clients; OpenAPI as the contract.

### 2.5 Assumptions and dependencies

As PRD section 13 (A-01 to A-06). Provider accounts (Stripe, email provider, captcha) exist before the related requirements are tested.

---

## 3. Functional requirements

### 3.1 Authentication (AUTH) — EPIC-FND-01

| ID | Requirement | Pri | Ph | Ver | Source |
| --- | --- | --- | --- | --- | --- |
| FR-AUTH-001 | The system SHALL let a person register with email and password and SHALL require email verification before the first sign-in to a workspace | M | MVP | T | EPIC-FND-01 |
| FR-AUTH-002 | The system SHALL require passwords of at least 12 characters, SHALL reject passwords found in known breach lists, and SHALL store them only as Argon2id hashes | M | MVP | T | EPIC-FND-01 |
| FR-AUTH-003 | The system SHALL issue access tokens valid for at most 15 minutes and rotating refresh tokens; reuse of a rotated refresh token SHALL revoke that token family | M | MVP | T | EPIC-FND-01 |
| FR-AUTH-004 | The system SHALL support time-based one-time-password (TOTP) multi-factor sign-in with recovery codes, and Admins SHALL be able to require it for all members | M | MVP | T | EPIC-FND-01 |
| FR-AUTH-005 | The system SHALL delay and then lock sign-in after repeated failures and SHALL return the same generic message whether or not the account exists | M | MVP | T | EPIC-FND-01 |
| FR-AUTH-006 | The system SHALL provide password reset by a single-use link valid for at most 30 minutes and SHALL revoke the user’s other sessions when the password changes | M | MVP | T | EPIC-FND-01 |
| FR-AUTH-007 | A user SHALL be able to list active sessions and revoke any of them | S | MVP | T | EPIC-FND-01 |
| FR-AUTH-008 | The system SHALL require re-verification (step-up) before billing changes, API-key creation, bulk export, role changes and account deletion | M | MVP | T | EPIC-FND-01 |
| FR-AUTH-009 | The system SHOULD offer single sign-on with Google and Microsoft accounts **\[OPEN Q-06\]** | S | MVP | T | EPIC-FND-01 |
| FR-AUTH-010 | Sign-out SHALL revoke the refresh token on the server | M | MVP | T | EPIC-FND-01 |
| FR-AUTH-011 | Desktop and mobile clients SHALL sign in with OAuth 2.1 and PKCE through the system browser and SHALL keep tokens in the operating-system secure store | M | V1 | T | EPIC-FND-01 |
| FR-AUTH-012 | The system SHALL record every authentication event (success, failure, lockout, reset, MFA change, token reuse) in the audit log | M | MVP | T | EPIC-FND-01 |

### 3.2 Workspaces and tenancy (TEN) — EPIC-FND-01

| ID | Requirement | Pri | Ph | Ver | Source |
| --- | --- | --- | --- | --- | --- |
| FR-TEN-001 | Every user SHALL belong to one or more workspaces through a membership that carries exactly one role | M | MVP | T | EPIC-FND-01 |
| FR-TEN-002 | The system SHALL isolate tenant data: every record carries a tenant identifier taken from the verified session (never from request content) and the database SHALL enforce isolation with row-level security | M | MVP | T | EPIC-FND-01 |
| FR-TEN-003 | On sign-up the system SHALL create a workspace with name, currency, time zone and default language | M | MVP | T | EPIC-FND-01 |
| FR-TEN-004 | A user who belongs to several workspaces SHALL be able to switch between them without signing in again | S | MVP | D | EPIC-FND-01 |
| FR-TEN-005 | Admins SHALL be able to enable or disable optional modules; core modules SHALL always be on; a disabled module SHALL reject API calls and be hidden in every client | M | MVP | T | EPIC-SET-01 |
| FR-TEN-006 | The system SHALL NOT create sample or demo data in a production workspace; an optional, clearly labelled demo workspace MAY be offered | M | MVP | I | EPIC-FND-01 |
| FR-TEN-007 | A platform administrator SHALL be able to suspend a workspace; the owner SHALL be able to export all data before deletion, and deletion SHALL follow the retention schedule | S | MVP | T | EPIC-FND-01 |

### 3.3 Audit (AUD) — EPIC-FND-01

| ID | Requirement | Pri | Ph | Ver | Source |
| --- | --- | --- | --- | --- | --- |
| FR-AUD-001 | Every create, update, delete and action SHALL write an audit record with actor, workspace, action, target, summary of change, result, IP address, request id and UTC time | M | MVP | T | EPIC-FND-01 |
| FR-AUD-002 | Audit records SHALL be append-only: no API or user interface SHALL edit or delete them; retention SHALL be at least 12 months (**PROPOSED**) | M | MVP | T | EPIC-FND-01 |
| FR-AUD-003 | Admins and Managers SHALL be able to view and filter the audit log; export SHALL need step-up verification | S | MVP | T | EPIC-NOT-01 |
| FR-AUD-004 | Security events (permission denial, cross-tenant attempt, webhook signature failure, rate-limit hit) SHALL be recorded and available to alerting | M | MVP | T | EPIC-FND-01 |

### 3.4 Team & Users (TEAM) — EPIC-TEAM-01

| ID | Requirement | Pri | Ph | Ver | Source |
| --- | --- | --- | --- | --- | --- |
| FR-TEAM-001 | Admins SHALL be able to invite people by email with a role; invitations SHALL be single-use and expire after 7 days | M | MVP | T | EPIC-TEAM-01 |
| FR-TEAM-002 | The system SHALL enforce the permission matrix in Appendix A for the six roles on every request | M | MVP | T | EPIC-TEAM-01 |
| FR-TEAM-003 | Admins SHALL be able to change a role, suspend, reactivate and remove members; the last Super Admin SHALL NOT be removable or demotable | M | MVP | T | EPIC-TEAM-01 |
| FR-TEAM-004 | Inviting or reactivating a member beyond the plan’s seat limit SHALL be blocked with a message that names the limit and offers an upgrade (BR-PLAN-001) | M | MVP | T | EPIC-TEAM-01 |
| FR-TEAM-005 | A member email SHALL be unique within a workspace, ignoring letter case (BR-UNQ-001) | M | MVP | T | EPIC-TEAM-01 |
| FR-TEAM-006 | Users SHALL be able to edit their own profile, change their password and manage their own MFA and sessions | M | MVP | T | EPIC-TEAM-01 |
| FR-TEAM-007 | A role change SHALL take effect no later than the user’s next access-token refresh (at most 15 minutes), and suspension SHALL revoke sessions immediately | M | MVP | T | EPIC-TEAM-01 |

### 3.5 Settings (SET) — EPIC-SET-01

| ID | Requirement | Pri | Ph | Ver | Source |
| --- | --- | --- | --- | --- | --- |
| FR-SET-001 | Admins SHALL be able to edit workspace name, logo, contact details, currency (ISO 4217), time zone (IANA) and default language | M | MVP | T | EPIC-SET-01 |
| FR-SET-002 | Changing the workspace currency SHALL NOT convert existing amounts (each record keeps its own currency); the system SHALL explain this and ask for confirmation | M | MVP | T | EPIC-SET-01 |
| FR-SET-003 | Each user SHALL be able to choose, per event category, whether to be notified in the app and by email (push in V1) | S | MVP | T | EPIC-SET-01 |
| FR-SET-004 | Admins SHALL be able to switch optional modules on and off (see FR-TEN-005) | M | MVP | T | EPIC-SET-01 |
| FR-SET-005 | Admins SHALL be able to connect and disconnect integrations (email provider first); credentials SHALL be stored encrypted and never shown again after saving | S | MVP | T | EPIC-SET-01 |
| FR-SET-006 | Admins SHALL be able to create scoped API keys (step-up required); a key SHALL be shown once, stored hashed, revocable, and show last-used time | S | MVP | T | EPIC-SET-01 |
| FR-SET-007 | Admins MAY manage outbound webhook endpoints with signing secrets and secret rotation | C | V1 | T | EPIC-SET-01 |
| FR-SET-008 | Admins SHALL be able to export all workspace data and to request workspace deletion (privacy rights) | M | MVP | T | EPIC-SET-01 |
| FR-SET-009 | The system SHALL NOT generate or display API keys or secrets in any client without a server call that creates them | M | MVP | I | EPIC-SET-01 |

### 3.6 Subscription, plans and limits (BIL) — EPIC-BIL-01

| ID | Requirement | Pri | Ph | Ver | Source |
| --- | --- | --- | --- | --- | --- |
| FR-BIL-001 | The system SHALL support the plans Starter, Professional and Enterprise with the limits in BR-PLAN-001 **\[OPEN Q-03\]** | M | MVP | T | EPIC-BIL-01 |
| FR-BIL-002 | An entitlement service SHALL check limits on every write path and SHALL return a distinct error code (limit reached) with the limit, current usage and upgrade link | M | MVP | T | EPIC-BIL-01 |
| FR-BIL-003 | Admins and Owners SHALL see current usage (seats, orders this month, contacts, active workflows) against plan limits | S | MVP | T | EPIC-BIL-01 |
| FR-BIL-004 | Plan change and payment SHALL use Stripe Checkout and Customer Portal; card data SHALL NOT pass through or be stored by MerchIO | S | MVP | I | EPIC-BIL-01 |
| FR-BIL-005 | Stripe webhook events SHALL be verified (signature, timestamp), de-duplicated by event id, and applied idempotently to subscription state | S | MVP | T | EPIC-BIL-01 |
| FR-BIL-006 | After a failed payment the system SHALL allow a grace period (7 days, **PROPOSED**) and then restrict the workspace to read-only without deleting data | S | MVP | T | EPIC-BIL-01 |
| FR-BIL-007 | When usage exceeds a lower plan after a downgrade, existing data SHALL be kept and only new creation beyond the limit SHALL be blocked | M | MVP | T | EPIC-BIL-01 |
| FR-BIL-008 | Plan changes SHALL be audited and Admins SHALL be notified | S | MVP | T | EPIC-BIL-01 |

### 3.7 Inventory (INV) — EPIC-INV-01

| ID | Requirement | Pri | Ph | Ver | Source |
| --- | --- | --- | --- | --- | --- |
| FR-INV-001 | Users with permission SHALL be able to create, view, edit and archive products with SKU, name, category, unit price (integer minor units plus currency), stock on hand, reorder point and status | M | MVP | T | EPIC-INV-01 |
| FR-INV-002 | A SKU SHALL be unique within a workspace, ignoring letter case (BR-UNQ-001) | M | MVP | T | EPIC-INV-01 |
| FR-INV-003 | Every change to stock SHALL be recorded as an immutable stock movement with reason (order fulfilled, order cancelled, restock, adjustment, import), quantity, actor, reference and UTC time | M | MVP | T | EPIC-INV-01 |
| FR-INV-004 | Manual stock adjustments SHALL require a reason, and stock on hand SHALL never become negative | M | MVP | T | EPIC-INV-01 |
| FR-INV-005 | Users SHALL be able to record a restock quantity from the product list or detail view | M | MVP | T | EPIC-INV-01 |
| FR-INV-006 | When a movement brings stock on hand to or below the reorder point (crossing from above), the system SHALL emit `inventory.low` once per crossing and notify permitted users | M | MVP | T | EPIC-INV-01 |
| FR-INV-007 | CSV import SHALL validate every row, skip duplicates and invalid rows, import up to 10,000 rows per file (**PROPOSED**) and return a row-level report | M | MVP | T | EPIC-INV-01 |
| FR-INV-008 | CSV export SHALL neutralise cells starting with =, +, - or @ (SEC-APP-05) | M | MVP | T | EPIC-INV-01 |
| FR-INV-009 | Lists SHALL support server-side search, filter (category, stock status), sort and cursor pagination | M | MVP | T | EPIC-INV-01 |
| FR-INV-010 | A product referenced by any order SHALL NOT be hard-deleted; it SHALL be archived instead | M | MVP | T | EPIC-INV-01 |
| FR-INV-011 | The mobile app MAY scan barcodes to find a product or count stock | C | V1 | D | EPIC-INV-01 |

### 3.8 Orders (ORD) — EPIC-ORD-01

| ID | Requirement | Pri | Ph | Ver | Source |
| --- | --- | --- | --- | --- | --- |
| FR-ORD-001 | Users with permission SHALL be able to create an order with customer, at least one line (product and quantity of at least 1), date, carrier and status; the system SHALL assign a per-workspace sequential order number | M | MVP | T | EPIC-ORD-01 |
| FR-ORD-002 | The order amount SHALL default to the sum of line price times quantity; overriding it SHALL need the permission `orders:price-override` | M | MVP | T | EPIC-ORD-01 |
| FR-ORD-003 | Statuses SHALL be Pending, Processing, Fulfilled and Cancelled; allowed transitions are Pending to Processing to Fulfilled, and any non-cancelled status to Cancelled | M | MVP | T | EPIC-ORD-01 |
| FR-ORD-004 | The Advance action to Fulfilled SHALL check stock for every line and apply all stock movements in one database transaction with row locks (BR-STK-001) | M | MVP | T | EPIC-ORD-01 |
| FR-ORD-005 | If any line exceeds stock on hand, the action SHALL fail with a message naming the product and available quantity, and SHALL change nothing (BR-STK-002) | M | MVP | T | EPIC-ORD-01 |
| FR-ORD-006 | When two requests advance the same order at the same time, exactly one SHALL succeed and the other SHALL receive a conflict response | M | MVP | T | EPIC-ORD-01 |
| FR-ORD-007 | Cancelling a Fulfilled order SHALL restore only the quantities recorded as applied for that order (BR-STK-003) | M | MVP | T | EPIC-ORD-01 |
| FR-ORD-008 | Orders in Pending or Processing MAY be edited; for Fulfilled orders only non-stock fields (carrier, notes) MAY be edited; every change SHALL be audited | M | MVP | T | EPIC-ORD-01 |
| FR-ORD-009 | Lists SHALL support search, filter by status, date range and customer, sort and cursor pagination | M | MVP | T | EPIC-ORD-01 |
| FR-ORD-010 | Each order SHALL show a timeline of status changes and stock movements | S | MVP | D | EPIC-ORD-01 |
| FR-ORD-011 | The system SHALL emit `orders.created`, `orders.fulfilled` and `orders.cancelled` events through the outbox | M | MVP | T | EPIC-ORD-01 |
| FR-ORD-012 | Users SHALL be able to import orders from CSV with the same validation report as inventory | S | MVP | T | EPIC-ORD-01 |
| FR-ORD-013 | The system MAY show carrier tracking status through a carrier adapter | C | V1 | D | EPIC-ORD-01 |
| FR-ORD-014 | Creating an order SHALL be blocked when the plan’s monthly order limit is reached (BR-PLAN-001) | M | MVP | T | EPIC-BIL-01 |

### 3.9 Notifications (NOT) — EPIC-NOT-01

| ID | Requirement | Pri | Ph | Ver | Source |
| --- | --- | --- | --- | --- | --- |
| FR-NOT-001 | Each user SHALL have an in-app notification feed with title, text, time, read state and a link to the related record | M | MVP | T | EPIC-NOT-01 |
| FR-NOT-002 | The system SHALL create notifications for: low stock, new order, order fulfilled, ticket created, escalated and overdue, workflow failure, import finished, plan limit reached, new website lead | M | MVP | T | EPIC-NOT-01 |
| FR-NOT-003 | Users SHALL be able to mark items read or unread, mark all read, and clear the feed | M | MVP | T | EPIC-NOT-01 |
| FR-NOT-004 | The unread count SHALL update in real time over a persistent connection, typically within 5 seconds of the event | M | MVP | T | EPIC-NOT-01 |
| FR-NOT-005 | Notifications SHALL be limited to modules and records the user may access (FR-TEAM-002) | M | MVP | T | EPIC-NOT-01 |
| FR-NOT-006 | Notifications SHALL respect each user’s preferences (FR-SET-003) | S | MVP | T | EPIC-NOT-01 |
| FR-NOT-007 | Notifications SHALL be kept for 90 days (**PROPOSED**) | S | MVP | I | EPIC-NOT-01 |
| FR-NOT-008 | Desktop clients SHALL show native notifications and a badge count; mobile clients SHALL receive push notifications | S | V1 | D | EPIC-NOT-01 |
| FR-NOT-009 | Admins and Managers SHALL be able to view an activity log built from audit records | S | MVP | T | EPIC-NOT-01 |

### 3.10 Workflows (WFL) — EPIC-WFL-01

| ID | Requirement | Pri | Ph | Ver | Source |
| --- | --- | --- | --- | --- | --- |
| FR-WFL-001 | Users with permission SHALL be able to create workflows with name, trigger, optional conditions, one or more actions and status Active or Paused | M | MVP | T | EPIC-WFL-01 |
| FR-WFL-002 | Triggers SHALL include: order placed, order fulfilled, stock below threshold, ticket created, new lead, record created, and a schedule | M | MVP | T | EPIC-WFL-01 |
| FR-WFL-003 | Actions SHALL include: notify team, queue email to a contact, create follow-up ticket; calling a webhook SHOULD be available; waiting for a period MAY be available | M | MVP | T | EPIC-WFL-01 |
| FR-WFL-004 | Events SHALL be written to an outbox in the same transaction as the change; each matching active workflow SHALL be queued with idempotency key `workflow_id:event_id` so a repeated delivery does not repeat its actions | M | MVP | T | EPIC-WFL-01 |
| FR-WFL-005 | Each run and step SHALL be logged with status, start and end time and error text, and shown in the user interface | M | MVP | T | EPIC-WFL-01 |
| FR-WFL-006 | Failed steps SHALL be retried with exponential backoff up to 5 times, then moved to a dead-letter queue and Admins SHALL be notified | M | MVP | T | EPIC-WFL-01 |
| FR-WFL-007 | A workflow chain SHALL stop at depth 3 and an action SHALL NOT re-trigger the workflow that caused it (BR-WFL-002) | M | MVP | T | EPIC-WFL-01 |
| FR-WFL-008 | Users SHOULD be able to run a test with a sample record that performs no external side effects | S | MVP | D | EPIC-WFL-01 |
| FR-WFL-009 | Pausing a workflow SHALL stop new runs immediately; runs already started SHALL finish | M | MVP | T | EPIC-WFL-01 |
| FR-WFL-010 | Editing a workflow SHOULD create a new version; each run SHALL record the version it used | S | MVP | T | EPIC-WFL-01 |
| FR-WFL-011 | The number of active workflows SHALL be limited by plan (Starter 5, Professional 50, **PROPOSED**) | S | MVP | T | EPIC-BIL-01 |
| FR-WFL-012 | Email actions SHALL send only to consented, non-suppressed contacts (BR-MSG-001) | M | MVP | T | EPIC-WFL-01 |

### 3.11 Support Tickets (TKT) — EPIC-TKT-01

| ID | Requirement | Pri | Ph | Ver | Source |
| --- | --- | --- | --- | --- | --- |
| FR-TKT-001 | Users with permission SHALL be able to create tickets with subject, description, customer name and email, priority (High, Medium, Low), status (Open, Escalated, Resolved), assignee and source (manual, website, chatbot) | M | MVP | T | EPIC-TKT-01 |
| FR-TKT-002 | The due time SHALL be set from priority at creation and whenever priority changes: High 4 hours, Medium 24 hours, Low 72 hours (BR-SLA-001) | M | MVP | T | EPIC-TKT-01 |
| FR-TKT-003 | The system SHALL show each ticket as on time, due soon or overdue, and SHALL notify the assignee and managers when a ticket becomes overdue | M | MVP | T | EPIC-TKT-01 |
| FR-TKT-004 | Each ticket SHALL have a thread of customer-visible replies and internal notes, each with author and time | M | MVP | T | EPIC-TKT-01 |
| FR-TKT-005 | A ticket SHALL be assignable only to active members whose role may handle tickets | M | MVP | T | EPIC-TKT-01 |
| FR-TKT-006 | Escalate SHALL set status Escalated, priority High and due time four hours from now, and SHALL notify managers | M | MVP | T | EPIC-TKT-01 |
| FR-TKT-007 | Tickets SHALL be resolvable and reopenable; the thread SHALL be kept | M | MVP | T | EPIC-TKT-01 |
| FR-TKT-008 | The system SHALL measure time to first reply and report it on the dashboard | S | MVP | T | EPIC-TKT-01 |
| FR-TKT-009 | Lists SHALL support search and filter by status, priority, assignee and overdue, with cursor pagination | M | MVP | T | EPIC-TKT-01 |
| FR-TKT-010 | Customer-visible replies SHOULD be delivered by email through the email provider | S | MVP | T | EPIC-TKT-01 |
| FR-TKT-011 | Unanswered chatbot questions SHOULD create tickets with source chatbot | S | V1 | T | EPIC-TKT-01 |
| FR-TKT-012 | Attachments MAY be added with type and size limits and malware scanning (SEC-APP-06) | C | V1 | T | EPIC-TKT-01 |

### 3.12 Email Marketing (EML) — EPIC-EML-01

| ID | Requirement | Pri | Ph | Ver | Source |
| --- | --- | --- | --- | --- | --- |
| FR-EML-001 | The system SHALL store contacts with email, name, consent status (source, time and exact wording) and unsubscribe flag; a contact email SHALL be unique within a workspace | M | MVP | T | EPIC-EML-01 |
| FR-EML-002 | Users SHALL be able to create campaigns with name, subject, content, audience and status Draft, Scheduled, Sent or Failed; scheduled time SHALL use the workspace time zone | M | MVP | T | EPIC-EML-01 |
| FR-EML-003 | A campaign SHALL be sent only to contacts with recorded consent who are not unsubscribed or suppressed; the recipient count SHALL be computed from actual recipients (BR-MSG-001) | M | MVP | T | EPIC-EML-01 |
| FR-EML-004 | Every message SHALL include sender identification and an unsubscribe link; an unsubscribe SHALL take effect immediately and permanently (BR-MSG-002) | M | MVP | T | EPIC-EML-01 |
| FR-EML-005 | Campaign HTML SHALL be sanitised before storage and sending | M | MVP | T | EPIC-EML-01 |
| FR-EML-006 | The system SHOULD send through an email provider (Amazon SES or SendGrid) and SHOULD turn bounces and complaints into suppressions | S | MVP | T | EPIC-EML-01 |
| FR-EML-007 | Scheduled campaigns SHALL be sent exactly once by the scheduler (BR-SCH-001) | M | MVP | T | EPIC-EML-01 |
| FR-EML-008 | Results (sent, delivered, opened, clicked, bounced, unsubscribed) SHALL come from provider events; the system SHALL NOT display simulated figures (BR-SIM-001) | S | MVP | T | EPIC-EML-01 |
| FR-EML-009 | Users SHOULD be able to send a test message to themselves | S | MVP | D | EPIC-EML-01 |
| FR-EML-010 | The system SHOULD verify the sending domain (SPF and DKIM) before the first send and SHOULD apply sending-rate limits | S | MVP | T | EPIC-EML-01 |

### 3.13 Dashboard (DSH) — EPIC-DSH-01

| ID | Requirement | Pri | Ph | Ver | Source |
| --- | --- | --- | --- | --- | --- |
| FR-DSH-001 | The dashboard SHALL show: revenue by month for six months (fulfilled orders), orders by status, open orders, open tickets, low-stock count, recent activity and email campaign results | M | MVP | T | EPIC-DSH-01 |
| FR-DSH-002 | Widgets SHALL show only data the user may access and SHALL use the workspace currency and time zone | M | MVP | T | EPIC-DSH-01 |
| FR-DSH-003 | Each key figure SHOULD link to the matching filtered list | S | MVP | D | EPIC-DSH-01 |
| FR-DSH-004 | Figures SHOULD be no more than 60 seconds old | S | MVP | T | EPIC-DSH-01 |
| FR-DSH-005 | A new workspace SHOULD show a checklist (import products, invite team, record first order, switch on an automation) instead of empty charts | S | MVP | D | EPIC-DSH-01 |

### 3.14 Chart & Dashboard Builder, basic (CHT) — EPIC-CHT-01

| ID | Requirement | Pri | Ph | Ver | Source |
| --- | --- | --- | --- | --- | --- |
| FR-CHT-001 | Users SHOULD be able to build a chart from platform data (stock, orders by status, revenue by month, campaign results), from an uploaded CSV, or from rows typed in | S | MVP | T | EPIC-CHT-01 |
| FR-CHT-002 | Chart types SHOULD include bar, line, pie and doughnut in the MVP; radar and polar MAY follow in V1 | S | MVP | D | EPIC-CHT-01 |
| FR-CHT-003 | Users SHOULD be able to save charts to dashboards shared within the workspace | S | MVP | T | EPIC-CHT-01 |
| FR-CHT-004 | Chart queries SHALL use a server-side, allowlisted query builder; clients SHALL NOT send raw query text | M | MVP | T | EPIC-CHT-01 |
| FR-CHT-005 | Uploaded CSV SHALL be limited to 5 MB and 50,000 rows and validated like other imports | S | MVP | T | EPIC-CHT-01 |
| FR-CHT-006 | Every chart SHALL have a text summary and a data-table view for screen-reader users | M | MVP | T | EPIC-CHT-01 |
| FR-CHT-007 | Charts MAY be exported as an image or CSV by the server | C | V1 | D | EPIC-CHT-01 |

### 3.15 Public website lead capture (PUB) — EPIC-PUB-01

| ID | Requirement | Pri | Ph | Ver | Source |
| --- | --- | --- | --- | --- | --- |
| FR-PUB-001 | The public API SHALL provide endpoints to submit a contact request, a trial request and a newsletter subscription | S | MVP | T | EPIC-PUB-01 |
| FR-PUB-002 | Public endpoints SHALL be protected by captcha, a honeypot field and rate limits per IP address and per email | M | MVP | T | EPIC-PUB-01 |
| FR-PUB-003 | Newsletter subscriptions SHALL use double opt-in and SHALL record consent source, time and wording | M | MVP | T | EPIC-PUB-01 |
| FR-PUB-004 | A contact or trial request SHALL create a lead with source Website, notify permitted users and raise the `leads.created` event | S | MVP | T | EPIC-PUB-01 |
| FR-PUB-005 | Public responses SHALL NOT echo personal data and public URLs SHALL NOT contain personal data | M | MVP | T | EPIC-PUB-01 |
| FR-PUB-006 | Every form SHALL show the privacy notice link and the consent wording | M | MVP | I | EPIC-PUB-01 |

### 3.16 Sync interface for desktop and mobile (SYNC) — EPIC-SYNC-01 (V1)

| ID | Requirement | Pri | Ph | Ver | Source |
| --- | --- | --- | --- | --- | --- |
| FR-SYNC-001 | The API SHALL return changes since a client’s last cursor (created, updated, deleted) only for data the user may access | M | V1 | T | EPIC-SYNC-01 |
| FR-SYNC-002 | The API SHALL accept a batch of client changes, each with a client mutation id, entity, base version and payload, and SHALL answer per item: applied, rejected (with the validation message) or conflict | M | V1 | T | EPIC-SYNC-01 |
| FR-SYNC-003 | Replayed mutations SHALL have no additional effect | M | V1 | T | EPIC-SYNC-01 |
| FR-SYNC-004 | Stock counts, order status and plan data SHALL be server-authoritative; conflicts SHALL be returned for user review; notes and ticket text SHALL merge by field | M | V1 | T | EPIC-SYNC-01 |
| FR-SYNC-005 | Clients SHALL queue changes while offline in persistent storage and send them in order on reconnect | M | V1 | T | EPIC-SYNC-01 |
| FR-SYNC-006 | Users SHALL be able to see and revoke registered devices | S | V1 | T | EPIC-SYNC-01 |
| FR-SYNC-007 | The API SHALL reject clients below a minimum supported version with an update-required response | S | V1 | T | EPIC-SYNC-01 |

---

## 4. Business rules

| ID | Rule | Used by |
| --- | --- | --- |
| BR-STK-001 | Fulfilling an order decreases stock for all its lines in one transaction, with row locks | FR-ORD-004 |
| BR-STK-002 | An order cannot be fulfilled when any line exceeds stock on hand | FR-ORD-005 |
| BR-STK-003 | Cancelling a fulfilled order restores only the quantity recorded as applied (`stock_applied`) | FR-ORD-007 |
| BR-STK-004 | The low-stock event fires once when stock moves from above to at-or-below the reorder point | FR-INV-006 |
| BR-UNQ-001 | Within a workspace, uniqueness (ignoring letter case) applies to: product SKU, member email, contact email, order number | FR-INV-002, FR-TEAM-005, FR-EML-001 |
| BR-MSG-001 | Marketing messages go only to contacts with recorded consent who are not unsubscribed or suppressed | FR-EML-003, FR-WFL-012 |
| BR-MSG-002 | Every marketing email carries sender identification and an unsubscribe link; unsubscribe is immediate and permanent | FR-EML-004 |
| BR-MSG-003 | (V1, text messages) Opt-out wording is required, consent is recorded, and sending is blocked outside 08:00 to 21:00 in the recipient’s local time | SMS addendum |
| BR-MSG-004 | Sends are idempotent: a retry never sends the same message twice | FR-EML-007 |
| BR-SLA-001 | Ticket due time: High 4 hours, Medium 24 hours, Low 72 hours from creation or priority change | FR-TKT-002 |
| BR-SLA-002 | Escalation sets High priority and a due time four hours from the escalation | FR-TKT-006 |
| BR-PLAN-001 | Starter: 3 seats, 500 orders per month, 2,500 contacts, 5 active workflows. Professional: 15 seats, unlimited orders, higher contact limit, 50 active workflows. Enterprise: custom **\[OPEN Q-03\]** | FR-BIL-001, FR-TEAM-004, FR-ORD-014 |
| BR-PLAN-002 | Limits are enforced by the server on every write path, never only in a client | FR-BIL-002 |
| BR-WFL-001 | A workflow runs only while Active, once per event, using the idempotency key | FR-WFL-004 |
| BR-WFL-002 | Chains stop at depth 3; an action does not re-trigger its own workflow | FR-WFL-007 |
| BR-SCH-001 | Scheduled items are claimed by the scheduler with row locking so each is processed exactly once | FR-EML-007 |
| BR-DATA-001 | Money is stored as integer minor units plus an ISO currency code per record | All money fields |
| BR-DATA-002 | Times are stored in UTC and shown in the workspace time zone | All time fields |
| BR-DATA-003 | Identifiers are UUIDv7; order numbers come from a per-workspace sequence | All entities |
| BR-DATA-004 | Customer-facing records are soft-deleted; audit and stock movement records are never deleted | All entities |
| BR-DATA-005 | Every mutation is audited | FR-AUD-001 |
| BR-SIM-001 | Anything not backed by a live provider is labelled Demo and never shown as real results | FR-EML-008 |

---

## 5. Non-functional requirements

| ID | Requirement | Pri | Ver |
| --- | --- | --- | --- |
| NFR-PERF-001 | API p95 latency SHALL be at most 300 ms for reads and 500 ms for writes at the design load of 1,000 workspaces, 50,000 orders per workspace and 100 requests per second sustained (**PROPOSED**) | M | T |
| NFR-PERF-002 | The dashboard SHALL respond within 2 seconds (p95) for a workspace with 50,000 orders | M | T |
| NFR-PERF-003 | List endpoints SHALL return at most 100 items per page | M | T |
| NFR-PERF-004 | A 10,000-row import SHALL finish within 60 seconds as a background job with visible progress | M | T |
| NFR-PERF-005 | Web pages SHALL reach largest contentful paint within 2.5 seconds on a mid-range device, with at most 250 KB of compressed JavaScript per route | S | T |
| NFR-AVL-001 | Availability SHALL be at least 99.9 percent per month; recovery point objective 5 minutes; recovery time objective 1 hour | M | A, T |
| NFR-AVL-002 | Deployments SHALL cause no downtime; database changes SHALL use expand and contract migrations | M | T |
| NFR-SCL-001 | API servers SHALL be stateless and scale horizontally; workers SHALL scale per queue | M | A |
| NFR-REL-001 | Background jobs SHALL be at-least-once with idempotency so effects happen once; no duplicate emails or stock movements | M | T |
| NFR-SEC-001 | The system SHALL meet OWASP ASVS level 2 and implement the controls in the Security Measures document | M | T, I |
| NFR-SEC-002 | All traffic SHALL use TLS 1.2 or higher; data SHALL be encrypted at rest; secrets SHALL come from a secret manager and never appear in code or logs | M | I, T |
| NFR-SEC-003 | An independent penetration test SHALL be completed before launch with no open critical or high findings | M | D |
| NFR-SEC-004 | Vulnerability patching: critical within 48 hours, high within 7 days, medium within 30 days | M | I |
| NFR-PRV-001 | The system SHALL support data export and deletion requests within 30 days, a consent log and a retention schedule | M | T |
| NFR-PRV-002 | Logs SHALL NOT contain passwords, tokens, secrets or card data, and SHALL minimise personal data | M | I, T |
| NFR-ACC-001 | Core journeys (J-01 to J-07) SHALL conform to WCAG 2.2 level AA, including keyboard operation, labelled controls, focus management in dialogs and text alternatives for charts | M | T, I |
| NFR-USE-001 | A new user SHOULD be able to record a first order within 10 minutes of finishing workspace setup (**PROPOSED**) | S | D |
| NFR-I18N-001 | All interface text SHALL be externalised; English at launch; dates, numbers and currency SHALL use locale-aware formatting **\[OPEN Q-12\]** | M | I |
| NFR-CMP-001 | The system SHALL support the browser, operating-system and device matrix in PRD section 9 | M | T |
| NFR-OFF-001 | (V1) Desktop and mobile clients SHALL work offline for core actions and SHALL sync within 30 seconds of reconnecting without data loss | M | T |
| NFR-OBS-001 | Services and clients SHALL emit structured logs, traces and metrics, with alerts for errors, latency, queue depth and security events | M | I, D |
| NFR-BKP-001 | Encrypted daily backups with point-in-time recovery SHALL be taken and a restore SHALL be tested at least quarterly | M | D |
| NFR-DAT-001 | Retention: audit records at least 12 months; notifications 90 days; deleted workspace data purged within 30 days after any legal hold (**PROPOSED**) | S | I |
| NFR-MNT-001 | Business-rule code SHALL have at least 90 percent line coverage, API code at least 80 percent, and every requirement SHALL be traced to tests | M | A |
| NFR-CAP-001 | Upload limits SHALL be enforced: CSV imports 5 MB (charts) and 10,000 rows (products and orders) unless changed by decision | M | T |

---

## 6. Data requirements (data dictionary summary)

Classes: **R** = Restricted, **C** = Confidential, **I** = Internal. Every tenant-owned entity also carries id (UUIDv7), tenant id, created and updated time, version and soft-delete marker (BR-DATA).

| ID | Entity | Key attributes | Class | Retention |
| --- | --- | --- | --- | --- |
| DR-001 | Tenant (workspace) | name, logo, currency, time zone, language, plan, module switches, status | I | Life of account + 30 days |
| DR-002 | User | email, name, password hash, MFA secret (encrypted), status | R | Life of account; deleted on request |
| DR-003 | Membership | user, tenant, role, status, invited by | I | Life of membership |
| DR-004 | Session / token family | device, created, last used, revoked | R | 30 days after expiry |
| DR-005 | Product | SKU, name, category, price minor units, currency, stock on hand, reorder point, status | I | Life of account |
| DR-006 | Stock movement | product, quantity, reason, reference, actor, time | I | Life of account (never deleted) |
| DR-007 | Order | number, customer, status, amount, currency, date, carrier, stock\_applied | C | Life of account (7 years if tax needs **\[OPEN\]**) |
| DR-008 | Order line | order, product, quantity, unit price | C | With order |
| DR-009 | Contact | email, name, tags, unsubscribe flag | C | Until deleted or erased on request |
| DR-010 | Consent record | contact, source, wording, time, status changes | C | Life of contact + legal period |
| DR-011 | Campaign | name, subject, sanitised content, audience, schedule, status | I | Life of account |
| DR-012 | Campaign event | recipient, provider event, time | C | 13 months |
| DR-013 | Workflow | name, trigger, conditions, actions, status, version | I | Life of account |
| DR-014 | Workflow run and step | workflow version, event id, status, timings, error | I | 90 days |
| DR-015 | Outbox event | type, payload reference, status, attempts | I | 30 days after processed |
| DR-016 | Ticket | subject, description, customer, priority, status, assignee, due time, source | C | Life of account |
| DR-017 | Ticket comment | ticket, author, visibility, text, time | C | With ticket |
| DR-018 | Notification | user, type, text, link, read state | C | 90 days |
| DR-019 | Audit record | actor, action, target, summary, result, IP, request id, time | C | At least 12 months |
| DR-020 | Plan, subscription, entitlement | plan, limits, provider references, status, period | I | Life of account + 7 years for invoices |
| DR-021 | Dataset, chart, dashboard | source, rows or reference, type, options, owner | C | Life of account |
| DR-022 | Lead | name, email, source, message, stage, consent | C | Until deleted; 24 months if unconverted **\[OPEN\]** |
| DR-023 | Subscriber (newsletter) | email, double opt-in state, wording, time | C | Until unsubscribed + proof for legal period |
| DR-024 | API key | name, scopes, hash, last used, created by | R | Until revoked + 90 days |
| DR-025 | Integration | provider, encrypted credentials, status | R | Until disconnected |
| DR-026 | Device (V1) | platform, client version, last seen, revoked | I | 12 months |

---

## 7. External interfaces

| ID | Interface | Purpose | Phase | Requirements |
| --- | --- | --- | --- | --- |
| EXT-01 | Stripe (Checkout, Customer Portal, webhooks) | Subscription and payment | MVP | FR-BIL-004, -005 |
| EXT-02 | Email provider (Amazon SES or SendGrid) | Campaign and ticket-reply delivery, bounce and complaint events | MVP | FR-EML-006, FR-TKT-010 |
| EXT-03 | Captcha provider (for example Cloudflare Turnstile or hCaptcha) | Public form protection | MVP | FR-PUB-002 |
| EXT-04 | Error reporting and telemetry (Sentry, OpenTelemetry backend) | Observability | MVP | NFR-OBS-001 |
| EXT-05 | OIDC identity providers (Google, Microsoft) | Single sign-on **\[OPEN Q-06\]** | MVP | FR-AUTH-009 |
| EXT-06 | Push services (FCM, APNs) | Mobile push | V1 | FR-NOT-008 |
| EXT-07 | Carrier tracking (EasyPost or Shippo) | Tracking status | V1 | FR-ORD-013 |
| EXT-08 | Twilio | Text messaging (addendum) | V1 | BR-MSG-003 |
| EXT-09 | Store and e-commerce platforms (Shopify, WooCommerce) **\[OPEN Q-04\]** | Imports and sync | V1 | Addendum |

All interfaces use TLS, least-privilege credentials stored encrypted, timeouts, retries with backoff and circuit breakers, and are replaceable behind an adapter.

---

## 8. Security and privacy requirements (input to Security Measures)

| Area | Requirement summary | Where specified | Control family | Threats |
| --- | --- | --- | --- | --- |
| Identity | Strong passwords, MFA, token rotation, lockout, step-up | FR-AUTH-001 to -012 | SEC-AUTH | THR-002, THR-016 |
| Tenancy and access | Tenant from session only, row-level security, role matrix on every request, default deny | FR-TEN-002, FR-TEAM-002, Appendix A | SEC-AUTHZ | THR-001, THR-009 |
| Input and output | Strict validation, safe rendering, CSV safety, upload limits, no raw queries from clients | FR-INV-007, -008, FR-CHT-004, -005, FR-EML-005 | SEC-APP | THR-003, THR-005, THR-006, THR-010 |
| API and public endpoints | Rate limits, idempotency, captcha, replay protection, signed webhooks | FR-PUB-002, FR-BIL-005, FR-SYNC-003 | SEC-API | THR-004, THR-007, THR-008, THR-014 |
| Messaging compliance | Consent, unsubscribe, quiet hours, no simulated results | BR-MSG, FR-EML-003, -004, -008 | SEC-COMP | THR-015 |
| Audit and detection | Append-only audit, security events, alerting | FR-AUD-001 to -004 | SEC-LOG | All |
| Data protection | Encryption, secrets management, export and delete, retention | NFR-SEC-002, NFR-PRV-001, NFR-DAT-001, FR-SET-008 | SEC-DATA, SEC-SEC | THR-017, THR-019 |
| Native clients (V1) | PKCE sign-in, secure token storage, sandboxed desktop renderer, signed updates | FR-AUTH-011, FR-SYNC-007 | SEC-MOB, SEC-DESK | THR-012, THR-013, THR-018 |
| Supply chain | Locked dependencies, scanning, patch SLAs | NFR-SEC-004 | SEC-SC | THR-011 |

---

## Appendix A. Role permission matrix (**PROPOSED**, needs confirmation)

V = view; E = create and edit; A = run actions (advance, send, assign, escalate, restock); D = archive or delete; X = administer; — = no access. Every cell is enforced by the server (FR-TEAM-002).

| Area | Super Admin | Admin | Manager | Sales Rep | Support Agent | Viewer |
| --- | --- | --- | --- | --- | --- | --- |
| Dashboard | V | V | V | V (own modules) | V (own modules) | V |
| Inventory | V E A D | V E A D | V E A | V | V | V |
| Orders | V E A D | V E A D | V E A | V E | V | V |
| Order price override | Yes | Yes | Yes | No | No | No |
| Notifications (own) | V E | V E | V E | V E | V E | V E |
| Workflows | V E A D | V E A D | V E A | V | — | V |
| Support tickets | V E A D | V E A D | V E A | V | V E A | V |
| Email marketing | V E A D | V E A D | V E A | V | — | V |
| Charts and dashboards | V E D | V E D | V E | V E | V | V |
| Team & Users | X | X (not Super Admin) | V | — | — | — |
| Settings | X | X | V | — | — | — |
| API keys and integrations | X | X | — | — | — | — |
| Billing and plan | X | V | — | — | — | — |
| Audit log | V export | V export | V | — | — | — |
| Delete workspace, transfer ownership | X | — | — | — | — | — |

---

## Appendix B. Acceptance criteria (samples; full set becomes Test Cases)

| ID | Requirement | Given / When / Then |
| --- | --- | --- |
| AC-ORD-004 | FR-ORD-004, BR-STK-001 | **Given** product SKU-1 has 10 in stock and a Processing order has 3 units; **when** the order is advanced to Fulfilled; **then** stock is 7, one stock movement of minus 3 exists with the order as reference, the order is Fulfilled and an `orders.fulfilled` event is queued |
| AC-ORD-005 | FR-ORD-005, BR-STK-002 | **Given** SKU-1 has 2 in stock and an order needs 3; **when** the order is advanced to Fulfilled; **then** the request fails with a message naming SKU-1 and 2 available, and stock, status and movements are unchanged |
| AC-ORD-006 | FR-ORD-006 | **Given** one Processing order; **when** two users advance it at the same moment; **then** exactly one request succeeds, the other receives a conflict response, and stock is reduced once |
| AC-ORD-007 | FR-ORD-007, BR-STK-003 | **Given** a Fulfilled order that applied 3 units; **when** it is cancelled; **then** stock increases by 3 and a restocking movement is recorded; a Fulfilled order with no applied quantity restores nothing |
| AC-INV-006 | FR-INV-006, BR-STK-004 | **Given** reorder point 5 and stock 6; **when** a movement brings stock to 4; **then** one low-stock notification and event are produced; a further movement to 3 produces none |
| AC-TEN-002 | FR-TEN-002 | **Given** workspaces A and B; **when** a user of B requests an identifier that belongs to A on any endpoint; **then** the response is not found and no data from A is returned |
| AC-TEAM-004 | FR-TEAM-004, BR-PLAN-001 | **Given** a Starter workspace with 3 members; **when** an Admin invites a fourth; **then** the invitation is rejected with the limit, current usage and an upgrade link |
| AC-AUTH-003 | FR-AUTH-003 | **Given** a refresh token already exchanged once; **when** it is presented again; **then** the request is refused, the whole token family is revoked, and an audit event is recorded |
| AC-EML-003 | FR-EML-003, BR-MSG-001 | **Given** 100 contacts of whom 80 consented and 5 of those unsubscribed; **when** a campaign to all contacts is sent; **then** it goes to 75 recipients and the recorded count is 75 |
| AC-EML-004 | FR-EML-004 | **Given** a recipient clicks unsubscribe; **when** the next campaign is sent; **then** that contact is excluded, including from queued jobs |
| AC-TKT-002 | FR-TKT-002, BR-SLA-001 | **Given** a Medium ticket created at 10:00; **then** it is due at 10:00 the next day; **when** its priority changes to High at 12:00; **then** the due time becomes 16:00 the same day |
| AC-WFL-004 | FR-WFL-004, BR-WFL-001 | **Given** an Active workflow for order placed and an event delivered twice; **then** the actions run once and the run log shows one run |
| AC-PUB-002 | FR-PUB-002 | **Given** a form submission with the honeypot field filled or beyond the rate limit; **then** it is rejected without creating a record |

---

## Appendix C. Traceability summary

| PRD epic | Requirements | Count |
| --- | --- | --- |
| EPIC-FND-01 | FR-AUTH-001 to -012, FR-TEN-001 to -007, FR-AUD-001 to -004 | 23 |
| EPIC-TEAM-01 | FR-TEAM-001 to -007 | 7 |
| EPIC-SET-01 | FR-SET-001 to -009 | 9 |
| EPIC-BIL-01 | FR-BIL-001 to -008 (plus FR-ORD-014, FR-WFL-011) | 8 |
| EPIC-INV-01 | FR-INV-001 to -011 | 11 |
| EPIC-ORD-01 | FR-ORD-001 to -013 | 13 |
| EPIC-NOT-01 | FR-NOT-001 to -009 | 9 |
| EPIC-WFL-01 | FR-WFL-001 to -010, -012 | 11 |
| EPIC-TKT-01 | FR-TKT-001 to -012 | 12 |
| EPIC-EML-01 | FR-EML-001 to -010 | 10 |
| EPIC-DSH-01 | FR-DSH-001 to -005 | 5 |
| EPIC-CHT-01 | FR-CHT-001 to -007 | 7 |
| EPIC-PUB-01 | FR-PUB-001 to -006 | 6 |
| EPIC-SYNC-01 | FR-SYNC-001 to -007 | 7 |

Totals: **140 functional requirements, 22 business rules, 25 non-functional requirements, 26 data entities, 9 external interfaces.** The RTM will link each to design, controls, API operations, tests and UAT.

---

## Appendix D. Open issues needing a decision

| ID | Issue | Needed from |
| --- | --- | --- |
| OI-01 | Confirm retention periods (audit, orders, leads, campaign events) with legal advice | Product owner, legal |
| OI-02 | Ticket deadlines: calendar hours or business hours? | Product owner |
| OI-03 | Import limits (10,000 rows, 5 MB) and chart data limit (50,000 rows) | Tech lead |
| OI-04 | Payment grace period and read-only behaviour (7 days proposed) | Product owner |
| OI-05 | Plan limits including active workflows and contacts (Q-03) | Product owner |
| OI-06 | Role matrix in Appendix A, including who may override prices | Product owner |
| OI-07 | Email provider choice and sending domain strategy | Tech lead |
| OI-08 | Whether MFA is mandatory for Admins and Super Admins | Security lead |
| OI-09 | Order and invoice retention for tax purposes (country dependent, Q-02) | Legal |
| OI-10 | Single sign-on at launch (Q-06) | Product owner |

---

## Approval and change log

| Role | Name | Decision | Date |
| --- | --- | --- | --- |
| Product owner |  |  |  |
| Tech lead |  |  |  |
| Security lead |  |  |  |
| QA lead |  |  |  |

Change log: 0.9, 7 November 2026, first draft for the core modules from PRD-001, the prototypes, backend plan v2 and the readiness audit.

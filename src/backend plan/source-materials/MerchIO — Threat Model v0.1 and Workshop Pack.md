# MerchIO — Threat Model v0.1 and Workshop Pack

Document 07 of the MerchIO documentation chain · Version 0.1 (first pass, needs team validation) · 7 November 2026

| Field | Value |
| --- | --- |
| Document ID | TM-001 |
| Status | Draft: AI-prepared first pass; **not yet validated by a team** |
| Owner | Security lead |
| Participants (workshop) | Architect, backend lead, front-end leads (web, mobile, desktop), DevOps, QA, product owner |
| Inputs | PRD-001, SRS-001, Backend Plan v2, Readiness Audit, `cursorsecurityrules.md` |
| Feeds | Security Measures, Test Cases, Pen Test Plan, Incident Response Plan, Architecture |

---

## 1. What this document is, and what I could and could not do

You asked me to run the threat-model workshop. A real workshop needs people in a room (or call) who know the system, so I cannot hold one alone. What I did instead:

**Done:** I ran a structured analysis of the system as a facilitator would: I defined assets, actors and trust boundaries, drew the data flows, applied STRIDE to every element, rated each threat, mapped each to controls and to verifying tests, and tied everything back to the SRS and the readiness audit. The result is a complete **first-pass register of 31 threats**.

**Not done (needs humans):** confirm the system model matches reality, calibrate the likelihood and impact ratings, add threats only the team knows about, and decide the open questions in Section 11. Until that session happens, every threat has the status **Proposed**, and the ratings are my judgement, not team consensus.

**How to use it:** read Sections 2 to 7 (the model), skim the register in Section 8, then run the three working sessions in Section 11 with the team using this document as the agenda and the pre-filled answers.

---

## 2. Scope and method

**In scope:** the MVP (web app, public API, workers, database, queue, file storage, third-party providers) and the V1 clients (Electron desktop app, React Native mobile app, sync). The public website and the delivery pipeline (source control, CI/CD, dependencies, the AI coding assistant) are in scope because they can compromise the product.

**Out of scope for this version:** the Text Marketing, Social and other V1 modules not yet in the SRS; physical security; the cloud provider’s own infrastructure.

**Method:** a four-question approach.

1. What are we working on? (Sections 3 to 6)
2. What can go wrong? (STRIDE per element, Section 7; register, Section 8)
3. What are we going to do about it? (controls, Section 8)
4. Did we do a good enough job? (verifying tests and residual risk, Sections 8 to 10)

**STRIDE:** Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege. A short privacy pass (linkability, identifiability, non-compliance) is included where personal data is involved.

**Rating:** Likelihood (1 to 5) times Impact (1 to 5) before controls (inherent). Bands: **Critical** 20 or more; **High** 12 to 19; **Medium** 6 to 11; **Low** 5 or less. The target after controls is Low or Medium. Ratings are **PROPOSED** until calibrated by the team.

---

## 3. Assets

| ID | Asset | Why it matters | Class |
| --- | --- | --- | --- |
| AS-01 | Tenant business data (orders, stock, prices, workflows) | The core of each customer’s business; integrity errors cost money | Confidential |
| AS-02 | Customer personal data (contacts, tickets, leads, subscribers) | Privacy law exposure; reputational harm | Confidential |
| AS-03 | Consent records | Legal proof for messaging | Confidential |
| AS-04 | Credentials, session tokens, MFA secrets, API keys | Account takeover | Restricted |
| AS-05 | Integration credentials (email provider, Stripe) | Spend, spam and data theft | Restricted |
| AS-06 | Audit log | Evidence and accountability | Confidential |
| AS-07 | Source code, build pipeline, signing keys | Supply-chain compromise | Restricted |
| AS-08 | Local data on desktop and mobile devices | Theft of lost or shared devices | Confidential |
| AS-09 | Availability of the service and the background jobs | Customers run daily work on it | Internal |
| AS-10 | Sender reputation (email domains and numbers) | Blocklisting stops all customers’ email | Internal |
| AS-11 | Billing and subscription state | Revenue and entitlement integrity | Internal |

---

## 4. Actors

| ID | Actor | Trust | Motivation / capability |
| --- | --- | --- | --- |
| AC-01 | Anonymous visitor / bot | None | Spam forms, scrape, probe |
| AC-02 | Authenticated tenant user (by role) | Limited | Normal work; may exceed role |
| AC-03 | Malicious tenant user / insider (including a tenant admin) | Limited | Exfiltrate data before leaving; sabotage |
| AC-04 | Another tenant | None toward this tenant | Curious or hostile; tries other tenants’ ids |
| AC-05 | External attacker | None | Credential stuffing, injection, phishing, exploits |
| AC-06 | Malicious file or data author | None | Poisoned CSV, backup, sync payload, webhook |
| AC-07 | Compromised dependency, provider or update source | Partly trusted | Supply-chain attacks |
| AC-08 | Platform staff with privileged access | High | Mistakes or abuse |
| AC-09 | AI coding assistant and prompt content | Partly trusted | May write insecure code or follow injected instructions |
| AC-10 | Lost or stolen device holder | None | Reads local data |

---

## 5. Trust boundaries

| ID | Boundary |
| --- | --- |
| TB-1 | Any client (web, desktop, mobile, public site) to the internet-facing API: clients are untrusted |
| TB-2 | Public (anonymous) endpoints to authenticated endpoints |
| TB-3 | API and workers to database, cache and file storage |
| TB-4 | MerchIO to third-party providers (Stripe, email, captcha, carriers, LLM) and back (webhooks) |
| TB-5 | Tenant A to tenant B |
| TB-6 | Desktop renderer (web content) to the Electron main process |
| TB-7 | Device storage to the person holding the device |
| TB-8 | Developer machines and CI to production (build and release path) |

---

## 6. Data-flow diagrams

**DFD-1: Web app, API, data**

```
[Browser: tenant user] --HTTPS--(TB-1)--> [API gateway/WAF] --> [API: auth, permission, validation]
                                                        |--(TB-3)--> [PostgreSQL + RLS]  [Redis]  [File storage]
                                                        |--> [Outbox] --> [Queue] --> [Workers]
[API] <--WebSocket (notifications, auth by token)-- [Browser]
```

**DFD-2: Public website**

```
[Visitor] --HTTPS--(TB-1,TB-2)--> [Public API: captcha, rate limit, validation] --> [Leads, Subscribers] --> [Notification + workflow]
                                              |--> [Email provider: double opt-in message]
```

**DFD-3: Background work and providers**

```
[Outbox event] --> [Workflow relay] --> [Job: idempotency key] --> [Email provider / Stripe / carriers]  (TB-4)
[Scheduler] --claims due items (row lock)--> [Campaign send]
[Provider webhooks] --signature + timestamp--(TB-4)--> [API webhook endpoint] --> [Subscription / email events]
```

**DFD-4: Desktop (Electron)**

```
[Renderer: web app, sandboxed] --contextBridge API--(TB-6)--> [Main: validated IPC] --> [File dialogs] [Local database] [Notifications]
[Main] --PKCE via system browser--> [Identity] ; [Main] --HTTPS--> [API] ; [Updater] --signed releases--> [Update host]
```

**DFD-5: Mobile (React Native) and sync**

```
[App] --secure store (tokens)--(TB-7)--> [Keychain/Keystore] ; [App] --local DB--> [Encrypted SQLite]
[App/Desktop] --mutation queue (idempotent)--(TB-1)--> [Sync API: validate, version check] --> [Domain rules] --> [DB]
[Push service] --> [App]
```

**DFD-6: Delivery pipeline**

```
[Developer + AI assistant] --PR--> [Source control] --> [CI: tests, SAST, scans, SBOM] --signed artefacts--(TB-8)--> [Registry] --> [Production]
[Dependencies] --> [CI]  ; [Secrets manager] --> [CI/Production]
```

---

## 7. STRIDE analysis by element

Cells list the threats found; IDs refer to the register in Section 8.

| Element | S | T | R | I | D | E |
| --- | --- | --- | --- | --- | --- | --- |
| Web client | Token theft (002) | Script injection (003) | — | Data in browser storage (002, 003) | — | CSRF actions (004) |
| Public API and forms | Fake leads and subscribers (008) | Payload tampering (010) | Disputed consent (015) | Echoed personal data (030) | Form floods (008, 023) | — |
| Authenticated API | Credential stuffing, account takeover (016, 028) | Injection, mass assignment (010, 009) | Missing audit (021) | Cross-tenant reads, verbose errors (001, 030) | Heavy endpoints (023) | Role bypass, plan bypass (009, 020) |
| Database | — | Direct tampering, bad restores (019) | Audit edits (021) | Cross-tenant leakage (001) | Locks, bloat (023) | — |
| Workers and workflows | Forged events (007, 022) | Replayed jobs (014, 022) | Unlogged actions (021) | Data in job payloads (030) | Loops, queue floods (022, 023) | Workflow acting beyond role (009) |
| Import and upload | — | Formula and malformed files (006) | — | SSRF via URL imports (005) | Huge files (023) | — |
| Providers and webhooks | Forged webhooks (007) | Replay (007) | — | Credential leakage (017) | Provider outage | Over-scoped keys (017) |
| Desktop app | Fake update (018) | Local file edits, bridge abuse (012, 019) | — | Plaintext local data (013, 019) | — | Renderer reaches system (012) |
| Mobile app | Stolen session on device (013) | Tampered local data (013) | — | Lost device, backups (013) | — | Deep-link abuse (013) |
| Sync | Replayed device (014) | Tampered mutations (014) | Repudiation of changes (021) | Over-broad pull (001) | Backlog floods (023) | Server fields set by client (014, 009) |
| Chatbot (V1) | — | Prompt injection (027) | — | Data leakage to model (027) | Cost abuse (023) | Tool misuse (027) |
| Delivery pipeline | Fake packages (011) | Poisoned dependency or action (011) | — | Secrets in repo or logs (017) | — | Insecure AI-written code (031) |
| Staff access | — | — | Untracked support access (025) | Browsing customer data (025) | — | Privilege creep (025) |

---

## 8. Threat register (first pass, status Proposed)

L = likelihood, I = impact (1 to 5), Score = L × I before controls. Controls come from `cursorsecurityrules.md` (`SEC-*`); controls marked **NEW** are proposed in Section 10. Residual target for every row: Medium or lower after controls and tests.

| ID | Threat | STRIDE | L | I | Score | Rating | Controls | Verifying test | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| THR-001 | A user of one workspace reads or changes another workspace’s data by guessing or reusing identifiers | I, T, E | 3 | 5 | 15 | High | SEC-AUTHZ-02, -03, -04, -08 | Cross-tenant negative test on every endpoint and table | Backend lead |
| THR-002 | Access or refresh tokens are stolen or replayed | S | 3 | 4 | 12 | High | SEC-AUTH-02, -03, -04 | Reused refresh token revokes the family | Backend lead |
| THR-003 | Script injection through names, notes, imported or restored data, sync payloads | T, I | 4 | 4 | 16 | High | SEC-APP-03, -04, -09; SEC-WEB-01 | Markup and quote-breaking ids render inert | Front-end lead |
| THR-004 | Cross-site request forgery on cookie-authenticated actions | E | 2 | 3 | 6 | Medium | SEC-API-02; SEC-AUTH-03 | Cross-site state change rejected | Backend lead |
| THR-005 | Server-side request forgery through webhook or import-by-URL features | I | 2 | 4 | 8 | Medium | SEC-APP-07 | Private and metadata addresses rejected | Backend lead |
| THR-006 | Malicious or malformed CSV and uploads (formula injection, huge files, binary content) | T, D | 4 | 3 | 12 | High | SEC-APP-05, -06 | Formula, oversize and binary files rejected or neutralised | Backend lead |
| THR-007 | Forged or replayed webhooks (Stripe, email provider) | S, T | 3 | 4 | 12 | High | SEC-API-05 | Bad signature and old timestamp rejected; duplicate event ignored | Backend lead |
| THR-008 | Spam and bot floods on public forms | S, D | 5 | 2 | 10 | Medium | SEC-API-07 | Honeypot and rate limit trigger | Backend lead |
| THR-009 | A user exceeds their role (including mass assignment of role, tenant or plan fields) | E | 3 | 5 | 15 | High | SEC-AUTHZ-01, -05, -06 | Lower role cannot call higher-role endpoints or set protected fields | Backend lead |
| THR-010 | SQL, command or template injection | T, E | 2 | 5 | 10 | Medium | SEC-APP-01, -02 | Injection strings stored and returned as data | Backend lead |
| THR-011 | Compromised dependency, build action, registry or package typo-squat | T | 3 | 5 | 15 | High | SEC-SC-01 to -05 | Lockfile drift and unpinned action fail CI | DevOps |
| THR-012 | Page script reaches the operating system through the desktop bridge | E | 2 | 4 | 8 | Medium | SEC-DESK-01 to -05 | Page cannot reach Node, arbitrary IPC or paths | Desktop lead |
| THR-013 | Data read from a lost or stolen phone, or from device backups | I | 3 | 4 | 12 | High | SEC-MOB-01, -02, -05 | Local database unreadable without unlock; wiped on sign-out | Mobile lead |
| THR-014 | Replayed, stale or tampered sync mutations; client sets server-controlled fields | T, E | 3 | 4 | 12 | High | SEC-API-06, -08 | Replay rejected; server fields ignored | Backend lead |
| THR-015 | Messages sent without consent, without opt-out, or outside quiet hours | (compliance) | 3 | 5 | 15 | High | SEC-COMP-01 | Send blocked without consent, wording or inside quiet hours | Backend lead |
| THR-016 | Credential stuffing and brute force | S | 5 | 3 | 15 | High | SEC-AUTH-06 | Lockout and rate limit trigger | Backend lead |
| THR-017 | Secrets leaked in code, logs, images or client bundles | I | 3 | 5 | 15 | High | SEC-SEC-01, -02, -06 | Secret scan fails build on a planted fake key | DevOps |
| THR-018 | Fake or downgraded desktop or mobile update | S, T | 2 | 5 | 10 | Medium | SEC-DESK-07 | Unsigned or older update refused | Desktop lead |
| THR-019 | Data loss or silent corruption (failed writes, damaged data file, bad restore) | T | 3 | 4 | 12 | High | SEC-DESK-06; RULE-ERR-01; NFR-BKP-001 | Damaged file quarantined and restored; failed write shown | Desktop lead, backend lead |
| THR-020 | Plan limits bypassed by editing the client or calling the API directly | E | 4 | 2 | 8 | Medium | SEC-AUTHZ-07; FR-BIL-002 | Over-limit create rejected by the server | Backend lead |
| THR-021 | Audit records altered or deleted; actions denied later | R | 2 | 4 | 8 | Medium | SEC-COMP-04; append-only storage | No update or delete path; hash-chain check | Backend lead |
| THR-022 | Workflow abuse: loops, email bombing, resource exhaustion | D, T | 3 | 3 | 9 | Medium | FR-WFL-007; SEC-API-09 **NEW** | Depth cap and per-tenant run and send caps enforced | Backend lead |
| THR-023 | Denial of service through heavy endpoints, imports or queue flooding | D | 4 | 3 | 12 | High | SEC-API-01; SEC-API-10 **NEW** | Per-tenant quotas and queue limits hold under load | DevOps |
| THR-024 | Tenant insider exports or deletes data before leaving | I, T | 3 | 4 | 12 | High | SEC-AUTH-05; SEC-COMP-04; SEC-AUTHZ-10 **NEW** | Export needs step-up, is audited and raises an alert | Backend lead |
| THR-025 | Platform or support staff access customer data without need or record | I, R | 2 | 5 | 10 | Medium | SEC-AUTHZ-09 **NEW**; SEC-COMP-04 | Access needs a time-limited grant and is audited | Security lead |
| THR-026 | Sender reputation damaged by abusive tenants (blocklisting) | D | 3 | 3 | 9 | Medium | SEC-COMP-01; SEC-COMP-06 **NEW** | Send caps and abuse detection trigger | Backend lead |
| THR-027 | Chatbot prompt injection or data leakage to the model (V1) | T, I | 3 | 3 | 9 | Medium | SEC-APP-10 **NEW** | Injected instructions ignored; no cross-tenant context | Backend lead |
| THR-028 | Account takeover through password reset or MFA recovery flaws | S, E | 3 | 5 | 15 | High | SEC-AUTH-05, -06; SEC-AUTH-08 **NEW** | Reset links single-use, short-lived; recovery notifies user | Backend lead |
| THR-029 | Invitation links intercepted or reused to join a workspace | S, E | 3 | 3 | 9 | Medium | SEC-AUTH-09 **NEW** | Used or expired invitation refused; bound to email | Backend lead |
| THR-030 | Personal data leaks through error messages, logs, telemetry or echoed responses | I | 3 | 3 | 9 | Medium | SEC-LOG-01; SEC-LOG-04 **NEW**; SEC-API-04 | Planted personal data never appears in logs or Sentry | Backend lead |
| THR-031 | AI coding assistant introduces insecure code or follows injected instructions in project content | T, E | 3 | 4 | 12 | High | SEC-AI-01 to -09; SEC-SC-01; code review | Planted instruction in an issue or file is flagged, not followed | Tech lead |

**Summary:** 31 threats: **17 High, 14 Medium, 0 Critical, 0 Low** before controls. No threat is accepted without a control and a verifying test.

---

## 9. How the readiness audit findings map to threats

| Audit finding | What it means for the model | Threats |
| --- | --- | --- |
| S-02 No authentication or authorisation | Every identity and access threat is open until a backend exists | THR-009, -016, -028 |
| S-03 Rules enforced only in the client | Limits and compliance can be bypassed | THR-020, -015 |
| W-01 Script injection through restored backups | Proven exploit path through imported and synced data | THR-003 |
| W-02 Silent data loss on storage failure; D-04 damaged file resets to demo data | Integrity and availability of user data | THR-019 |
| W-06 CSV parsing and formula injection | File-borne attacks | THR-006 |
| W-07 Public CDN scripts without integrity | Supply-chain exposure | THR-011 |
| D-01 Unsupported Electron, M-01 outdated Expo | Unpatched engine vulnerabilities, weak update path | THR-011, -012, -018 |
| D-02 Inline scripts allowed in the desktop policy | Injection reaches the native bridge | THR-003, -012 |
| D-03, M-06 Unencrypted local data | Device theft and shared computers | THR-013 |
| S-06 Simulated results shown as real | Misleading messaging and compliance claims | THR-015 |
| S-11 Swallowed errors, no reporting | Attacks and failures go unnoticed | THR-019, -030 |
| D-07 No permission handler or fuses | Weak desktop hardening | THR-012 |

---

## 10. Priorities, new controls and proposed requirement changes

### 10.1 Order of attack

1. **Identity and tenancy (MVP, first):** THR-001, -009, -016, -028, -002. A multi-tenant product that fails here fails everywhere.
2. **Injection and data handling (MVP):** THR-003, -006, -010, -007, -014.
3. **Messaging compliance (MVP, before the first real send):** THR-015, -026.
4. **Pipeline and secrets (from day one):** THR-011, -017, -031.
5. **Availability and abuse (MVP):** THR-023, -022, -008, -020.
6. **Client hardening (V1):** THR-013, -012, -018, -019 (desktop and mobile), THR-027 (chatbot).
7. **Oversight (MVP):** THR-021, -024, -025, -029, -030.

### 10.2 New controls proposed (to be added to Security Measures and `cursorsecurityrules.md`)

| ID | Control | Mitigates |
| --- | --- | --- |
| SEC-AUTH-08 | Password reset and MFA recovery use single-use, time-limited tokens, never reveal whether an account exists, notify the account owner, and revoke other sessions on completion | THR-028 |
| SEC-AUTH-09 | Invitations are single-use, expire in 7 days, are bound to the invited email and rate-limited | THR-029 |
| SEC-AUTHZ-09 | Staff access to customer data requires a customer-granted or ticket-linked, time-limited grant and is fully audited | THR-025 |
| SEC-AUTHZ-10 | Bulk export and mass delete require step-up, are audited, and trigger an alert to workspace owners and the security team | THR-024 |
| SEC-API-09 | Per-workspace caps on workflow runs, outbound messages and workflow chain depth, with alerts when reached | THR-022 |
| SEC-API-10 | Per-workspace quotas for requests, imports and queue depth; heavy work runs in queues with limits and back-pressure | THR-023 |
| SEC-APP-10 | Chatbot input and output are treated as untrusted: strictly scoped retrieval per workspace, no tool access to other tenants, output encoded, prompts and responses not stored with personal data beyond need | THR-027 |
| SEC-COMP-06 | Verified sending domains, per-workspace send caps, bounce and complaint monitoring, and automatic suspension on abuse | THR-026 |
| SEC-LOG-04 | Scrub personal data and secrets before logs, traces and error reports leave the service | THR-030 |

### 10.3 Proposed additions to the SRS (for SRS v0.10)

| New ID | Requirement | Pri |
| --- | --- | --- |
| FR-AUTH-013 | Invitation and recovery tokens SHALL be single-use, bound to the intended email or account, and expire (SEC-AUTH-08, -09) | M |
| FR-WFL-013 | The system SHALL cap workflow runs and outbound messages per workspace per hour and alert Admins when a cap is reached (SEC-API-09) | M |
| FR-EML-011 | The system SHALL enforce per-workspace send caps, require a verified sending domain and suspend sending on abuse signals (SEC-COMP-06) | M |
| FR-AUD-005 | The system SHALL provide an integrity check that detects altered or removed audit records | S |
| FR-SET-010 | Platform staff access to a workspace SHALL require a recorded, time-limited grant visible to the workspace owner (SEC-AUTHZ-09) | M |
| FR-SET-011 | Bulk export and mass deletion SHALL notify workspace owners and be rate-limited (SEC-AUTHZ-10) | M |
| NFR-SEC-005 | Per-workspace quotas SHALL prevent one tenant degrading others (SEC-API-10) | M |
| NFR-SEC-006 | Telemetry SHALL be scrubbed of personal data and secrets before leaving the service (SEC-LOG-04) | M |

---

## 11. Workshop pack (for the team session)

### 11.1 Logistics

- **Format:** three working sessions of 90 minutes (can run in one day with breaks), plus a 30-minute wrap-up a week later after owners have reviewed their threats.
- **Roles:** facilitator (security lead), scribe, architect, backend lead, front-end lead (web), desktop and mobile leads, DevOps, QA, product owner (decision maker on scope and risk appetite).
- **Before the session (30 minutes each):** read Sections 2 to 7 of this document, the SRS security summary (section 8), and `cursorsecurityrules.md`.
- **Ground rules:** attack the design, not the people; every threat gets an owner and an action, or a recorded acceptance; no solution debates longer than two minutes, park them.

### 11.2 Rating scales to agree in the first ten minutes

| Score | Likelihood | Impact |
| --- | --- | --- |
| 1 | Needs unusual skill and access; not expected in 3 years | Minor annoyance; no data or money lost |
| 2 | Possible with effort; may happen once in 3 years | One user affected; easily recovered |
| 3 | Plausible; may happen yearly | Many users affected or a compliance question; recovery in days |
| 4 | Likely; may happen several times a year | One workspace loses data, money or trust; notification duties |
| 5 | Expected; already seen in similar products or happening now | Multiple workspaces affected, regulatory breach, or loss of the platform |

### 11.3 Agenda

| Session | Goal | Steps | Output |
| --- | --- | --- | --- |
| 1. Model (90 min) | Make sure the model matches reality | Walk assets, actors and trust boundaries; redraw each DFD on a whiteboard and correct it; list missing flows (admin tools, support access, backups, analytics) | Agreed model; list of corrections |
| 2. Discover (90 min) | Find what the first pass missed | For each DFD run the STRIDE prompts below; each person writes abuse cases on cards; compare with the register; add new threats THR-032 and up | Updated register |
| 3. Decide (90 min) | Rate, assign, decide | Calibrate likelihood and impact; set owners; choose controls and MVP or V1 placement; answer the questions in 11.5; record accepted risks | Register v0.5, decision log, action list |

**STRIDE prompts (use at every trust boundary crossing):**

1. Spoofing: how could someone pretend to be this user, device, service or provider?
2. Tampering: what could be changed in transit, at rest, or in a file this element reads?
3. Repudiation: could someone deny an action, and could we prove what happened?
4. Information disclosure: what could leak through responses, logs, errors, caches, backups, or another tenant?
5. Denial of service: what is the cheapest way to make this slow or stop it for others?
6. Elevation of privilege: how could a lower role, tenant, or page script gain more power?
7. Privacy: could this data be linked to a person in a way the person did not expect?

### 11.4 Output templates

**Decision log row:** ID, date, decision, options considered, rationale, owner, review date. **Risk acceptance:** threat ID, rating, reason it cannot be mitigated now, compensating controls, accepted by, expiry date.

### 11.5 Questions the team must answer

| ID | Question | Related threats |
| --- | --- | --- |
| TQ-01 | What is our risk appetite, and is the 5 by 5 scale and banding in Section 2 acceptable? | All |
| TQ-02 | May support staff ever see customer data, and under what approval process? | THR-025 |
| TQ-03 | Is multi-factor sign-in mandatory for Admins and Super Admins at launch? | THR-016, -028 |
| TQ-04 | Are there data-residency or customer-managed-key requirements? | THR-001, -025 |
| TQ-05 | Must the desktop app encrypt its local database in V1, or is operating-system disk encryption acceptable? | THR-013, -019 |
| TQ-06 | Which captcha provider, and is double opt-in mandatory for every subscription? | THR-008, -015 |
| TQ-07 | Will an AI chatbot ship in V1, with which provider, and what data may it see? | THR-027 |
| TQ-08 | Who may export or bulk delete data, and what triggers an alert? | THR-024 |
| TQ-09 | Are outbound webhooks in the MVP or later? | THR-005, -007 |
| TQ-10 | Penetration test vendor and timing; will a bug-bounty programme follow? | All |
| TQ-11 | What may the AI coding assistant access (repositories with secrets, production data, internal docs)? | THR-017, -031 |
| TQ-12 | How strong must audit tamper-evidence be: hash chain, write-once storage, or both? | THR-021 |

---

## 12. Follow-up actions

| # | Action | Owner | When |
| --- | --- | --- | --- |
| 1 | Schedule and run the three sessions with the team | Security lead | Within one week |
| 2 | Calibrate ratings, update the register to v0.5, record decisions | Security lead, scribe | After session 3 |
| 3 | Write Security Measures (04) from the register: one control per mitigation, with owner and verification | Security lead | Wave 2 |
| 4 | Add the new controls (Section 10.2) and threat rows THR-020 to THR-031 to `cursorsecurityrules.md` | Tech lead | Same day as workshop; draft applied alongside this document |
| 5 | Add the proposed requirements (Section 10.3) to the SRS and re-baseline | Tech lead | After workshop |
| 6 | Turn each verifying test into formal Test Cases (`TC-SEC-nnn`) linked to THR and SEC IDs | QA lead | Wave 3 |
| 7 | Use the ten highest-rated threats as the penetration-test focus | Security lead | Wave 4 |
| 8 | Redraw the DFDs in the Architecture document with trust boundaries as agreed | Architect | Wave 2 |
| 9 | Re-run this analysis after the PoCs and before each release gate | Security lead | Ongoing |

**Version path:** 0.1 (this first pass) → 0.5 (after the workshop) → 1.0 (baselined with Security Measures, end of Wave 2) → reviewed every sprint that changes a trust boundary.

## Approval and change log

| Role | Name | Decision | Date |
| --- | --- | --- | --- |
| Security lead |  |  |  |
| Architect |  |  |  |
| Product owner |  |  |  |

Change log: 0.1, 7 November 2026, first-pass analysis prepared from PRD-001, SRS-001, backend plan v2, the readiness audit and the security rules; awaiting team workshop.

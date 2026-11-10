# MerchIO — Project Documentation Plan

PRD → SRS → Architecture → Security Measures → OpenAPI → Test Plan → Threat Model → Test Cases → UAT → Release → RTM → Incident Response → Pen Test → PoC → MVP pattern → Playbook → Gap Analysis → Execution Guide

Prepared for CodeByXO · Each document is specified with the 5W1H+A framework (Who, What, When, Why, Where, How, Alternative) plus security notes

---

## 1. Purpose and how to use this plan

MerchIO now has working prototypes (web, mobile, desktop, homepage), a backend plan (v2) and a readiness audit that found 51 issues. What is missing is the **document chain** that turns those assets into an enterprise-grade, auditable build. This plan defines every document in that chain: what it is for, who owns it, what goes in it, how it is checked, and how it connects to the next one.

Three outcomes:

1. A single, ordered set of 18 documents with clear owners, inputs, outputs and acceptance criteria.
2. A **traceability spine** (shared IDs and an RTM) so every requirement can be followed to design, controls, API, tests, UAT and release.
3. The two AI-assistant rule files (`cursorrules.md`, `cursorsecurityrules.md`) built from the first four documents, so the code written with Cursor follows the same requirements, architecture and security controls as the documents.

**Honest starting point:** none of the 18 documents exists yet as a formal, approved document. The audit and backend plan v2 are the closest seeds (see Section 7). The rule files delivered with this plan are built from those seeds and carry IDs that the PRD, SRS, Architecture and Security Measures documents will confirm or refine.

---

## 2. The document chain at a glance

Numbers follow the order you gave. Section 8 gives the recommended build order, which differs slightly because some documents drive others (for example the Threat Model drives Security Measures).

| # | Document | Answers | Built from | Gate it supports |
| --- | --- | --- | --- | --- |
| 01 | PRD | What are we building, for whom, why, how will we know it worked | Vision, prototypes, personas | Product approval |
| 02 | SRS | What exactly must the system do and how well | PRD | Requirements baseline |
| 03 | Architecture | How is it built | SRS, backend plan v2 | Design approval |
| 04 | Security Measures | Which controls protect it | SRS, Architecture, Threat Model | Security design approval |
| 05 | OpenAPI | What is the exact contract between clients and server | SRS, Architecture | API freeze per module |
| 06 | Test Plan | How will we prove it works | SRS, Architecture, Security | Test strategy approval |
| 07 | Threat Model | What can go wrong and what stops it | Architecture, data flows | Security design approval |
| 08 | Test Cases | The concrete checks | SRS, OpenAPI, Threat Model | Test readiness |
| 09 | UAT Plan | Do real users accept it | PRD, SRS | Release readiness |
| 10 | Release / Deployment Plan | How do we ship and roll back safely | Architecture, Test Plan | Go / no-go |
| 11 | RTM | Is every requirement designed, built, tested and accepted | All above | Every gate |
| 12 | Incident Response Plan | What do we do when something breaks or is attacked | Security, Threat Model | Production readiness |
| 13 | Penetration Testing Plan | How do independent testers attack it | Threat Model, Security | Pre-launch security sign-off |
| 14 | PoC | Do the riskiest ideas actually work | Architecture risks, Gap Analysis | Architecture confirmation |
| 15 | MVP pattern | What is the smallest valuable release and how do we choose scope | PRD, PoC results | Scope freeze |
| 16 | Playbook | How the team works day to day | All above | Team readiness |
| 17 | Gap Analysis | How far is today from the target | Prototypes, audit, SRS | Planning, re-run each wave |
| 18 | Execution Guide | Step-by-step plan to deliver | All above | Delivery start |

```
PRD ─► SRS ─► Architecture ─► Security Measures ─► OpenAPI
          │         │                ▲
          │         └─► Threat Model ─┘     PoC ─► MVP pattern
          ▼                                    │
   Test Plan ─► Test Cases ─► UAT ─► Release ─► Incident Response ─► Pen Test
          │
   RTM (spans everything)      Gap Analysis ⇄ every wave      Playbook + Execution Guide (top layer)
```

---

## 3. Conventions that apply to every document

### 3.1 Location and format

Documents live in the repository as **docs-as-code** so they are versioned, reviewed in pull requests and checked in CI.

```
docs/
  00-documentation-plan.md
  01-prd/            02-srs/            03-architecture/ (C4 + adr/)
  04-security/       05-openapi/openapi.yaml    06-test-plan/
  07-threat-model/   08-test-cases/     09-uat/
  10-release/        11-rtm/            12-incident-response/
  13-pentest/        14-poc/            15-mvp/
  16-playbook/       17-gap-analysis/   18-execution-guide/
.cursor/ or repo root:  cursorrules.md   cursorsecurityrules.md
```

Formats: Markdown for text, YAML for OpenAPI, Mermaid or PlantUML for diagrams, CSV or generated Markdown for the RTM. Word or PDF exports are produced from the Markdown for external readers (auditors, customers).

### 3.2 Header block (every document)

Title · document ID · version (semantic: 0.x draft, 1.0 baselined) · status · owner · reviewers · approvers · last updated · change log · related documents.

### 3.3 Status lifecycle

Draft → In review → Approved → **Baselined** (changes only through change request) → Superseded. Baselines are tagged in Git (for example `docs-v1.0-srs`).

### 3.4 ID scheme (the traceability spine)

| Prefix | Meaning | Example |
| --- | --- | --- |
| BG, PER, EPIC, FEAT, MET | Business goal, persona, epic, feature, metric (PRD) | EPIC-ORD-01 |
| FR, NFR, BR, DR | Functional, non-functional, business rule, data requirement (SRS) | FR-ORD-014, BR-STK-002 |
| ADR, CMP | Architecture decision, component | ADR-007 |
| THR | Threat (Threat Model) | THR-014 |
| SEC | Security control (Security Measures) | SEC-AUTH-03 |
| API | OpenAPI operation (`operationId`) | API-ORD-advance |
| TP, TC | Test plan item, test case | TC-ORD-021 |
| UAT | UAT scenario | UAT-ORD-003 |
| REL, INC, PEN, POC, GAP | Release item, incident playbook, pen test scope item, PoC, gap | GAP-007 |

Module codes follow the product modules: ORD, INV, SUP, EML, SMS, SOC, ACC, PIP, DEA, REC, APT, WFL, TKT, BOT, KB, SET, TEAM, BIL, CHT, NOT, PUB (public site), SYNC.

### 3.5 Quality rules for requirements and tests

Every requirement is atomic, testable, uniquely identified, prioritised (MoSCoW) and traceable to a PRD item. Every test names the requirement or threat it proves. A statement that cannot be tested is rewritten or removed.

### 3.6 Automation

CI runs: Markdown lint, link check, OpenAPI lint (Spectral), an **RTM coverage check** (fails on orphan requirements, untested requirements, or tests pointing to missing IDs), and a check that baselined documents were not edited without a change request.

### 3.7 Review and approval

Small documents need one reviewer; PRD, SRS, Architecture, Security Measures, Threat Model and Release Plan need an owner, a technical reviewer and a security reviewer. AI-assisted drafts are always reviewed by a human against the sources before approval.

---

## 4. Document specifications, part A (01–09)

### 01 · PRD — Product Requirements Document

|  |  |
| --- | --- |
| **What** | Vision, problem statement, personas (store owner, operations staff, marketer, sales rep, support agent, admin, platform admin), user journeys, epics per module (core vs optional), goals and success metrics, scope and non-goals, platforms (web, mobile, desktop, public site), plans (Starter, Professional, Enterprise), assumptions, dependencies, risks, release scope |
| **Why** | One shared definition of the product before engineering detail; prevents the breadth trap (21 modules) by forcing priorities |
| **Who** | Owner: product owner (CodeByXO). Reviewers: tech lead, security, design. Consumers: everyone downstream |
| **When** | Wave 1, weeks 1–2 |
| **Where** | `docs/01-prd/` |
| **How** | Start from prototypes and the module list; interview pilot merchants; score epics (impact × confidence ÷ effort); declare compliance obligations (GDPR/CCPA, TCPA, CAN-SPAM, PCI SAQ-A) as product constraints |
| **Alternative** | A one-page product brief plus a jobs-to-be-done canvas for early stages; keep the PRD thin and link to epics |
| **Security notes** | Classify data (public, internal, confidential, restricted); state regulatory scope; record trust assumptions about tenants and users |
| **Done when** | Every module has an epic, a priority, a metric and an owner; non-goals are explicit; product owner signs off |
| **IDs / feeds** | BG, PER, EPIC, FEAT, MET → SRS |

### 02 · SRS — Software Requirements Specification

|  |  |
| --- | --- |
| **What** | Numbered functional requirements per module (FR), business rules (BR), non-functional requirements (NFR: performance, availability, accessibility, i18n, offline and sync, browser/OS/device matrix), data requirements and dictionary (DR), external interfaces (Stripe, SES, Twilio, Shopify, carriers), constraints, acceptance criteria (Given/When/Then), security and privacy requirements |
| **Why** | The contract for what the system shall do; the base for design, tests and acceptance |
| **Who** | Owner: tech lead with product owner. Reviewers: QA, security, UX |
| **When** | Wave 1, weeks 1–2 (core modules first, optional modules later) |
| **Where** | `docs/02-srs/` |
| **How** | Follow ISO/IEC/IEEE 29148 structure. Seed functional requirements from the module schemas and the rules already proven in the prototypes (order fulfilment and stock, SMS opt-out, SLA by priority, plan seat limits, scheduler, workflows) |
| **Alternative** | A user-story backlog with acceptance criteria; keep an SRS anyway for audit and enterprise buyers |
| **Security notes** | A dedicated security and privacy requirements chapter (authentication, tenancy, audit, retention) that Security Measures must satisfy |
| **Done when** | All requirements atomic, testable, prioritised and linked to PRD IDs; NFRs have measurable targets (for example p95 under 300 ms) |
| **IDs / feeds** | FR, NFR, BR, DR → Architecture, OpenAPI, Test Cases, RTM |

### 03 · Architecture

|  |  |
| --- | --- |
| **What** | C4 views (context, containers, components), module boundaries, data model and ERD, tenancy, event outbox and workflow engine, scheduler, sync protocol, public API, deployment topology, environments, observability, scalability and disaster-recovery design, quality-attribute scenarios, technology choices and versions, ADR log |
| **Why** | Shows how requirements are met and keeps three clients and one server aligned |
| **Who** | Owner: architect / tech lead. Reviewers: security, DevOps, mobile and desktop leads |
| **When** | Wave 2, weeks 3–4 |
| **Where** | `docs/03-architecture/` and `docs/03-architecture/adr/` |
| **How** | Start from backend plan v2; record each significant choice as an ADR (for example NestJS vs alternatives, Drizzle vs Prisma, auth build vs buy); validate risky choices through PoCs |
| **Alternative** | arc42 template; or a lighter set of diagrams plus ADRs for a small team |
| **Security notes** | Trust boundaries and data flows drawn on every diagram; these are the input to the Threat Model |
| **Done when** | Each FR/NFR maps to a component; ADRs exist for all major decisions; reviewers sign off |
| **IDs / feeds** | ADR, CMP → Security Measures, OpenAPI, Release Plan |

### 04 · Security Measures

|  |  |
| --- | --- |
| **What** | Control catalogue (SEC-AREA-nn): identity and sessions, authorisation and tenancy, data protection, application security, API security, native client security (mobile, Electron), compliance controls (consent, quiet hours, GDPR/CCPA), logging and audit, supply chain, infrastructure, secure SDLC; for each control: objective, mapped threats and requirements, owner, implementation, verification method |
| **Why** | Turns the Threat Model into enforceable controls and gives auditors one place to look |
| **Who** | Owner: security lead (can be fractional). Reviewers: architect, DevOps, legal advisor |
| **When** | Wave 2, weeks 3–4 (iterates with the Threat Model) |
| **Where** | `docs/04-security/` |
| **How** | Start from section 6 of backend plan v2; map to OWASP ASVS L2, MASVS and the Electron security checklist; add SOC 2 readiness mapping |
| **Alternative** | An ASVS-only checklist for the first release, expanded to a full catalogue before enterprise sales |
| **Security notes** | This is the security baseline; deviations require a recorded risk acceptance |
| **Done when** | Every high and critical threat has at least one control; every control has an owner and a verification method |
| **IDs / feeds** | SEC → `cursorsecurityrules.md`, Test Cases, Pen Test Plan, RTM |

### 05 · OpenAPI

|  |  |
| --- | --- |
| **What** | OpenAPI 3.1 contract: paths per module including action endpoints, schemas generated from the shared domain package, error model, pagination, filtering, idempotency and concurrency headers, auth schemes, public site endpoints, sync endpoints, webhooks, examples, rate-limit headers, versioning and deprecation policy |
| **Why** | Single contract for web, mobile, desktop, native apps and partners; basis for generated clients, mocks and contract tests |
| **Who** | Owner: backend lead. Reviewers: front-end leads, security, QA |
| **When** | Wave 2, weeks 3–4 for core modules; extended per module |
| **Where** | `docs/05-openapi/openapi.yaml` (generated parts built in CI) |
| **How** | Contract-first; every operation has an `operationId` and links to FR IDs; lint with Spectral; run a mock server for front-end work; fuzz with Schemathesis |
| **Alternative** | GraphQL or tRPC; not chosen because native clients and a public API need a standard REST description |
| **Security notes** | Every operation declares its auth requirement and permission; no operation without a 401/403/429 response; request size limits and validation rules documented |
| **Done when** | Spec lints clean; every FR with an API need has an operation; breaking-change check enabled in CI |
| **IDs / feeds** | API → Test Cases, generated clients, RTM |

### 06 · Test Plan

|  |  |
| --- | --- |
| **What** | Scope, risk-based strategy, test levels (unit, integration, contract, end to end, performance, security, accessibility, sync and offline, compatibility), environments and data, tools (Vitest, Testcontainers, Schemathesis, Playwright, Maestro or Detox, k6, axe, ZAP), entry and exit criteria, coverage targets, defect severity and workflow, roles, schedule, metrics |
| **Why** | Defines how quality is proven, not just that tests exist |
| **Who** | Owner: QA lead. Reviewers: tech lead, security |
| **When** | Wave 3, weeks 5–6 |
| **Where** | `docs/06-test-plan/` |
| **How** | Use section 8 of backend plan v2 as the checklist; include the existing prototype suites as golden parity tests; add real-browser, real-device and real-Electron testing that the prototypes lacked |
| **Alternative** | Per-sprint test charters; kept as a supplement, not a replacement |
| **Security notes** | Security testing levels (SAST, DAST, dependency, secrets, authorisation matrix, tenant isolation) are first-class, not an appendix |
| **Done when** | Strategy covers every NFR; exit criteria agreed; environments and data defined |
| **IDs / feeds** | TP → Test Cases, UAT, Release |

### 07 · Threat Model

|  |  |
| --- | --- |
| **What** | Assets, actors, trust boundaries, data-flow diagrams per container (web, mobile, desktop, API, workers, public site, integrations), STRIDE analysis, privacy analysis (LINDDUN), abuse cases, threat register (THR) with likelihood and impact, mapped controls (SEC), residual risk, review triggers |
| **Why** | Finds design-level problems before they are built; justifies every control |
| **Who** | Owner: security lead. Participants: architect, developers, QA |
| **When** | Draft in Wave 1 (it informs Architecture and Security); finalised in Wave 2; updated every sprint that changes a trust boundary |
| **Where** | `docs/07-threat-model/` |
| **How** | Workshop per data-flow diagram; seed with known issues from the readiness audit (script injection through restored data, silent data loss, unprotected plan limits, desktop bridge abuse, tenant data leakage, token theft, webhook forgery, public form spam, replayed sync mutations, supply-chain compromise) |
| **Alternative** | PASTA or attack trees for the highest-risk flows |
| **Security notes** | Treat the register as a living artefact; closed threats still keep their tests |
| **Done when** | All flows analysed; every high threat has controls and a verifying test |
| **IDs / feeds** | THR → Security Measures, Test Cases, Pen Test Plan, Incident Response |

### 08 · Test Cases

|  |  |
| --- | --- |
| **What** | Concrete tests: ID, title, linked FR/BR/SEC/THR/API IDs, preconditions, data, steps, expected result, priority, type, automation status and tool, tags (smoke, regression, security, accessibility) |
| **Why** | Makes requirements verifiable and regressions detectable |
| **Who** | Owner: QA lead with developers. Reviewers: product owner for behaviour |
| **When** | Wave 3, weeks 5–6 for core modules; then with each feature |
| **Where** | `docs/08-test-cases/` and the test code itself (the test code is the source of truth for automated cases) |
| **How** | Convert the roughly 100 existing prototype checks into formal cases (order to stock effects, workflow triggers, SMS opt-out, uniqueness, import report, scheduler, backup and restore); add negative and abuse cases from the Threat Model; Gherkin for end-to-end journeys |
| **Alternative** | Exploratory charters and property-based tests for the rules engine, in addition to scripted cases |
| **Security notes** | Every high threat has at least one negative test (for example cross-tenant access, injection, forged webhook) |
| **Done when** | Every FR, BR and high threat has at least one case; automation status tracked |
| **IDs / feeds** | TC → RTM, UAT, Release gates |

### 09 · UAT Plan

|  |  |
| --- | --- |
| **What** | Objectives, participants (pilot merchants and internal role players), scenarios from personas and journeys (UAT-xxx), entry and exit criteria, environment and anonymised data, schedule, defect triage, sign-off form, training material, per-platform coverage (web, desktop, mobile) |
| **Why** | Confirms the product solves the real problem, not just the written requirement |
| **Who** | Owner: product owner. Participants: pilot customers. Support: QA |
| **When** | Wave 4, weeks 7–8; executed before each release candidate |
| **Where** | `docs/09-uat/` |
| **How** | Scripted journeys (receive order, fulfil, low stock alert, campaign, ticket handling) plus free exploration sessions; collect satisfaction and task-completion measures |
| **Alternative** | Closed beta with feature flags and telemetry-based acceptance |
| **Security notes** | Use anonymised or synthetic data; test accounts are removed after UAT |
| **Done when** | Exit criteria met (no open critical or high defects, agreed pass rate), sign-off recorded |
| **IDs / feeds** | UAT → RTM, Release Plan |

---

## 5. Document specifications, part B (10–18)

### 10 · Release / Deployment Plan

|  |  |
| --- | --- |
| **What** | Environments (local, preview, staging, production), CI/CD pipelines, versioning and release trains, feature flags and tenant module switches, expand/contract database migrations, rollback and restore procedures, canary or blue/green strategy, change approval, go/no-go checklist, store submissions (EAS, Google Play, App Store), desktop signing, notarisation and update channels, post-release verification, communication plan |
| **Why** | Shipping is a risk; this makes releases repeatable, reversible and auditable |
| **Who** | Owner: DevOps lead. Reviewers: tech lead, security, QA, product owner |
| **When** | Wave 4, weeks 7–8; rehearsed on staging before first production release |
| **Where** | `docs/10-release/` and the pipeline definitions in `.github/workflows/` |
| **How** | Start from backend plan v2 section 7.6; define gate criteria from the Test Plan; script rollback and database restore and rehearse them; define minimum-supported-client-version rules for desktop and mobile |
| **Alternative** | Trunk-based continuous deployment behind feature flags with automated canary analysis |
| **Security notes** | Signed artefacts and provenance, secrets only from the secret manager, separation of duties for production approval, SBOM attached to every release |
| **Done when** | A full rehearsal (deploy, verify, roll back, restore) passes on staging; go/no-go checklist agreed |
| **IDs / feeds** | REL → RTM, Incident Response, Playbook |

### 11 · RTM — Requirements Traceability Matrix

|  |  |
| --- | --- |
| **What** | Bidirectional matrix linking PRD items → requirements (FR/NFR/BR) → architecture (ADR/CMP) → security controls (SEC) and threats (THR) → API operations → test cases → UAT scenarios → release items, with status and coverage per row |
| **Why** | Proves that nothing required is missing, nothing built is unrequested, and everything is tested and accepted; central evidence for audits |
| **Who** | Owner: QA lead (maintained by tooling). Reviewers: product owner, tech lead |
| **When** | Skeleton in Wave 2; baselined at each gate; updated every sprint |
| **Where** | `docs/11-rtm/` (generated CSV and Markdown from IDs in the documents and test code) |
| **How** | A script reads IDs from document front matter, OpenAPI `operationId`s and test annotations (for example `@trace FR-ORD-014`), builds the matrix, reports coverage and fails CI on orphans |
| **Alternative** | A tool-based matrix (Jira with Xray, Polarion, or similar) once the team grows; start with generated files |
| **Security notes** | Every high threat and every SEC control must appear with a verifying test; gaps are release blockers |
| **Done when** | 100 percent of Must requirements have design, API (where applicable), test and UAT links; coverage report published each sprint |
| **IDs / feeds** | All IDs; feeds every gate decision |

### 12 · Incident Response Plan

|  |  |
| --- | --- |
| **What** | Severity levels, roles (incident commander, communications, scribe, technical lead), detection and alert sources, triage, containment, eradication and recovery steps, evidence handling, internal and customer communication templates, regulatory notification timelines (for example 72 hours under GDPR), post-incident review, on-call rotation, drill schedule |
| **Why** | Reduces damage and recovery time when something fails or is attacked; required by enterprise customers and SOC 2 |
| **Who** | Owner: security lead. Reviewers: DevOps, legal advisor, support lead |
| **When** | Wave 4, weeks 7–8; tabletop exercise before launch and quarterly afterwards |
| **Where** | `docs/12-incident-response/` |
| **How** | Write playbooks (INC-xxx) for: tenant data exposure, token or key compromise, credential stuffing, injection or script attack, ransomware, provider outage, bad release, messaging compliance breach, compromised desktop or mobile update; link each to detection rules and runbooks |
| **Alternative** | A managed detection and response provider handling first-line response, with this plan defining escalation |
| **Security notes** | Contact tree and breach-notification templates stored outside the system that may be down; log retention long enough to investigate |
| **Done when** | Playbooks exist for the top threats; one tabletop completed; contacts verified |
| **IDs / feeds** | INC → Playbook, RTM |

### 13 · Penetration Testing Plan

|  |  |
| --- | --- |
| **What** | Scope (web app, API, mobile apps, desktop apps, public site, infrastructure, integrations), rules of engagement, methodology (OWASP WSTG, ASVS L2, MASVS, API Security Top 10, Electron security checklist), tenant-isolation and authorisation-matrix testing, environments and seeded test tenants, schedule, vendor criteria, deliverables, retest, severity SLAs, remediation tracking |
| **Why** | Independent proof that controls work; required by many enterprise buyers |
| **Who** | Owner: security lead. Executed by an external firm. Reviewers: architect, DevOps |
| **When** | Plan in Wave 4; test before launch, then annually and after major changes |
| **Where** | `docs/13-pentest/` |
| **How** | Grey-box testing against staging with documented accounts; focus on threats rated high in the Threat Model; fix and retest all critical and high findings before go-live |
| **Alternative** | A private bug-bounty programme after launch plus continuous automated DAST (supplement, not substitute, for a pre-launch test) |
| **Security notes** | Never test production data; written authorisation and scope; test accounts and keys rotated afterwards |
| **Done when** | Vendor engaged, scope signed, schedule fixed, remediation SLA agreed |
| **IDs / feeds** | PEN → Gap Analysis, RTM, Release go/no-go |

### 14 · PoC — Proofs of Concept

|  |  |
| --- | --- |
| **What** | Short, time-boxed experiments that remove the biggest unknowns before commitment. Each PoC states hypothesis, success criteria, time box, result and decision |
| **Why** | Avoids building the whole system on an assumption that turns out to be wrong |
| **Who** | Owner: architect. Executed by senior developers |
| **When** | Wave 2, weeks 3–4 (each at most two weeks) |
| **Where** | `docs/14-poc/` and throwaway branches |
| **How** | Candidate PoCs: (1) shared domain package used by API and all three clients with parity tests; (2) tenant isolation with row-level security; (3) offline sync and conflict handling on desktop and mobile; (4) outbox, workflow engine and scheduler correctness under concurrency; (5) email and SMS provider sandboxes with consent enforcement; (6) native sign-in with PKCE and secure token storage on Electron and mobile |
| **Alternative** | Spikes inside MVP sprints, only for small unknowns |
| **Security notes** | PoC code never reaches production; use synthetic data and throwaway credentials |
| **Done when** | Each PoC has a recorded outcome and, where relevant, an ADR |
| **IDs / feeds** | POC → Architecture (ADR), MVP pattern, Gap Analysis |

### 15 · MVP pattern

|  |  |
| --- | --- |
| **What** | The rule set for choosing and cutting scope, and the resulting MVP definition: value-slice scoring, the walking skeleton (thinnest end-to-end path), must/should/could lists, feature flags and tenant module switches, what is explicitly excluded, exit and kill criteria, success metrics |
| **Why** | MerchIO has 21 modules; the pattern stops scope creep and gets a real tenant on real infrastructure early |
| **Who** | Owner: product owner. Reviewers: tech lead, pilot customers |
| **When** | Wave 3, weeks 5–6, after PoC results |
| **Where** | `docs/15-mvp/` |
| **How** | Score each epic by impact, confidence and effort; propose MVP core loop: sign-in and tenant, Inventory, Orders with stock effects, Notifications, Workflows, Support Tickets, Email campaigns, Dashboard; web first, desktop and mobile as later shells; defer Social publishing, Community, Newsflash, Trending, advanced billing; each later module ships behind a flag |
| **Alternative** | A concierge or manual-backend MVP to test demand first (lower build cost, weaker proof of the product) |
| **Security notes** | MVP cannot defer authentication, tenant isolation, audit logging or messaging compliance |
| **Done when** | MVP scope is frozen, mapped to requirement IDs, with measurable exit criteria |
| **IDs / feeds** | MVP items → Execution Guide, RTM |

### 16 · Playbook

|  |  |
| --- | --- |
| **What** | How the team builds and operates: branching and pull-request rules, review checklist, definition of ready and done, coding and API standards, database migration procedure, release routine, on-call and escalation, runbooks (deploy, roll back, restore, rotate secrets, onboard a tenant, rebuild an index), troubleshooting guides, how to use the AI assistant rules |
| **Why** | Makes good practice the default and speeds up new contributors |
| **Who** | Owner: tech lead. Reviewers: all engineers |
| **When** | Wave 3, weeks 5–6; grows continuously |
| **Where** | `docs/16-playbook/` |
| **How** | Write from what the team actually does; link to `cursorrules.md` and `cursorsecurityrules.md`; test each runbook by following it |
| **Alternative** | A wiki; acceptable only if versioned and reviewed like code |
| **Security notes** | Runbooks for secret rotation, access removal and key compromise are mandatory; no secrets in the playbook |
| **Done when** | Each runbook has been executed once by someone who did not write it |
| **IDs / feeds** | Playbook → onboarding, Incident Response, Execution Guide |

### 17 · Gap Analysis

|  |  |
| --- | --- |
| **What** | Current state versus target state across product, architecture, security, quality, accessibility, operations and compliance; each gap (GAP-nnn) has severity, remediation, owner, wave and linked requirement |
| **Why** | Turns the readiness audit into a managed backlog and shows progress honestly |
| **Who** | Owner: tech lead. Reviewers: product owner, security |
| **When** | Refresh in Wave 1; re-run at the end of every wave and before every gate |
| **Where** | `docs/17-gap-analysis/` |
| **How** | Seed with the 51 audit findings (4 blockers, 16 high) and backend plan v2; re-score against the approved SRS and Security Measures; report coverage percentage per area |
| **Alternative** | A maturity-model scoring (for example ASVS levels) for the security part only |
| **Security notes** | Open critical security gaps block release; accepted risks are signed and dated |
| **Done when** | Every audit finding is closed, accepted or scheduled; gap trend reported per wave |
| **IDs / feeds** | GAP → Execution Guide, Release go/no-go |

### 18 · Execution Guide

|  |  |
| --- | --- |
| **What** | The step-by-step delivery plan: team and roles, sprint plan (two-week sprints) with goals and task lists mapped to requirement IDs, environment setup commands, definition of done, gate criteria (Gate A foundation, Gate B platform, Gate C release), decision and risk logs, communication cadence, how to work with the AI assistant and the rule files |
| **Why** | Lets anyone pick up the plan and execute it the same way |
| **Who** | Owner: delivery lead (the tech lead for a small team). Reviewers: product owner |
| **When** | Wave 4, weeks 7–8, updated every sprint |
| **Where** | `docs/18-execution-guide/` |
| **How** | Start from backend plan v2 phases 0 to 13 and the audit gates; for each sprint list the IDs delivered, tests that must pass and documents that must be updated |
| **Alternative** | A continuous Kanban flow with weekly planning |
| **Security notes** | Security tasks (threat note, controls, negative tests) are part of each story, not a separate phase |
| **Done when** | Sprint 1 to 4 fully planned; gates and owners agreed |
| **IDs / feeds** | All IDs; the day-to-day driver |

---

## 6. Traceability model (RTM) in practice

| Level | Source | Linked to | Check |
| --- | --- | --- | --- |
| Business | PRD BG, EPIC, FEAT | SRS FR / NFR | Every epic has at least one requirement |
| Requirement | SRS FR, BR, NFR | ADR/CMP, API, SEC, TC | Every Must requirement has design, test and (for API features) an operation |
| Design | ADR, CMP | FR, THR | Every component is justified by a requirement |
| Security | THR → SEC | TC (negative tests), PEN | Every high threat has a control and a test |
| Verification | TC, UAT | FR, BR, SEC, THR | No test without a target; no target without a test |
| Release | REL | TC, UAT, GAP | Release items list the requirements they deliver |

Example row: `EPIC-ORD-01 → FR-ORD-014 (fulfilment decrements stock atomically) → BR-STK-002 → ADR-011 (stock transaction with row lock) → SEC-DATA-04 → API-ORD-advance → TC-ORD-021, TC-ORD-022 → UAT-ORD-003 → REL-1.0`.

Coverage targets: 100 percent of Must requirements traced; 100 percent of high threats with tests; no orphan tests; reported every sprint.

---

## 7. Reuse of existing MerchIO assets

| Existing asset | Seeds which documents |
| --- | --- |
| Module schemas and rules in the prototypes (21 modules) | PRD epics, SRS functional requirements and business rules, OpenAPI schemas |
| Backend plan v2 (stack, structure, architecture, security, phases, endpoint map, sync, native plans) | Architecture, Security Measures, OpenAPI skeleton, Release Plan, Execution Guide |
| Readiness audit (51 findings) | Gap Analysis, SRS non-functional and security requirements, Threat Model seeds, Security Measures, Pen Test focus |
| About 100 prototype test checks | Golden parity tests, Test Cases |
| Prototypes (web, mobile, desktop, homepage) | PoC evidence, UAT scenarios, UX reference |
| Homepage content and plans | PRD positioning, pricing and plan limits |

---

## 8. Recommended build order (waves)

The order in Section 2 is the reading order. Build order follows dependencies: the Threat Model is drafted before Security Measures, and PoCs run before the MVP scope is frozen.

| Wave | Weeks | Documents | Exit criteria |
| --- | --- | --- | --- |
| 0 (done) | — | Prototypes, backend plan v2, readiness audit, first draft of the two rule files | Seeds available |
| 1 | 1–2 | 01 PRD, 02 SRS (core modules), 17 Gap Analysis refresh, 07 Threat Model draft | Requirements baseline v0.9 |
| 2 | 3–4 | 03 Architecture, 04 Security Measures, 05 OpenAPI (core), 14 PoC, 11 RTM skeleton with CI check | Design approved; PoC outcomes recorded |
| 3 | 5–6 | 06 Test Plan, 08 Test Cases (core), 15 MVP pattern, 16 Playbook; rule files updated from approved documents | Test strategy and MVP scope approved |
| 4 | 7–8 | 09 UAT Plan, 10 Release Plan, 12 Incident Response, 13 Pen Test Plan, 18 Execution Guide; RTM baseline | Gate A ready; delivery can start |
| 5 | ongoing | Update RTM, Gap Analysis, Threat Model, OpenAPI each sprint; freeze documents at each release gate | Documents match the code at every release |

Total effort for one product owner and one tech lead with AI-assisted drafting: roughly 8 weeks part-time alongside Phase 0 of the build.

---

## 9. Governance

| Role | Responsibility |
| --- | --- |
| Product owner | PRD, MVP pattern, UAT, scope decisions |
| Tech lead / architect | SRS, Architecture, PoC, Playbook, Execution Guide, Gap Analysis |
| Security lead (can be fractional) | Threat Model, Security Measures, Incident Response, Pen Test Plan |
| QA lead | Test Plan, Test Cases, RTM |
| DevOps lead | Release Plan, pipelines, runbooks |
| Legal / compliance advisor | Compliance statements in PRD, SRS, Security Measures; breach notification terms |
| Pilot customers | UAT participation and feedback |

Rules: every document has one accountable owner; baselined documents change only through a change request recorded in the change log; AI-assisted drafts must be verified against their sources; documents are reviewed in pull requests like code.

---

## 10. How the first four documents build the two rule files

`cursorrules.md` (engineering) and `cursorsecurityrules.md` (security) are the machine-readable summary of the chain, so the AI assistant works inside the same boundaries as the people.

| Source document | Feeds `cursorrules.md` | Feeds `cursorsecurityrules.md` |
| --- | --- | --- |
| PRD | Product context, personas, module scope, non-goals, MVP boundaries, brand tokens | Data classification, regulatory scope, trust assumptions |
| SRS | Domain and business rules, NFR budgets (performance, accessibility, offline), definition of done, testing rules | Security and privacy requirements, compliance rules (consent, quiet hours, retention) |
| Architecture | Stack and versions, repo structure, module boundaries, API and database rules, client adapter pattern | Trust boundaries, tenant isolation rules, native client boundaries |
| Security Measures | Cross-references (rules cite SEC IDs) | Control-by-control rules, forbidden code patterns, secure patterns, review checklist |

Update procedure: when any of the four documents changes, the rule files change in the same pull request; each rule keeps its ID (for example `RULE-API-03`, `SEC-AUTH-02`) so the RTM can trace rules to requirements and controls. Install the files at the repository root, or split them into `.cursor/rules/*.mdc` files with `alwaysApply` front matter.

---

## 11. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Documents rot after baseline | CI checks, ownership, update documents in the same pull request as the change |
| Over-documentation slows delivery | Thin PRD, requirement-level detail only where risk is high, generate what can be generated (RTM, OpenAPI clients) |
| Small team bandwidth | Fractional security and QA support, AI-assisted drafting with human review, waves limited to what the next gate needs |
| AI-drafted errors | Source-based review, sampling checks, RTM catches orphans |
| Rules diverge from documents | Same-PR rule, rule IDs, quarterly audit of the rule files against the documents |

---

## 12. Next steps

1. Approve this plan and the build order.
2. Draft the PRD and SRS for the core modules (Wave 1), starting from the module schemas and the audit findings.
3. Run the threat-modelling workshop on the data-flow diagrams.
4. Place `cursorrules.md` and `cursorsecurityrules.md` in the repository and use them from the first commit; refresh them when the PRD, SRS, Architecture and Security Measures are approved.
5. Add the RTM coverage check to CI as soon as the first IDs exist.

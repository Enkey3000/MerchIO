# MerchIO — Product Requirements Document (PRD)

Document 01 of the MerchIO documentation chain · Version 0.9 (draft for owner review) · 7 November 2026

| Field | Value |
| --- | --- |
| Document ID | PRD-001 |
| Status | In review |
| Owner | Product owner (CodeByXO) |
| Reviewers | Tech lead, security lead, design |
| Consumers | SRS, Architecture, Security Measures, Test Plan, UAT Plan, MVP pattern |
| Related | Documentation Plan, Backend Plan v2, Readiness Audit, SRS-001, Threat Model |

**How to read the tags.** Every item carries one of three tags so you can see what is decided and what is not.

- **STATED**: comes from your direction or from the working prototypes.
- **PROPOSED**: my recommendation; needs an owner decision.
- **ASSUMPTION**: believed true, not yet validated with customers or data. Section 16 lists the decisions I need from you before this document can be baselined as 1.0.

---

## 1. Executive summary

MerchIO is a multi-tenant **commerce operations platform** that gives small and mid-sized merchants one connected workspace for inventory, orders, marketing, sales, support and reporting, with automation that links them (for example: a fulfilled order reduces stock, low stock raises an alert and opens a follow-up task, a new website lead appears in the pipeline). It replaces five or six separate subscriptions with one login and one bill. **STATED**

It is delivered as a web app first, then desktop (Windows, macOS, Linux) and mobile (Android, iOS) apps on the same backend, plus a public website. Working prototypes of all four exist; this PRD defines what the production product must be. **STATED**

The first release (MVP) focuses on a small core loop that a merchant can run end to end: sign in to a workspace, manage products and stock, process orders, get notified, automate routine follow-ups, handle customer tickets, send email campaigns and see the results on a dashboard. **PROPOSED**

---

## 2. Vision and positioning

- **Vision:** a world where every merchant, from a one-person shop to a growing brand, runs on automation that feels effortless. **STATED** (homepage)
- **Mission:** give merchants one connected launchpad to sell, market, ship and support, so they spend time growing instead of juggling tools. **STATED** (homepage)
- **Positioning statement:** For small and mid-sized online merchants who run their business across too many disconnected tools, MerchIO is the all-in-one operations platform that connects orders, stock, customers and campaigns so routine work happens automatically. Unlike point tools it is connected out of the box; unlike large suites it is simple enough to run without an IT team. **PROPOSED**
- **Category:** horizontal business-operations platform for commerce (comparable in scope to Zoho One or Odoo, or a bundle of a CRM, helpdesk and email tool). **PROPOSED**

---

## 3. Problem and opportunity

| # | Problem | Evidence status |
| --- | --- | --- |
| P-1 | Stock, orders, customers and campaigns live in separate tools, so people re-key data and miss events (an item sells out and nobody is told) | ASSUMPTION; validate in pilot interviews |
| P-2 | Routine follow-ups (confirmation messages, reorder alerts, ticket assignment) are manual and inconsistent | ASSUMPTION |
| P-3 | Support requests are scattered across inboxes with no deadlines or ownership | ASSUMPTION |
| P-4 | Owners lack one view of how the business is doing | ASSUMPTION |
| P-5 | Messaging rules (consent, opt-out, quiet hours) are easy to break and costly when broken | Regulatory fact (TCPA, CAN-SPAM, GDPR) |
| P-6 | Paying for and learning five or six tools is expensive for small teams | ASSUMPTION |

**Opportunity:** small merchants are underserved by enterprise suites and overserved by point tools. A connected, simple platform with built-in compliance can win on convenience and total cost. **ASSUMPTION** (needs market validation, see Q-01 and Q-02).

---

## 4. Personas

| ID | Persona | Goals | Pains | Main modules | Main platform |
| --- | --- | --- | --- | --- | --- |
| PER-OWNER | Store owner / operator | See the business at a glance; keep customers happy; control cost | Too many tools; no single view | Dashboard, Orders, Inventory, Billing | Web, mobile |
| PER-OPS | Operations / warehouse staff | Pick, pack and ship correctly; keep stock accurate | Stock mismatches; surprise sell-outs | Inventory, Orders, Notifications | Desktop, mobile, web |
| PER-MKT | Marketer | Send the right message to the right people, compliantly | Consent confusion; no results view | Email, Text, Social, Dashboard | Web |
| PER-SALES | Sales rep | Track leads and deals; never miss a follow-up | Lost leads; scattered notes | Pipeline, Accounts, Deals | Web, mobile |
| PER-SUP | Support agent | Resolve tickets within deadline | No priorities or deadlines; repeated questions | Tickets, Chatbot, Knowledge base | Web, desktop |
| PER-ADMIN | Tenant administrator | Add people, set roles, control access and plan | Security worries; unclear permissions | Team & Users, Settings, Billing | Web |
| PER-PLAT | Platform administrator (internal) | Operate tenants, support customers, protect the platform | Visibility, safe access | Internal tooling (out of MVP scope) | Web |

---

## 5. Goals, non-goals and success metrics

### 5.1 Business goals

| ID | Goal | Tag |
| --- | --- | --- |
| BG-01 | Launch a production MVP that real merchants use for daily order and stock work | PROPOSED |
| BG-02 | Prove that connected automation saves time (fewer manual follow-ups) | PROPOSED |
| BG-03 | Be trustworthy enough for business data: secure, compliant, reliable | STATED (enterprise-grade direction) |
| BG-04 | Reach the same product on web, desktop and mobile without three different rule sets | STATED (shared backend plan) |
| BG-05 | Build a base that supports a paid subscription model (Starter, Professional, Enterprise) | STATED (prototype plans) |

### 5.2 Non-goals (first release)

| ID | Non-goal |
| --- | --- |
| NG-01 | Replacing a full accounting or ERP system |
| NG-02 | Building a storefront or checkout (MerchIO manages operations behind the store) |
| NG-03 | Live social-network publishing, Community forum, Newsflash and Trending in the MVP (they may exist as demo, behind a tenant switch) |
| NG-04 | Native Swift, Kotlin or C# apps (React Native and Electron come first) |
| NG-05 | Custom per-customer development or on-premise installs |
| NG-06 | A marketplace of third-party apps |

### 5.3 Success metrics (targets are PROPOSED for owner confirmation)

| ID | Metric | Target at 90 days after MVP | How measured |
| --- | --- | --- | --- |
| MET-01 | Activation: tenants that process their first order within 7 days of sign-up | 60 percent | Product analytics |
| MET-02 | Weekly active tenants that use at least 3 core modules | 50 percent of active tenants | Product analytics |
| MET-03 | Orders handled through MerchIO per active tenant per week | Growing month over month; baseline set by pilots | Database metrics |
| MET-04 | Automated actions executed (workflow runs) per tenant per week | At least 20 | Workflow run log |
| MET-05 | Ticket first-response within the deadline | 90 percent | Ticket data |
| MET-06 | Stock accuracy: orders blocked or corrected because of stock errors | Fewer than 1 percent of orders | Order and stock logs |
| MET-07 | Reliability: availability / p95 API latency | 99.9 percent / under 300 ms | Monitoring |
| MET-08 | Customer satisfaction (pilot survey) | 4 out of 5 or higher | UAT and surveys |
| MET-09 | Security: open critical or high findings at launch | Zero | Pen test, scans |
| MET-10 | Accessibility: WCAG 2.2 AA conformance for core journeys | 100 percent of core journeys | Audit |

---

## 6. Scope and prioritisation

### 6.1 Module catalogue and phase

Priority uses MoSCoW for the MVP. Phases: **MVP**, **V1**, **V2**, **Later**.

| Code | Module | Tier | Phase | MoSCoW | Epic |
| --- | --- | --- | --- | --- | --- |
| FND | Accounts, sign-in, workspaces (tenancy), roles | Core | MVP | Must | EPIC-FND-01 |
| TEAM | Team & Users | Core | MVP | Must | EPIC-TEAM-01 |
| SET | Settings | Core | MVP | Must | EPIC-SET-01 |
| BIL | Subscription, plans and limits | Core | MVP | Must (limits), Should (self-service checkout) | EPIC-BIL-01 |
| INV | Inventory Management | Core | MVP | Must | EPIC-INV-01 |
| ORD | Order Fulfillment | Core | MVP | Must | EPIC-ORD-01 |
| NOT | Notifications | Core | MVP | Must | EPIC-NOT-01 |
| WFL | Workflow Management | Core | MVP | Must | EPIC-WFL-01 |
| TKT | Support Ticketing | Core | MVP | Must | EPIC-TKT-01 |
| EML | Email Marketing | Core | MVP | Should (send), Must (consent) | EPIC-EML-01 |
| DSH | Dashboard | Core | MVP | Must | EPIC-DSH-01 |
| CHT | Chart & Dashboard Builder | Core | MVP (basic), V1 (full) | Should | EPIC-CHT-01 |
| PUB | Public website lead capture | Core | MVP | Should | EPIC-PUB-01 |
| SYNC | Offline sync for desktop and mobile | Platform | V1 | Must for V1 | EPIC-SYNC-01 |
| SMS | Text Marketing | Optional | V1 | Should | EPIC-SMS-01 |
| SOC | Social Media Marketing (live publishing) | Optional | V1 | Could | EPIC-SOC-01 |
| ACC, PIP, DEA | Accounts, Sales Pipeline, Deals & Schedules | Optional | V1 | Should | EPIC-ACC-01, PIP-01, DEA-01 |
| REC, APT | Data Entry & Processing, Appointments | Optional | V1 | Should | EPIC-REC-01, APT-01 |
| BOT, KB | Chatbots, FAQs & Q&As (one knowledge base) | Optional | V1 | Should | EPIC-BOT-01, KB-01 |
| SUP | Supply Chains | Optional | V2 | Could | EPIC-SUP-01 |
| TRD, NEWS, RES, COM | Trending, Newsflash, Resources, Community | Optional | Later | Won’t (MVP) | EPIC-EXT-01 |

Tier tags: Core, Optional and phase placement are **PROPOSED** (based on the readiness audit and the earlier scope review); the module list itself is **STATED**.

### 6.2 MVP definition (what must be true to call it an MVP)

A merchant can, in a real production environment: (1) create a workspace and invite teammates with roles; (2) import or add products and see stock; (3) record and fulfil orders with stock updating automatically and safely; (4) receive in-app notifications for important events; (5) switch on at least three automations; (6) log and resolve customer tickets with deadlines; (7) send a consented email campaign; (8) see a dashboard of the above; (9) stay within the limits of their plan. Security, tenant isolation, audit logging and messaging compliance are part of the MVP and cannot be deferred. **PROPOSED**

---

## 7. Epics for the core modules

| Epic | Persona | Outcome | Key capabilities | Priority | Metric |
| --- | --- | --- | --- | --- | --- |
| EPIC-FND-01 | All | Safe, separate workspace per business | Sign-up, sign-in, multi-factor, sessions, workspaces, roles and permissions, audit log | Must | MET-09 |
| EPIC-TEAM-01 | PER-ADMIN | Control who can do what | Invite, assign role, suspend, remove, seat limit by plan | Must | MET-09 |
| EPIC-SET-01 | PER-ADMIN | Configure the workspace | Company profile, currency, time zone, language, module switches, notification preferences, integrations | Must | MET-02 |
| EPIC-BIL-01 | PER-OWNER | Pay for the right plan and stay within it | Plans, limits enforced on seats, orders and contacts, usage view, upgrade | Must / Should | BG-05 |
| EPIC-INV-01 | PER-OPS | Accurate stock | Products, SKUs, stock levels, reorder points, restock, low-stock alerts, import and export | Must | MET-06 |
| EPIC-ORD-01 | PER-OPS, PER-OWNER | Orders processed correctly and quickly | Create, edit, advance (pending, processing, fulfilled), cancel, stock effects, carrier, history | Must | MET-03, MET-06 |
| EPIC-NOT-01 | All | Never miss what matters | In-app notifications, read and unread, preferences, activity log; push and desktop notifications in V1 | Must | MET-02 |
| EPIC-WFL-01 | PER-OWNER, PER-OPS | Routine work happens by itself | Triggers (order placed, order fulfilled, stock low, ticket created, lead created), actions (notify, queue email, create follow-up ticket), test run, pause, run history | Must | MET-04 |
| EPIC-TKT-01 | PER-SUP | Customer problems resolved on time | Tickets, priority, deadline by priority, assignee, reply thread, escalate, resolve | Must | MET-05 |
| EPIC-EML-01 | PER-MKT | Compliant, measurable email | Campaigns, audiences, consent records, unsubscribe, scheduling, real send through a provider, results | Must (consent) / Should (send) | MET-08 |
| EPIC-DSH-01 | PER-OWNER | One view of the business | KPIs, revenue trend, orders by status, recent activity, low-stock list | Must | MET-02 |
| EPIC-CHT-01 | PER-OWNER, PER-MKT | Answer own questions with data | Import or enter data, build charts, save dashboards (basic in MVP) | Should | MET-02 |
| EPIC-PUB-01 | PER-SALES, PER-MKT | Capture leads from the website | Contact, trial and newsletter forms creating leads and subscribers with consent and spam protection | Should | MET-01 |

---

## 8. Key user journeys

| ID | Journey | Steps (modules) |
| --- | --- | --- |
| J-01 | Onboarding | Sign up (FND) → create workspace and set currency and time zone (SET) → invite teammates (TEAM) → import products by CSV (INV) → record first order (ORD) |
| J-02 | Order to fulfilment | Order created (ORD) → workflow sends confirmation (WFL, EML) → staff advance to processing then fulfilled (ORD) → stock decreases (INV) → notification (NOT) → dashboard updates (DSH) |
| J-03 | Low stock | Fulfilment drops stock to the reorder point (INV) → alert (NOT) → workflow creates a follow-up task or ticket (WFL, TKT) → restock recorded (INV) |
| J-04 | Email campaign | Choose audience with consent (EML) → schedule or send → results visible (EML, DSH) → unsubscribe honoured |
| J-05 | Ticket handling | Ticket created (TKT) → deadline set by priority → assigned → reply thread → escalate or resolve → first-response metric (DSH) |
| J-06 | Website lead | Visitor submits form on the public site (PUB) → lead created with source Website → notification and workflow (NOT, WFL) |
| J-07 | Owner review | Owner opens dashboard (DSH) → drills into low stock or open tickets → builds a custom chart (CHT) |

---

## 9. Platforms and channels

| Surface | Phase | Role | Offline | Notes |
| --- | --- | --- | --- | --- |
| Web app | MVP | Primary product | Not required | Responsive; keyboard and screen-reader accessible |
| Public website | MVP | Marketing and lead capture | No | Calls the public API |
| Desktop (Electron) | V1 | Warehouse and back-office use; native notifications, file dialogs | Required (queue and sync) | Windows, macOS, Linux |
| Mobile (React Native) | V1 | On-the-go orders, stock counts, ticket replies, push | Required for core actions | Android and iOS |
| Native apps | Later | Only if measured needs justify | Yes | Same API |

Support baseline (**PROPOSED**): latest two versions of Chrome, Edge, Firefox and Safari; Windows 10 and 11, macOS 13 and later, current Ubuntu LTS; iOS 17 and later; Android 10 (API 29) and later.

---

## 10. Plans and entitlements

Values come from the prototype and are **STATED for the prototype, PROPOSED for launch** until pricing is validated (Q-03).

|  | Starter | Professional | Enterprise |
| --- | --- | --- | --- |
| Indicative price | 29 per month | 99 per month | 299 per month (custom above) |
| Team seats | 3 | 15 | Custom |
| Orders per month | 500 | Unlimited | Unlimited |
| Contacts | 2,500 | Higher or unlimited | Unlimited |
| Channels and automation | Basic | All channels, workflows | Plus dedicated support, SLA, custom integrations |

Limits are enforced by the server on every write (see SRS BR-PLAN). Annual billing discount of 20 percent is shown on the prototype and is PROPOSED.

---

## 11. Competitive context

| Alternative | Strength | Gap MerchIO targets |
| --- | --- | --- |
| Zoho One, Odoo | Breadth | Complexity and setup effort for small teams |
| CRM plus helpdesk plus email tools | Depth per function | No connected automation; several bills |
| Shopify and marketplace back-office tools | Close to the store | Limited marketing, sales and support in one place |
| Spreadsheets | Free and flexible | No automation, no access control, error-prone |

Risk: depth per module will be shallower than specialist tools. Mitigation: win on connection, simplicity and compliance; integrate rather than rebuild where depth matters. **ASSUMPTION**

---

## 12. Constraints and regulatory scope

| Area | Requirement | Tag |
| --- | --- | --- |
| Privacy | GDPR and CCPA: lawful basis, consent, export and delete, retention, breach notification | STATED (security plan) |
| Messaging | TCPA and CAN-SPAM for SMS and email: recorded consent, opt-out, quiet hours | STATED |
| Payments | Card data handled only by Stripe-hosted components (PCI SAQ-A scope) | STATED |
| Accessibility | WCAG 2.2 AA for core journeys | PROPOSED |
| Security | Controls in the Security Measures document and the security rules file | STATED |
| App stores | Apple and Google policies for the mobile apps; code signing for desktop | STATED |
| Data residency | To be decided (Q-05) | OPEN |

Data classes: Restricted (credentials, tokens, keys, payment references), Confidential (customer personal data, orders, tickets, consent records), Internal (configuration, analytics), Public (marketing content).

---

## 13. Assumptions and dependencies

| ID | Item | Tag |
| --- | --- | --- |
| A-01 | Five to ten pilot merchants can be recruited for requirements validation and UAT | ASSUMPTION |
| A-02 | Stripe (billing), Amazon SES or SendGrid (email) and Twilio (SMS) are acceptable providers | PROPOSED |
| A-03 | US messaging registration (10DLC) approval takes weeks and must start early | Fact; plan for it |
| A-04 | One cloud provider (AWS) hosts production | PROPOSED |
| A-05 | The tenant model is shared-database with row-level security | PROPOSED (backend plan) |
| A-06 | The brand name MerchIO and its domain are clear to use | ASSUMPTION (needs trademark and domain check) |

---

## 14. Risks

| ID | Risk | Likelihood | Impact | Response |
| --- | --- | --- | --- | --- |
| RISK-01 | Scope too broad for a small team | High | High | MVP limited to the core loop; optional modules behind switches |
| RISK-02 | Product shallower than specialist tools | Medium | Medium | Focus on connection and simplicity; integrate where depth is needed |
| RISK-03 | Compliance mistakes in messaging | Medium | High | Server-side enforcement; consent log; legal review |
| RISK-04 | Security incident or tenant data leak | Low to medium | Very high | Threat model, row-level security, penetration test before launch |
| RISK-05 | Prototype rules drift from the server | High | High | One shared domain package; golden tests |
| RISK-06 | Provider approvals delay launch (SMS, social, app stores) | Medium | Medium | Start approvals in the first sprint; keep affected features in V1 |
| RISK-07 | Demand not validated | Medium | High | Pilot programme before large build commitment |

---

## 15. Release plan and exit criteria

| Release | Scope | Exit criteria |
| --- | --- | --- |
| **MVP (web + public site)** | Section 6.2 and the MVP-phase epics | Five pilot tenants run real orders for four weeks; all Must requirements verified; no open critical or high security finding; UAT signed off |
| **V1** | Desktop and mobile apps with sync; SMS; live social publishing; pipeline, accounts, deals; data entry; appointments; chatbot and knowledge base; full chart builder | Sync conflict tests pass; store approvals; pilot satisfaction at target |
| **V2** | Supply chains, extras, native apps if justified, deeper integrations | Based on V1 data |

Kill and pivot criteria (**PROPOSED**): if fewer than three of five pilot tenants reach weekly active use within eight weeks, pause new modules and rework onboarding and scope before continuing.

---

## 16. Open questions for the owner

| ID | Question | Why it matters |
| --- | --- | --- |
| Q-01 | Who is the first target customer (online retailers, service businesses that sell products, another group)? | Drives personas, language and integrations |
| Q-02 | Which countries at launch? | Sets compliance scope (GDPR, TCPA, tax) |
| Q-03 | Are the prototype prices and limits right? | Entitlement rules and revenue model |
| Q-04 | Which integrations come first (Shopify, WooCommerce, others)? | Scope of EML, ORD and INV imports |
| Q-05 | Data residency needs (EU-only data, for example)? | Hosting and architecture |
| Q-06 | Is single sign-on (Google, Microsoft, SAML) needed at launch? | Authentication scope |
| Q-07 | Is a real AI assistant wanted, or an FAQ assistant for now? | Chatbot scope and cost |
| Q-08 | Who are the pilot merchants and when can they start? | UAT and MVP exit |
| Q-09 | Support model after launch (hours, channels, targets)? | Operations and ticket NFRs |
| Q-10 | Legal entity, terms of service, privacy policy owner? | Compliance and launch readiness |
| Q-11 | Trademark and domain clearance for MerchIO? | Brand risk |
| Q-12 | Languages needed at launch beyond English? | i18n scope |

---

## 17. Traceability and approval

This PRD introduces the IDs **BG, NG, PER, MET, EPIC, J, A, RISK, Q**. Each EPIC maps to SRS requirements (`FR-<MODULE>-nnn`) and from there to design, security controls, API operations, tests and UAT scenarios (see the RTM).

| Role | Name | Decision | Date |
| --- | --- | --- | --- |
| Product owner |  |  |  |
| Tech lead |  |  |  |
| Security lead |  |  |  |

Change log: 0.9, 7 November 2026, first draft from prototypes, backend plan, readiness audit and documentation plan.

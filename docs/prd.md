# Product requirements

**Status:** consolidated product brief based on the supplied PRD draft. The PRD remains in review; priorities, targets, pricing, launch geography, and market assumptions require owner validation.

## Vision

Give small and midsize merchants one connected place to coordinate the work behind selling: products and stock, orders, customer communication, support, and reporting. MerchIO is intended to make routine cross-module work easier to automate while keeping the interface approachable for small teams.

## Problem and opportunity

The product hypothesis is that smaller merchants lose time and context when operational data sits across separate tools, spreadsheets, and inboxes. MerchIO proposes to connect those workflows and surface the important changes in a shared workspace. The user-provided documents treat the underlying market pains as assumptions that need validation with merchants; this package does not claim market research has confirmed them.

## Target personas

| Persona | Primary need | Initial product areas |
|---|---|---|
| Store owner / operator | Understand business activity and keep orders and stock moving | Dashboard, orders, inventory, settings |
| Operations / warehouse staff | Pick, pack, and ship accurately; avoid stock surprises | Inventory, orders, notifications |
| Marketer | Reach an appropriate audience and understand campaign results | Email, consent records, dashboard |
| Sales representative | Track leads and follow up consistently | Leads, accounts, pipeline (later phase) |
| Support agent | Own customer issues and resolve them within a target time | Tickets, customer history |
| Tenant administrator | Manage workspace members, roles, modules, and plan | Team, settings, billing |

## MVP proposal

The draft MVP seeks to support a coherent operational loop: create a workspace and team, add or import products, record and advance orders, update stock safely, send relevant notifications, handle tickets, run basic workflow actions, and review activity on a dashboard. Consent management and tenant security are foundational requirements, not optional post-launch enhancements.

| Capability | Proposed phase | Notes |
|---|---|---|
| Workspace, sign-in, membership, roles, audit | MVP | Must be designed and tested before production data is used |
| Inventory and order lifecycle | MVP | Stock changes must be transactional and server-authoritative |
| Notifications and basic workflows | MVP | Durable processing and idempotency required |
| Tickets and dashboard | MVP | SLA targets and dashboard metrics need validation |
| Email campaigns | MVP (limited) | Consent and unsubscribe handling are prerequisites; sending provider is proposed |
| Public lead capture | MVP candidate | Captcha, abuse controls, and privacy notice required |
| Desktop/mobile offline sync | V1 | Proposed; needs conflict handling and platform validation |
| SMS, live social publishing, sales tools, appointments, chatbots | V1 | Provider and compliance dependencies |
| Broader supply-chain and extension features | V2 / later | Defer pending validated demand |

## Non-goals for the first release

- Replacing a full accounting or ERP system.
- Providing a storefront or card checkout experience for merchants’ customers.
- Building separate native Swift, Kotlin, or C# clients before the proposed Electron and React Native clients are validated.
- Supporting bespoke on-premises deployments or a third-party app marketplace.
- Presenting prototype-only modules as production-ready.

## Proposed success measures

The source PRD proposes activation, weekly use across core modules, order throughput, workflow activity, ticket response, stock accuracy, reliability, customer satisfaction, and security findings as measures. Numerical targets in the source draft are hypotheses, not established commitments. Set baselines and targets with pilot merchants before using them as release gates.

## Constraints and requirements

- Roles and tenant boundaries must be enforced by trusted server-side code, not client-side visibility alone.
- Stock changes, order transitions, plan entitlements, consent, opt-out, and scheduled work must be authoritative on the server.
- Payment card details should remain with a hosted payment provider; the design proposes Stripe-hosted checkout/portal flows.
- Privacy, retention, export/deletion, accessibility, and messaging obligations need jurisdiction-specific review.
- Final launch regions, data residency, pricing, first customer segment, and priority integrations remain open questions.

## Product decisions still needed

1. Which merchant segment and countries are in the first pilot?
2. Which commerce and fulfillment integrations are essential at launch?
3. What pricing and limits should be tested with customers?
4. What data residency, support, SSO, localization, and legal ownership are required?
5. Who will recruit pilot merchants and approve MVP acceptance?

See the original PRD and SRS drafts preserved in `src/backend plan/source-materials/` for full requirement IDs and traceability. The [roadmap](roadmap.md) records the proposed sequence and readiness gates.

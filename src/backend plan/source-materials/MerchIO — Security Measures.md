# MerchIO — Security Measures

Document 04 of the MerchIO documentation chain · Version 0.9 (draft for review) · 7 November 2026

| Field | Value |
| --- | --- |
| Document ID | SMD-001 |
| Status | In review |
| Owner | Security lead |
| Reviewers | Architect, backend, front-end, mobile and desktop leads, DevOps, QA, legal advisor |
| Based on | SRS-001 (security and privacy requirements), ARC-001, TM-001 (threat model v0.1, 31 threats), Backend Plan v2, `cursorsecurityrules.md` v1.1 |
| Feeds | `cursorsecurityrules.md`, Test Plan, Test Cases (`TC-SEC-nnn`), Pen Test Plan, Incident Response Plan, RTM |

**Status of controls.** Every control below is **Planned**: none is implemented or verified yet. Phase **MVP** means it must be in place before the first production customer; **V1** means before the desktop and mobile apps ship.

---

## 1. Purpose, scope and method

This document is the single catalogue of controls that protect MerchIO. Each control states what must be true, which threats and requirements it serves, how it is implemented, how it is verified, when it is needed and who owns it. It is the baseline for design reviews, tests, audits and the AI assistant rules.

**Scope:** the MVP platform (web app, public API, workers, data stores, providers, delivery pipeline) and the V1 clients (Electron desktop, React Native mobile, sync).

**How it was built:** every high or medium threat in TM-001 has at least one control; every security requirement in SRS section 8 maps to a control family; the control IDs are the same ones used in `cursorsecurityrules.md` so code, rules, tests and documents trace to each other. Families and IDs are listed in section 4; sections 5 to 8 add compliance mapping, secure development, detection and testing.

**Columns in the catalogue**

| Column | Meaning |
| --- | --- |
| ID | `SEC-<FAMILY>-nn` (stable) |
| Control | The statement that must be true |
| Threats | THR IDs it mitigates |
| Implementation | Where and how it is realised |
| Verification | How we prove it (test, scan, inspection, drill) |
| Ph | MVP or V1 |
| Owner | BE backend, FE front end, MOB mobile, DESK desktop, OPS DevOps, SEC security lead, QA, PO product owner |

---

## 2. Security principles and governance

### 2.1 Principles

1. **Default deny and least privilege** for people, services and code.
2. **Defence in depth**: no single control is relied on alone (for example tenant isolation uses the token, application checks and row-level security).
3. **The server decides**: clients are untrusted; every rule that matters is enforced on the server.
4. **Secure by default and by design**: security requirements are part of every story, not a later phase.
5. **Evidence over assertion**: a control is not counted until a test, scan, inspection or drill proves it.
6. **Privacy by design**: collect less, keep it shorter, expose it to fewer people.
7. **Assume breach**: detect, contain and recover quickly (see the Incident Response Plan).

### 2.2 Roles

| Role | Responsibility |
| --- | --- |
| Security lead (can be fractional) | Owns this document, the threat model, risk decisions, security reviews, incident leadership |
| Architect / tech lead | Designs controls into the architecture; approves exceptions with the security lead |
| Engineers | Implement controls, write negative tests, follow the rule files |
| DevOps | Pipeline, infrastructure, secrets, patching, monitoring |
| QA | Security test cases, regression, release gates |
| Product owner | Accepts residual risk on behalf of the business |
| Legal advisor | Privacy, messaging law, breach notification obligations |

### 2.3 Policy hierarchy and exceptions

`cursorsecurityrules.md` (for code and the AI assistant) and this document (for the whole programme) are the security baseline. A deviation requires a recorded **risk acceptance**: threat or control ID, reason, compensating controls, owner, approver and an **expiry date** (maximum 6 months, then re-approved). Accepted risks appear in the Gap Analysis.

### 2.4 Review gates

| Gate | Security activity | Evidence |
| --- | --- | --- |
| Design | Threat note for any feature touching authentication, data, files, network, native bridge or messaging | Note in the pull request; threat model updated |
| Pull request | Rule-file checklist (`cursorsecurityrules.md` section 17); negative tests present | Checked template, CI green |
| Release candidate | Full scan suite, authorisation and tenant-isolation suites, dependency and container reports, SBOM | CI artefacts |
| Pre-launch | Independent penetration test; no open critical or high finding | Pen test report and retest |
| Production | Change approval, rollback ready, alerts verified | Release checklist |

---

## 3. Data classification and handling

| Class | Examples | Storage | Transit | Logging | Access | Retention |
| --- | --- | --- | --- | --- | --- | --- |
| **Restricted** | Passwords (hashes), tokens, API keys, MFA secrets, integration credentials, payment references | Hashed or field-encrypted with KMS keys; never in clients unprotected; never in files, images or repos | TLS only; never in URLs | Never logged | Service identity only; staff need break-glass | Shortest possible; revoke on use or expiry |
| **Confidential** | Contacts, orders, tickets, leads, subscribers, consent records, audit records, local device data | Encrypted at rest; tenant-isolated | TLS only | Ids only, personal data redacted | Role and tenant-scoped; staff only by grant (SEC-AUTHZ-09) | Per data dictionary (SRS section 6) |
| **Internal** | Configuration, workflow definitions, aggregated analytics, system metrics | Encrypted at rest | TLS | Allowed | Authenticated staff and tenant admins | Life of account |
| **Public** | Marketing content | Integrity protected | TLS | Allowed | Anyone | n/a |

Every field in the data dictionary has a class; the schema check in SEC-DATA-01 fails the build if one is missing.

---

## 4. Control catalogue

### 4.1 Authentication and sessions (`SEC-AUTH`)

| ID | Control | Threats | Implementation | Verification | Ph | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-AUTH-01 | Passwords hashed with Argon2id; breached passwords rejected; no custom cryptography | THR-016, -028 | Auth module with Argon2id (about 64 MiB memory, 3 iterations, tuned to roughly 250 ms); k-anonymity breach-list check; minimum length 12 | Unit tests; configuration inspection; password policy tests | MVP | BE |
| SEC-AUTH-02 | Access tokens live at most 15 minutes; refresh tokens rotate on every use; reuse revokes the family; strict token verification (algorithm allowlist, issuer, audience) | THR-002 | JWT access tokens; refresh tokens are random 256-bit values stored hashed with a family id | AC-AUTH-003; token tampering tests; alert test | MVP | BE |
| SEC-AUTH-03 | Web sessions use httpOnly, Secure, SameSite cookies; no tokens in web storage | THR-002, -004 | `__Host-` cookie prefix; no token in JavaScript-readable storage | Header tests; ZAP; storage inspection test | MVP | BE, FE |
| SEC-AUTH-04 | Native clients sign in with OAuth 2.1 and PKCE through the system browser and keep tokens in the OS secure store | THR-002, -013 | Expo AuthSession or AppAuth; Electron `safeStorage`; refresh handled outside web content | Integration tests; manual review; pen test | V1 | MOB, DESK |
| SEC-AUTH-05 | Multi-factor sign-in (TOTP, later passkeys) and step-up verification for sensitive actions | THR-016, -024, -028 | TOTP per RFC 6238; recovery codes stored hashed; step-up valid 10 minutes for billing, API keys, export, role change, deletion | Tests per sensitive action; MFA bypass tests | MVP | BE |
| SEC-AUTH-06 | Lockout with progressive delay, rate limits on sign-in, reset, MFA and invitations, generic error messages | THR-016 | Redis counters per account and per address; captcha after repeated failures | Brute-force test; load test; message comparison test | MVP | BE |
| SEC-AUTH-07 | Sessions listed and revocable; password or MFA change revokes other sessions | THR-002 | Session table with device info; revoke endpoint | Tests | MVP | BE |
| SEC-AUTH-08 | Reset and recovery tokens single-use, short-lived (30 minutes), never reveal whether an account exists, notify the owner, revoke other sessions | THR-028 | Hashed tokens with expiry; uniform responses; notification email | Reuse, expiry, enumeration tests | MVP | BE |
| SEC-AUTH-09 | Invitations single-use, expire in 7 days, bound to the invited email, rate-limited | THR-029 | Hashed token bound to email; rate limit per inviter | Reuse, expiry, wrong-email tests | MVP | BE |

### 4.2 Authorisation and tenancy (`SEC-AUTHZ`)

| ID | Control | Threats | Implementation | Verification | Ph | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-AUTHZ-01 | Default deny: every route declares a permission and passes a guard | THR-009 | Global NestJS guard; permission decorator; CI script lists routes without a declaration and fails | Route inventory test; role matrix tests | MVP | BE |
| SEC-AUTHZ-02 | Tenant id comes only from the verified session | THR-001 | Request context built from the token; lint rule forbids reading tenant id from body, query or path | Lint; tests that send a foreign tenant id | MVP | BE |
| SEC-AUTHZ-03 | Object-level checks on every read, update, delete and action; cross-tenant ids return not found | THR-001, -009 | Repositories require tenant context and ownership; shared policy helper | Cross-tenant negative suite on every endpoint | MVP | BE |
| SEC-AUTHZ-04 | PostgreSQL row-level security on every tenant table | THR-001 | Policies using `app.tenant_id`; application role cannot bypass; pooled connections in transaction mode | Suite generated from the schema that attacks every table from another tenant | MVP | BE |
| SEC-AUTHZ-05 | Roles enforced on the server per the matrix (SRS Appendix A) | THR-009 | Matrix stored as data in the domain package | Matrix tests for every role and action | MVP | BE |
| SEC-AUTHZ-06 | Mass assignment prevented | THR-009 | Strict Zod DTOs; server-controlled field list (`role`, `tenant_id`, `plan`, `stock_applied`, `version`) | Tests that send protected fields | MVP | BE |
| SEC-AUTHZ-07 | Plan limits and entitlements checked on every write path | THR-020 | Entitlement service in the write pipeline | Over-limit tests via API | MVP | BE |
| SEC-AUTHZ-08 | Negative tests are mandatory for every new route and table | THR-001, -009 | CI gate: tenant-isolation and authorisation suites must pass | CI report | MVP | QA |
| SEC-AUTHZ-09 | Staff access to customer data needs a time-limited, recorded grant visible to the workspace owner | THR-025 | Support-access grants table; staff role has no standing data access; all access audited | Access without grant refused; audit check | MVP | SEC |
| SEC-AUTHZ-10 | Bulk export and mass delete need step-up, are audited, rate-limited and alert owners and security | THR-024 | Export service wrapper; alert rule ALR-009 | Tests; alert fire test | MVP | BE |

### 4.3 Data protection (`SEC-DATA`)

| ID | Control | Threats | Implementation | Verification | Ph | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-DATA-01 | Every field is classified; classification drives handling | All | `class` attribute in the data dictionary and schemas; schema check fails the build if missing | CI check | MVP | SEC |
| SEC-DATA-02 | Encryption at rest for databases, caches, object storage, backups and local device databases | THR-013, -017 | Managed-service encryption with KMS keys; SQLCipher or OS file protection on devices (TQ-05) | Configuration inspection; device test | MVP (server), V1 (devices) | OPS, DESK, MOB |
| SEC-DATA-03 | Encryption in transit everywhere | THR-002 | TLS 1.2 or higher (1.3 preferred); HSTS; TLS also from API to database and cache | testssl scan; configuration review | MVP | OPS |
| SEC-DATA-04 | Key management: separate keys per environment, envelope encryption, yearly rotation, access only through IAM roles | THR-017 | KMS customer-managed keys; data keys wrapped by KMS | Key policy review; rotation record | MVP | OPS |
| SEC-DATA-05 | Field-level encryption for integration credentials and MFA secrets; key id stored with ciphertext | THR-017 | AES-256-GCM with KMS data keys | Unit tests; database inspection shows no plaintext | MVP | BE |
| SEC-DATA-06 | Encrypted backups with point-in-time recovery and tested restores | THR-019 | PITR (5 minutes), encrypted snapshots, second-location copy, quarterly drill | Drill report | MVP | OPS |
| SEC-DATA-07 | Retention and erasure follow the data dictionary; erasure requests complete within 30 days with evidence | THR-030 | Maintenance queue jobs; erasure log | Tests; sample audit | MVP | BE |
| SEC-DATA-08 | Data minimisation and non-production data: staging and local use synthetic or anonymised data only | THR-030, -017 | Seed and masking tools; no production copies | Inspection; staging data scan | MVP | OPS |

### 4.4 Secrets (`SEC-SEC`)

| ID | Control | Threats | Implementation | Verification | Ph | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-SEC-01 | No secrets in code, tests, comments, docs, images, CI files, bundles or logs | THR-017 | Secret manager plus environment injection; `.env.example` with fake values only | Secret scan on every commit and in history | MVP | OPS |
| SEC-SEC-02 | A found secret is revoked and rotated at once and never repeated or summarised | THR-017 | Runbook; assistant rule SEC-AI-02 | Drill; tabletop | MVP | SEC |
| SEC-SEC-03 | Secrets and identifiers come from a cryptographically secure generator | THR-002, -017 | `crypto.randomBytes` and `randomUUID`; lint ban on `Math.random` for security values | Lint | MVP | BE |
| SEC-SEC-04 | Integration tokens encrypted; API keys hashed, shown once, scoped, revocable | THR-017 | See SEC-DATA-05; key service | Tests | MVP | BE |
| SEC-SEC-05 | Client apps hold no long-lived secrets; no key generation or display in clients | THR-017 | Server issues keys; bundles scanned | Bundle scan | MVP | FE |
| SEC-SEC-06 | Secret scanning blocks merges | THR-017 | gitleaks pre-commit and CI | Planted fake key fails the build | MVP | OPS |
| SEC-SEC-07 | Service credentials rotate every 90 days or immediately on suspicion; break-glass access is sealed, audited and reviewed after use | THR-017, -025 | Secret manager rotation; break-glass procedure | Rotation records; quarterly review | MVP | OPS |

### 4.5 Application security (`SEC-APP`)

| ID | Control | Threats | Implementation | Verification | Ph | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-APP-01 | Every external input validated at the boundary with strict allowlist schemas; unknown fields rejected; size limits set | THR-010, -009 | Zod schemas from the domain package; Fastify body limits | Fuzzing (Schemathesis); injection strings in tests | MVP | BE |
| SEC-APP-02 | No SQL by string building; no `eval`, `new Function`, shell execution or dynamic `require` with user input | THR-010 | ORM or parameterised queries; ESLint security rules and bans | SAST; lint; code review | MVP | BE |
| SEC-APP-03 | Data is rendered as text; no `innerHTML` or equivalent with data; rich text only through a vetted sanitiser | THR-003 | Framework rendering; DOMPurify allowlist where HTML is unavoidable (campaign content) | Lint rule; XSS test corpus in end-to-end tests | MVP | FE |
| SEC-APP-04 | No inline event handlers and no HTML assembled from strings that include data | THR-003 | Component framework; CSP without `unsafe-inline` | Lint; CSP test | MVP | FE |
| SEC-APP-05 | CSV and spreadsheet safety: formula neutralisation on export; size, row and type limits on import; BOM stripped; skipped rows reported | THR-006 | Shared CSV utility in the domain package | Unit tests with formula payloads; large-file tests | MVP | BE |
| SEC-APP-06 | File uploads: allowlisted types by content sniffing, size limits, random names, malware scan, stored outside the app origin, attachment disposition and nosniff | THR-006 | Presigned uploads; scanner worker; separate download domain | Upload abuse tests (polyglot, oversized, double extension) | MVP | BE |
| SEC-APP-07 | Server-side requests to user-supplied URLs use an egress allowlist and reject private, loopback, link-local and metadata addresses; limited redirects and size | THR-005 | Safe HTTP client wrapper with DNS pinning | SSRF test suite | MVP (V1 if webhooks are deferred) | BE |
| SEC-APP-08 | No user input in file paths; ids and fixed base directories only | THR-006, -010 | Storage abstraction using generated keys | Path traversal tests | MVP | BE |
| SEC-APP-09 | Restored backups, sync payloads and imported files are validated record by record with the normal schemas; safe deserialisation only | THR-003, -014 | Shared validation in import, restore and sync paths | Poisoned-payload tests (markup, quote-breaking ids, oversized) | MVP | BE |
| SEC-APP-10 | Chatbot input and output untrusted: workspace-scoped retrieval, no cross-tenant tool access, encoded output, minimal retention of prompts | THR-027 | Retrieval filtered by tenant; fixed tool list; output encoding | Prompt-injection test set; cross-tenant retrieval test | V1 | BE |

### 4.6 API security (`SEC-API`)

| ID | Control | Threats | Implementation | Verification | Ph | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-API-01 | Rate limits per IP, user, tenant and API key; stricter on auth, public forms, exports and bulk operations; `429` with `Retry-After` | THR-016, -023, -008 | Redis token buckets in a global guard | Load and abuse tests | MVP | BE |
| SEC-API-02 | CORS allowlist (never wildcard with credentials); CSRF protection for cookie flows | THR-004 | Fastify CORS config; anti-CSRF header or token with SameSite | Cross-origin tests; ZAP | MVP | BE |
| SEC-API-03 | Security headers on every response: HSTS, nosniff, Referrer-Policy, Permissions-Policy, no-store on sensitive responses, strict CSP on HTML | THR-003 | Helmet-style middleware; CDN rules | Header scan in CI | MVP | BE, OPS |
| SEC-API-04 | Errors never reveal stack traces, SQL, paths, versions or cross-tenant existence | THR-030, -001 | Central exception filter | Error response tests | MVP | BE |
| SEC-API-05 | Webhooks: verify signature on the raw body with timing-safe comparison, check timestamp, deduplicate by event id; outbound webhooks signed with HMAC and rotatable secrets | THR-007 | Webhook middleware; event-id store | Forged, stale and duplicate event tests | MVP | BE |
| SEC-API-06 | Idempotency keys on creates and actions; optimistic concurrency with `If-Match` | THR-014 | Idempotency store; version checks | Replay and concurrent update tests | MVP | BE |
| SEC-API-07 | Public endpoints: captcha, honeypot, per-IP and per-email limits, disposable-email filtering, double opt-in, no personal data echoed | THR-008, -015 | Public module guard chain | Bot simulation; honeypot tests | MVP | BE |
| SEC-API-08 | Sync endpoints apply the same rules and permissions as REST, reject stale versions and ignore server-controlled fields | THR-014, -009 | Sync module uses domain package | Replay, tamper and stale-version tests | V1 | BE |
| SEC-API-09 | Per-workspace caps on workflow runs, outbound messages and chain depth, with alerts | THR-022 | Counters in Redis; configurable caps per plan | Cap tests; alert test | MVP | BE |
| SEC-API-10 | Per-workspace quotas for requests, imports and queue depth; heavy work runs in queues with back-pressure | THR-023 | Quota service; queue limits | Load test with an abusive tenant | MVP | BE, OPS |

### 4.7 Web front end (`SEC-WEB`)

| ID | Control | Threats | Implementation | Verification | Ph | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-WEB-01 | Strict CSP with no `unsafe-inline` or `unsafe-eval`; `frame-ancestors 'none'`; `object-src 'none'`; `base-uri 'self'` | THR-003 | Nonces or hashes; headers from the CDN or API | CSP evaluator; browser test | MVP | FE |
| SEC-WEB-02 | Self-hosted scripts, styles and fonts; pinned versions; Subresource Integrity for any unavoidable third-party asset | THR-011 | Build pipeline bundles all assets | Build check that fails on external script tags | MVP | FE |
| SEC-WEB-03 | No secrets or tokens in the bundle; production source maps access-controlled | THR-017 | Build-time scan | Bundle scan | MVP | FE |
| SEC-WEB-04 | No sensitive data in local storage, session storage, IndexedDB or URLs | THR-002, -030 | Preferences only in browser storage | Storage inspection in end-to-end tests | MVP | FE |
| SEC-WEB-05 | External links use `noopener noreferrer`; redirect targets validated against an allowlist | THR-003 | Link component; redirect helper | Tests | MVP | FE |
| SEC-WEB-06 | URLs placed in links or images allow only `http`, `https`, `mailto`, `tel` | THR-003 | URL sanitiser | Tests with `javascript:` and `data:` | MVP | FE |

### 4.8 Mobile apps (`SEC-MOB`)

| ID | Control | Threats | Implementation | Verification | Ph | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-MOB-01 | Tokens only in the Keychain or Keystore; biometric re-authentication for billing, API keys and export | THR-002, -013 | `expo-secure-store`; local authentication | Device tests; MASVS checks | V1 | MOB |
| SEC-MOB-02 | Local database encrypted; wipe on sign-out and after repeated failed unlock | THR-013 | SQLCipher or OS file protection `complete` | Device forensics test | V1 | MOB |
| SEC-MOB-03 | TLS only; certificate pinning with a rotation plan and safe fallback | THR-002 | Pinning configuration with backup pins | Proxy interception test | V1 | MOB |
| SEC-MOB-04 | Deep and universal links validated against an allowlist; no state change from a link without confirmation | THR-013 | Link router | Malicious link tests | V1 | MOB |
| SEC-MOB-05 | Sensitive files excluded from backups; screenshots and recording blocked on sensitive screens; no sensitive data in logs or crash reports | THR-013, -030 | Platform flags; log scrubbing | Manual and automated checks | V1 | MOB |
| SEC-MOB-06 | Minimum permissions requested at the moment of use; root and jailbreak signals advisory only | THR-013 | Permission prompts; signal collection | Review | V1 | MOB |
| SEC-MOB-07 | No secrets in the app bundle; the binary is treated as public | THR-017 | Build-time scan | Bundle scan | V1 | MOB |

### 4.9 Desktop app (`SEC-DESK`)

| ID | Control | Threats | Implementation | Verification | Ph | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-DESK-01 | Window settings: `contextIsolation` on, `sandbox` on, `nodeIntegration` off, no webview tag, no insecure content; no remote content in windows that have the bridge | THR-012 | Window factory with fixed options | Unit test of options; Electron checklist review | V1 | DESK |
| SEC-DESK-02 | Preload exposes the smallest typed API through `contextBridge`; never `ipcRenderer`, `require`, file or shell access | THR-012 | Typed bridge module | Code review; bridge surface test | V1 | DESK |
| SEC-DESK-03 | Every IPC handler validates the sender frame and the payload (schema, size); file paths come only from native dialogs | THR-012 | Handler wrapper with schema and sender check | IPC fuzz tests; unauthorised sender test | V1 | DESK |
| SEC-DESK-04 | Deny all permission requests by default; block navigation and window opening except allowlisted https links opened externally | THR-012 | Session permission handlers; navigation guards | Tests; manual attempt to navigate | V1 | DESK |
| SEC-DESK-05 | Strict CSP in the renderer; Electron fuses set (disable run-as-node and inspect arguments, enable ASAR integrity where supported) | THR-003, -012 | Build configuration | Fuse check in CI | V1 | DESK |
| SEC-DESK-06 | Local data encrypted with a key from `safeStorage`; atomic writes; validation on load; damaged files quarantined and restored from the newest valid backup, never reset to seed data | THR-019, -013 | SQLite with encryption (TQ-05); recovery routine | Corruption and power-loss tests | V1 | DESK |
| SEC-DESK-07 | Auto-update only from signed releases over HTTPS with signature verification and a minimum-version floor; Windows code signing; macOS signing and notarisation | THR-018 | electron-builder and updater configuration | Tampered and downgraded update tests | V1 | DESK, OPS |
| SEC-DESK-08 | `merchio://` handlers validate the route against an allowlist, handle cold start and second instance, and never act on link data alone | THR-012 | Protocol handler | Malicious link tests | V1 | DESK |
| SEC-DESK-09 | Electron stays on the latest supported major; security releases applied within 14 days | THR-011, -012 | Dependency policy and automation | Version check in CI | V1 | DESK, OPS |

### 4.10 Compliance and privacy (`SEC-COMP`)

| ID | Control | Threats | Implementation | Verification | Ph | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-COMP-01 | Messaging: consent recorded (who, when, source, wording) before marketing messages; opt-out wording; STOP and unsubscribe immediate and permanent; quiet hours enforced on the server (08:00 to 21:00 recipient time); consent log immutable | THR-015 | Compliance service in the send path; consent store | AC-EML-003 and -004; quiet-hour and missing-consent tests | MVP (email), V1 (SMS) | BE |
| SEC-COMP-02 | Privacy: minimisation, purpose limitation, export and delete within 30 days, retention schedule, lawful-basis fields, double opt-in for newsletters, privacy notice and consent text on every form | THR-030 | Export and erasure jobs; form components with notices | End-to-end privacy request test; DPIA review | MVP | BE, FE |
| SEC-COMP-03 | Payments only through Stripe-hosted components; MerchIO never receives, stores or logs card data | AS-11 | Stripe Checkout and Portal only | Inspection; SAQ-A questionnaire; log scan for card patterns | MVP | BE |
| SEC-COMP-04 | Immutable audit of authentication events, role changes, exports, deletes, plan changes, API-key actions and staff access; each record has actor, workspace, action, target, result, IP and request id | THR-021, -024, -025 | Audit module, append-only grants, hash chain per workspace | Tamper test; integrity check job | MVP | BE |
| SEC-COMP-05 | Simulated or demo features are labelled and never shown as real results | THR-015 | Demo labels in the UI; no fake metrics | UI inspection; test that metrics derive from provider events | MVP | FE, PO |
| SEC-COMP-06 | Sender safeguards: verified sending domains, per-workspace send caps, bounce and complaint monitoring, automatic suspension on abuse | THR-026 | Domain verification check; cap service; provider event rules | Cap and suspension tests | MVP | BE |

### 4.11 Logging and monitoring (`SEC-LOG`)

| ID | Control | Threats | Implementation | Verification | Ph | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-LOG-01 | Structured logs with request, tenant and user ids; passwords, tokens, secrets, card data and unneeded personal data redacted; bodies of auth, billing and import requests never logged | THR-030 | pino with redaction paths | Planted-secret test; log sampling | MVP | BE |
| SEC-LOG-02 | Security events emitted and alerted (see section 7) | All | Event catalogue; alert rules | Alert fire drills | MVP | SEC, OPS |
| SEC-LOG-03 | Logs tamper-resistant, access-controlled and retained (security logs 13 months, **PROPOSED**) | THR-021 | Central log store with restricted write and read roles | Access review | MVP | OPS |
| SEC-LOG-04 | Personal data and secrets scrubbed before logs, traces and error reports leave the service | THR-030 | Scrubbing middleware in the OpenTelemetry and Sentry pipelines | Planted personal data never reaches Sentry | MVP | BE |

### 4.12 Dependencies and supply chain (`SEC-SC`)

| ID | Control | Threats | Implementation | Verification | Ph | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-SC-01 | Lockfile and exact versions; frozen installs in CI; each new dependency reviewed (maintenance, licence, install scripts, vulnerabilities) | THR-011 | pnpm lockfile; PR template item | CI fails on lockfile drift | MVP | OPS |
| SEC-SC-02 | No unreviewed install scripts; check names for typo-squatting | THR-011 | Lifecycle scripts disabled by default | Review log | MVP | OPS |
| SEC-SC-03 | Dependency audit, static analysis (CodeQL), container scan (Trivy), secret scan, licence check, SBOM on every build; critical or high findings block release | THR-011 | CI jobs | CI report archived per release | MVP | OPS |
| SEC-SC-04 | CI actions pinned by commit SHA; read-only default workflow permissions; secrets scoped per environment | THR-011 | Workflow templates; branch protection | Workflow lint | MVP | OPS |
| SEC-SC-05 | Release artefacts built only in CI, signed, with provenance; developer machines never produce releases | THR-011, -018 | Signed images; build attestations | Provenance verification at deploy | MVP | OPS |
| SEC-SC-06 | Patch deadlines: critical 48 hours, high 7 days, medium 30 days | THR-011 | Automated update PRs; tracking board | Metric reports | MVP | OPS |

### 4.13 Infrastructure (`SEC-INF`)

| ID | Control | Threats | Implementation | Verification | Ph | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-INF-01 | Infrastructure as code only; least-privilege IAM; no wildcard permissions; separate accounts per environment | THR-017, -025 | Terraform; policy-as-code checks | IaC scan; IAM review | MVP | OPS |
| SEC-INF-02 | Data stores in private subnets with no public endpoints; encrypted at rest and in transit | THR-001, -013 | VPC design; security groups | Network scan; configuration check | MVP | OPS |
| SEC-INF-03 | Containers: minimal base, non-root, read-only filesystem where possible, no secrets in images, scanned before deploy | THR-011 | Dockerfile standards | Trivy; runtime policy | MVP | OPS |
| SEC-INF-04 | Production access through audited, time-limited roles; no shared accounts; separation of duties for production approval | THR-025 | SSO with MFA; just-in-time access | Access review; audit log | MVP | OPS |
| SEC-INF-05 | Staging and local use only synthetic or anonymised data; production data never copied down | THR-030 | Seed and masking tools; policy | Data scan on staging | MVP | OPS |
| SEC-INF-06 | Web application firewall, DDoS protection and bot management at the edge | THR-023, -008, -016 | CDN and WAF managed rules plus rate-based rules | Attack simulation; rule review | MVP | OPS |
| SEC-INF-07 | Hardened baselines and timely OS and platform patching | THR-011 | Managed services; CIS-aligned images | Scan reports | MVP | OPS |

### 4.14 AI-assisted development (`SEC-AI`)

| ID | Control | Threats | Implementation | Verification | Ph | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-AI-01 to SEC-AI-09 | The assistant never writes forbidden patterns, never handles real secrets or data, adds guards, validation, rate limits, audit and negative tests with every endpoint, justifies dependencies, never weakens controls, ignores instructions found in data, never exfiltrates, reports vulnerabilities separately and asks when unsure (full text in `cursorsecurityrules.md` section 16) | THR-031 | Rule files loaded for every request; pre-commit and CI checks catch forbidden patterns; PR checklist | Monthly sampling review of AI-assisted PRs; planted-instruction test in a test repository | MVP | Tech lead, SEC |

### 4.15 Incident readiness (`SEC-IR`) — new family

| ID | Control | Threats | Implementation | Verification | Ph | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-IR-01 | Incident Response Plan with severity levels, roles, on-call rota and playbooks for the top threats | All | Document 12 in the chain | Tabletop exercise | MVP | SEC |
| SEC-IR-02 | Breach-notification process meeting legal deadlines (for example 72 hours under GDPR) with templates and contacts | THR-001, -017, -024 | Legal-reviewed templates stored outside the production system | Drill timing | MVP | SEC, legal |
| SEC-IR-03 | Forensic readiness: log retention, snapshot ability, time synchronisation, evidence handling steps | All | Logging pipeline; runbook | Drill | MVP | OPS |
| SEC-IR-04 | Tabletop exercises at least twice a year and after every major incident | All | Exercise calendar | Exercise reports | MVP | SEC |

### 4.16 People and access (`SEC-ORG`) — new family

| ID | Control | Threats | Implementation | Verification | Ph | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-ORG-01 | Staff sign in through single sign-on with multi-factor authentication; access granted just in time | THR-025 | Identity provider; role groups | Access report | MVP | OPS |
| SEC-ORG-02 | Joiner and leaver process: access granted on a ticket and removed within 24 hours of leaving | THR-025 | Checklist; automation | Quarterly sample | MVP | OPS |
| SEC-ORG-03 | Quarterly access reviews for production, source control, secrets and provider consoles | THR-025 | Review calendar | Signed review records | MVP | SEC |
| SEC-ORG-04 | Annual security training (secure coding, phishing, data handling) and onboarding briefing on the rule files | THR-031, -016 | Training plan | Completion records | MVP | SEC |
| SEC-ORG-05 | Developer device hygiene: disk encryption, screen lock, patching, endpoint protection | THR-017 | Device policy | Spot checks | MVP | OPS |
| SEC-ORG-06 | Vendor risk reviews for every provider (data-processing agreement, security report, breach terms) before use | THR-007, -017 | Vendor register | Register completeness | MVP | SEC, legal |

---

## 5. Threat-to-control coverage

Every threat in TM-001 has at least one control and one verifying test family. Test families become `TC-SEC` cases in the Test Cases document.

| Threat | Rating | Primary controls | Test family | Ph |
| --- | --- | --- | --- | --- |
| THR-001 Cross-tenant access | High | SEC-AUTHZ-02, -03, -04, -08; SEC-INF-02 | Tenant isolation suite (API and database) | MVP |
| THR-002 Token theft or replay | High | SEC-AUTH-02, -03, -04, -07 | Token rotation and reuse tests | MVP |
| THR-003 Script injection | High | SEC-APP-03, -04, -09; SEC-WEB-01; SEC-DESK-05 | XSS corpus; CSP tests; poisoned-payload tests | MVP |
| THR-004 CSRF | Medium | SEC-API-02; SEC-AUTH-03 | Cross-origin tests | MVP |
| THR-005 SSRF | Medium | SEC-APP-07 | SSRF suite | MVP |
| THR-006 Malicious files | High | SEC-APP-05, -06, -08 | Upload and CSV abuse tests | MVP |
| THR-007 Webhook forgery | High | SEC-API-05; SEC-ORG-06 | Forged, stale, duplicate event tests | MVP |
| THR-008 Public form abuse | Medium | SEC-API-07; SEC-INF-06 | Bot and rate tests | MVP |
| THR-009 Privilege escalation | High | SEC-AUTHZ-01, -05, -06 | Role matrix and mass-assignment tests | MVP |
| THR-010 Injection | Medium | SEC-APP-01, -02 | Fuzzing; SAST | MVP |
| THR-011 Supply chain | High | SEC-SC-01 to -06; SEC-WEB-02; SEC-DESK-09 | CI gate tests; lockfile drift test | MVP |
| THR-012 Desktop bridge abuse | Medium | SEC-DESK-01 to -05, -08 | Bridge and IPC tests | V1 |
| THR-013 Local device data theft | High | SEC-MOB-01, -02, -05; SEC-DESK-06; SEC-DATA-02 | Device forensics tests | V1 |
| THR-014 Sync replay or tampering | High | SEC-API-06, -08; SEC-APP-09 | Replay and tamper tests | V1 |
| THR-015 Messaging compliance breach | High | SEC-COMP-01, -05; SEC-API-07 | Consent, quiet-hour, unsubscribe tests | MVP |
| THR-016 Credential stuffing | High | SEC-AUTH-01, -05, -06; SEC-INF-06 | Brute-force and lockout tests | MVP |
| THR-017 Secrets exposure | High | SEC-SEC-01 to -07; SEC-DATA-04, -05 | Planted-secret scan tests | MVP |
| THR-018 Insecure updates | Medium | SEC-DESK-07; SEC-SC-05 | Tampered and downgraded update tests | V1 |
| THR-019 Data loss or corruption | High | SEC-DESK-06; SEC-DATA-06; RULE-ERR-01 | Corruption, power-loss and restore drills | MVP (server), V1 (devices) |
| THR-020 Plan-limit bypass | Medium | SEC-AUTHZ-07 | Over-limit API tests | MVP |
| THR-021 Audit tampering | Medium | SEC-COMP-04; SEC-LOG-03 | Tamper and integrity-check tests | MVP |
| THR-022 Workflow abuse | Medium | SEC-API-09 | Cap and depth tests | MVP |
| THR-023 Denial of service | High | SEC-API-01, -10; SEC-INF-06 | Load and abusive-tenant tests | MVP |
| THR-024 Insider export | High | SEC-AUTH-05; SEC-AUTHZ-10; SEC-COMP-04 | Step-up and alert tests | MVP |
| THR-025 Staff access abuse | Medium | SEC-AUTHZ-09; SEC-INF-04; SEC-ORG-01 to -03 | Grant and audit tests; access reviews | MVP |
| THR-026 Sender reputation | Medium | SEC-COMP-06 | Cap and suspension tests | MVP |
| THR-027 Chatbot injection | Medium | SEC-APP-10 | Prompt-injection and retrieval tests | V1 |
| THR-028 Account takeover | High | SEC-AUTH-05, -06, -08 | Reset and recovery tests | MVP |
| THR-029 Invitation abuse | Medium | SEC-AUTH-09 | Invitation reuse and expiry tests | MVP |
| THR-030 Personal data leakage | Medium | SEC-LOG-01, -04; SEC-API-04; SEC-DATA-07, -08 | Planted-data tests in logs and Sentry | MVP |
| THR-031 AI assistant risk | High | SEC-AI-01 to -09; SEC-SC-01; SEC-ORG-04 | Sampling review; planted-instruction test | MVP |

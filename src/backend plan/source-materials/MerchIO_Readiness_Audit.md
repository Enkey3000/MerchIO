# MerchIO Readiness Audit: Web, Mobile and Desktop

_Enterprise and production-readiness review · 4 November 2026 · Prepared for CodeByXO_

## 1. Verdict

**Not ready to be declared production frontends. Ready to start the backend and the shared foundation. Connect the clients only through the gates below.**

| Question | Answer | Why |
|---|---|---|
| Start building the backend (plan v2, phases 0–2) | **GO** | The rules, schemas and flows are proven in working prototypes, and the plan already covers the gaps. |
| Use web, mobile and desktop as UX and functional references, and for stakeholder testing | **GO** | They demonstrate every module and are backed by about 100 automated checks. |
| Treat any of the three as the final production frontend | **NO-GO** | Architecture, security, accessibility and release gaps (see findings). |
| Connect the current clients directly to a backend as they are | **NO-GO** | Blockers S-01, S-02, M-01, D-01 and the web structure issues W-01, W-04 must be resolved first. |
| Publish to app stores or distribute desktop installers | **NO-GO** | Outdated toolchains, no signing or update path, untested on real devices and operating systems. |

### Per platform

| Platform | Verdict | What it needs |
|---|---|---|
| Web app | Prototype-complete, not production-ready. Conditional go after Gate A. | Rebuild as a modular TypeScript project on the shared domain package; fix injection, silent save failures and accessibility. |
| Mobile (React Native) | Functional prototype on an outdated toolchain. Conditional go after Gate A and the mobile items in Gate B. | Upgrade Expo, run on real devices, add keyboard handling, accessibility and SQLite storage. |
| Desktop (Electron) | Sound shape (sandbox, isolation, validated IPC) on an unsupported Electron. Conditional go after Gate A and the desktop items in Gate B. | Upgrade Electron, fix file recovery and packaging, and test on all three operating systems. It reuses the web renderer, so the web refactor comes first. |

## 2. Findings at a glance

**51 findings:** 4 Blocker, 16 High, 25 Medium, 6 Low · By area: Shared 13, Web 10, Mobile 13, Desktop 11, Homepage 4

## 3. Readiness scorecard

Ratings are an assessment against enterprise, production-ready expectations (Red = not acceptable yet, Amber = partly there, Green = acceptable).

| Dimension | Web | Mobile | Desktop | Basis |
|---|---|---|---|---|
| Features vs. spec | Green | Amber | Amber | Web covers all modules end to end; mobile and desktop lack some features (M-07, D-09). |
| Architecture & maintainability | Red | Amber | Amber | Web is one patched file (W-04); mobile is cleaner but its engine is generated (S-01). |
| Security | Red | Amber | Red | No auth anywhere (S-02); web XSS (W-01); desktop on an unsupported Electron (D-01). |
| Data integrity & persistence | Red | Red | Red | Silent save failures (W-02), whole-state storage (S-04, S-05), file reset (D-04). |
| Accessibility | Red | Red | Red | Failed axe checks on web and homepage; nothing implemented on mobile (M-04). |
| Performance & scalability | Amber | Amber | Amber | Fine to about 20,000 records in tests; ceilings in S-05. |
| Test evidence | Amber | Amber | Amber | About 100 automated checks, all simulated; no real browsers, devices or Electron. |
| Release readiness | Red | Red | Red | Single HTML file; outdated toolchains; no signing, store or update path. |
| Backend-connection readiness | Amber | Amber | Amber | All three use schema-driven modules and can sit behind an adapter, once the domain package exists. |

## 4. What is solid

- Schema-driven modules: one definition drives lists, forms, validation and actions, which makes the move to an API straightforward.
- The business rules (stock effects, workflows, compliance wording, SLA, plan limits) are explicit and covered by about 100 automated checks.
- Offline-first behaviour and local persistence work as designed (apart from the failure cases above).
- Electron shell follows the right security shape: sandbox, context isolation, validated IPC, blocked navigation, external links in the browser.
- React Native renders text safely by default, so mobile has no equivalent of the web injection issue.
- Consistent brand system built from the supplied logo, light and dark themes, and a clear information architecture.
- The backend plan (v2) already anticipates most gaps: shared domain package, sync, public API, entitlements.

## 5. Gates before connecting to real backends

**Gate A: foundation (before connecting any client to the API; about 3–4 weeks)**

- [ ] S-01 Extract `packages/domain` and move the existing tests over
- [ ] Introduce the data-adapter interface in web, mobile and desktop (local now, remote later)
- [ ] W-04 / W-01 Modularise the web app, delete overridden code, remove string-built HTML and inline handlers
- [ ] W-02 / S-11 Visible save failures and central error reporting
- [ ] S-07 / S-08 / S-09 Decide money (minor units), time (UTC + tenant zone) and id (UUIDv7) formats
- [ ] S-02 Remove the client-side API key and add the login flow design

**Gate B: platform readiness (before any beta)**

- [ ] M-01 / M-02 Upgrade Expo/React Native, install, commit the lockfile, run on iPhone and Android
- [ ] M-03 / M-05 / M-08 Keyboard handling, error boundary, safe-area context
- [ ] D-01 / D-04 / D-05 / D-07 Upgrade Electron and builder, file recovery, icons, signing, updater, permission and fuse hardening
- [ ] D-10 Run the desktop app on Windows, macOS and Linux

**Gate C: release readiness (before production)**

- [ ] W-03 / M-04 / H-02 Accessibility fixes and audits (axe plus screen readers)
- [ ] D-02 / D-03 Strict CSP and encryption at rest
- [ ] W-10 / D-10 Real browser, device and Electron end-to-end tests
- [ ] M-10 / H-01 / H-03 Store requirements, verified marketing claims, production forms

## 6. Impractical or questionable features

| Feature | Concern |
|---|---|
| Chatbot | Keyword matching over FAQs. Not AI; label it ‘FAQ assistant’ until an LLM service backs it. |
| Trending and dashboard KPIs | Computed from simulated data (random open rates and reach). |
| Social publishing and campaign sending | Do not contact any network or provider; counts are simulated. |
| Subscription | Switches plans instantly with no billing or limits beyond the seat rule. |
| Newsflash, Resources, Community | Vendor content inside each customer’s workspace; better as a separate help site. |
| Backup and restore by copy-paste | Works for a demo; impractical and risky (clipboard, personal data) at real data sizes. |
| ‘Reset demo data’ button and seed data | Must not exist in production builds. |
| CSV import on mobile (paste only) | Needs a file picker; paste does not work for real files. |
| Pipeline drag-and-drop | Mouse-only on web; no touch or keyboard alternative. |
| Language setting | Decorative; no translations exist. |
| SMS quiet-hours statement | Shown on the page but not enforced. |

## 7. Findings in detail

Severity: **Blocker** = must be fixed before connecting to a backend or releasing; **High** = fix before beta; **Medium** = fix before production; **Low** = polish. Effort is a rough estimate for one engineer.

### Shared

#### S-01 · Blocker · Business rules are triplicated with no single source of truth

- **Finding:** The web app, the mobile engine (generated from the web code by a script) and the desktop renderer each carry their own copy of validation, stock effects, workflows and the scheduler. The old and new versions of several web functions also coexist (see W-04).
- **Impact:** Every fix must be made three times; behaviour will drift between platforms and from the future server.
- **Recommendation:** Extract one `packages/domain` (TypeScript) first; make web, mobile, desktop and the API import it. Reuse the existing ~100 checks as golden tests.
- **Effort:** Large (1–3 weeks) · **Established by:** Code review

#### S-02 · Blocker · No authentication, authorization or multi-user model

- **Finding:** There is no login. Roles in Team & Users are labels only and nothing is enforced. An API key is generated and shown in the browser.
- **Impact:** Anyone with the device can read and change everything. Not acceptable for an enterprise product or any backend connection.
- **Recommendation:** Backend-issued sessions (OIDC/PKCE), RBAC and tenant isolation. Remove the client-side API key UI; keys are created and shown once by the server.
- **Effort:** Large (1–3 weeks) · **Established by:** Code review

#### S-03 · High · Rules that must be enforceable are enforced only in the client

- **Finding:** Plan seat limits, SMS opt-out compliance, SKU/email uniqueness, stock integrity and SLA timers all run in the browser or app. Editing localStorage or the data file bypasses them.
- **Impact:** Plan limits, compliance and integrity can be bypassed.
- **Recommendation:** Move them to the server (transactions, constraints, entitlement and compliance services); keep client copies for fast feedback only.
- **Effort:** Large (1–3 weeks) · **Established by:** Code review

#### S-04 · High · Whole-state persistence with no versioning or conflict control

- **Finding:** Every change serialises the entire state object; two tabs or devices overwrite each other (last write wins). Cross-tab sync replaces the whole state.
- **Impact:** Silent loss of edits when two sessions are open; cost grows with data size.
- **Recommendation:** Per-record storage with `version` and `updated_at`; sync protocol with conflict handling (see backend plan §9).
- **Effort:** Medium (2–5 days) · **Established by:** Code review

#### S-05 · High · Hard capacity ceiling from browser and device storage

- **Finding:** Measured about 123 KB per 1,000 records (20,000 records = 2.4 MB). localStorage is about 5 MB (roughly 40,000 records); Android AsyncStorage is commonly limited to about 2 MB per value (roughly 17,000 records). Verify on device.
- **Impact:** Data silently stops saving or fails to load past the ceiling.
- **Recommendation:** SQLite on native clients, server as source of truth, local cache with eviction.
- **Effort:** Medium (2–5 days) · **Established by:** Tested (Node/jsdom)

#### S-06 · Medium · Metrics and results are simulated but presented as real

- **Finding:** Email open rates, SMS click rates, social reach and campaign counts come from random numbers; ‘Send’ and ‘Publish’ do not contact any provider. The SMS page says quiet hours are respected, but nothing enforces them.
- **Impact:** Misleading in a business tool; a compliance risk if users believe messages were sent.
- **Recommendation:** Label simulated data clearly (or hide the actions) until real providers are connected; enforce quiet hours on the server.
- **Effort:** Small (≤1 day) · **Established by:** Code review

#### S-07 · Medium · Money is stored as floating-point numbers; currency is cosmetic

- **Finding:** Amounts are JavaScript numbers. Switching currency changes only the symbol (tested: $100 becomes €100 with no conversion).
- **Impact:** Rounding errors and wrong totals; mixed-currency data is impossible.
- **Recommendation:** Integer minor units plus an ISO currency code per record; explicit FX policy.
- **Effort:** Medium (2–5 days) · **Established by:** Tested

#### S-08 · Medium · Dates use UTC slices, causing off-by-one days

- **Finding:** Verified: at 6:30 pm Pacific on 4 Nov the app computes today as 5 Nov. Affects scheduler, appointments and order dates near midnight.
- **Impact:** Campaigns and posts fire a day early or late; wrong order dates.
- **Recommendation:** Store timestamps in UTC; keep a tenant time zone; format dates in that zone.
- **Effort:** Medium (2–5 days) · **Established by:** Tested

#### S-09 · Medium · Ids and order numbers are generated on the client

- **Finding:** Ids use a 7-character random string; order numbers are ORD-(4822 + count), which repeats after deletions and races across devices.
- **Impact:** Collisions, duplicate order numbers, no safe sync.
- **Recommendation:** UUIDv7 ids and server-side sequences for order numbers.
- **Effort:** Small (≤1 day) · **Established by:** Code review

#### S-10 · Medium · Stock reversal can create stock from nothing for imported history

- **Finding:** Verified: cancelling a seed order that was already ‘Fulfilled’ adds 3 units that were never deducted.
- **Impact:** Inventory drift whenever historical orders are imported or edited.
- **Recommendation:** Track whether an order’s stock effect was applied (`stock_applied`) and reverse only what was applied.
- **Effort:** Small (≤1 day) · **Established by:** Tested

#### S-11 · Medium · No error reporting; failures are swallowed

- **Finding:** Lint found empty catch blocks in every codebase (storage writes, file writes, parsing). Failed saves look successful.
- **Impact:** Problems cannot be diagnosed in the field; data loss goes unnoticed.
- **Recommendation:** Central error handling, Sentry (or similar), user-visible failure messages.
- **Effort:** Medium (2–5 days) · **Established by:** Lint

#### S-12 · Medium · No internationalisation

- **Finding:** The Language setting is decorative; all text is hard-coded English; default currency USD.
- **Impact:** Blocks non-English markets and some enterprise buyers.
- **Recommendation:** i18n framework, message catalogues, locale-aware dates and numbers.
- **Effort:** Medium (2–5 days) · **Established by:** Code review

#### S-13 · Low · Demo seed data ships in every build

- **Finding:** Sample customers, orders and tickets are created on first run.
- **Impact:** Confusing for real users; could be mistaken for real data.
- **Recommendation:** Production mode with empty states and an optional guided demo tenant.
- **Effort:** Small (≤1 day) · **Established by:** Code review

### Web

#### W-01 · High · Script injection through restored backups

- **Finding:** Verified: a backup whose order id is ‘'+(window.__xss=1)+'’ executes code when the row button is clicked. Record ids and keys are placed unescaped inside inline `onclick` attributes. Text fields are escaped correctly (tested).
- **Impact:** Self-XSS today; becomes a real attack once data comes from a server or other users. In the desktop app the injected code could call the native bridge.
- **Recommendation:** Stop building HTML with string templates and inline handlers; use a framework or `addEventListener` with data attributes. Validate every restored or synced record.
- **Effort:** Medium (2–5 days) · **Established by:** Tested

#### W-02 · High · Silent data loss when storage fails

- **Finding:** Verified: with storage throwing a quota error, the app still shows ‘Saved’; the change exists only in memory and is lost on reload.
- **Impact:** Users lose work without warning.
- **Recommendation:** Detect write failures, show a blocking warning, offer export; move to a server-backed store.
- **Effort:** Small (≤1 day) · **Established by:** Tested

#### W-03 · High · Accessibility failures

- **Finding:** axe-core found: 7 unlabeled form controls on Orders, a select with no name, empty table headers (the checkbox column), heading-order and landmark problems. Modals do not close with Escape (tested), have no focus trap or dialog role. Cards are clickable `div`s, menu links have no `href`, the pipeline needs a mouse to drag, charts have no text alternative. Colour contrast was not testable here.
- **Impact:** Fails WCAG 2.2 AA; excludes keyboard and screen-reader users; procurement blockers for enterprise and public-sector buyers.
- **Recommendation:** Semantic controls, labels, `role=dialog` with focus management, keyboard alternatives to drag and drop, chart summaries and data tables; run axe and manual screen-reader tests in CI.
- **Effort:** Large (1–3 weeks) · **Established by:** Tested (axe)

#### W-04 · High · Single 106 KB inline script, 93 inline handlers, patch-on-patch structure

- **Finding:** The app is one HTML file. Five core functions (table render, edit, save, import, action) are defined twice because later passes overrode earlier ones (verified). No modules, types or build step.
- **Impact:** Hard to maintain, review or secure; forces a CSP that allows inline scripts; dead code hides bugs.
- **Recommendation:** Rebuild as a Vite + TypeScript project (routes per module), delete overridden code, keep the schema-driven design.
- **Effort:** Large (1–3 weeks) · **Established by:** Lint / code review

#### W-05 · Medium · Rendering and persistence do not scale beyond tens of thousands of rows

- **Finding:** Measured (jsdom/Node): at 20,000 records serialising takes about 25 ms per save, search about 22 ms, render about 49 ms. Fine for the prototype; every save still rewrites everything and every action re-renders the page. Tables show a fixed 8 rows with no virtualisation.
- **Impact:** Sluggish with real data volumes; battery and CPU cost on laptops.
- **Recommendation:** Server-side pagination, search and sorting; virtualised lists; targeted updates.
- **Effort:** Medium (2–5 days) · **Established by:** Tested (indicative)

#### W-06 · Medium · CSV import and export are fragile and not safe for spreadsheets

- **Finding:** The parser cannot handle line breaks inside quoted fields, byte-order marks or semicolon delimiters; no size limits. Export does not neutralise cells that start with =, +, - or @ (spreadsheet formula injection).
- **Impact:** Corrupt imports; exported files can run formulas when opened in Excel.
- **Recommendation:** Use a proper CSV library; limits and error report; prefix risky cells on export.
- **Effort:** Small (≤1 day) · **Established by:** Code review

#### W-07 · Medium · Runtime dependence on third-party hosts

- **Finding:** Chart.js and Google Fonts load from public CDNs with no integrity hashes; if blocked, charts silently stay empty.
- **Impact:** Offline failure, privacy concerns, supply-chain exposure.
- **Recommendation:** Self-host and pin assets; add SRI; show a fallback when charts cannot load.
- **Effort:** Small (≤1 day) · **Established by:** Code review

#### W-08 · Medium · Touch and responsive behaviour unverified

- **Finding:** Pipeline drag-and-drop uses mouse-only HTML5 events. Layout was tested only in a simulated DOM; no real browsers, devices or breakpoints.
- **Impact:** Likely broken on tablets and phones.
- **Recommendation:** Pointer-event drag with a ‘Move to…’ menu fallback; test on real browsers and devices.
- **Effort:** Medium (2–5 days) · **Established by:** Code review

#### W-09 · Medium · Several features are impractical or misleading for a business product

- **Finding:** Chatbot is keyword matching, not AI; Trending is computed from simulated data; Newsflash, Resources and Community are vendor content living inside every customer’s workspace; Subscription switches plans for free with no billing; Social ‘Publish’ posts nowhere.
- **Impact:** Over-promises; adds maintenance without customer value.
- **Recommendation:** Keep behind tenant switches (already hidden by default) and label as demo; ship only when real services back them.
- **Effort:** Small (≤1 day) · **Established by:** Code review

#### W-10 · Low · Test evidence is simulated only

- **Finding:** 39 automated checks run in jsdom: no real browser, visual regression, responsive, contrast or cross-browser tests.
- **Impact:** False confidence about real-world behaviour.
- **Recommendation:** Add Playwright end-to-end tests on Chromium, WebKit and Firefox plus visual snapshots.
- **Effort:** Medium (2–5 days) · **Established by:** Code review

### Mobile

#### M-01 · Blocker · Toolchain is far behind and unlikely to pass store requirements

- **Finding:** Expo SDK 52 and React Native 0.76 date from late 2024; npm now shows Expo 58 and React Native 0.88. SDK 52 targets older Android and Xcode levels than current Google Play and App Store rules require (verify the current deadlines).
- **Impact:** New releases may be rejected; no security fixes; large upgrade debt grows.
- **Recommendation:** Upgrade to the current Expo SDK before any further feature work; re-test on devices.
- **Effort:** Medium (2–5 days) · **Established by:** Registry check

#### M-02 · High · Dependency pins are inconsistent and the project has never been installed or run

- **Finding:** package.json pins react-native 0.76.3 while Expo 52.0.49 expects 0.76.9 (verified from its bundled module list). No lockfile; never built on a device or emulator.
- **Impact:** First install will warn or fail; unknown runtime issues.
- **Recommendation:** Install, run `expo install --fix`, commit the lockfile, run on an iPhone and an Android device.
- **Effort:** Small (≤1 day) · **Established by:** Registry check

#### M-03 · High · No keyboard handling

- **Finding:** No screen uses KeyboardAvoidingView or equivalent (0 files). On iOS the keyboard will cover form fields and the chat input.
- **Impact:** Forms and chat are hard to use.
- **Recommendation:** Wrap forms and chat in keyboard-aware containers; test with long forms.
- **Effort:** Small (≤1 day) · **Established by:** Code review

#### M-04 · High · Accessibility not implemented

- **Finding:** 0 files set accessibility labels or roles; icons are emoji; many tap targets are smaller than 44 pt; no dynamic-type support; no screen-reader testing.
- **Impact:** Fails platform accessibility expectations and enterprise requirements.
- **Recommendation:** Add roles/labels, proper icons, minimum touch sizes, font scaling; test with VoiceOver and TalkBack.
- **Effort:** Medium (2–5 days) · **Established by:** Code review

#### M-05 · High · No error boundary; uncaught errors blank the app

- **Finding:** 0 error boundaries; persistence errors are swallowed.
- **Impact:** A single bad record can white-screen the app.
- **Recommendation:** Add an error boundary with recovery, crash reporting and safe-mode data export.
- **Effort:** Small (≤1 day) · **Established by:** Code review

#### M-06 · High · Whole-state AsyncStorage persistence, unencrypted

- **Finding:** One key holds all data and is rewritten on every change (see S-04, S-05). Personal data (contacts, emails) is stored unencrypted on the device.
- **Impact:** Capacity, performance and privacy problems.
- **Recommendation:** SQLite for records; secure storage for tokens; device encryption guidance; wipe on sign-out.
- **Effort:** Medium (2–5 days) · **Established by:** Code review

#### M-07 · Medium · Feature gaps compared with web and desktop

- **Finding:** No push or local notifications; the scheduler only runs while the app is open; CSV import is paste-only (no file picker); dates are free-text and not validated as dates; no deep links, biometrics or drag pipeline.
- **Impact:** Scheduled actions do not fire in the background; weaker workflows.
- **Recommendation:** Server-side scheduler and push; document picker; native date pickers; deep links.
- **Effort:** Medium (2–5 days) · **Established by:** Code review

#### M-08 · Medium · Safe-area and system-bar handling is incomplete

- **Finding:** Uses React Native’s iOS-only SafeAreaView plus StatusBar height on Android; Android 15 edge-to-edge will overlap the header and tab bar. `react-native-safe-area-context` is not used.
- **Impact:** Layout overlaps on newer devices.
- **Recommendation:** Adopt safe-area-context and test notched and gesture-navigation devices.
- **Effort:** Small (≤1 day) · **Established by:** Code review

#### M-09 · Medium · Whole tree re-renders on every change

- **Finding:** A global mutable object plus a forced update re-renders every screen on any change; lists use ScrollView (no virtualisation) with ‘Show more’ batches of 30.
- **Impact:** Jank with larger data sets.
- **Recommendation:** State store with selectors, memoised rows, FlatList.
- **Effort:** Medium (2–5 days) · **Established by:** Code review

#### M-10 · Medium · Store submission prerequisites are missing

- **Finding:** No privacy policy link, privacy manifest / data-safety answers, account deletion flow (needed once accounts exist), review demo account, real bundle identifiers, crash reporting or environment configuration.
- **Impact:** Rejection at review.
- **Recommendation:** Prepare store listings and policies; use EAS environments.
- **Effort:** Medium (2–5 days) · **Established by:** Code review

#### M-11 · Medium · Theme ignores the system setting

- **Finding:** The app defaults to light and uses its own toggle although the manifest says ‘automatic’.
- **Impact:** Feels wrong in dark-mode devices.
- **Recommendation:** Follow the system appearance by default; keep manual override.
- **Effort:** Small (≤1 day) · **Established by:** Code review

#### M-12 · Low · Dead web-only code in the generated engine

- **Finding:** Lint reports undefined references (`toast`, `E`) in unused branches copied from the web code.
- **Impact:** Latent crashes if those branches are ever used.
- **Recommendation:** Remove when the shared domain package replaces the generated engine.
- **Effort:** Small (≤1 day) · **Established by:** Lint

#### M-13 · Low · Nested modals are untested on iOS

- **Finding:** Pickers open inside bottom sheets (modal inside modal), which is a known weak spot on iOS.
- **Impact:** Possible presentation failures.
- **Recommendation:** Test on device; use a single sheet component with stacked content.
- **Effort:** Small (≤1 day) · **Established by:** Code review

### Desktop

#### D-01 · Blocker · Electron 33 is several major versions out of support

- **Finding:** package.json pins Electron ^33 (Oct 2024); npm latest is 45 and only the latest few majors receive security fixes. electron-builder is also a major behind (25 vs 26).
- **Impact:** Known browser-engine vulnerabilities stay unpatched in a shipped desktop app.
- **Recommendation:** Upgrade Electron and electron-builder now, then enable current security defaults and fuses.
- **Effort:** Small (≤1 day) · **Established by:** Registry check

#### D-02 · High · Content security policy allows inline scripts

- **Finding:** The policy needs `'unsafe-inline'` because the app relies on inline handlers. Together with W-01, injected code would run with access to the native bridge (it could overwrite the data file or trigger save dialogs).
- **Impact:** Weakens the main defence against script injection.
- **Recommendation:** Remove inline handlers (see W-04), then drop `unsafe-inline`; keep the bridge minimal and validated.
- **Effort:** Medium (2–5 days) · **Established by:** Code review

#### D-03 · High · Data and backups are stored unencrypted

- **Finding:** `merchio-data.json` and seven rolling daily backups sit as plain JSON in the user profile and include personal data.
- **Impact:** Privacy and compliance exposure on shared or lost laptops.
- **Recommendation:** Encrypt at rest (SQLCipher with a key from safeStorage), shorten retention, or keep data server-side.
- **Effort:** Medium (2–5 days) · **Established by:** Code review

#### D-04 · High · A damaged data file silently resets to demo data

- **Finding:** If the file is unreadable the app starts from seed data and the next save overwrites the damaged file. Backups exist but are never used for recovery.
- **Impact:** Total data loss from a partial write or disk error.
- **Recommendation:** Validate on load, quarantine the bad file, offer restore from the newest good backup.
- **Effort:** Small (≤1 day) · **Established by:** Code review

#### D-05 · High · Packaging and release gaps

- **Finding:** App icons are not wired into electron-builder (icons live in `assets/`, the default is `build/`, and no icon is configured), so installers would use the default icon. There is no code-signing or notarisation setup, no auto-update, no crash reporting, and no Windows app id (`setAppUserModelId`) so toast notifications and taskbar grouping can misbehave.
- **Impact:** Unsigned installers trigger SmartScreen/Gatekeeper warnings; no way to ship fixes.
- **Recommendation:** Configure icons, signing, notarisation, updater and app id; test installers on clean machines.
- **Effort:** Medium (2–5 days) · **Established by:** Code review

#### D-06 · Medium · Deep links do not work on cold start

- **Finding:** `merchio://` is handled only for an already-running instance; the launch arguments are never read on Windows and Linux.
- **Impact:** Links from emails or other apps fail if MerchIO is closed.
- **Recommendation:** Read `process.argv` at startup; test per platform.
- **Effort:** Small (≤1 day) · **Established by:** Code review

#### D-07 · Medium · Hardening is incomplete

- **Finding:** No permission-request handler (camera, location, etc. should be denied), no Electron fuses, no session-level restrictions. Navigation and window-open rules are in place (good).
- **Impact:** Smaller defence-in-depth than a security review will expect.
- **Recommendation:** Deny all permissions by default; set fuses; review against the Electron security checklist.
- **Effort:** Small (≤1 day) · **Established by:** Code review

#### D-08 · Medium · Startup and write behaviour

- **Finding:** The page blocks on a synchronous IPC call at startup; writes are debounced by 400 ms and the whole file is rewritten, so a crash can lose the last edits.
- **Impact:** Slow start with large data; small loss window.
- **Recommendation:** Async load with a splash screen; incremental writes (SQLite).
- **Effort:** Small (≤1 day) · **Established by:** Code review

#### D-09 · Medium · Tray and window behaviour are basic

- **Finding:** One 64 px icon is scaled to 16 px (blurry on high-DPI); no macOS template image; Linux needs an AppIndicator; closing the window quits (an unused flag suggests minimise-to-tray was intended).
- **Impact:** Looks unpolished; unexpected quit behaviour.
- **Recommendation:** Provide per-platform tray icons; decide the close behaviour; add a setting.
- **Effort:** Small (≤1 day) · **Established by:** Lint / code review

#### D-10 · Medium · Never run in real Electron

- **Finding:** All 35 checks use a mocked Electron and a simulated DOM. Menus, dialogs, tray, notifications, protocol handling and installers are untested on any OS.
- **Impact:** Unknown defects in native behaviour.
- **Recommendation:** Run on Windows, macOS and Linux; add Playwright-for-Electron tests.
- **Effort:** Medium (2–5 days) · **Established by:** Code review

#### D-11 · Low · Typography differs from the web app

- **Finding:** Web fonts were removed for offline use, so the desktop UI falls back to system fonts.
- **Impact:** Brand inconsistency.
- **Recommendation:** Bundle the fonts locally.
- **Effort:** Small (≤1 day) · **Established by:** Code review

### Homepage

#### H-01 · Medium · Placeholder marketing claims

- **Finding:** Statistics (12M+ orders, 38% faster, 4.8/5, 99.9% uptime), named testimonials and integration logos are invented sample content.
- **Impact:** Misleading-advertising risk if published as is.
- **Recommendation:** Replace with verified data or remove; add disclaimers for demos.
- **Effort:** Small (≤1 day) · **Established by:** Code review

#### H-02 · Medium · Accessibility issues

- **Finding:** axe-core: 28 elements outside landmarks, 8 social icons without accessible names, 2 unlabeled inputs, heading-order issue.
- **Impact:** Fails accessibility reviews.
- **Recommendation:** Add landmarks, labels and icon names.
- **Effort:** Small (≤1 day) · **Established by:** Tested (axe)

#### H-03 · Medium · Forms are not production-grade

- **Finding:** No server, captcha, rate limiting, double opt-in, consent text or privacy policy; legal links, social URLs, address, phone and emails are placeholders. Hand-off to the app relies on a shared browser storage origin.
- **Impact:** Spam, privacy-law exposure and no real lead capture.
- **Recommendation:** Public API from the backend plan (§5.5), consent and policy pages, real contact details.
- **Effort:** Medium (2–5 days) · **Established by:** Code review

#### H-04 · Low · Page weight and SEO basics

- **Finding:** 231 KB single file with the 97 KB logo embedded twice; no social-share tags, sitemap, structured data or analytics/consent banner.
- **Impact:** Slower loads; weaker discoverability.
- **Recommendation:** Serve optimised image files (WebP/SVG), add metadata, analytics with consent.
- **Effort:** Small (≤1 day) · **Established by:** Code review

## 8. Method, limits and evidence

**Method**

- **Static analysis:** ESLint (recommended rules) on the web and homepage scripts, mobile engine, desktop main, preload and bridge code. JSX false positives (no React plugin) were discarded.
- **Accessibility:** axe-core on the dashboard, orders list, add-order form and homepage (colour contrast excluded).
- **Behaviour probes:** Scripted tests for script injection, storage failure, stock reversal, currency, date handling, modal keyboard handling and scale (1k, 5k and 20k records).
- **Dependency check:** npm registry versions for Expo, React Native, Electron and electron-builder, plus Expo SDK 52’s bundled module list.
- **Code review:** Manual review of all three codebases and the homepage against enterprise expectations: security, data integrity, accessibility, release and operations.

**Limits of this review**

- No real browsers, phones, emulators or Electron runtime were available; web, desktop and homepage were exercised in a simulated DOM (jsdom) and the Electron main process through a mock.
- Colour contrast, real-device layout, touch behaviour and screen-reader behaviour could not be tested and are likely to produce further findings.
- Performance numbers come from Node/jsdom and are indicative only.
- Store and platform policy deadlines change often; items marked ‘verify’ should be re-checked against current Google Play, Apple and Electron release policies.

**Automated test inventory (existing):** Web app 39, Mobile engine 20, Mobile UI smoke 8, Desktop (main, bridge, preview) 35 checks (about 100 in total, all simulated).

**ESLint results**

| Codebase | Problems | Main causes |
|---|---|---|
| Web app script | 15 (9 errors, 6 warnings) | empty catch blocks, function reassignment, useless escapes |
| Homepage script | 7 (2, 5) | empty catch blocks, unused variables |
| Desktop main process | 7 (2, 5) | empty catch blocks, unused flag |
| Desktop bridge | 2 (1, 1) | empty catch block |
| Mobile engine | 9 (5, 4) | undefined `toast` and `E`, empty catch blocks |

**axe-core violations (excluding colour contrast)**

| Page | Rules |
|---|---|
| Dashboard | heading-order, landmark-unique |
| Orders list | label (7), select-name, empty-table-header (2), landmark-unique |
| Add-order form | label (7), select-name, empty-table-header (2), heading-order, region (2), landmark-unique |
| Homepage | region (28), svg-img-alt (8), label (2), heading-order |

**Scale probe (web state, Node/jsdom)**

| Records | State size | Serialise | Render page | Search |
|---|---|---|---|---|
| 1,000 | 123 KB | 1 ms | 14 ms | 1 ms |
| 5,000 | 596 KB | 12 ms | 33 ms | 6 ms |
| 20,000 | 2,398 KB | 25 ms | 49 ms | 22 ms |

**Dependency currency (npm registry, checked 4 Nov 2026)**

| Package | Pinned | Latest | Note |
|---|---|---|---|
| Expo SDK | 52 (52.0.49) | 58 | Expo 52 expects React Native 0.76.9 |
| React Native | 0.76.3 | 0.88.1 | Pin is also inconsistent with Expo 52 |
| Electron | ^33.2.0 (Oct 2024) | 45.2.2 | Out of support |
| electron-builder | ^25.1.8 | 26.18.0 | One major behind |
| react-native-web (preview only) | ~0.19.13 | 0.21.4 | Preview tooling |

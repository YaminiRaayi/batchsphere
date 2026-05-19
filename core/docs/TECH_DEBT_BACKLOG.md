# BatchSphere — Tech Debt & Enhancement Backlog
**Author:** Project review pass
**Date:** 2026-05-18
**Status:** Drafted from end-to-end review of `core/` after LIMS Master Plan close-out

---

## 0. Scope of this document

This is a follow-on to `LIMS_MASTER_PLAN.md`. All LIMS feature tickets (G-1 through LIMS-8) are closed; ALC-1 is partially closed. The product-wide tech-debt and reusability items found during the review live here so they can be picked up as standalone tickets without polluting the LIMS plan.

Each ticket follows the LIMS-plan format: priority, effort, risk, problem, work breakdown, and acceptance criteria. Effort estimates assume one engineer.

### How items are grouped

| Group | Tickets | Theme |
|---|---|---|
| Compliance & Audit | TD-1, TD-2 | ALCOA++ enforcement infrastructure |
| Testing | TD-3 | Backend integration coverage on transactional paths |
| Security & Identity | TD-4, TD-5 | Refresh-token revocation, login throttle, MFA gate, API versioning |
| Reliability & Operations | TD-6, TD-7, TD-8 | Background jobs, notifications, observability |
| Data & Storage | TD-9, TD-10 | File storage migration, retention/archive |
| Frontend Reusability | TD-11, TD-12, TD-13, TD-14 | API client generation, primitives, mega-page splits, hook patterns |
| Backend Code Quality | TD-15, TD-16 | Exception handler cleanup, lint/format gates |
| Documentation & DX | TD-17, TD-18 | Docs consolidation, CI for Linux build |
| Accessibility & i18n | TD-19 | A11y + future i18n |

---

## 1. Evidence collected during review

These numbers anchor the tickets so estimates are not guesses.

| Metric | Value | Source |
|---|---|---|
| Backend source files | 604 | `find core/src/main/java -name "*.java"` |
| `ServiceImpl` files | 43 | `find core/src/main/java -name "*ServiceImpl.java"` |
| `auditEventService.record(...)` call sites | 99 across 20 files | `grep -r auditEventService.record` |
| Backend test files | 30 | `find core/src/test/java -name "*.java"` |
| Backend integration tests on new LIMS modules | 4 (equipment, env-monitoring, reagent, logbook) | manual scan |
| Flyway migrations | 101 (V1–V103, plus mixed) | `ls db/migration` |
| `lib/api.ts` line count | 2520 | `wc -l` |
| Fetch calls in `lib/api.ts` | 280 | `grep -c requestJson\|requestMutation` |
| React page files | 45 under `features/` | `find features -name "*Page.tsx"` |
| Pages > 1,000 lines | 5 (`MasterDataPage` 3804, `SamplingPage` 2813, `SpecMoaPage` 2275, `WarehousePage` 2076, `GrnPage` 1973) | `wc -l` |
| Repeated `fieldCls` declaration | 3 LIMS pages (exact string match); more with minor variation | `grep -l 'fieldCls = "w-full rounded-lg'` |
| Repeated status-badge helpers | 9 distinct page-local functions | `grep -rn 'function status'` |
| `@Scheduled` / Quartz usage | 0 | `grep -r @Scheduled` |
| `JavaMailSender` / email infrastructure | 0 (string match only in unrelated entities) | `grep -r JavaMailSender` |
| Rate-limit / throttle code | 0 | `grep -r RateLimit\|Bucket4j` |
| Refresh-token revocation | 0 | `grep -r Revoked\|TokenBlacklist` |
| `/api/v1` versioning prefix | 0 | `grep -r /api/v1` |
| Actuator / health endpoints | 0 configured | `grep -r actuator` |
| Docs files in `core/docs/` | 26 (markdown + docx mixed) | `ls core/docs/` |

Two pleasant surprises during the review:
- `application-prod.yaml` already runs Flyway with `validate-on-migrate: true`, `out-of-order: false`, `baseline-on-migrate: false`. Only the default profile is loose. So the strict-prod story is in place; the migration-history audit (TD-15 follow-on) only needs to confirm none of the existing migrations were applied out-of-order in any environment.
- `AuthorizationIntegrationTest.protectedApiGroupsRejectWrongRoles` already exists and asserts every `SecurityConfig` API group rejects wrong-role callers with HTTP 403, which closes one of the Section-11 ALCOA++ items.

---

## 2. Tickets

---

### TD-1 — Audit Event Coverage Enforcement
**Priority:** P0 | **Effort:** 2 days | **Risk:** broad surface, low individual risk

**Problem:** `auditEventService.record(...)` is called manually in 99 places across only 20 of 43 service files. The other 23 service implementations either don't audit at all or do so inconsistently. Easy to forget on the next status transition; no compile-time guarantee. ALC-3 in the LIMS plan calls this out at the coverage-matrix level — this ticket is the engineering enforcement that makes ALC-3 closeable.

**Backend:**
- Introduce a marker annotation `@Auditable(entityType, actionType, fieldPath)` applied at the service-method or domain-event level.
- Implement a `@Aspect` (Spring AOP) that resolves the annotation, captures method args/result, and calls `AuditEventService.record(...)`. Alternative pattern: emit a Spring `ApplicationEvent` from the service and have a single listener record it.
- Migrate hot domains first: sampling, GRN, deviation, CAPA, stability, em. Keep manual `record()` calls where the audit needs custom old/new value diffs.
- Add a "coverage matrix" test: enumerate every `@Service` method that mutates state and assert each maps to either `@Auditable` or has an explicit manual `record()` call.

**Acceptance criteria:**
- [ ] At least 80% of state-mutating service methods covered by `@Auditable` or matrix-listed manual call.
- [ ] Coverage matrix test fails CI if a new mutating method is added without audit binding.
- [ ] No regression in existing audit trail rows (compare row count before/after on a smoke fixture).

---

### TD-2 — Hard-Delete Sweep (ALC-2 implementation)
**Priority:** P0 | **Effort:** 2 days | **Risk:** workflow behavior may shift for users used to delete-then-recreate flows

**Problem:** Section 11 has `[ ] No hard deletes — is_active = false or status change only`. The LIMS plan calls out two known paths: draft GRN item replacement deletes draft items/documents, and change-control affected-entity removal hard-deletes the row. Need a sweep across every repository and service for `.delete*(...)` calls.

**Backend:**
- Grep every `repository.delete*` and `entityManager.remove` call. Classify each as: (a) safe (draft never persisted), (b) needs soft delete, (c) needs documented exception.
- For each (b): ensure entity has `isActive` column, change service to `setIsActive(false)`, update all queries to filter `findByIsActiveTrue...`.
- Add migration for any entity that lacks `isActive`.
- Update integration tests asserting the "removed" record is still queryable as inactive.

**Acceptance criteria:**
- [ ] Zero `repository.delete*` calls remain except documented exceptions.
- [ ] Every GMP-relevant entity has `is_active` column.
- [ ] Documented exceptions are listed in `core/docs/HARD_DELETE_EXCEPTIONS.md`.

---

### TD-3 — Backend Integration Test Sweep
**Priority:** P0 | **Effort:** 5 days | **Risk:** moderate — uncovered code may surface bugs

**Problem:** 30 test files for 604 source files. Critical transactional paths have no integration coverage: stability OOT computation, CoA issuance sequence under concurrency, sampling disposition + investigation flow, GRN container/label generation, inventory adjustments, vendor qualification flow, warehouse hierarchy CRUD. Most of these are listed in the LIMS plan as deferred.

**Backend:**
- Coverage targets per domain (one or two integration tests each):
  - `transactions/sampling`: record result → disposition → investigation Phase I → Phase II → close
  - `qms/batchrelease`: CoA analyst-sign → manager-issue → concurrent issue race (two threads, expect distinct `COA-YYYY-NNNNN`)
  - `lims/stability`: protocol-month timepoint generation, OOT flag set when delta > 10%, OOT not set when delta ≤ 10%
  - `transactions/sampling` CSV: atomic-rollback when row N is invalid → zero rows persisted
  - `transactions/grn`: draft → submit → containers + label + QR generation
  - `transactions/inventory`: receipt + adjustment + pallet placement
  - `masterdata/vendor`: full vendor qualification cycle
- Use Testcontainers Postgres or `application-test.yaml` H2 (already exists). Prefer Testcontainers for Flyway parity.

**Acceptance criteria:**
- [ ] Each domain above has at least one happy-path and one negative-path integration test.
- [ ] CSV-atomicity test: failed row → assert `qcTestResultRepository.count()` unchanged.
- [ ] CoA concurrency test passes two parallel threads and asserts no duplicate `coa_number`.
- [ ] Coverage delta surfaced in PR via JaCoCo report.

---

### TD-4 — Auth Hardening: Refresh-Token Rotation + Revocation
**Priority:** P0 | **Effort:** 2 days | **Risk:** session disruption if rolled out badly

**Problem:** JWT access tokens last 1h and refresh tokens 7d. There's no rotation on refresh and no revocation list. If a refresh token leaks (XSS, log exposure, dev-tools snapshot), it remains valid for the full 7-day window with no kill switch. For a regulated product holding GMP data this is the easiest finding for an auditor.

**Backend:**
- Add `refresh_token` table: `id`, `user_id`, `token_hash`, `issued_at`, `expires_at`, `rotated_to_id`, `revoked_at`, `revoke_reason`.
- On `/api/auth/refresh`: validate token, mark old row revoked, issue a new refresh token, return both. Reject any refresh attempt with an already-rotated token (replay detection — also revoke the entire chain).
- Add `/api/auth/logout` that revokes the active refresh token; current logout is client-only.
- Add `/api/admin/sessions` for SUPER_ADMIN to view + revoke active sessions.

**Acceptance criteria:**
- [ ] Refresh issues new token and revokes old in same transaction.
- [ ] Replay of revoked refresh returns 401 and revokes the new chain (suspected breach).
- [ ] Logout endpoint actually invalidates the refresh server-side.
- [ ] Admin can list and revoke any user's active sessions.

---

### TD-5 — Auth Hardening: Login Throttle, MFA Gate, API Versioning
**Priority:** P1 | **Effort:** 2 days | **Risk:** low

**Problem:** No failed-login lockout, no rate limit on `/api/auth/login`. TOTP MFA migration (V96) exists but it's unclear if it's enforced at login for QC_MANAGER / SUPER_ADMIN roles. No API versioning prefix means the first breaking change forces a coordinated frontend release. CORS is hardcoded to `localhost:5173`.

**Backend:**
- Add Bucket4j or in-memory token bucket on `/api/auth/login`: 5 attempts per user per 15 min, then HTTP 429. Persist counter in DB so it survives restart.
- Confirm MFA flow on login: if `user.mfaEnabled` and role in {QC_MANAGER, SUPER_ADMIN}, force MFA challenge before issuing tokens. Already partially in `LoginResponse.mfaRequired`.
- Introduce `/api/v1/` prefix via `server.servlet.context-path` or class-level annotation. Keep `/api/` redirect with deprecation header for one release.
- Externalize CORS origins via `application.yaml`: `app.security.cors.allowed-origins`. Document for prod.

**Acceptance criteria:**
- [ ] 6th login attempt within 15 min for same username returns HTTP 429 with `Retry-After`.
- [ ] QC_MANAGER and SUPER_ADMIN cannot complete login without MFA when enabled.
- [ ] Both `/api/...` and `/api/v1/...` resolve; `/api/...` returns `Deprecation: true` header.
- [ ] CORS origins configurable; prod config documented in `application-prod.yaml`.

---

### TD-6 — Background Job Framework
**Priority:** P1 | **Effort:** 1.5 days | **Risk:** low

**Problem:** Stability timepoints due in 14 days, reagent lots expiring in 30, env-monitoring breach lookups, retention-sample disposal due — all surface only when a user opens a page. No `@Scheduled` jobs anywhere in the project. Several plan tickets implicitly assume a job runs daily but nothing does.

**Backend:**
- Add `@EnableScheduling` to a new `JobsConfig`. Use Spring's built-in scheduler (no Quartz yet — too heavy for current scale).
- Implement jobs (each one tagged with `auditEventService.record("SYSTEM_JOB", ...)`):
  - `StabilityDueSoonJob` — daily 06:00 UTC, calls `stabilityService.dueSoon(14)`, emits notification per timepoint.
  - `ReagentExpiryJob` — daily 06:05, calls `reagentService.expiringLots(30)`, emits notification.
  - `ReferenceStandardExpiryJob` — daily 06:10, same pattern.
  - `EmBreachReminderJob` — every 6h, lists open breaches > 24h with no linked deviation, emits escalation.
  - `RetentionDisposalDueJob` — weekly Monday 06:00, calls `retentionSampleService.dueForDisposal()`.
- Add a `/api/admin/jobs` endpoint listing last run + last status of each job.

**Acceptance criteria:**
- [ ] At least 5 scheduled jobs defined and registered.
- [ ] Each job records `JOB_RUN` audit event with row counts.
- [ ] SUPER_ADMIN can view last run / failure of each job via API.
- [ ] Test profile disables scheduling (`@Profile("!test")` on `JobsConfig`).

---

### TD-7 — Notification Channel
**Priority:** P1 | **Effort:** 2 days | **Risk:** moderate (email infra setup)

**Problem:** Once TD-6 jobs fire, they have nowhere to deliver. No `JavaMailSender`, no in-app notification table, no Slack/webhook hook.

**Backend:**
- Add `notification` table: `id`, `user_id`, `topic`, `payload_json`, `read_at`, `created_at`. Service writes a row.
- Add `JavaMailSender` config behind `app.notifications.email.enabled=false` (default) so dev runs offline.
- `NotificationService.send(userId, topic, payload, channels=[INAPP, EMAIL])`.
- `/api/notifications` GET (current user's unread + recent), `/api/notifications/{id}/read` POST.

**Frontend:**
- Bell icon in `AppShell` header. Polls every 60s. Dropdown shows last 20.

**Acceptance criteria:**
- [ ] Stability/reagent/EM jobs deliver notifications via service.
- [ ] User sees unread count in app header within 60s of job run.
- [ ] Email delivery toggleable per environment; never throws if disabled.

---

### TD-8 — Observability Baseline
**Priority:** P1 | **Effort:** 1 day | **Risk:** very low

**Problem:** No Actuator endpoints exposed. No structured logging (default console). No correlation IDs across request → service → audit-event chain. When a future support call says "the CoA failed at 14:32", there's no efficient way to trace it.

**Backend:**
- Add `spring-boot-starter-actuator`. Expose `/actuator/health`, `/actuator/info`, `/actuator/metrics`, `/actuator/prometheus`. Secure to SUPER_ADMIN or behind ops auth.
- Add MDC correlation-ID filter: read `X-Request-Id` header, generate if missing, log it on every line, include in `AuditEvent.contextJson` if not already.
- Switch logging pattern to JSON (Logstash encoder) under `application-prod.yaml`. Keep human-readable in dev.

**Acceptance criteria:**
- [ ] `/actuator/health` returns DB + Flyway status.
- [ ] Every request log line includes a `requestId`.
- [ ] Audit event row includes the same `requestId` as the originating HTTP call.
- [ ] Prometheus endpoint scrapeable.

---

### TD-9 — File Storage Migration to S3-Compatible
**Priority:** P2 | **Effort:** 3 days | **Risk:** moderate (file paths persisted in DB)

**Problem:** All file uploads (GRN docs, vendor docs, spec PDFs, MoA SOPs, CoA reprints) land in `core/storage/` on local disk. Not HA, not encrypted at rest in the app, no object-lock for retention. For a single-tenant demo this is fine; for any real install it's a blocker.

**Backend:**
- Abstract current local-disk writes behind a `FileStorageService` interface (already exists in `storage/` package — verify and extend).
- Add `S3FileStorageService` implementation (AWS SDK or MinIO client).
- Configurable via `app.storage.backend=LOCAL|S3` and `app.storage.s3.bucket=...`.
- Existing DB rows store path-only — keep that as a relative key under the bucket so migration is just a one-time copy script.
- Server-side encryption on by default (AWS-KMS or SSE-S3). Object-lock policy documented in `core/docs/STORAGE_RETENTION.md`.

**Acceptance criteria:**
- [ ] All upload endpoints work against either backend behind a config flag.
- [ ] Test suite passes with both backends (LocalStack for S3 in tests).
- [ ] Object-lock retention period configurable per `documentCategory`.

---

### TD-10 — Data Retention & Archive
**Priority:** P2 | **Effort:** 3 days | **Risk:** schema-impacting

**Problem:** GMP records must be retained 5–30 years depending on jurisdiction. There's no archive policy and no archive table. Soft-deleted rows accumulate in hot tables forever. Audit events for closed batches stay in `audit_event` permanently.

**Backend:**
- Add `retention_policy` table: `entity_type`, `retention_years`, `archive_table_name`.
- For each high-volume table (`audit_event`, `qc_test_result`, `em_result`, `stability_result`): nightly job moves rows older than X years where the parent batch/study is closed/released into `<table>_archive`.
- Archive tables are append-only with object-lock-equivalent: only INSERT, no UPDATE/DELETE, even by SUPER_ADMIN.
- Read paths transparently union live + archive when an investigation needs old data.

**Acceptance criteria:**
- [ ] Retention policy defined per entity type.
- [ ] Archive job runs nightly, moves correct row set.
- [ ] Archive tables reject UPDATE/DELETE at the DB role level.
- [ ] Investigation query (`/api/audit-events?entityId=...`) returns rows from both live and archive transparently.

---

### TD-11 — Frontend API Client Generation (OpenAPI)
**Priority:** P1 | **Effort:** 2 days | **Risk:** low (introduces tooling)

**Problem:** `core/ui/src/lib/api.ts` is 2520 lines with 280 hand-wired fetch calls. Every backend change needs a hand-edit on the frontend; type drift between `DTO.java` and `types/*.ts` is invisible until runtime. Removing this is the single biggest DX win available.

**Backend:**
- Add Springdoc OpenAPI: `springdoc-openapi-starter-webmvc-ui` dependency. Exposes `/v3/api-docs` and `/swagger-ui.html`.
- Annotate controllers with `@Operation`, `@ApiResponse` only where the default reflection isn't enough. Most endpoints document themselves.

**Frontend:**
- Add `openapi-typescript` (codegen) + `openapi-fetch` (runtime) as dev dependency.
- npm script `generate-api` that pulls `/v3/api-docs` from a running backend and writes `core/ui/src/lib/api-generated.ts` and `core/ui/src/types/api.d.ts`.
- Migrate one domain (`lims/reagent`) end to end as a reference. Other domains migrate ticket-by-ticket.
- Keep `lib/api.ts` as a thin facade that re-exports named functions during the migration so pages don't all change at once.

**Acceptance criteria:**
- [ ] `/v3/api-docs` returns valid OpenAPI 3.1 for all controllers.
- [ ] `npm run generate-api` produces compilable TS types.
- [ ] `ReagentInventoryPage` and `ReferenceStandardsPage` build against generated client.
- [ ] PR-time CI fails if backend DTO change breaks frontend types.

---

### TD-12 — UI Primitives Library
**Priority:** P1 | **Effort:** 2 days | **Risk:** very low

**Problem:** Code review found:
- `fieldCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:..."` declared verbatim in 3 LIMS pages and as near-copies in many more.
- 9 distinct `statusBadge` / `statusCls` / `statusBadgeClass` functions that all return Tailwind class strings for the same green/amber/rose semantic.
- Card-with-KPI-grid pattern (`<div className="grid gap-3 md:grid-cols-4">`) repeated in every LIMS page.
- Form layouts repeat `<form onSubmit={handle}><input className={fieldCls} .../></form>`.

CLAUDE.md says "no component library — all UI is hand-rolled with TailwindCSS." That's fine as a choice; the problem is the lack of even local primitives.

**Frontend — `components/primitives/`:**
- `Input`, `Select`, `Textarea`, `Checkbox` — wrap raw HTML with the `fieldCls` styling. Forward refs and props.
- `StatusBadge` — takes `variant: "ok" | "warn" | "danger" | "neutral" | "info"` and `children`. Replaces all 9 page-local helpers.
- `KpiCard` — `{ label, value, accent? }`. Replaces the repeated card divs.
- `EmptyState` — `{ icon?, title, description, action? }`. Replaces "No entries yet" inline rows.
- `PageHeader` — `{ title, description, actions? }`.
- `FormGrid`, `FormRow` — replace ad-hoc `<form className="grid gap-3 md:grid-cols-N">`.
- `Toolbar` — filter-row primitive used by `LogbookPage`, `EnvironmentalMonitoringPage`.

**Migration:**
- Convert `ReagentInventoryPage` and `ReferenceStandardsPage` first (smallest, similar shape).
- Then `LogbookPage`, `EnvironmentalMonitoringPage`, `StabilityPage`.

**Acceptance criteria:**
- [ ] All primitives exist with stories in a `components/primitives/_demo.tsx` reference page.
- [ ] Zero remaining `fieldCls = "w-full rounded-lg..."` declarations.
- [ ] Zero remaining page-local `statusBadge` / `statusCls` helpers.
- [ ] All five LIMS pages use primitives.

---

### TD-13 — Split Mega-Page Files into Domain Subcomponents
**Priority:** P1 | **Effort:** 4 days | **Risk:** moderate (large refactor surface)

**Problem:** Five page files exceed 1,000 lines each, three exceed 2,000:
- `MasterDataPage.tsx` — 3,804 lines
- `SamplingPage.tsx` — 2,813 lines
- `SpecMoaPage.tsx` — 2,275 lines
- `WarehousePage.tsx` — 2,076 lines
- `GrnPage.tsx` — 1,973 lines

These are unreadable in a single file, have collapsed state machines, and are change-magnets — every LIMS plan ticket so far has touched `SamplingPage`. Risk of merge conflicts is real.

**Frontend — recommended split for `SamplingPage`:**
- `sampling/SamplingPage.tsx` — route shell + tab state only
- `sampling/RequestListPanel.tsx` — left column list + filters
- `sampling/RequestDetailPanel.tsx` — middle column with the active request
- `sampling/WorksheetGrid.tsx` — the per-parameter result-entry table (the part LIMS-A modified)
- `sampling/CsvImportDialog.tsx` — the LIMS-B import flow
- `sampling/DispositionPanel.tsx` — pass/fail decision
- `sampling/InvestigationPanel.tsx` — OOS Phase I + II
- Move long inline lambdas to `sampling/hooks/useSamplingMutations.ts`

Apply equivalent splits to the other four mega-pages in subsequent passes.

**Acceptance criteria:**
- [ ] No page file > 600 lines after refactor.
- [ ] No top-level page handles > 3 sibling concerns.
- [ ] Existing integration paths still work (smoke test by clicking through `qc/sampling`).
- [ ] TypeScript build clean.

---

### TD-14 — Standardize on React Query for Data
**Priority:** P2 | **Effort:** 2 days | **Risk:** low

**Problem:** 24 page files use `useQuery` from TanStack Query. Several other pages (StabilityPage, EnvironmentalMonitoringPage, ReagentInventoryPage, ReferenceStandardsPage just shipped) use raw `useState + useEffect + manual reloads`. Pattern is inconsistent; manual reloads miss the stale-while-revalidate, deduping, and cache-invalidation benefits. After a mutation they reload everything when they could just invalidate the affected query keys.

**Frontend:**
- Pick the inconsistent pages and convert each fetch to `useQuery({ queryKey: [...], queryFn: ... })`.
- Convert each mutation to `useMutation` + `queryClient.invalidateQueries({ queryKey })`.
- Define a `lib/queryKeys.ts` registry: `qk.reagents.list()`, `qk.reagents.lots(reagentId)`, etc. Prevents key drift.

**Acceptance criteria:**
- [ ] All `*Page.tsx` files use React Query for reads/writes.
- [ ] No remaining manual `void load()` `useEffect` reload patterns.
- [ ] `queryKeys.ts` is the only place that constructs query keys.

---

### TD-15 — Backend Code Hygiene Pass
**Priority:** P2 | **Effort:** 1 day | **Risk:** very low

**Problem:** Small drift accumulated:
- `GlobalExceptionHandler` has two `resourceNotFoundException` methods — one for `ResourceNotFoundException` (correct name) and one for `BusinessConflictException` (misnamed copy/paste). Rename the second to `handleBusinessConflict`.
- `handleDupliateException` is a typo for `handleDuplicateException`.
- Several controllers import `@RequestMapping` but don't use it at the class level (legacy artifact).
- `bkp/` folder still in the repo root.
- Some service classes mix `XxxService` + `XxxServiceImpl` pattern; one (`ReagentInventoryService`) is shared by two controllers — that's fine but worth documenting.

**Backend:**
- Add Spotless or `editorconfig-checker` to Maven build.
- Add Checkstyle config (light: import-order, unused-imports, naming).
- Fix the 3 named issues above by hand.
- Delete `bkp/` or move under `archive/` outside the build.

**Acceptance criteria:**
- [ ] `./mvnw verify` runs Spotless/Checkstyle and fails on violations.
- [ ] Exception-handler method names match the exception type.
- [ ] No unused imports remain in controllers (verified by Checkstyle).

---

### TD-16 — Frontend Lint/Format Gate
**Priority:** P2 | **Effort:** 0.5 days | **Risk:** very low

**Problem:** No visible ESLint / Prettier enforcement in CI for the frontend. Tailwind class ordering inconsistent. Some files mix `"` and `'` quote styles.

**Frontend:**
- Add `eslint` + `@typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-tailwindcss` if not present, or strict-mode them if they are.
- Add Prettier with project config.
- `npm run lint` + `npm run format:check` wired into pre-push or CI.

**Acceptance criteria:**
- [ ] `npm run lint` passes clean.
- [ ] Prettier formatting consistent across all files.
- [ ] PR fails CI on lint or format violations.

---

### TD-17 — Documentation Consolidation
**Priority:** P3 | **Effort:** 1 day | **Risk:** very low

**Problem:** `core/docs/` has 26 files including overlapping plans:
- `LIMS_MASTER_PLAN.md` (the live one)
- `NEXT_DEVELOPMENT_PLAN_2026-05-11.md`
- `PHASE_6_PLAN_2026-05-11.md`
- `CODEX_IMPLEMENTATION_EXECUTION_PLAN.md`
- `Codex_plan_later.md`
- `IMPLEMENTATION_GAP_ANALYSIS.md`
- `BATCHSPHERE_PROJECT_STATUS_2026-04-30.md`

And `.docx` files alongside `.md` for the same topics. Newcomer can't tell which is canonical. Also `CLAUDE.md` at root still references "55 Flyway migrations" but the count is 101.

**Action:**
- Move superseded plans into `core/docs/archive/` with a clear `README.md` index that says which is the current source of truth per domain.
- Update root `CLAUDE.md`: refresh the migration count, the modules-built-vs-planned table, and add a pointer to this `TECH_DEBT_BACKLOG.md`.
- Decide between `.md` and `.docx` (keep `.md` in repo, `.docx` only if Yamini specifically uses them).
- Create `core/docs/INDEX.md` listing every doc with one-line "what it is" and "still active? yes/no".

**Acceptance criteria:**
- [ ] `core/docs/INDEX.md` exists and lists every doc.
- [ ] Archived plans are under `core/docs/archive/`.
- [ ] `CLAUDE.md` migration count + module table is current as of the date of this ticket close.

---

### TD-18 — CI Build for Linux
**Priority:** P3 | **Effort:** 0.5 days | **Risk:** very low

**Problem:** During this review pass, `npm run build` failed in the Linux sandbox because the macOS-resolved `@rollup/rollup-linux-arm64-gnu` binary wasn't present in `node_modules`. That means Vite builds were never being exercised on Linux — which is where CI and any container deployment would run.

**Action:**
- Add GitHub Actions / GitLab CI workflow that runs `mvn verify` and `npm ci && npm run build && tsc --noEmit` on `ubuntu-latest`.
- On pull-request, run both jobs in parallel.
- Cache Maven and npm.

**Acceptance criteria:**
- [ ] PR runs backend tests + frontend build on Linux.
- [ ] Build badge in `README.md`.
- [ ] Failure on either job blocks merge.

---

### TD-19 — Accessibility Pass
**Priority:** P3 | **Effort:** 2 days | **Risk:** low

**Problem:** Status communicated via color only in multiple places (rose/amber/green badges in EM, stability, reagent, reference-standards pages). WCAG 2.1 1.4.1 fail. Buttons disabled via `opacity-40` without `aria-disabled`. Form labels not consistently associated with inputs. Keyboard navigation through the SamplingPage worksheet not verified.

**Action:**
- Add `axe-core` + `@axe-core/react` in dev mode; surface violations in console.
- Add visible text or icon alongside every color-coded badge (e.g., the `StatusBadge` primitive from TD-12 always renders text).
- Add `aria-label` / `aria-describedby` where appropriate. Pair every form input with a `<label htmlFor>`.
- Run a manual keyboard-only pass through `qc/sampling` and `qms/batch-release`.

**Acceptance criteria:**
- [ ] `axe-core` reports zero serious / critical violations on each route.
- [ ] All status indicators carry text + color.
- [ ] All forms keyboard-navigable.

---

## 3. Prioritization summary

If picking one ticket per fortnight, the recommended order accounts for: regulatory leverage, blast radius if unfixed, and unblocking dependencies.

| Order | Ticket | Reason |
|---|---|---|
| 1 | **TD-1** Audit coverage enforcement | Closes the deepest audit gap; required to mark Section-11 line item as verified. Unblocks ALC-3. |
| 2 | **TD-3** Backend test sweep | Multiplies confidence on every subsequent change. Required before any deploy. |
| 3 | **TD-4** Refresh-token rotation | Cheapest security gap to close; easiest audit-finding to remove. |
| 4 | **TD-2** Hard-delete sweep | Required to close ALCOA+ "Enduring". |
| 5 | **TD-11** OpenAPI client generation | Removes 2000+ lines of frontend code and prevents type drift. Frees engineering time for everything below. |
| 6 | **TD-12** UI primitives | Forced setup for any future UI work. Doing it after TD-11 means less rework. |
| 7 | **TD-6 + TD-7** Jobs + notifications | First user-facing workflow gap once compliance is solid. |
| 8 | **TD-8** Observability | Needed before first real customer pilot. |
| 9 | **TD-5** MFA gate + API versioning + login throttle | Final security pass before any external user. |
| 10 | **TD-13** Mega-page splits | Best done when modules stabilize; doing it before TD-12 wastes effort. |
| 11 | **TD-14** React Query standardize | Naturally falls out of TD-13. |
| 12 | TD-9, TD-10, TD-15, TD-16, TD-17, TD-18, TD-19 | Polish / ops; sequence as capacity allows. |

---

## 4. What this document is not

- Not a replacement for the LIMS Master Plan — LIMS feature tickets continue to live there.
- Not a roadmap for new modules (HRMS expansion, full batch manufacturing) — those belong in `BatchSphere_Full_Roadmap_2026.docx`.
- Not a security audit — TD-4 + TD-5 capture the visible issues, but a proper pen-test should run before production.

---

## 5. Change log

| Date | Author | Change |
|---|---|---|
| 2026-05-18 | Review pass | Initial draft after LIMS Master Plan close-out + ALC-1 logbook delivery |

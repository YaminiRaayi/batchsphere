# BatchSphere — Platform Layer PRD

**Author:** Strategic planning pass  
**Date:** 2026-05-19  
**Status:** Draft backlog for Year 1 platform foundation  
**Source:** `ENTERPRISE_PLATFORM_ROADMAP.md` Section 3

---

## 0. Purpose

This PRD turns the Common Platform Layer roadmap (PL-1 through PL-12) into implementation-ready tickets. This is the foundation that lets BatchSphere grow from a strong LIMS/QMS product into a global, multi-regulator, multi-modality pharma platform.

The platform layer must support:

- Five regulators: FDA, EMA, CDSCO, WHO, NMPA.
- Three modalities: OSD, Sterile, API.
- Seven initial languages: English, Hindi, Telugu, Kannada, Tamil, Mandarin, Spanish.
- Region-aware deployment and data residency.
- Shared audit, e-signature, RBAC, workflow, notifications, document storage, integrations, observability, and CSV validation evidence.

---

## 1. Delivery Strategy

### 1.1 Implementation Waves

| Wave | Focus | Tickets | Why first |
|---|---|---|---|
| Wave 1 | Architecture decisions and guardrails | PL-1.1, PL-2.1, PL-4.1, PL-5.1, PL-12.1 | Prevents rework across every domain |
| Wave 2 | Tenant, region, audit, e-sign foundations | PL-1.2-1.4, PL-2.2-2.4, PL-4.2-4.5 | Required before platform rollout |
| Wave 3 | RBAC, workflow, regulator profiles, modality model | PL-5.*, PL-6.*, PL-7.* | Makes domain behavior configurable |
| Wave 4 | i18n, document storage, notifications | PL-3.*, PL-8.*, PL-9.* | Enables global customer experience |
| Wave 5 | Integration, observability, CSV pack generator | PL-10.*, PL-11.*, PL-12.* | Enables enterprise operations and validation |

### 1.2 Non-Negotiable Architecture Principles

- Tenant isolation is explicit and testable.
- Audit and e-sign are platform services, not copied module code.
- Regulatory behavior is profile-driven, not hardcoded per customer.
- Documents and raw files live in object storage, not ad hoc database blobs.
- Validation evidence is generated continuously from code, API contracts, and tests.
- Platform work must not break current LIMS/QMS demo flows.

### 1.3 Exit Criteria

- New tenant can be provisioned, configured for regulator/profile/language/region, and used without manual DB edits.
- Critical GMP action emits hash-chained audit event and optional e-sign according to profile.
- User permissions are granted through configurable roles and checked by centralized permission logic.
- UI supports translation keys and locale formatting for core shell and platform screens.
- Documents/files are stored with version, retention metadata, checksum, and region-aware storage.
- CI can export a validation pack with URS/FS/DS/OQ evidence and traceability matrix.

---

## 2. Ticket Backlog

## PL-1 — Multi-Tenancy

### PL-1.1 — Tenant Model Decision Record

**Priority:** P0 | **Effort:** 2 days | **Risk:** high  
**Goal:** Choose and document tenant isolation model before schema work starts.

**Work:**
- Compare schema-per-tenant, database-per-tenant, and row-level tenant column models.
- Evaluate Flyway migration complexity, reporting, backup/restore, support operations, and regulator needs.
- Document final decision in `core/docs/ARCHITECTURE.md` or a new ADR.

**Acceptance criteria:**
- [ ] ADR records chosen model, rejected alternatives, and migration impact.
- [ ] Decision covers EU/CN residency constraints.
- [ ] Implementation sequence for existing single-tenant data is defined.

### PL-1.2 — Tenant Entity and Configuration Registry

**Priority:** P0 | **Effort:** 4 days | **Risk:** medium  
**Goal:** Create canonical tenant registry.

**Work:**
- Add `Tenant` entity with code, name, status, primary region, regulatory profiles, modality support, default language, enabled languages.
- Add `TenantConfig` key/value or structured config table for feature/profile flags.
- Seed default tenant for current data.

**Acceptance criteria:**
- [ ] Default tenant exists after migration.
- [ ] Tenant config can store regulator, modality, locale, region, and feature values.
- [ ] Backend can resolve current tenant in service layer.

### PL-1.3 — Tenant Context Propagation

**Priority:** P0 | **Effort:** 5 days | **Risk:** high  
**Goal:** Every request has a tenant context.

**Work:**
- Resolve tenant from subdomain, header, or authenticated user claim.
- Add `TenantContext` holder with request lifecycle cleanup.
- Include tenant ID/code in logs and audit events.
- Add test utilities for tenant-scoped integration tests.

**Acceptance criteria:**
- [ ] Missing tenant fails with clear 400/401 unless system endpoint.
- [ ] Tenant context clears after request.
- [ ] Audit/log output includes tenant code.
- [ ] Integration test proves two tenant contexts do not leak.

### PL-1.4 — Tenant-Aware Data Access Guard

**Priority:** P0 | **Effort:** 8 days | **Risk:** high  
**Goal:** Prevent cross-tenant reads/writes.

**Work:**
- Add tenant column or schema-routing support based on PL-1.1 decision.
- Update shared base entities or repositories to enforce tenant scope.
- Add negative tests for cross-tenant lookup/update.
- Document migration strategy for existing records.

**Acceptance criteria:**
- [ ] Tenant A cannot read Tenant B record by UUID.
- [ ] Tenant A cannot update Tenant B record by UUID.
- [ ] Existing default tenant data remains usable.
- [ ] Admin/system jobs have explicit tenant selection.

## PL-2 — Data Residency and Regional Deployment

### PL-2.1 — Region Model and Residency Policy

**Priority:** P0 | **Effort:** 3 days | **Risk:** high  
**Goal:** Define region registry and tenant residency constraints.

**Work:**
- Add `Region` model: code, display name, jurisdiction, data residency class, allowed storage buckets, allowed DB cluster.
- Define region-pinned tenant policy.
- Document CN/EU constraints.

**Acceptance criteria:**
- [ ] Region registry supports US, EU, IN, CN at minimum.
- [ ] Tenant has exactly one primary data region.
- [ ] Policy states when cross-region replication is forbidden.

### PL-2.2 — Region-Aware Runtime Configuration

**Priority:** P0 | **Effort:** 4 days | **Risk:** medium  
**Goal:** Make app runtime aware of current region.

**Work:**
- Add region config to application properties.
- Expose internal `RegionContext`.
- Include region in audit/export/report metadata.
- Add startup validation that region config exists.

**Acceptance criteria:**
- [ ] App fails fast if region config missing.
- [ ] Reports and audit exports can show region.
- [ ] Tests cover default region behavior.

### PL-2.3 — Region-Pinned Storage Routing

**Priority:** P1 | **Effort:** 5 days | **Risk:** medium  
**Goal:** Ensure object/document storage uses tenant region.

**Work:**
- Add storage bucket resolver by tenant region.
- Reject upload if tenant region has no configured bucket.
- Store region and bucket metadata on document/file records.

**Acceptance criteria:**
- [ ] Tenant file upload stores region and bucket reference.
- [ ] Tenant cannot upload to unapproved region.
- [ ] Region metadata appears in document audit.

### PL-2.4 — Residency Verification Report

**Priority:** P1 | **Effort:** 3 days | **Risk:** low  
**Goal:** Provide inspection/audit evidence for data residency.

**Work:**
- Add internal endpoint/report listing tenant, region, DB/storage locations, replication policy.
- Export CSV/PDF for IT owner.

**Acceptance criteria:**
- [ ] Super admin can export residency report.
- [ ] Report includes tenant, region, storage bucket, replication policy.
- [ ] Wrong role gets HTTP 403.

## PL-3 — Internationalization Framework

### PL-3.1 — Frontend i18n Framework

**Priority:** P0 | **Effort:** 5 days | **Risk:** medium  
**Goal:** Add translation-key framework without breaking current UI.

**Work:**
- Choose React i18n library and configure provider.
- Add key namespace strategy by domain.
- Convert app shell, nav, auth, dashboard, and common states first.
- Add locale persistence per user.

**Acceptance criteria:**
- [ ] User can switch UI language.
- [ ] Missing keys are visible in development.
- [ ] App shell renders from translation keys.
- [ ] Existing routes still build.

### PL-3.2 — Locale Formatting Layer

**Priority:** P0 | **Effort:** 3 days | **Risk:** low  
**Goal:** Centralize date, time, number, and currency formatting.

**Work:**
- Add frontend formatting helpers.
- Add backend locale-aware report helpers.
- Replace platform-shell date/number formatting first.

**Acceptance criteria:**
- [ ] Dates render according to selected locale.
- [ ] Numbers use locale separators.
- [ ] Reports can receive locale parameter.

### PL-3.3 — Translation Catalogs and Pharma Glossary

**Priority:** P1 | **Effort:** 6 days | **Risk:** medium  
**Goal:** Establish controlled translation process.

**Work:**
- Create catalog files for en, hi, te, kn, ta, zh-CN, es.
- Create glossary for GMP, LIMS, QMS, audit, e-sign, CoA, SOP, deviation, CAPA.
- Mark non-reviewed translations as draft.

**Acceptance criteria:**
- [ ] Catalog structure exists for all seven languages.
- [ ] Glossary is versioned in docs.
- [ ] Translation status can distinguish reviewed vs draft.

### PL-3.4 — Tenant and User Language Preferences

**Priority:** P1 | **Effort:** 4 days | **Risk:** medium  
**Goal:** Separate per-tenant document language from per-user UI language.

**Work:**
- Add user language preference.
- Add tenant primary/document languages.
- Apply fallback order: user language -> tenant default -> English.

**Acceptance criteria:**
- [ ] User can store UI language preference.
- [ ] Tenant can define allowed languages.
- [ ] Unsupported user language falls back cleanly.

### PL-3.5 — Localized Reports and Controlled Labels

**Priority:** P2 | **Effort:** 5 days | **Risk:** medium  
**Goal:** Let GMP documents use tenant-approved language.

**Work:**
- Add report label translation API/helper.
- Apply to selected PDFs: CoA, audit trail report, readiness report.
- Include language metadata in generated PDFs.

**Acceptance criteria:**
- [ ] CoA/report labels can render in tenant document language.
- [ ] PDF metadata includes language.
- [ ] Missing regulated translation blocks report unless fallback is allowed by tenant config.

## PL-4 — Audit and E-Signature Platform Layer

### PL-4.1 — Audit Event Canonical Schema

**Priority:** P0 | **Effort:** 4 days | **Risk:** high  
**Goal:** Standardize audit event payload across all domains.

**Work:**
- Define canonical fields: tenant, entity type/id/code, event type, action, actor, role, source, reason, old/new values, correlation ID.
- Map existing audit events to canonical model.
- Add compatibility migration if needed.

**Acceptance criteria:**
- [ ] Existing audit endpoint still works.
- [ ] New audit row includes tenant and correlation ID.
- [ ] Canonical schema documented.

### PL-4.2 — Domain Event Audit Listener

**Priority:** P0 | **Effort:** 6 days | **Risk:** high  
**Goal:** Move toward event-driven audit recording.

**Work:**
- Define `GmpDomainEvent` interface.
- Add listener that writes canonical audit rows.
- Convert 2-3 high-value flows first: QC result entry, CoA issue, EM breach dismiss.

**Acceptance criteria:**
- [ ] Converted flows write audit through listener.
- [ ] Tests prove old/new/reason captured.
- [ ] Existing direct audit calls remain until migrated.

### PL-4.3 — Auditable Annotation and AOP Guard

**Priority:** P1 | **Effort:** 5 days | **Risk:** medium  
**Goal:** Reduce missed audit calls on service methods.

**Work:**
- Add `@AuditableAction` annotation.
- Add interceptor to capture action metadata and correlation ID.
- Use annotation for selected workflow methods.

**Acceptance criteria:**
- [ ] Annotated method creates audit event or domain event.
- [ ] Missing reason on critical action can be rejected.
- [ ] Test covers success and rollback behavior.

### PL-4.4 — Hash-Chained Audit Trail

**Priority:** P0 | **Effort:** 6 days | **Risk:** high  
**Goal:** Make audit rows tamper-evident.

**Work:**
- Add previous hash/current hash fields.
- Hash tenant, entity, timestamp, actor, payload, previous hash.
- Add verifier service.
- Backfill starting chain for existing rows.

**Acceptance criteria:**
- [ ] New rows contain current hash and previous hash.
- [ ] Tampered row fails verification.
- [ ] Verification report shows chain status.

### PL-4.5 — Platform E-Sign Service V2

**Priority:** P0 | **Effort:** 6 days | **Risk:** high  
**Goal:** Centralize e-sign policy and verification.

**Work:**
- Add e-sign policy registry by action/entity/profile.
- Support password verification now, optional MFA hook later.
- Enforce meaning text, signer role, signer independence when configured.
- Link e-sign row to audit event/correlation ID.

**Acceptance criteria:**
- [ ] Critical action checks policy before state change.
- [ ] Wrong password blocks state change.
- [ ] Wrong role blocks state change.
- [ ] E-sign row links to audit/correlation ID.

## PL-5 — Configurable RBAC and Approval Workflow Engine

### PL-5.1 — Permission Registry

**Priority:** P0 | **Effort:** 5 days | **Risk:** high  
**Goal:** Define stable resource/action permission model.

**Work:**
- Create permission registry table or code-seeded registry.
- Map current roles to permissions.
- Add developer docs for naming permissions.

**Acceptance criteria:**
- [ ] Registry covers existing protected API groups.
- [ ] Current roles map to equivalent access.
- [ ] Wrong-role integration tests still pass.

### PL-5.2 — Tenant-Configurable Roles

**Priority:** P0 | **Effort:** 6 days | **Risk:** high  
**Goal:** Allow each tenant to define roles from permission registry.

**Work:**
- Add tenant role and role-permission tables.
- Keep system roles as templates.
- Add backend APIs for role assignment and inspection.

**Acceptance criteria:**
- [ ] Tenant admin can view role permissions.
- [ ] Permission changes affect authorization.
- [ ] Cross-tenant role access blocked.

### PL-5.3 — Central Authorization Service

**Priority:** P0 | **Effort:** 6 days | **Risk:** high  
**Goal:** Consolidate permission checks for API and workflow actions.

**Work:**
- Add `AuthorizationService.can(user, action, resource, context)`.
- Use in selected controllers/services.
- Support condition checks such as owner, department, status, tenant.

**Acceptance criteria:**
- [ ] API checks can use permission service.
- [ ] Service-layer workflow gates can use same service.
- [ ] Tests cover role and condition denial.

### PL-5.4 — Approval Workflow State Machine

**Priority:** P1 | **Effort:** 8 days | **Risk:** high  
**Goal:** Make approval flows configurable per entity type.

**Work:**
- Define workflow definition model: states, transitions, guards, roles, e-sign requirements.
- Implement engine for simple sequential approvals.
- Pilot on controlled document or change control flow.

**Acceptance criteria:**
- [ ] Workflow definition can be read from config/table.
- [ ] Invalid transition returns 409.
- [ ] Transition can require e-sign and role.

### PL-5.5 — Delegated Approval

**Priority:** P2 | **Effort:** 4 days | **Risk:** medium  
**Goal:** Support vacation/absence delegation with audit trail.

**Work:**
- Add delegation records: from user, to user, scope, dates, reason.
- Apply to approval eligibility.
- Audit delegation create/revoke/use.

**Acceptance criteria:**
- [ ] Delegated approver can act within active date/scope.
- [ ] Expired delegation cannot approve.
- [ ] Audit trail shows delegation used.

## PL-6 — Multi-Regulator Configuration Framework

### PL-6.1 — Regulatory Profile Model

**Priority:** P0 | **Effort:** 4 days | **Risk:** medium  
**Goal:** Model applied regulators per tenant.

**Work:**
- Add profiles for FDA, EMA, CDSCO, WHO, NMPA.
- Store profile set on tenant.
- Add service to query active profiles.

**Acceptance criteria:**
- [ ] Tenant can have multiple active regulatory profiles.
- [ ] Profile list is auditable/configurable by super admin.
- [ ] Service returns active profiles in request context.

### PL-6.2 — Profile-Driven Validation Rules

**Priority:** P0 | **Effort:** 6 days | **Risk:** high  
**Goal:** Move regulator-specific behavior into rules.

**Work:**
- Add `RegulatoryRuleService`.
- Implement starter rules: e-sign manifestation, retention period, Chinese audit language requirement flag, batch numbering policy hook.
- Pilot one rule in report/e-sign flow.

**Acceptance criteria:**
- [ ] Rule outcome changes by tenant profile.
- [ ] Tests cover FDA vs NMPA behavior stub.
- [ ] Rule source is visible in error/report metadata.

### PL-6.3 — Retention Policy Registry

**Priority:** P1 | **Effort:** 4 days | **Risk:** medium  
**Goal:** Centralize GMP record retention requirements.

**Work:**
- Define retention policy by entity type, regulator profile, modality.
- Apply to document/object metadata.
- Add report listing retention settings.

**Acceptance criteria:**
- [ ] Entity type has effective retention policy.
- [ ] Document metadata stores retention policy version.
- [ ] IT/QA can export retention policy report.

### PL-6.4 — Regulator Manifestation in Reports

**Priority:** P1 | **Effort:** 4 days | **Risk:** low  
**Goal:** Make generated reports show applicable regulator controls.

**Work:**
- Add report footer/header section for profiles, tenant, region, language.
- Apply to CoA, audit trail report, ALCOA readiness export.

**Acceptance criteria:**
- [ ] PDF includes applicable regulator profile(s).
- [ ] Profile metadata is testable.
- [ ] Missing profile config fails safely for regulated report.

## PL-7 — Multi-Modality Data Model

### PL-7.1 — Product Modality Foundation

**Priority:** P0 | **Effort:** 4 days | **Risk:** medium  
**Goal:** Add modality to product/material context.

**Work:**
- Add modality enum: OSD, STERILE, API.
- Attach modality to product/material master where appropriate.
- Backfill existing data as OSD unless configured otherwise.

**Acceptance criteria:**
- [ ] Existing products/materials have modality.
- [ ] APIs expose modality.
- [ ] UI shows modality badge in relevant masters.

### PL-7.2 — Modality Extension Pattern

**Priority:** P1 | **Effort:** 5 days | **Risk:** high  
**Goal:** Support modality-specific attributes without bloating core tables.

**Work:**
- Define extension table pattern.
- Add starter extension tables for sterile and API attributes.
- Document when to use extension vs core fields.

**Acceptance criteria:**
- [ ] Extension pattern documented.
- [ ] Starter extension table migration exists.
- [ ] Service can load modality-specific attributes.

### PL-7.3 — Process Template Model

**Priority:** P1 | **Effort:** 6 days | **Risk:** medium  
**Goal:** Let process steps differ by modality.

**Work:**
- Add process template and process step model.
- Support IPC parameter definitions by step.
- Keep future link to MBR/eBMR.

**Acceptance criteria:**
- [ ] Template can define steps and IPC params.
- [ ] Template associated with modality/product.
- [ ] API can retrieve process template.

### PL-7.4 — Modality-Aware Validation Hook

**Priority:** P1 | **Effort:** 4 days | **Risk:** medium  
**Goal:** Let services enforce modality-specific requirements.

**Work:**
- Add validation hook interface.
- Pilot rule: sterile product requires configured sterile attributes before release-ready status.
- Add tests for OSD vs Sterile behavior.

**Acceptance criteria:**
- [ ] Validation behavior changes by modality.
- [ ] Error message names missing modality requirement.
- [ ] Existing OSD flow unaffected.

## PL-8 — Notification Channel

### PL-8.1 — Notification Event Model

**Priority:** P0 | **Effort:** 4 days | **Risk:** medium  
**Goal:** Create cross-domain notification event foundation.

**Work:**
- Add notification event entity: topic, severity, tenant, recipient, source entity, status.
- Add API to list and mark read.
- Emit from one pilot flow: overdue training or EM breach.

**Acceptance criteria:**
- [ ] Notification is created from pilot event.
- [ ] User can list own notifications.
- [ ] Mark-read writes audit or notification history.

### PL-8.2 — Channel Preferences

**Priority:** P1 | **Effort:** 4 days | **Risk:** medium  
**Goal:** Allow tenant/user notification routing.

**Work:**
- Add topic/channel preferences: in-app, email, SMS, webhook.
- Add digest vs immediate setting.
- Keep non-in-app senders stubbed if infrastructure absent.

**Acceptance criteria:**
- [ ] Preference can be configured per topic.
- [ ] Disabled channel is not attempted.
- [ ] Digest preference is stored.

### PL-8.3 — Notification Dispatchers

**Priority:** P1 | **Effort:** 5 days | **Risk:** medium  
**Goal:** Add extensible outbound dispatch framework.

**Work:**
- Implement dispatcher interface.
- Add in-app dispatcher fully.
- Add email/webhook stubs with retry and failure status.

**Acceptance criteria:**
- [ ] Failed dispatch records failure reason.
- [ ] Retry count tracked.
- [ ] New dispatcher can be added without changing event creation.

## PL-9 — Object Storage and Document Service

### PL-9.1 — Storage Provider Abstraction

**Priority:** P0 | **Effort:** 5 days | **Risk:** high  
**Goal:** Add S3-compatible storage abstraction.

**Work:**
- Define storage provider interface: put, get signed URL, delete/retire, checksum.
- Add local/dev implementation and S3-compatible implementation hook.
- Store object key, checksum, size, content type.

**Acceptance criteria:**
- [ ] Upload returns object metadata.
- [ ] Download uses signed URL or streamed response.
- [ ] SHA-256 checksum stored.

### PL-9.2 — Document Versioning Service

**Priority:** P0 | **Effort:** 6 days | **Risk:** high  
**Goal:** Standardize controlled document/file versioning.

**Work:**
- Add document/file version model if current model insufficient.
- Support version number, status, watermark flag, retention policy, object reference.
- Pilot for SOP/document file or raw-data attachment.

**Acceptance criteria:**
- [ ] New version does not overwrite old version.
- [ ] Old version remains retrievable according to permissions.
- [ ] Version metadata includes actor/time/checksum.

### PL-9.3 — Object Lock and Retention Metadata

**Priority:** P1 | **Effort:** 4 days | **Risk:** medium  
**Goal:** Preserve GMP records for retention period.

**Work:**
- Store retention-until date and legal hold flag.
- Block deletion/retirement before retention expiry.
- Add admin report for retained objects.

**Acceptance criteria:**
- [ ] Delete/retire before retention date returns 409.
- [ ] Retention date derived from policy.
- [ ] Report lists retained files.

### PL-9.4 — File Access Audit

**Priority:** P1 | **Effort:** 3 days | **Risk:** low  
**Goal:** Audit document/file views and downloads.

**Work:**
- Record file view/download event with actor, entity, version, object key hash.
- Add file access timeline/filter.

**Acceptance criteria:**
- [ ] Download writes audit event.
- [ ] Audit event references document version.
- [ ] Wrong-role download blocked with 403.

## PL-10 — Integration Platform

### PL-10.1 — API Client Registry

**Priority:** P1 | **Effort:** 5 days | **Risk:** medium  
**Goal:** Manage external API clients per tenant.

**Work:**
- Add API client entity with name, scopes, tenant, status, secret hash.
- Add key generation/revocation.
- Audit key lifecycle.

**Acceptance criteria:**
- [ ] Tenant admin can create/revoke API client.
- [ ] Secret stored hashed only.
- [ ] Revoked key cannot call API.

### PL-10.2 — Webhook Subscriber Framework

**Priority:** P1 | **Effort:** 5 days | **Risk:** medium  
**Goal:** Send outbound events to customer systems.

**Work:**
- Add webhook subscription model by event topic.
- Add signing secret.
- Add delivery log with retry status.

**Acceptance criteria:**
- [ ] Event creates webhook delivery record.
- [ ] Payload is signed.
- [ ] Failed delivery retries and records reason.

### PL-10.3 — Connector Framework

**Priority:** P2 | **Effort:** 6 days | **Risk:** medium  
**Goal:** Standardize instrument/ERP connector plugins.

**Work:**
- Define connector interface: configure, test connection, pull, push, health.
- Add registry for connector type and tenant instance.
- Stub connector types: OPC-UA, Empower/Chromeleon/OpenLab, SAP, Argus.

**Acceptance criteria:**
- [ ] Connector instance can be configured/tested.
- [ ] Health result stored.
- [ ] New connector type can be registered.

### PL-10.4 — Integration Audit and Replay

**Priority:** P2 | **Effort:** 4 days | **Risk:** low  
**Goal:** Make integrations inspectable and recoverable.

**Work:**
- Store inbound/outbound integration message metadata.
- Redact sensitive payload fields.
- Add replay/retry for failed outbound messages.

**Acceptance criteria:**
- [ ] Failed message visible with status/reason.
- [ ] Replay writes audit event.
- [ ] Sensitive fields are redacted in logs/UI.

## PL-11 — Observability and Disaster Recovery

### PL-11.1 — Correlation IDs and Structured Logging

**Priority:** P0 | **Effort:** 3 days | **Risk:** low  
**Goal:** Make every request traceable.

**Work:**
- Add correlation ID filter.
- Include tenant, region, user, route, status in structured logs.
- Return correlation ID in response header.

**Acceptance criteria:**
- [ ] Every API response has correlation ID.
- [ ] Logs include tenant and correlation ID.
- [ ] Audit events can store correlation ID.

### PL-11.2 — OpenTelemetry and Metrics Baseline

**Priority:** P1 | **Effort:** 5 days | **Risk:** medium  
**Goal:** Add enterprise observability hooks.

**Work:**
- Add tracing instrumentation.
- Add metrics for HTTP latency, DB health, job health, audit write failures, notification failures.
- Document dashboards.

**Acceptance criteria:**
- [ ] Metrics endpoint exposes platform metrics.
- [ ] Trace includes route and tenant tags where safe.
- [ ] Audit write failure metric exists.

### PL-11.3 — Health and Readiness Probes

**Priority:** P0 | **Effort:** 3 days | **Risk:** low  
**Goal:** Support production deployment checks.

**Work:**
- Add health/readiness checks for DB, Flyway, storage, notification queue, region config.
- Split liveness from readiness.

**Acceptance criteria:**
- [ ] Liveness passes when app thread is alive.
- [ ] Readiness fails if DB/storage unavailable.
- [ ] Probe output avoids secrets.

### PL-11.4 — Backup and Restore Evidence

**Priority:** P1 | **Effort:** 5 days | **Risk:** medium  
**Goal:** Track backup and restore-test evidence.

**Work:**
- Add backup evidence record: tenant/region, size, duration, target, status.
- Add restore-test evidence record.
- Add IT dashboard/API for last backup and last restore test.

**Acceptance criteria:**
- [ ] Backup evidence can be recorded.
- [ ] Last restore test visible by region.
- [ ] Failed restore test is visible and exportable.

## PL-12 — Computer System Validation Pack Generator

### PL-12.1 — Validation Artifact Model

**Priority:** P0 | **Effort:** 4 days | **Risk:** medium  
**Goal:** Model validation artifacts and traceability.

**Work:**
- Add artifact types: URS, FS, DS, IQ, OQ, PQ, RTM, Validation Summary.
- Add artifact version, status, owner, generatedAt, source.
- Link artifact to tickets/features/tests.

**Acceptance criteria:**
- [ ] Artifact registry can list generated validation docs.
- [ ] Artifact has version/status/owner.
- [ ] Artifact can link to test evidence.

### PL-12.2 — OpenAPI-to-FS/DS Generator

**Priority:** P1 | **Effort:** 6 days | **Risk:** medium  
**Goal:** Generate functional/design specs from API contracts and docs.

**Work:**
- Extract OpenAPI or controller endpoint metadata.
- Generate endpoint inventory with roles, request/response, error codes.
- Map endpoints to platform/domain features.

**Acceptance criteria:**
- [ ] Generated FS includes endpoint list.
- [ ] Generated DS includes service/controller references where possible.
- [ ] Missing role metadata is flagged.

### PL-12.3 — CI OQ Evidence Publisher

**Priority:** P0 | **Effort:** 6 days | **Risk:** medium  
**Goal:** Convert test runs into validation evidence.

**Work:**
- Parse backend/frontend test/build output.
- Store OQ run evidence: command, date, commit, pass/fail, test count.
- Export OQ evidence as Markdown/PDF.

**Acceptance criteria:**
- [ ] Test run evidence can be attached to validation pack.
- [ ] Failed run is recorded, not hidden.
- [ ] Evidence includes command and timestamp.

### PL-12.4 — Requirements Traceability Matrix

**Priority:** P0 | **Effort:** 6 days | **Risk:** high  
**Goal:** Link roadmap/PRD tickets to implementation and tests.

**Work:**
- Define RTM row model: requirement ID, description, source doc, implementation file(s), test(s), status.
- Generate initial RTM from `PLATFORM_LAYER_PRD.md` and known evidence.
- Add export.

**Acceptance criteria:**
- [ ] RTM lists PL tickets with status.
- [ ] Each implemented row can reference code/tests.
- [ ] Export is reviewable by QA/IT.

---

## 3. First Implementation Slice

Start with these because they reduce future rework and produce visible enterprise value:

1. `PL-1.1` Tenant Model Decision Record.
2. `PL-4.1` Audit Event Canonical Schema.
3. `PL-12.1` Validation Artifact Model.
4. `PL-11.1` Correlation IDs and Structured Logging.
5. `PL-5.1` Permission Registry.

Parallel demo asset:

- `PHA-15` from `PHARMA_DOMAIN_GAP_ANALYSIS.md`: inspection-ready single-record audit-trail PDF.

---

## 4. Open Decisions

| ID | Decision | Needed before | Recommendation |
|---|---|---|---|
| OD-1 | Tenant isolation model | PL-1.2 | Prefer tenant column first for current codebase, design escape path to schema-per-tenant for regulated enterprise customers |
| OD-2 | Tenant routing signal | PL-1.3 | Use authenticated claim + optional subdomain later |
| OD-3 | Object storage provider | PL-9.1 | Use S3-compatible abstraction with local MinIO/dev option |
| OD-4 | Workflow engine build vs library | PL-5.4 | Start lightweight internal state-machine definition; avoid heavy BPM engine until workflows demand it |
| OD-5 | i18n library | PL-3.1 | Use a mainstream React i18n library with ICU support |
| OD-6 | Audit hash scope | PL-4.4 | Hash per tenant, globally ordered within tenant |

---

## 5. Done Means for Platform Layer

- Platform foundations are tenant-aware, region-aware, regulator-aware, and validated.
- Existing LIMS/QMS routes still pass role/security/build checks.
- Every new critical platform action has audit/e-sign behavior defined.
- CI can produce current validation evidence.
- `SESSION_RESUME.md` and roadmap docs point to this PRD as active backlog.

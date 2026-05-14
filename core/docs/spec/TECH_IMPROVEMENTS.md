# BatchSphere Technical Improvements

**Defined:** 2026-05-14  
**Scope:** Cross-cutting improvements across security, reporting, UX, architecture, performance, and data quality. These are not new pharma modules — they are improvements to existing infrastructure that affect every module.

---

## Priority Stack-Rank

| Priority | Item | Effort | Regulatory / Product Impact |
|---|---|---|---|
| P0 | Data lock after QC disposition | Low | FDA data integrity — immutable records |
| P0 | Frontend session timeout | Low | EU GMP Annex 11 §12 — unattended terminal |
| P1 | PDF export (deviation report, CAPA closure) | Medium | Inspector expects printed GMP records |
| P1 | CSV/Excel export from all list tables | Low | Table-stakes for pharma ERP power users |
| P1 | OpenAPI / Swagger documentation | Low (2 deps) | Integration readiness, partner onboarding |
| P1 | API versioning (`/api/v1/`) | Low | Long-term stability, integration contracts |
| P2 | Supplier scorecard analytics | Medium | VMS demo value, procurement decisions |
| P2 | In-app notification bell (pending approvals) | Low | UX — before Phase 7 alert center |
| P2 | Column sort on all list tables | Low | UX standard — every ERP has it |
| P2 | Password policy engine | Low | Annex 11 §12 — configurable password rules |
| P3 | MFA for login and e-sign | Medium | 21 CFR Part 11 strong authentication |
| P3 | Approval delegation | Medium | Common pharma — acting authority |
| P3 | Bulk operations (train, assign, approve) | Medium | Power user workflows |
| P4 | Inspector view / read-only role | Low | Demo professionalism |
| P4 | S3-compatible file storage | High | Production readiness only |
| P4 | i18n / localization | Very High | Only if going multinational |

---

## 1. Security Improvements

### 1.1 Frontend Session Timeout

**Regulatory basis:** EU GMP Annex 11 §12 — unattended terminal must not remain logged in.

Implementation:
- Add idle timer in `authStore.ts` (Zustand): track last user interaction timestamp.
- After 30 minutes of inactivity: clear auth state, redirect to `/login` with `?reason=timeout`.
- Show modal at 25 minutes: "Your session will expire in 5 minutes. Continue?"
- Store `sessionTimeoutMinutes` in backend config (SUPER_ADMIN configurable).

Files:
- `core/ui/src/stores/authStore.ts` — add idle tracking
- `core/ui/src/components/SessionTimeoutModal.tsx` — new component
- `core/ui/src/shell/AppShell.tsx` — mount timeout listener

### 1.2 Multi-Factor Authentication (TOTP)

**Regulatory basis:** FDA 21 CFR Part 11 §11.200(a)(1) — two distinct identification components for e-signatures on regulated records.

Implementation:
- Backend: add `totpSecret VARCHAR(100)` to `User` entity (V_fix migration).
- Use `java-otp` or `Google Authenticator` TOTP library.
- `POST /api/auth/totp/setup`: generates secret, returns QR code for authenticator app.
- `POST /api/auth/totp/verify`: verifies 6-digit code.
- Login flow: after password auth, if `totpEnabled = true`, require TOTP code before issuing JWT.
- E-sign flow: optionally require TOTP as second factor alongside password.
- SUPER_ADMIN can reset/disable TOTP for a user.

Files:
- `core/src/main/java/com/batchsphere/core/auth/` — new `TotpController`, `TotpService`
- `core/ui/src/features/auth/LoginPage.tsx` — add TOTP step
- `core/ui/src/features/admin/UserManagementPage.tsx` — show TOTP status, reset action

### 1.3 Password Policy Engine

**Regulatory basis:** EU GMP Annex 11 §12 — system owner defines and enforces password policy.

Implementation:
- Add `SystemConfig` entity with key-value pairs (SUPER_ADMIN editable):
  - `PASSWORD_MIN_LENGTH` (default 8)
  - `PASSWORD_REQUIRE_UPPERCASE` (default true)
  - `PASSWORD_REQUIRE_DIGIT` (default true)
  - `PASSWORD_REQUIRE_SPECIAL` (default true)
  - `PASSWORD_EXPIRY_DAYS` (default 90)
  - `PASSWORD_HISTORY_COUNT` (default 5 — no reuse of last 5)
- Add `PasswordHistory` entity: `userId`, `hashedPassword`, `createdAt`.
- Enforce in `AuthController.changePassword()` and initial set.
- Frontend: `/admin/system-config` page for SUPER_ADMIN to view/edit policy settings.

### 1.4 Approval Delegation

**Use case:** QC Manager on leave; needs to delegate CAPA approval authority to a deputy for a defined period.

Implementation:
- Add `ApprovalDelegation` entity: `delegatorId` (employee), `delegateeId` (employee), `scope` (CAPA_APPROVAL / DOCUMENT_APPROVAL / ALL), `validFrom DATE`, `validUntil DATE`, `reason TEXT`, `active BOOLEAN`.
- In approval service: before checking `current actor has QC_MANAGER role`, also check `is there an active delegation to this actor for this scope`.
- Audit all actions taken under delegation with `delegationId` reference.
- Frontend: delegation management page under `/hrms/employees/{id}` — "Active Delegations" tab.

---

## 2. Reporting

### 2.1 PDF Export

**Use case:** Inspectors request printed GMP records. Every pharma ERP exports to PDF.

**Regulatory basis:** FDA 21 CFR Part 11 §11.10(b) — records must be available in human-readable form.

Technology: `OpenPDF` (open-source iText fork) — `com.github.librepdf:openpdf:1.3.x`.

Reports to implement (backend endpoint for each):
- `GET /api/reports/deviation/{id}/pdf` — Deviation Investigation Report
  - Header: deviationNumber, title, severity, status, dates
  - Body: description, root cause, immediate action, impact assessment
  - Footer: e-signature records, audit timeline last 10 events
- `GET /api/reports/capa/{id}/pdf` — CAPA Closure Report
  - Header: capaNumber, linked deviation, owner, dates
  - Body: corrective action, preventive action, effectiveness review outcome
  - Footer: e-signature records, reassignment history
- `GET /api/reports/lot/{lotNumber}/pdf` — Batch Certificate
  - Header: lot number, product, GRN reference, manufacture/expiry dates
  - Body: QC test results summary, disposition
  - Footer: QP certification details, e-sign reference
- `GET /api/reports/apqr/{id}/pdf` — APQR Report
- `GET /api/reports/training/{employeeId}/pdf` — Employee Training Record

Frontend:
- "Export PDF" button on deviation detail, CAPA detail, lot traceability, APQR detail.
- Button calls report endpoint with `Accept: application/pdf` header; browser downloads the file.

### 2.2 CSV / Excel Export

**Use case:** Lab managers, QA managers, procurement users expect to export any table to Excel.

Implementation:
- Add `?format=csv` query parameter support to all major list endpoints.
- Backend: when `Accept: text/csv` or `?format=csv` detected, serialize response as CSV using Apache Commons CSV.
- Endpoints to add CSV support:
  - `GET /api/deviations?format=csv`
  - `GET /api/capas?format=csv`
  - `GET /api/grns?format=csv`
  - `GET /api/inventory?format=csv`
  - `GET /api/sampling?format=csv`
  - `GET /api/retention-samples?format=csv`
  - `GET /api/complaints?format=csv`
  - `GET /api/equipment?format=csv`
- Frontend: "Export CSV" button on every list page toolbar. Calls the endpoint with `format=csv`, triggers file download.

### 2.3 Supplier Scorecard Analytics

**Use case:** QA Manager and Procurement need to compare suppliers by quality performance.

Implementation — backend:
- New endpoint: `GET /api/suppliers/{id}/scorecard?from=&to=`
- Returns `SupplierScorecardResponse`:
  - `totalGrnsReceived`, `grnRejectionCount`, `grnRejectionRate` (%)
  - `oosResultCount` (sampling OOS linked to this supplier's lots)
  - `deviationCount` (deviations with sourceModule=GRN, supplier match)
  - `capaCount` (CAPAs linked to those deviations)
  - `openCapaCount`
  - `auditScores`: list of audit records with scores
  - `qualificationStatus`, `lastAuditDate`, `nextAuditDue`
  - `monthlyGrnTrend`: last 6 months GRN count + rejection count
- New endpoint: `GET /api/suppliers/scorecard-summary` — all suppliers with scorecard totals, sortable.

Frontend — `core/ux-mockups/19-supplier-scorecard.html`:
- `/master-data/partners/scorecard` page.
- Summary table: all suppliers ranked by rejection rate; color-coded performance indicator.
- Individual supplier card: KPIs, 6-month GRN trend bar chart, linked deviations/CAPAs.

---

## 3. UX Improvements

### 3.1 Column Sort on All List Tables

**Implementation:**
- Add `sort` and `direction` query parameters to all paginated list endpoints.
  - Example: `GET /api/deviations?sort=severity&direction=DESC`
- Backend: `JpaRepository` sort via `Pageable` with `Sort.by(direction, field)`.
- Frontend: all `<table>` headers become clickable; cycle through ASC / DESC / none.
- Track active sort column in component state; pass to React Query key for refetch.

### 3.2 In-App Notification Bell

**Trigger:** Pending items that need the current user's attention.

Implementation — backend:
- New endpoint: `GET /api/notifications/pending-count` returns:
  - `pendingCapaApprovals`: CAPAs in `PENDING_APPROVAL` for which current user is QC_MANAGER.
  - `pendingDocumentApprovals`: document revisions in `IN_REVIEW` awaiting current user's approval step.
  - `overdueTrainingCount`: current user's training assignments past due date.
  - `overdueCapaCount`: CAPAs owned by current user that are past due date.
  - `total`: sum of all.

Frontend:
- Bell icon in `AppShell.tsx` header.
- Badge shows `total` count (red dot if > 0).
- Click opens a dropdown: 4 rows of counts with navigation links.
- Query refreshes every 5 minutes via React Query `refetchInterval`.

### 3.3 Bulk Operations

**Operations needed:**

Training bulk assignment:
- Admin can select multiple employees (checkboxes in employee list) → "Assign Training" drawer.
- Single form: training SOP, due date, role requirement key.
- Creates one `TrainingAssignment` per selected employee.

CAPA bulk owner change:
- QC Manager selects multiple CAPAs → "Reassign" drawer.
- Select new owner, enter reason → creates reassignment records for all.

Document bulk distribution:
- Admin selects multiple users in distribution form at once (multi-checkbox instead of comma-text).

Implementation:
- Backend: add `POST /api/training/bulk-assign` accepting `{ employeeIds: [], sopDocumentId, dueDate }`.
- Backend: add `POST /api/capas/bulk-reassign` accepting `{ capaIds: [], newOwner, reason }`.
- Frontend: add `SelectAll` checkbox + selection state to relevant list tables. Floating action bar appears when items are selected.

### 3.4 Inspector / Read-Only View

**Use case:** FDA inspector sits down at the terminal during an inspection. Should be able to browse all records but perform no actions. Risk of accidental edits or approvals during demonstration.

Implementation:
- Add `INSPECTOR` role to `UserRole` enum.
- SUPER_ADMIN can create inspector user accounts.
- Spring Security: `INSPECTOR` role has read-only access — only `GET` endpoints pass; all `POST/PUT/DELETE` return `403`.
- Frontend: when current user role is `INSPECTOR`, hide all action buttons (Create, Edit, Approve, Submit).
- Show read-only badge in header: "Inspector Mode — Read Only".
- Inspector has access to all modules (cross-cutting) — no role-gating restrictions.

### 3.5 Saved Filters / Named Views

**Use case:** QC Manager returns daily to the same filter: "All my open CAPAs overdue this week."

Implementation:
- Add `UserSavedView` entity: `userId`, `module` (path), `viewName`, `filterParams` (JSON).
- `POST /api/saved-views`, `GET /api/saved-views?module=`, `DELETE /api/saved-views/{id}`.
- Frontend: "Save this filter" button on list page toolbars. Saved views appear in a dropdown for quick recall. Stored server-side per user.

---

## 4. Architecture Improvements

### 4.1 OpenAPI / Swagger Documentation

**Priority: P1. Effort: 2 Maven dependencies.**

```xml
<dependency>
  <groupId>org.springdoc</groupId>
  <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
  <version>2.5.0</version>
</dependency>
```

- Accessible at `http://localhost:8080/swagger-ui.html`.
- Add `@Operation`, `@ApiResponse`, `@Parameter` annotations on all controllers.
- Group by module using `@Tag`: GRN, Inventory, Sampling, QMS, HRMS, Documents, LIMS.
- Add server URL configuration for dev/staging/prod environments.
- Export `openapi.json` to `core/docs/api/openapi.json` for partner integration.

### 4.2 API Versioning

**Current state:** All routes at `/api/...`. Breaking changes silently break integrations.

Implementation:
- Add `/v1/` prefix to all routes: `/api/v1/deviations`, `/api/v1/capas`, etc.
- Keep `/api/...` as deprecated aliases with `@Deprecated` marker (optional, for 90-day migration window).
- Spring Security config: update path matchers for `/api/v1/**`.
- Frontend `api.ts`: update all fetch paths to include `/v1/`.
- Swagger: document which endpoints are `v1`.

### 4.3 Health Check and Actuator

**Priority: Needed for any production deployment.**

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  endpoint:
    health:
      show-details: when_authorized
```

- `GET /actuator/health` — returns `{"status": "UP", "components": {"db": "UP"}}`.
- `GET /actuator/info` — returns build version, git commit.
- Secure actuator endpoints: only `SUPER_ADMIN` can access `/actuator/metrics`.

### 4.4 Rate Limiting

**Regulatory basis:** EU GMP Annex 11 §13 — physical and logical access controls.

Implementation using Spring's `RateLimiter` (Resilience4j) or Bucket4j:
- Login endpoint: max 10 attempts per IP per minute. After 10: return `429 Too Many Requests` with `Retry-After` header.
- General API: max 200 requests per user per minute.
- Reporting endpoints (PDF/CSV): max 10 per user per minute (generation is CPU-heavy).

### 4.5 S3-Compatible File Storage (Future)

**Current state:** Local disk `core/storage/` — single point of failure, no replication.

**For production:** Replace `LocalFileStorageService` with `S3StorageService`:
- Backend: `AmazonS3` client (AWS SDK) or MinIO client for self-hosted S3.
- Config: `storage.provider=s3|local`, `storage.s3.bucket`, `storage.s3.endpoint`, `storage.s3.region`.
- Service interface: `FileStorageService` with `save(fileName, inputStream)`, `load(path)`, `delete(path)` — already abstracted enough to swap.
- Frontend: no change — file upload/download via existing API endpoints.

---

## 5. Performance

### 5.1 Database Index Strategy

Add targeted indexes for the most common filter/sort patterns. Create migration `Vxx__add_performance_indexes.sql`:

```sql
-- Deviation filters
CREATE INDEX idx_deviation_status ON qms_deviation(status) WHERE is_active = TRUE;
CREATE INDEX idx_deviation_severity ON qms_deviation(severity) WHERE is_active = TRUE;
CREATE INDEX idx_deviation_source ON qms_deviation(source_module) WHERE is_active = TRUE;

-- CAPA filters
CREATE INDEX idx_capa_status ON qms_capa(status) WHERE is_active = TRUE;
CREATE INDEX idx_capa_due_date ON qms_capa(due_date) WHERE is_active = TRUE;
CREATE INDEX idx_capa_owner ON qms_capa(owner) WHERE is_active = TRUE;

-- Inventory filters
CREATE INDEX idx_inventory_expiry ON inventory(expiry_date) WHERE is_active = TRUE;
CREATE INDEX idx_inventory_status ON inventory(status) WHERE is_active = TRUE;

-- Audit events (heavy read by entityType+entityId)
CREATE INDEX idx_audit_entity ON audit_event(entity_type, entity_id);

-- E-signatures
CREATE INDEX idx_esign_entity ON e_signature_record(entity_type, entity_id);

-- Retention samples expiry lookup
CREATE INDEX idx_retention_until ON retention_sample(retention_until) WHERE status = 'STORED';
```

### 5.2 N+1 Query Prevention

**Risk areas:**
- `GrnController.getGrns()` → loads `GrnItem` → then each item lazy-loads `GrnContainer` → O(n²) queries.
- `CapaBoardPage` → loads CAPAs → each CAPA lazy-loads attachments → O(n) extra queries.
- `SamplingPage` → sampling requests → each loads samples → each loads test results.

**Fix pattern:**
- Use `@EntityGraph` on `JpaRepository` query methods for list endpoints.
- Or use `JOIN FETCH` in JPQL for complex joins.
- Add `@QueryHints(value = @QueryHint(name = HINT_FETCHGRAPH, value = "..."))` for controlled eager loading on list queries only.
- Add `@Transactional(readOnly = true)` on all read-only service methods.

---

## 6. Data Quality

### 6.1 Duplicate Detection

**Problem:** Creating the same material code twice, same GRN number twice, same deviation for the same GRN.

Implementation:
- Material: `UNIQUE` constraint on `materialCode` (already exists). Frontend: show "Material code already exists" inline validation on create form.
- GRN: `UNIQUE` constraint on `grnNumber`. GRN create form: check uniqueness on blur.
- Deviation: before auto-creating deviation from GRN rejection, check if a deviation with `sourceEntityId = grnId` already exists → skip if found.
- Employee: `UNIQUE` constraint on `employeeCode`.

### 6.2 Configurable Data Validation Rules

**For future:** A validation rules engine where QA can configure acceptable ranges per material/test parameter. Currently spec parameters have `minValue/maxValue` but these are stored in Spec entities and only compared at QC result entry.

Phase 8 enhancement: Allow QA to configure `validationRule` per `SpecParameter`:
- `NUMERIC_RANGE`: value must be between min and max.
- `TEXT_MATCH_REGEX`: result must match a pattern.
- `PASSES_IDENTITY`: result must confirm identity test pass.

---

## 7. Accessibility

### 7.1 WCAG 2.1 Level AA Compliance

**Requirements:**
- Color contrast: all text must pass 4.5:1 contrast ratio. Current blue-900 sidebar + blue-200 text: check passes. Status pill backgrounds: verify amber/green text contrast.
- Keyboard navigation: all interactive elements reachable by Tab, operable by Enter/Space.
- Screen reader: all form inputs have `<label>` or `aria-label`. Tables have `scope="col"` on headers.
- Focus visible: `:focus-visible` ring on all focusable elements.
- Modal focus trap: dialogs (e-sign, create form) must trap focus inside.

Implementation:
- Audit `ESignatureDialog.tsx`, `AuditTimeline.tsx`, all form drawers.
- Add `aria-label` to icon-only buttons (e.g., close buttons using × symbol).
- Add `role="dialog"` and `aria-modal="true"` to modal overlays.
- Add skip-link: `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to content</a>`.

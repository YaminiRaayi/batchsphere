# BatchSphere Project Status — Complete Review

**Prepared:** 2026-04-30  
**Scope:** Full codebase review across backend (Java/Spring Boot), frontend (React/TypeScript), database migrations (V1–V53), and existing documentation.

---

## 1. Project Summary

BatchSphere is a pharma ERP platform for managing incoming raw materials through: GRN receipt → warehouse quarantine → QC sampling → testing → disposition → release. The current build focuses on the stock-control backbone (WMS + Sampling + QC), with a broader product vision that also includes LIMS, QMS/CAPA, HRMS, document management, and a procurement/vendor management system.

---

## 2. What Is Completed

### 2.1 Authentication and Authorization

| Feature | Status | Notes |
|---|---|---|
| JWT-based login / refresh / logout | Done | `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout` |
| Bootstrap admin on startup | Done | `AuthDataInitializer.java` |
| QC seed users on startup | Done | `qc.analyst`, `qc.manager` seeded in dev |
| User management CRUD | Done | Admin-only via `/api/auth/users/**` |
| Role-based route security | Done | `SecurityConfig.java` with per-route role enforcement |
| JWT filter | Done | `JwtAuthenticationFilter.java` |
| Password hashing | Done | BCrypt |

**Roles defined:** `SUPER_ADMIN`, `WAREHOUSE_OP`, `QC_ANALYST`, `QC_MANAGER`, `PROCUREMENT`

---

### 2.2 Master Data — Material

| Feature | Status |
|---|---|
| Material CRUD (create/read/update) | Done |
| Material type (CRITICAL, NON_CRITICAL, FINISHED_GOODS, IN_PROCESS) | Done |
| Auto-generated material code by type | Done |
| Storage condition | Done |
| Sampling required flag | Done |
| Vendor CoA release allowed flag | Done |
| Spec linkage (specId on material) | Done |
| Material-to-Spec via `MaterialSpecLink` table | Done (V42) |

---

### 2.3 Master Data — Warehouse Hierarchy

| Feature | Status |
|---|---|
| BusinessUnit → Warehouse → Room → Rack → Shelf → Pallet | Done |
| Room-level storage condition | Done |
| Room capacity fields | Done (V27) |
| Pallet reference linked to GRN items | Done |
| Soft delete on location entities | Done (V25) |
| Uniqueness scoped to parent | Done (V23) |
| Storage condition validation at GRN receive | Done |

---

### 2.4 Master Data — Specification (Spec) and Method of Analysis (MOA)

| Feature | Status |
|---|---|
| Spec CRUD API (`/api/specs`) | Done |
| Spec lifecycle (DRAFT → UNDER_REVIEW → APPROVED → OBSOLETE) | Done (V41) |
| Spec type (MATERIAL, IN_PROCESS, FINISHED_PRODUCT, PACKAGING) | Done |
| Target market enum (EU, US_FDA, INDIA_CDSCO, etc.) | Done (entity + DB) |
| Compendial reference enum (PH_EUR, USP, BP, IP, etc.) | Done |
| SpecParameter table | Done (V42) |
| SpecParameter fields: test type, criteria type, limits, unit, MOA link | Done |
| MaterialSpecLink table | Done (V42) |
| Spec revision chain (previousSpecId) | Done (V43) |
| Spec approval metadata (approvedBy, approvedAt, reviewRoute) | Done |
| MOA CRUD API (`/api/moas`) | Done |
| MOA type enum (HPLC, GC, UV_VIS, IR, etc.) | Done |
| MOA validation status (NOT_VALIDATED → VALIDATED_COMPENDIAL) | Done |
| MOA status lifecycle (DRAFT → APPROVED → OBSOLETE) | Done (V41) |
| MOA sample solution stability fields | Done |
| Sampling Tool CRUD | Done |

---

### 2.5 Master Data — Vendor Management System (VMS)

| Feature | Status |
|---|---|
| Vendor CRUD (`/api/vendors`) | Done |
| Vendor category (API_SUPPLIER, EXCIPIENT_SUPPLIER, etc.) | Done (V29) |
| Vendor approval flag | Done |
| Vendor audit/performance fields (lastAuditDate, qaRating, etc.) | Done (V31) |
| Vendor corporate documents (upload/list/delete/download) | Done (V36) |
| VendorBusinessUnit (VBU) CRUD | Done (V30, V32) |
| VBU site qualification, audit fields | Done |
| VBU document management | Done |
| VBU audit create/update/list | Done |
| Audit-driven VBU qualification updates | Done |
| Live GRN lookup per vendor | Done |

---

### 2.6 Supplier

| Feature | Status |
|---|---|
| Supplier CRUD (`/api/suppliers`) | Done (basic) |

---

### 2.7 Batch

| Feature | Status |
|---|---|
| Batch CRUD (`/api/batches`) | Done |
| Batch status lifecycle | Done |
| Batch type | Done |

---

### 2.8 GRN (Goods Receipt Note)

| Feature | Status |
|---|---|
| GRN create (draft) | Done |
| GRN update | Done |
| GRN receive (with full downstream triggers) | Done |
| Container generation per GRN item | Done |
| In-house material label generation | Done |
| GRN documents (upload/download/delete) | Done |
| Storage condition validation against selected pallet's room | Done |
| Sampling request auto-creation on receive | Done |
| Inventory creation on receive | Done |
| GRN list with filtering | Done |
| QC status at GRN item level | Done |

---

### 2.9 Inventory

| Feature | Status |
|---|---|
| Inventory status model (QUARANTINE/SAMPLING/UNDER_TEST/RELEASED/REJECTED/BLOCKED) | Done |
| Inventory creation from GRN receive | Done |
| Inventory transactions (audited history) | Done |
| Inventory transfer between pallets | Done |
| Inventory summary view | Done |
| Inventory status update request DTO | Done |
| Inventory grouped by materialId + batchId + palletId | Done |

---

### 2.10 Sampling and QC — Full Workflow

This is the most complete module. All phases through investigation and resample are implemented.

| Feature | Status |
|---|---|
| Sampling request auto-created from GRN | Done |
| Sampling plan create/update | Done |
| Sampling start (moves inventory QUARANTINE → SAMPLING) | Done |
| Sampling complete | Done |
| Sample handoff to QC (moves inventory SAMPLING → UNDER_TEST) | Done |
| QC receipt | Done |
| QC review start | Done |
| QC worksheet generation (test rows from SpecParameters) | Done (V44) |
| QC test result entry per parameter | Done |
| Automatic OOS/OOT flag from test results | Done |
| QC decision (APPROVED/REJECTED → RELEASED/REJECTED inventory) | Done |
| QC decision blocked while investigation is open | Done |
| Investigation open (BLOCKED inventory) | Done |
| Investigation Phase I / Phase II escalation | Done (V49) |
| Investigation QA review gate before closure | Done (V50) |
| Investigation closure categories | Done (V53) |
| Investigation outcomes: RESUME_REVIEW, RETEST, RESAMPLE, REJECTED | Done |
| QA review metadata (qaReviewRemarks, qaReviewedBy, qaReviewedAt) | Done |
| Retained sample fields (retainedFlag, quantity, retainedUntil) | Done (V45) |
| Retained sample lifecycle (consumed, destroyed, retention expired) | Done (V48) |
| Retained sample auto-consumed on retest start | Done |
| Retained sample destroy API | Done |
| Retest flow (worksheet rows reset, analyst reassignment) | Done |
| Resample as child sampling cycle | Done |
| Resample lineage (parentSamplingRequestId, rootId, cycleNumber) | Done (V47) |
| Cycle history API | Done |
| Duplicate child-cycle prevention | Done |
| Container-level sample tracing (SampleContainerLink) | Done (V38) |
| Sample as first-class entity | Done |
| QcDisposition as separate entity | Done (V39) |
| Historical data backfill (V40) | Done |

---

### 2.11 Frontend (UI)

| Screen / Feature | Status |
|---|---|
| Login page | Done |
| Access denied page | Done |
| Protected routes | Done |
| Dashboard page | Done (structure; KPI data needs wiring) |
| GRN page (create/list/receive/containers) | Done |
| Inventory page | Done |
| Warehouse page (hierarchy, map, occupancy) | Done |
| Sampling page (full workflow incl. investigation, resample, retest) | Done |
| Vendors page (CRUD, documents, audits) | Done |
| Vendor Business Units page | Done |
| Suppliers page | Done |
| Materials page (list + create) | Done |
| Specs page + Spec-MOA combined page | Done |
| MOA page | Done |
| Sampling Tools page | Done |
| App shell (sidebar, navigation) | Done |
| Auth store (Zustand) | Done |
| Type definitions for all modules | Done |

---

### 2.12 Integration Tests

| Test File | Coverage |
|---|---|
| `AuthControllerIntegrationTest` | Login, logout, refresh, me endpoint |
| `AuthorizationIntegrationTest` | Role-based access enforcement |
| `UserManagementIntegrationTest` | Admin user CRUD |
| `WarehouseLocationServiceIntegrationTest` | Warehouse hierarchy |
| `GrnControllerIntegrationTest` | GRN create, receive, containers |
| `InventoryControllerIntegrationTest` | Inventory queries and status |
| `SamplingControllerIntegrationTest` | Full sampling API lifecycle |
| `SamplingServiceIntegrationTest` | Service-level sampling flow + exception paths |

---

### 2.13 Database Migrations

53 Flyway migrations applied (V1–V53) covering the full schema history from initial material table through QC investigation compliance fields.

---

## 3. Gaps — What Is Not Implemented

### 3.1 Critical Gaps (break existing workflows or create data integrity risk)

#### GAP-01: Material Master — Persistence Mismatch
- **Problem:** Fields shown in the `Create Material` UI are NOT persisted to the database.
- **Confirmed missing:** `hsnCode`, `casNumber`, `pharmacopoeialRef`
- **To verify:** `materialCategory`, `genericNames`, `maxHumidity`, `lightSensitivity`, `shelfLifeMonths`, `retestPeriodMonths`, `reorderLevel`, `leadTimeDays`, `controlledSubstance`
- **Impact:** Users enter data that silently disappears after save. Creates false confidence in UAT.
- **Fix:** Add DB columns, update entity + DTO + service mapping.
- **Reference:** `MATERIAL_MASTERDATA_GAPS_2026-04-28.md`

#### GAP-02: Sampling Quantity Field UX (COMPOSITE type)
- **Problem:** For `COMPOSITE` sample type, the editable field is `individualSampleQuantity` (per-container). Users interpret it as the total composite quantity.
- **Observed in UAT:** 10 containers × 0.5 per container = total 5.0 stored, but user intended 0.5 total.
- **Impact:** Valid but unintended sampling plans are created. Data appears correct but is semantically wrong.
- **Fix (UI):** Relabel field to "Quantity Per Container", show formula (`containers × per-container qty = composite`), make `compositeSampleQuantity` read-only.
- **Fix (backend):** Optionally add a sanity check for unusually large composite totals.
- **Reference:** `QC_SAMPLING_GAP_ANALYSIS.md`

#### GAP-03: No Outbound Inventory Flow
- **Problem:** Inventory can reach `RELEASED` status but there is no mechanism to issue/consume/dispatch it.
- **Impact:** Released stock accumulates with no downstream lifecycle. Cannot model material consumption, production orders, or dispensing.
- **Required:** Stock issue transaction, issue reason codes, issue-to reference (production batch, dispensing record), quantity deduction, and inventory transaction record.

#### GAP-04: No Stock Adjustment API (Functional)
- **Problem:** `InventoryAdjustmentRequest.java` DTO exists but no endpoint or service logic is confirmed for adjustment.
- **Impact:** Discrepancies between physical count and system stock cannot be corrected.
- **Required:** Adjustment endpoint with reason code, approved-by, before/after quantities, and mandatory inventory transaction record.

---

### 3.2 Security Gaps

#### GAP-05: No Seed Users for WAREHOUSE_OP and PROCUREMENT Roles
- **Problem:** Only `admin` (SUPER_ADMIN), `qc.analyst`, and `qc.manager` are seeded. `WAREHOUSE_OP` and `PROCUREMENT` roles have no dev/test users.
- **Impact:** End-to-end testing of warehouse operations and vendor management requires using SUPER_ADMIN, which bypasses role boundary verification.
- **Fix:** Add seed users `warehouse.op` and `procurement.user` in `application.yaml` seed-users config.

#### GAP-06: No User Management Frontend
- **Problem:** User management APIs (`GET/POST/PUT/DELETE /api/auth/users`) are backend-complete but there is no admin UI.
- **Impact:** Admins cannot provision new users without direct API calls (e.g. Postman).
- **Fix:** Build a simple user management page (SUPER_ADMIN only), accessible from the app shell settings or admin section.

#### GAP-07: No Procurement Role Access to Material/Spec Read
- **Problem:** `PROCUREMENT` role can access vendor APIs but cannot read materials or specs — both needed for procurement context.
- **Impact:** A procurement user cannot look up what material they are purchasing against.
- **Fix:** Extend `SecurityConfig` to allow `PROCUREMENT` read access to `/api/materials/**` and `/api/specs/**`.

---

### 3.3 WMS Enhancement Gaps

#### GAP-08: No FEFO Allocation Logic
- **Problem:** Expiry dates are captured on GRN items and containers, but there is no first-expiry-first-out selection logic for putaway or issue.
- **Impact:** Released stock may be consumed out of expiry order, which is a GMP compliance risk.

#### GAP-09: No Putaway Suggestion Engine
- **Problem:** There is no system recommendation for where to place incoming stock based on material type, storage condition, or quarantine zone rules.
- **Impact:** Warehouse operators rely entirely on manual knowledge of location rules.

#### GAP-10: No Capacity Enforcement
- **Problem:** Room capacity fields are present (V27) but no enforcement logic validates whether a pallet, shelf, rack, or room is at capacity before placing stock.
- **Impact:** Locations can be over-filled without system warning.

#### GAP-11: No Environmental Monitoring
- **Problem:** No temperature/humidity logging, excursion alerts, or room qualification records.
- **Impact:** A GMP-compliant cold-chain or controlled-environment requirement cannot be met.

#### GAP-12: No Movement History UI
- **Problem:** `InventoryTransaction` records warehouse-linked stock movements in the DB, but no dedicated warehouse movement history view exists in the UI.
- **Impact:** Warehouse supervisors cannot audit stock movement without database access.

#### GAP-13: No Status-Based Movement Restrictions
- **Problem:** The system does not prevent moving quarantined stock to a released zone, or issuing rejected stock, at the warehouse operation level.
- **Impact:** Physical movement controls depend entirely on manual discipline, not system enforcement.

---

### 3.4 QC and Sampling Remaining Gaps

#### GAP-14: No E-Sign / Electronic Signature for Critical Actions
- **Problem:** QC decisions, QA review approvals, and investigation closures are recorded with a username string but no electronic signature or dual-confirmation mechanism.
- **Impact:** For 21 CFR Part 11 or EU Annex 11 compliance, critical quality decisions require a stronger audit trail than a username field.
- **Fix:** Add confirmation flow (password re-entry or PIN challenge) for QC decision and QA review completion endpoints.

#### GAP-15: No Dedicated Audit Trail Timeline UI
- **Problem:** Status transitions and key events are recorded in inventory transactions and entity timestamps, but there is no user-facing audit timeline or event log view per batch or per sampling request.
- **Impact:** QA personnel cannot trace the full event history of a batch through a single screen.

#### GAP-16: Investigation Model Is Not Full Pharma Compliance Depth
- **Problem:** The current investigation model is a practical structured version. Missing items:
  - Formal OOS/OOT phase summary reports
  - Richer closure taxonomy
  - CAPA linkage
  - Reviewer/checker separation beyond the current QA gate
- **Impact:** Fine for current scope, but will require expansion before regulatory inspection readiness.

#### GAP-17: Sampling Workflow Not Linked to SpecParameter-Driven Quantity Rules
- **Problem:** Sampling method (HUNDRED_PERCENT, SQRT_N_PLUS_1, etc.) comes from the Spec, but the number of containers to sample is still manually entered in the plan. The system does not auto-compute required container count from the method + total container count.
- **Impact:** Analyst can enter fewer containers than required without system warning.

---

### 3.5 Spec / MOA Gaps

#### GAP-18: No Spec Review Queue in UI
- **Problem:** Backend supports submit-for-review and approve/reject lifecycle, but the UI has no dedicated "Review Queue" view where QC Manager sees all pending specs awaiting review.
- **Impact:** QC Manager has no workflow inbox.

#### GAP-19: No MOA Linked-Specs Impact View
- **Problem:** No `GET /api/moas/{id}/linked-specs` endpoint or UI. If a MOA is being retired, there is no way to see which specs are affected.
- **Impact:** A MOA can be obsoleted without knowing its downstream impact.

#### GAP-20: Spec targetMarket Logic Not Fully Wired
- **Problem:** `targetMarket` field exists on Spec entity (V41), but there is no business logic that uses it to validate sampling method defaults, flag regulatory mismatches, or drive region-specific acceptance criteria.
- **Impact:** The field is stored but not operational.

---

### 3.6 Vendor/Supplier Gaps

#### GAP-21: Supplier Module Is Very Thin
- **Problem:** Supplier has basic CRUD only. No supplier-to-vendor linkage, no supplier qualification tracking, and no GRN association logic.
- **Impact:** Supplier as a concept is present but not operationally useful. GRNs are linked to vendors (not suppliers), which may be architecturally intentional but the supplier entity has no active role in any workflow.

#### GAP-22: VendorDocument Naming Inconsistency
- **Problem:** `VendorDocument.java` entity exists under vendor, and `VendorCorporateDocumentRepository.java` also exists — naming is inconsistent.
- **Impact:** Code confusion when extending vendor document features.

---

### 3.7 Test Coverage Gaps

#### GAP-23: No Tests for Material, Spec, MOA, Vendor, Supplier Modules
- **Problem:** Integration tests exist only for Auth, Warehouse, GRN, Inventory, and Sampling. Material CRUD, Spec lifecycle, MOA lifecycle, Vendor workflows, and Supplier CRUD have zero test coverage.
- **Impact:** Changes to these modules have no safety net. UAT is the only validation layer.

#### GAP-24: No Exception Path Tests for Many Scenarios
- **Problem:** Tests primarily cover the happy path. Negative cases (invalid state transitions, missing required fields, unauthorized access to specific actions) are tested minimally.
- **Impact:** Regression risk for edge cases.

---

### 3.8 Technical / Infrastructure Gaps

#### GAP-25: No API Documentation (Swagger/OpenAPI)
- **Problem:** Only a Postman collection exists for API reference. No Swagger UI or OpenAPI spec generated from the code.
- **Impact:** New developers and testers must reverse-engineer endpoints from code or Postman.

#### GAP-26: Local Filesystem for Document Storage (Not Production-Ready)
- **Problem:** Vendor documents and GRN documents are stored on the local filesystem (`MultipartFile` → disk path).
- **Impact:** Does not scale. Cannot be used in multi-instance deployments. Will fail in containerized cloud environments.
- **Fix:** Abstract the storage layer behind an interface and add an S3/GCS implementation.

#### GAP-27: No Pagination on All List Endpoints
- **Problem:** Some list endpoints may return unbounded results. GRN list has pagination; not all modules are verified.
- **Impact:** Performance risk on large datasets.

#### GAP-28: No API Rate Limiting or Throttling
- **Problem:** No rate limiting on authentication or general API endpoints.
- **Impact:** Brute-force attack surface on the login endpoint.

#### GAP-29: No API Versioning Strategy
- **Problem:** All APIs at `/api/*` with no version prefix.
- **Impact:** Future breaking changes will require all clients to update simultaneously.

#### GAP-30: Dashboard KPIs Are Not Wired
- **Problem:** `DashboardPage.tsx` exists but live KPI data (stock counts, pending sampling requests, overdue audits, etc.) is not pulled from backend APIs.
- **Impact:** Dashboard shows structure without operational data.

---

## 4. Modules Not Yet Started

These are in the product UX mockups but have no backend or frontend implementation:

| Module | UX Mockup | Priority |
|---|---|---|
| HRMS | `06-hrms.html` | Low (later phase) |
| LIMS (Lab testing workflow) | `08-lims.html` | High (needed for QC test execution depth) |
| QMS / CAPA | `03-qms.html` | Medium |
| Centralized Document Management | `05-documents.html` | Medium |
| Recall Locator | WMS Checklist | High (audit readiness) |
| Cycle Count / Physical Verification | WMS Checklist | Medium |
| Environmental Monitoring | WMS Checklist | Medium |
| User Management UI | AUTH_USAGE.md | High (operational need) |

---

## 5. What Can Be Improved (Without Adding New Scope)

### 5.1 Immediate Improvements (Low Effort, High Value)

| Item | Effort | Impact |
|---|---|---|
| Add `WAREHOUSE_OP` and `PROCUREMENT` seed users | 30 min | Enables role-based testing without SUPER_ADMIN |
| Fix Material master persistence gap (hsnCode, casNumber, pharmacopoeialRef) | 1 day | Eliminates silent data loss |
| Fix Sampling COMPOSITE quantity UX (field label + formula hint) | 0.5 day | Eliminates UAT misunderstanding |
| Add Swagger/OpenAPI dependency and annotations | 1 day | Self-documenting API |
| Wire Dashboard KPI data from real APIs | 1–2 days | Makes dashboard operational |
| Add PROCUREMENT role read access to materials/specs | 30 min | SecurityConfig change only |

### 5.2 Medium-Term Improvements (1–2 Weeks)

| Item | Effort | Impact |
|---|---|---|
| Build User Management frontend (admin only) | 2–3 days | Eliminates need for API calls to provision users |
| Add integration tests for Material, Spec, MOA, Vendor modules | 3–4 days | Safety net for future changes |
| Abstract document storage behind interface + add S3 backend | 2 days | Production deployment readiness |
| Add Spec review queue UI | 1–2 days | Completes spec lifecycle workflow |
| Add MOA linked-specs impact view | 1 day | Prevents accidental MOA retirement |
| Add inventory stock issue/dispatch flow | 3–4 days | Completes released stock lifecycle |
| Add audit trail timeline page | 2–3 days | QA visibility into event history |

### 5.3 Architecture Improvements (Longer Term)

| Item | Impact |
|---|---|
| Introduce FEFO logic for stock issue | GMP compliance for expiry-sensitive materials |
| Enforce capacity at pallet/shelf/rack/room | Prevents over-filling locations |
| Add putaway suggestion based on storage condition + zone | Reduces manual placement errors |
| Add status-based movement restrictions | Prevents system misuse (issuing quarantined stock) |
| Implement e-sign / confirmation for QC decisions | 21 CFR Part 11 / EU Annex 11 readiness |
| Add targetMarket-driven validation in spec/sampling | Makes regulatory framework functional |
| Introduce API versioning | Future-proofs client contracts |
| Add rate limiting on `/api/auth/login` | Security hardening |

---

## 6. Verified Working End-to-End Flow

The following flow has been implemented and verified through integration tests:

```
GRN Created (DRAFT)
  → GRN Received
  → Containers generated
  → Material labels generated
  → Inventory created (QUARANTINE)
  → Sampling request auto-created (REQUESTED)
  → Sampling plan defined (PLAN_DEFINED)
  → Sampling started (IN_PROGRESS, inventory → SAMPLING)
  → Sampling completed (SAMPLED)
  → Handoff to QC (HANDED_TO_QC, inventory → UNDER_TEST)
  → QC receipt recorded
  → QC review started
  → QC worksheet generated from SpecParameters
  → Test results entered per parameter
  → QC decision made (inventory → RELEASED or REJECTED)

Exception path (if OOS):
  → Investigation opened (inventory → BLOCKED)
  → Phase I / Phase II escalation
  → QA review submitted → QA approve or return
  → Outcome: RESUME_REVIEW | RETEST | RESAMPLE | REJECTED
  → Retest: retained sample consumed, worksheet reset, new results entered
  → Resample: child sampling cycle created, lineage tracked
```

---

## 7. Priority Recommendation for Next Build Sprint

**Immediate (this sprint):**

1. Fix Material persistence gap — no data loss for hsnCode, casNumber, pharmacopoeialRef
2. Add seed users for WAREHOUSE_OP and PROCUREMENT roles
3. Fix COMPOSITE sampling quantity UX label

**Next sprint:**

4. User management frontend screen
5. Inventory stock issue / dispatch flow
6. Dashboard live KPI wiring
7. Integration tests for Material, Spec, MOA, Vendor modules

**Following sprint (WMS hardening):**

8. FEFO logic and expiry-aware issue allocation
9. Capacity enforcement per location level
10. Movement history UI
11. Putaway suggestion (basic rules-based)

**Later:**

12. LIMS test entry depth integration
13. QMS/CAPA module
14. Environmental monitoring
15. E-sign for critical quality decisions
16. HRMS

---

## 8. Reference Index

| Document | Location |
|---|---|
| Project Overview | `core/docs/PROJECT_OVERVIEW.md` |
| Architecture | `core/docs/ARCHITECTURE.md` |
| QC Sampling Gap Analysis | `core/docs/QC_SAMPLING_GAP_ANALYSIS.md` |
| QC Sampling Phase Status | `core/docs/QC_SAMPLING_PHASE_STATUS.md` |
| QC Sampling Progress (2026-04-28) | `core/docs/STATUS_2026-04-28_QC_SAMPLING_PROGRESS_SUMMARY.md` |
| Spec and MOA Design | `core/docs/SPEC_MOA_DESIGN.md` |
| WMS Enhancement Checklist | `core/docs/WMS_ENHANCEMENT_CHECKLIST.md` |
| Material Master Data Gaps | `core/docs/MATERIAL_MASTERDATA_GAPS_2026-04-28.md` |
| VMS Implementation Plan | `core/docs/VMS_IMPLEMENTATION_PLAN.md` |
| Auth Usage | `core/docs/AUTH_USAGE.md` |
| Implemented Work Summary | `core/docs/IMPLEMENTED_WORK_SUMMARY.md` |

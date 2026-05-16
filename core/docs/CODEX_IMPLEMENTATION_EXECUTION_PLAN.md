# Codex Implementation Execution Plan

**Date:** 2026-05-10  
**Purpose:** Step-by-step implementation plan for the pharma gaps listed in [Codex_plan_later.md](./Codex_plan_later.md) and [IMPLEMENTATION_GAP_ANALYSIS.md](./IMPLEMENTATION_GAP_ANALYSIS.md).  
**Status:** Implementation in progress. Phase 1, Ticket 2.1, Ticket 2.3, Ticket 3.1, the backend compatibility layer for Ticket 3.2, Ticket 3.4, Phase 4, Phase 5 compliance infrastructure, Phase 6A Ticket 6A.1, Ticket 6A.2 backend guard regression coverage, Improvement 4 generic e-sign API, Ticket 6B.1 Deviation MVP, Ticket 6B.2 CAPA MVP, Ticket 6B.3 CAPA Approval Workflow, Ticket 6B.4 CAPA Ownership and Reassignment, Ticket 6B.5 CAPA Attachments, Ticket 6B.6 CAPA Effectiveness Review, Ticket 6B.7 QMS Analytics, Ticket 6B.9 Change Control Module, Ticket 6C.1 Employee / HRMS Foundation, Ticket 6C.2 Auth Hardening, Ticket 6D.1 Controlled Documents, Ticket 6D.2 Distribution And Acknowledgment, Ticket 6D.3 Fix Document Approval E-Sign Flow, Ticket 6D.4 Document Control UI Polish, Ticket 6E.1 Training Assignment, Ticket 6F.1 Reusable E-Signature Dialog, Ticket 6F.2 Audit Timeline, Ticket 6F.3 Dashboard Live KPIs, complaints, equipment qualification, Ticket 7.1 Risk Register, Ticket 7.2 APQR, and Ticket 7.3 Supplier Quality Agreement Management, Ticket 6G.1 Fix Pre-Existing Backend Compile Errors, Ticket 6G.4 Document Review Date Tracking, Ticket 6G.5 GRN Rejection Deviation Auto-Creation, Ticket 6G.6 MoA SOP Document Linkage, Ticket 6G.7 Training Gate Enforcement for Sampling and QC, Ticket 6G.8 OOS/OOT Two-Phase Investigation Workflow, and Ticket 6G.9 Lot/Batch Traceability View have been implemented/verified in code.

---

## Guiding Rule

Implement the gaps in small vertical slices. Each slice should include:

1. database migration
2. backend entity/DTO/repository/service/controller changes
3. frontend type/API/page updates
4. focused tests
5. one happy-path or module E2E scenario when the feature becomes user-facing

Do not build every future module at once. The first objective is to make the current inbound material flow trustworthy:

`Supplier/Vendor/Material rules -> GRN -> Inventory -> Sampling -> QC release`

---

## Current Migration Baseline

Latest existing migration:

```text
V89__create_supplier_quality_agreement.sql
```

New migrations should start at:

```text
V90
```

---

## Phase 1: Inbound Master Data Controls

### Goal

Prevent bad or unqualified master data from entering GRN and inventory.

### Ticket 1.1: Supplier Pharma Fields

**Migration**

```text
V56__enhance_supplier_pharma_fields.sql
```

**Backend**

- Add enums:
  - `SupplierType`
  - `SupplierQualificationStatus`
- Update `Supplier`.
- Update `SupplierRequest`.
- Add `SupplierResponse` so controller does not return entity directly.
- Update `SupplierService` and `SupplierServiceImpl`.

**Frontend**

- Update supplier types in `core/ui/src/types`.
- Expand supplier form with:
  - supplier type
  - qualification status
  - country of manufacture
  - GMP certificate number/body/expiry
  - approved since
  - last audit date
  - next audit due
- Add status badges in supplier list.

**Tests**

- Backend supplier create/update tests.
- E2E supplier creation with qualified manufacturer.

**Done Means**

- Supplier can be created as `MANUFACTURER`.
- Supplier can be marked `QUALIFIED`, `CONDITIONALLY_QUALIFIED`, `SUSPENDED`, or `DISQUALIFIED`.
- Existing supplier list still works.

---

### Ticket 1.2: Material Lifecycle Status

**Migration**

```text
V57__add_material_lifecycle_status.sql
```

**Backend**

- Add `MaterialStatus` enum:
  - `DRAFT`
  - `ACTIVE`
  - `DISCONTINUED`
  - `OBSOLETE`
- Add `status` to `Material`.
- Default existing materials to `ACTIVE`.
- Keep `isActive` temporarily for backward compatibility if needed.

**Frontend**

- Add lifecycle status selector to material create/edit.
- Show status badge on material list.

**Tests**

- Material create defaults to `ACTIVE` or chosen status.
- Material status update persists.

**Done Means**

- Materials have a pharma lifecycle, not just active/inactive.

---

### Ticket 1.3: Approved Vendor List

**Migration**

```text
V58__create_vendor_material_approval.sql
```

**Backend**

Create:

```text
VendorMaterialApproval
  vendorId
  vendorBusinessUnitId
  supplierId
  materialId
  status
  approvalBasis
  qualificationDate
  nextRequalificationDate
  approvedBy
  remarks
```

Enums:

- `VendorMaterialApprovalStatus`
- `VendorMaterialApprovalBasis`

Add repository/service/controller:

```text
/api/vendor-material-approvals
```

**Frontend**

- Add "Material Approvals" tab/card in Vendor/VBU area.
- Allow Admin/QC Manager to approve a material-source combination.
- Show current AVL status by material.

**Tests**

- Create approval.
- Suspend approval.
- Filter by material/vendor/VBU/supplier.

**Done Means**

- The system can answer: "Is this supplier/vendor/site approved for this material?"

---

### Ticket 1.4: GRN Master Data Enforcement

**Migration**

No migration unless error/audit fields are added.

**Backend**

Add guards in `GrnServiceImpl.createGrn()` and/or `receiveGrn()`:

- material must be `ACTIVE`
- material must have approved spec
- supplier must not be `SUSPENDED` or `DISQUALIFIED`
- VBU must be qualified
- `VendorMaterialApproval` must exist and be `APPROVED` or allowed `CONDITIONAL`
- expired GMP certificate should block or warn based on material risk

**Frontend**

- Show blocking message before submit.
- Show source approval status in GRN material line.

**Tests**

- GRN fails for disqualified supplier.
- GRN fails for inactive material.
- GRN fails without approved spec.
- GRN passes for approved AVL source.

**Done Means**

- A GRN cannot be created/received for an unqualified material-source combination.

---

## Phase 2: Inventory Truth

### Goal

Inventory must represent usable physical stock, not just originally received stock.

### Ticket 2.1: Inventory Expiry And Retest Dates

**Migration**

```text
V59__add_inventory_expiry_and_retest_dates.sql
```

**Backend**

- Add to `Inventory`:
  - `expiryDate`
  - `retestDueDate`
- Populate from `GrnItem` / `Batch` during GRN receipt.
- Backfill existing inventory from batch where possible.

**Frontend**

- Show expiry/retest on inventory table and selected lot detail.
- Add expiry/retest filters.

**Tests**

- Received GRN creates inventory with expiry and retest dates.
- Existing FEFO behavior still works.

**Done Means**

- Inventory can be queried directly for expiry/retest.

---

### Ticket 2.2: Expiry/Retest Issue Guards

**Migration**

No migration unless adding status reason fields.

**Backend**

- Block issue of expired inventory.
- Block or require QA review for retest-overdue inventory.
- Keep FEFO suggestion/enforcement.

**Frontend**

- Disable Issue button for expired/retest-blocked lots.
- Show clear reason.

**Tests**

- Expired released inventory cannot be issued.
- Valid released inventory can be issued.

**Done Means**

- Expired/retest-overdue material cannot silently leave warehouse.

---

### Ticket 2.3: Sampling Consumption Transaction

**Migration**

```text
V60__add_sampling_consumption_inventory_transaction.sql
```

**Backend**

- Add `SAMPLING_CONSUMPTION` to `InventoryTransactionType`.
- On sampling completion, deduct total actual sampled quantity from inventory.
- Create transaction with:
  - reference type `SAMPLING_REQUEST`
  - reference ID
  - before quantity
  - after quantity
  - actor

**Frontend**

- Inventory movement history shows sampling consumption.
- Sampling completion shows total consumed quantity.

**Tests**

- Receive 100 kg.
- Sample 0.5 kg.
- Inventory becomes 99.5 kg.
- Movement history shows `SAMPLING_CONSUMPTION`.

**Done Means**

- Sampling no longer overstates available inventory.

---

## Phase 3: Sampling Redesign

### Goal

Support real container-level pharma sampling with different quantities per bag and per sample purpose.

### Ticket 3.1: Sampling Container Draw Model

**Status:** Implemented. Actual migration: `V61__add_sampling_container_draws.sql`.

**Migration**

```text
V61__create_sampling_container_draw.sql
```

**Backend**

Create:

```text
SamplingContainerDraw
  samplingPlanId
  grnContainerId
  drawPurpose
  plannedQuantity
  actualQuantity
  uom
  containerBalanceBefore
  containerBalanceAfter
  sampledBy
  sampledAt
  containerCondition
  resealed
  samplingLabelApplied
```

Add enum:

```text
SamplingDrawPurpose
  IDENTITY
  COMPOSITE_ASSAY
  RETENTION
  MICRO
  OTHER
```

**Frontend**

- Sampling plan matrix:
  - container
  - received
  - remaining
  - identity draw
  - assay/composite draw
  - retention draw
  - total draw
  - balance after

**Tests**

- Different containers can have different draw quantities.
- Same container can have identity + composite + retention.
- Negative balance blocked.

**Done Means**

- Sampling is per-container and per-purpose.

---

### Ticket 3.2: Multiple Samples Per Sampling Request

**Status:** Backend compatibility layer implemented. Actual migration: `V62__allow_multiple_qc_samples_per_request.sql`.

**Migration**

```text
V62__allow_multiple_qc_samples_per_request.sql
```

**Backend**

- Replace unique constraint on `Sample.samplingRequestId`.
- Add/ensure unique:

```text
UNIQUE(sampling_request_id, sample_type)
```

- Create separate samples:
  - identity
  - composite QC
  - retention
- Preserve the existing primary `sample` response for current QC flows.
- Add `samples` response list for all sample records under the request.

**Frontend**

- Show samples as separate cards under one sampling request.
- Current TypeScript response type supports `samples`; full visual sample cards are still pending.

**Tests**

- One sampling request can have identity + composite + retention sample.

**Done Means**

- Sampling request is the event; samples are the controlled outputs.
- Existing QC review/release behavior continues to use a primary sample until the worksheet model is expanded.

---

### Ticket 3.3: Container Remaining Balance

**Status:** Folded into Ticket 3.1. No separate migration needed unless later balance audit fields are added.

**Migration**

```text
No separate migration; covered by V61.
```

**Backend**

- Add `remainingQuantity` to `GrnContainer`.
- Initialize from container quantity on receipt.
- Update after sampling draws.
- Validate remaining = original - total draws.

**Frontend**

- GRN container list shows sampled quantity and remaining quantity.
- Sampling matrix shows current remaining before draw.

**Tests**

- Container remaining decreases after sampling completion.

**Done Means**

- User can see exactly how much remains in each bag/container.

---

### Ticket 3.4: Chain Of Custody Events

**Status:** Implemented. Actual migration: `V63__create_sample_chain_of_custody.sql`.

**Migration**

```text
V63__create_sample_chain_of_custody.sql
```

**Backend**

Create:

```text
SampleChainOfCustody
  sampleId
  samplingRequestId
  eventType
  fromLocation
  toLocation
  handedOverBy
  handedOverAt
  receivedBy
  receivedAt
  receiptCondition
  remarks
```

**Frontend**

- Show custody timeline.
- Add handoff/receipt event details.
- Current TypeScript response type supports `custodyEvents`; full visual custody timeline is still pending.

**Tests**

- Handoff creates custody event.
- QC receipt completes custody event.
- Multiple samples in the same sampling request each get custody tracking.

**Done Means**

- Sample transfer is no longer only one overwritten field set.

---

## Phase 4: QC Worksheet And Release Gate

### Goal

QC disposition must be based on completed required tests from the approved spec.

### Ticket 4.1: QcWorksheet Entity

**Status:** Implemented. Actual migration: `V64__create_qc_worksheet.sql`.

**Migration**

```text
V64__create_qc_worksheet.sql
```

**Backend**

Create:

```text
QcWorksheet
  samplingRequestId
  sampleId
  specId
  status
  assignedAnalyst
  reviewer
  generatedAt
  generatedBy
```

- Add `worksheetId` to `QcTestResult`.
- Update worksheet generation.

**Frontend**

- Show worksheet header/status.
- Group test results by worksheet.

**Tests**

- QC receipt generates worksheet.
- Worksheet contains one row per mandatory SpecParameter.

**Done Means**

- Worksheet is first-class, not only implied by result rows.

---

### Ticket 4.2: Mandatory Completion Gate

**Status:** Implemented for the current QC sampling flow. Mandatory pass completion, failing-result investigation closure, open/pending investigation blocking, and reviewer-vs-analyst independence are enforced before final QC disposition.

**Migration**

No migration.

**Backend**

- Before QC final approve/reject:
  - all mandatory parameters must be complete
  - no failing result can be released without closed approved investigation
  - reviewer must differ from analyst where configured

**Frontend**

- Disable final disposition until gate passes.
- Show missing tests and failed/unreviewed results.

**Tests**

- Disposition blocked with missing mandatory result.
- Disposition blocked with open OOS investigation.
- Disposition succeeds after all required tests pass.

**Done Means**

- QC cannot release by skipping worksheet work.

---

## Phase 5: Compliance Infrastructure

### Goal

Make regulated actions audit-ready.

### Ticket 5.1: Audit Event Infrastructure

**Status:** Implemented as backend infrastructure. Actual migration: `V65__create_audit_event.sql`. Current wiring records QC worksheet creation/status/result events and final QC disposition audit events. Reusable frontend audit trail card remains future UI work.

**Migration**

```text
V65__create_audit_event.sql
```

**Backend**

- Add `AuditEvent`.
- Add `AuditEventService`.
- Add helper methods for create/update/status/signature.
- Add endpoint:

```text
GET /api/audit-events?entityType=&entityId=
```

**Frontend**

- Reusable Audit Trail tab/card.

**Tests**

- Status changes emit audit event.
- Entity update emits old/new values for controlled fields.

**Done Means**

- Controlled entity history is visible and append-only from app logic.

---

### Ticket 5.2: E-Signature Service

**Status:** Implemented as backend infrastructure with QC final disposition wiring and a generic signature API. Actual migration: `V66__create_e_signature_record.sql`. Password verification is supported when credentials are provided; reusable approval dialogs should use `POST /api/e-signatures`.

**Migration**

```text
V66__create_e_signature_record.sql
```

**Backend**

- Add `ESignatureRecord`.
- Add credential verification service.
- Add generic endpoint: `POST /api/e-signatures` with `{ entityType, entityId, action, username, password, meaning, reason }`.
- Keep timeline endpoint: `GET /api/e-signatures?entityType=&entityId=`.
- Require e-signature on:
  - Spec/MoA approval
  - QC disposition
  - inventory status release/reject/block
  - VBU qualification approval

**Frontend**

- Reusable e-signature modal.
- Prompt for username/password and meaning.

**Tests**

- Wrong password blocks approval.
- Correct password records signature.

**Done Means**

- Approval means verified signer, not just typed confirmation text.

---

## Phase 6: Document Control And HRMS

### Goal

Create the foundation for SOPs, training, and later alert ownership.

### Ticket 6.1: Employee And HRMS Foundation

**Migration**

```text
V67__create_employee_and_user_employee_link.sql
```

**Backend**

- Add `Employee`.
- Link `User.employeeId` to actual employee.
- Add department/site/designation.

**Frontend**

- Minimal employee admin page.
- Link user to employee.

**Done Means**

- Users have real people/department/site context.

---

### Ticket 6.2: Controlled Document MVP

**Migration**

```text
V68__create_controlled_document_tables.sql
```

**Backend**

- `ControlledDocument`
- `DocumentRevision`
- `DocumentApproval`
- `DocumentDistribution`

**Frontend**

- Document list.
- Revision upload.
- Approval action.
- Distribution/acknowledgment list.

**Done Means**

- SOPs and validation reports are controlled records, not just file paths.

---

### Ticket 6.3: Training Assignment

**Migration**

```text
V69__create_training_assignment.sql
```

**Backend**

- `TrainingAssignment`
- `RoleQualificationRequirement`
- Service checks for training status.

**Frontend**

- Training assignment list.
- User training status.

**Done Means**

- Sampling/QC can later check whether the actor is trained.

---

## Phase 6B: QMS Enhancements (CAPA + Change Control)

### Goal

Extend the implemented Deviation and CAPA MVPs with approval, ownership, evidence, effectiveness, analytics, and change control.

### Ticket 6B.3: CAPA Approval Workflow

**Status:** Implemented.

**Backend**
- Add `PENDING_APPROVAL`, `APPROVED`, `REJECTED` states to CAPA lifecycle (or approval sub-status).
- Submit-for-approval action after action plan completion.
- QA/QC manager approve/reject with comments; require e-sign.
- Audit events for submission, approval, rejection, resubmission.

**Frontend**
- Approval action panel on CAPA detail.
- Approval queue/filter on `/qms/capas`.
- Rejected state with comments and resubmit action.

**Tests**
- Owner can submit; manager can approve/reject with e-sign; unauthorized role blocked.

---

### Ticket 6B.4: CAPA Ownership And Reassignment

**Status:** Implemented.

**Backend**
- Replace free-text owner with employee/user reference.
- Add reassignment action: reason, previous owner, new owner, assigned by, assigned at.
- Reassignment history.

**Frontend**
- Owner selector using employees.
- Reassignment drawer with reason.
- Ownership history timeline.

**Tests**
- Assign to active employee; reassign requires reason; inactive employee cannot receive ownership.

---

### Ticket 6B.5: CAPA Attachments And Evidence

**Status:** Implemented.

**Backend**
- Attachment records for each CAPA stage (investigation evidence, corrective action proof, preventive action proof, effectiveness check evidence).
- File metadata, uploaded by, uploaded at, stage/purpose.
- Audit events on upload/remove.

**Frontend**
- Evidence upload area on CAPA detail.
- Grouped evidence list by stage.
- Preview/download actions.

**Tests**
- Upload evidence for a stage; evidence appears on detail; closed CAPA evidence changes are audited.

---

### Ticket 6B.6: CAPA Effectiveness Review Expansion

**Status:** Implemented.

**Backend**
- Scheduled effectiveness review date and reviewer assignment.
- Pass/fail outcome with reviewer comments.
- Failed review → reopen or create linked follow-up CAPA/deviation.
- E-sign required for final effectiveness pass/fail.

**Frontend**
- Effectiveness review section on CAPA detail.
- Due/overdue filters on CAPA board.
- Failed review follow-up action.

**Tests**
- CAPA cannot close before effectiveness review; failed review creates follow-up; pass allows final closure with e-sign.

---

### Ticket 6B.7: Recurring CAPA And Deviation Analytics

**Status:** Implemented.

**Backend**
- Recurrence detection by root cause, department, source module, material, supplier/vendor, location.
- Summary endpoint: open/overdue/recurring counts, CAPA closure aging, repeat deviation source.

**Frontend**
- QMS analytics dashboard.
- Trend cards and filters.
- Drill-down from metric to record list.

**Tests**
- Summary endpoint calculates grouped counts; filters return expected records.

---

### Ticket 6B.8: CAPA Escalation Alerts

**Status:** Not implemented. Requires HRMS ownership + alert/notification foundation (Phase 7).

**Backend**
- Due-soon and overdue escalation rules.
- Escalate to owner, owner manager, QA/QC manager based on thresholds.
- Alert records tied to alert center.

**Frontend**
- Alert badge/count on CAPA board.
- Overdue escalation panel on CAPA detail.
- Escalation history timeline.

**Tests**
- Due-soon creates alert; overdue escalates to configured role; closed CAPA stops escalating.

---

### Ticket 6B.9: Change Control Module

**Status:** Implemented.

**Migration**
```text
V75__create_change_control.sql
```

**Backend**
- `ChangeControl` entity: number, title, change type, reason, risk classification, status.
- Affected entity linking (material, spec, vendor, warehouse/process, document, system config).
- Impact assessment, approval routing, implementation tasks, effectiveness verification, closure e-sign.

**Frontend**
- `/qms/change-controls` list.
- Change control detail page.
- Affected entity selector/linking.
- Approval and implementation task panels.

**Tests**
- Create change control linked to affected entity; approval requires authorized role + e-sign; closure blocked until tasks and effectiveness checks complete.

---

## Phase 6F: Compliance UI Catch-Up

### Goal

Make the already-built compliance backend (audit events, e-signatures) visible and usable across all modules.

### Ticket 6F.1: Reusable E-Signature Dialog

**Status:** Implemented.

- `core/ui/src/components/ESignatureDialog.tsx`
- Props: `entityType`, `entityId`, `action`, `defaultMeaning`, `reason`, `onSigned`, `visible`, `onClose`
- Calls `POST /api/e-signatures` with password-verified credentials
- Wired into QC final approval/rejection (`SamplingPage`) and deviation closure (`DeviationDetailPage`)

---

### Ticket 6F.2: Audit Timeline

**Status:** Implemented.

- `core/ui/src/components/AuditTimeline.tsx`
- Reads `GET /api/audit-events?entityType=&entityId=` via React Query
- Color-coded by event type: CREATE, UPDATE, STATUS_CHANGE, E_SIGNATURE, WORKFLOW_ACTION
- Wired into `SamplingPage`, `GrnPage`, `DeviationDetailPage`, `DocumentsPage`

---

### Ticket 6F.3: Dashboard Live KPIs

**Status:** Implemented.

**Backend**

- Added `countExpiringBetween(@Param from, @Param to)` JPQL query to `InventoryRepository`
- Added `expiringIn30Days` field to `InventorySummaryResponse`
- Updated `InventoryServiceImpl.getInventorySummary()` to populate expiry count

**Frontend**

- Added `expiringIn30Days: number` to `InventorySummary` type
- Dashboard 5 live KPI cards:
  - Quarantine Lots → `/inventory`
  - Pending Sampling → `/qc/sampling`
  - Open Deviations (OPEN + UNDER_INVESTIGATION + CAPA_IN_PROGRESS) → `/qms/deviations`
  - Expiring ≤30d → `/inventory`
  - Overdue Requalifications (VBU `nextRequalificationDue ≤ today`) → `/master-data/partners/vendors`
- All cards are role-gated and navigable

### Ticket 6D.3: Fix Document Approval E-Sign Flow

**Status:** Implemented.

**Problem:** `ApprovalDialog` in `DocumentsPage.tsx` wraps `ESignatureDialog`, which only calls `POST /api/e-signatures`. `approveDocumentRevision` is never invoked — `DocumentApproval.status` stays `PENDING` and revision never advances from `IN_REVIEW`.

**Dead code to remove:**
- `signaturePassword` state
- `approvalComments` state (parent scope)
- `approvalMutation`
- `ApprovalDialog` component

**Fix:**
- Restore inline approval form in "Approval Workflow" panel calling `approveDocumentRevision` directly.
- Backend approval endpoint already records e-signature internally.

**File:** `core/ui/src/features/documents/DocumentsPage.tsx`

### Ticket 6D.4: Document Control UI Polish

**Status:** Implemented.

**Gaps in `DocumentsPage.tsx`:**
- "My Acknowledgments" uses `.slice(0, 4)` — no "View all" toggle.
- Distribution form uses comma-separated text for usernames — replace with checkbox list from `managedUsers`.
- `RevisionCard.fileName` shown as plain text — should be a download anchor via `GET /api/documents/{id}/revisions/{revId}/file`.

**File:** `core/ui/src/features/documents/DocumentsPage.tsx`

---

## Phase 6G: Pharma Compliance Gap Backfill

**Goal:** Close regulatory gaps identified post-Phase-6B. Each ticket has a specific FDA/EU GMP anchor. Full ticket definitions are in `NEXT_DEVELOPMENT_PLAN_2026-05-11.md` Phase 6G section.

---

### Ticket 6G.1: Fix Pre-Existing Backend Compile Errors

**Status:** Implemented. `./mvnw clean compile` passes with zero errors. 97 integration tests pass.

**Backend**
- Fix `AuthDataInitializer.java` — builder missing 6C.2 security fields.
- Fix `BatchServiceImpl.java` — partial implementation compile failure.
- `./mvnw compile` must pass with zero errors.

**Done Means**
- Backend compiles clean; all existing integration tests run.

---

### Ticket 6G.2: Audit Timeline Wiring — CAPA and Change Control

**Status:** Not implemented.

**Regulatory basis:** FDA 21 CFR Part 11 §11.10(e) — audit trails required for all CAPA and change control records.

**Backend**
- Add missing `AuditEventService.record(...)` calls in `CapaServiceImpl` and `ChangeControlServiceImpl` for every state transition.

**Frontend**
- Add `<AuditTimeline entityType="QMS_CAPA" entityId={...} />` to `CapaBoardPage.tsx` CAPA detail panel.
- Add `<AuditTimeline entityType="CHANGE_CONTROL" entityId={...} />` to `ChangeControlPage.tsx` detail view.

**Done Means**
- CAPA and Change Control detail pages show complete audit history. No regulated action is missing from the trail.

---

### Ticket 6G.3: Dashboard QMS/Compliance KPI Expansion

**Status:** Not implemented.

**Regulatory basis:** FDA QSIT + EU GMP Chapter 1 — management review of quality metrics.

**Backend**
- Extend `GET /api/qms/analytics` with: `openChangeControls`, `pendingCCApprovals`, `overdueEffectivenessChecks`, `documentsAwaitingReview`, `overdueTrainingAssignments`.

**Frontend**
- Add KPI cards to `DashboardPage.tsx`: Open Change Controls, Overdue Effectiveness Reviews, Documents Due for Review, Overdue Training. Role-gated.

**Done Means**
- QC Manager sees live QMS health on dashboard.

---

### Ticket 6G.4: Document Review Date Tracking

**Status:** Implemented. `reviewStatus` computed dynamically from `nextReviewDate` (OVERDUE/DUE_SOON/CURRENT). `GET /api/documents/due-for-review` endpoint added. Frontend: "Due for Review" toggle tab, review status badge in document list and detail panel.

**Regulatory basis:** EU GMP Chapter 4.7 — documents must be reviewed periodically; past-review SOPs are uncontrolled.

**Migration:** `V80__add_document_review_tracking.sql`
- Add `review_interval_months INT DEFAULT 24`, `next_review_date DATE`, `review_status VARCHAR(30)` to `controlled_document`.

**Backend**
- Compute `nextReviewDate` at final approval. Derive `reviewStatus` from date vs today.
- Add `GET /api/documents/due-for-review` endpoint.

**Frontend**
- Document list: `Next Review` column, `reviewStatus` badge, "Due for Review" filter tab.

**Done Means**
- No SOP can silently age past its review date without visibility.

---

### Ticket 6G.5: GRN Rejection → Deviation Auto-Creation

**Status:** Implemented. V91 migration adds `linked_deviation_id`/`linked_deviation_number` to `grn`. On CoA REJECTED: `DeviationService.createAutoDeviation()` fires, GRN stores deviation reference. Frontend shows deviation number in rejection message and linked deviation panel in GRN detail. 99 tests pass.

**Regulatory basis:** EU GMP Chapter 6.14 — material rejection events must be investigated with traceable documentation.

**Backend**
- On GRN `REJECTED` or CoA `REJECTED`: auto-create `Deviation` with `sourceModule=GRN`, `sourceEntityId=grn.id`, title, severity `MAJOR`, status `OPEN`. Return `linkedDeviationId` in GRN response.

**Frontend**
- Toast after rejection: `"Deviation [DEV-XXXX] automatically created."` GRN detail shows linked deviations section.

**Done Means**
- Every rejected GRN has an automatic traceable deviation. Source link navigable in both directions.

---

### Ticket 6G.6: MoA → Controlled SOP Document Linkage

**Status:** Implemented. V92 migration adds `sop_document_id`, `sop_revision_id`, `sop_document_number` to `moa_master`. `MoaServiceImpl.applySopLink()` validates EFFECTIVE status and stores denormalized document number. Frontend: "Linked SOP Document" selector (EFFECTIVE docs only) in MoA form; `sopDocumentNumber` badge in detail panel. 99 tests pass.

**Regulatory basis:** EU GMP Chapter 6.9 — test methods must reference approved analytical procedure SOPs.

**Migration:** `V81__add_moa_sop_document_link.sql`
- Add `sop_document_id UUID`, `sop_revision_id UUID` to `moa` table.

**Backend**
- `MoaServiceImpl`: validate linked document is `EFFECTIVE`. Include linked doc metadata in `MoaResponse`.

**Frontend**
- MoA form: "Linked SOP" selector filtered to `EFFECTIVE` documents. MoA detail shows SOP link.

**Done Means**
- Every MoA traces to its controlling SOP. MoA → SOP revision path is navigable.

---

### Ticket 6G.7: Training Gate Enforcement for Sampling and QC

**Status:** Implemented. `TrainingGateService` created; wired into `SamplingServiceImpl` for `startSampling` (SAMPLING_SOP), `recordWorksheetResult` (QC_ANALYST_TRAINING), `recordQcDecision` (QC_MANAGER_QUALIFICATION). Soft gate: only enforces when training records exist for the user+key pair.

**Regulatory basis:** EU GMP Chapter 2.8–2.9 + FDA 211.68 — only trained personnel may perform regulated operations.

**Backend**
- Add `TrainingGateService.assertTrainedForRequirement(username, requirementKey)`.
- Wire into `SamplingServiceImpl`: `startSampling` checks `SAMPLING_SOP`, `enterQcResult` checks `QC_ANALYST_TRAINING`, `finalDisposition` checks `QC_MANAGER_QUALIFICATION`.

**Frontend**
- Training gate error shows resolution path: `"Assign training in HRMS → Training."`

**Done Means**
- Untrained personnel cannot perform regulated sampling or QC operations at the system boundary.

---

### Ticket 6G.8: OOS/OOT Investigation Two-Phase Workflow

**Status:** Implemented. V93 migration adds 8 columns. `QcPhase1Outcome` enum (NO_ASSIGNABLE_CAUSE, INVALID_RESULT). `completePhase1()` auto-advances to PHASE_II or closes as CLOSED_INVALID. `completePhase2()` requires QC Manager e-sign, submits to QA_REVIEW_PENDING. Frontend: Phase 1 completion form (OOT flag, outcome, retest count) + Phase 2 e-sign form on investigation cards.

**Regulatory basis:** FDA OOS Guidance (2006) + EU GMP Chapter 6.15–6.18 — mandatory two-phase OOS investigation (Phase 1: lab; Phase 2: full investigation).

**Migration:** `V82__add_oos_investigation_phases.sql`
- Add to `qc_investigation`: `investigation_phase`, `phase1_outcome`, `phase1_root_cause`, `phase1_completed_by/at`, `phase2_required`, `oot_flag`, `retest_authorized`, `retest_sample_count`.

**Backend**
- `completePhase1()`: no-assignable-cause → Phase 2; invalid-result → retest. `completePhase2()`: requires e-sign by QC Manager.

**Frontend**
- Phase 1 and Phase 2 sections on QC investigation panel. OOT flag toggle. Status pill: PHASE_1 / PHASE_2 / COMPLETED / INVALID_RESULT.

**Done Means**
- OOS investigation follows FDA two-phase structure. Phase transition is explicit and audited.

---

### Ticket 6G.9: Lot/Batch Traceability View

**Status:** Implemented. `GET /api/lots/{searchKey}/traceability` — searches by GRN number or vendor batch. `LotTraceabilityServiceImpl` assembles: GRN receipt, CoA review, sampling requests, QC results summary, QC disposition, QC decision, investigations (phases + closure), inventory transactions, deviations, CAPAs into a chronological timeline. Frontend: `/qms/traceability` search page with vertical timeline, status badges, event type color coding, linked deviation badge. Nav entry added.

**Regulatory basis:** EU GMP Annex 15 + FDA 211.188 — full lot history from receipt to disposition must be reconstructable.

**Backend**
- No migration. Add `GET /api/lots/{lotNumber}/traceability` returning `LotTraceabilityResponse`: GRN → containers → CoA review → sampling → QC worksheet/results → disposition → inventory transactions → linked deviations → CAPAs.

**Frontend**
- New page `/qms/traceability`. Search by lot/GRN number. Vertical timeline showing each step with date, actor, status, and link to source record.

**Done Means**
- QC Manager can reconstruct a lot's complete history in one view for inspection readiness.

---

### Ticket 6G.10: Change Control Affected Entity Navigation and Display

**Status:** Not implemented.

**Regulatory basis:** EU GMP Chapter 13 — change records must explicitly identify controlled items being changed; raw UUIDs are not inspection-readable.

**Migration:** `V83__add_cc_affected_entity_display_fields.sql`
- Add `entity_display_name VARCHAR(255)`, `entity_number VARCHAR(100)` to `qms_change_control_affected_entity`.

**Backend**
- `ChangeControlServiceImpl.addAffectedEntity()`: resolve display name/number from actual entity tables by type. Include `navigationPath` in response.

**Frontend**
- Replace raw entity IDs with `entityDisplayName` + clickable navigation links. "Add entity" form uses search/autocomplete pickers instead of manual UUID entry.

**Done Means**
- Change Control records show human-readable entity names. Inspectors can navigate directly to changed items. No raw UUIDs visible.

---

## Phase 7: Alert Center

### Goal

Notify owners after employee, training, document, supplier, inventory, and instrument ownership exists.

### Ticket 7.1: Alert Event And Scheduler

**Migration**

```text
V70__create_alert_event.sql
```

**Backend**

- `AlertEvent`
- daily scheduler
- alert generation services:
  - training due
  - SOP acknowledgment due
  - supplier/VBU audit due
  - GMP certificate expiry
  - inventory expiry/retest due

**Frontend**

- Alert center.
- Dashboard alert widget.

**Done Means**

- Alerts have owner, due date, severity, and status.

---

## Testing Strategy

### Backend Tests

Add service tests for every business rule:

- supplier qualification blocks GRN
- AVL missing blocks GRN
- inactive material blocks GRN
- unapproved spec blocks GRN
- expired inventory blocks issue
- sampling draw cannot exceed container remaining
- sampling completion reduces inventory
- QC release blocked when mandatory worksheet rows incomplete
- e-signature blocks wrong password

### Frontend/E2E Tests

Keep E2E focused and split by module:

1. Supplier qualification E2E
2. AVL + GRN guard E2E
3. Inventory expiry/retest E2E
4. Sampling per-container draw E2E
5. QC worksheet release gate E2E
6. E-signature approval E2E

Avoid one massive end-to-end test until the modules are stable.

---

## Stop/Go Gates

Do not start Phase 3 sampling redesign until:

- supplier qualification exists
- material lifecycle exists
- AVL exists
- GRN guards exist
- inventory expiry/retest fields exist

Do not start alerts until:

- employee/HRMS foundation exists
- controlled documents exist
- training assignment exists
- owners/departments exist for alert targets

Do not start LIMS instrument integration until:

- QC worksheet entity exists
- lab instrument/reference standard/reagent masters exist
- raw data attachment model exists

---

## First Implementation Sprint

Recommended first sprint:

1. `V56` supplier pharma fields.
2. Supplier backend DTO/service/controller updates.
3. Supplier frontend form/list updates.
4. Backend tests for supplier qualification status.
5. E2E: procurement/admin creates qualified manufacturer supplier.

Second sprint:

1. `V57` material lifecycle status.
2. `V58` vendor material approval AVL.
3. GRN guard for material active + approved spec.
4. GRN guard for supplier/VBU/AVL qualification.

This gives the fastest visible improvement without destabilizing Sampling/QC immediately.

---

## Related Planning Docs

- [Codex_plan_later.md](./Codex_plan_later.md)
- [IMPLEMENTATION_GAP_ANALYSIS.md](./IMPLEMENTATION_GAP_ANALYSIS.md)
- [SUPPLIER_ENHANCEMENT_REQUIREMENTS.md](./SUPPLIER_ENHANCEMENT_REQUIREMENTS.md)
- [INVENTORY_ISSUE_AND_ADJUSTMENT_DEVELOPMENT_PLAN.md](./INVENTORY_ISSUE_AND_ADJUSTMENT_DEVELOPMENT_PLAN.md)
- [QC_CONTAINER_SAMPLING_RULES.md](./QC_CONTAINER_SAMPLING_RULES.md)
- [QC_SAMPLING_GAP_ANALYSIS.md](./QC_SAMPLING_GAP_ANALYSIS.md)

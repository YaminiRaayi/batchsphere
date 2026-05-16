# BatchSphere Next Development Plan

**Prepared:** 2026-05-11  
**Inputs reviewed:** `BATCHSPHERE_PROJECT_STATUS_2026-04-30.md`, `IMPLEMENTATION_GAP_ANALYSIS.md`, `CODEX_IMPLEMENTATION_EXECUTION_PLAN.md`, `PHASE_6_PLAN_2026-05-11.md`, current code search through migrations V56-V66.  
**Current baseline:** V97 `create_approval_delegation`; V95 retention-sample migration is H2-compatible after removing the PostgreSQL-only UUID default.

---

## 1. Current Truth

The older project status file is useful history, but it is no longer the best source of truth. Several gaps listed there have now been implemented in code.

Implemented or verified in current code:

| Area | Current status |
|---|---|
| Supplier pharma fields | Built in V56 |
| Material lifecycle status | Built in V57 |
| Approved Vendor List | Built in V58 |
| Inventory expiry/retest fields | Built in V59 |
| Inventory issue + FEFO/expiry/retest guards | Built in `InventoryServiceImpl` |
| Sampling consumption deduction | Built in V60 |
| Per-container sampling draw model | Built in V61 |
| Multiple samples per sampling request | Built in V62 |
| Sample chain of custody | Built in V63 |
| QC worksheet entity | Built in V64 |
| QC mandatory worksheet gate before approval | Built in `SamplingServiceImpl` |
| Audit event infrastructure | Built in V65 |
| E-signature record infrastructure | Built in V66; generic `POST /api/e-signatures` API added for reusable approval dialogs |
| GRN source qualification guards | Built in `GrnServiceImpl`: material ACTIVE, approved spec, supplier qualification/GMP, VBU qualification/GMP, AVL |
| GRN CoA review | Built in V67 with review status, reviewer, remarks, arrival temperature, cold-chain, container/label checks, audit event, and GRN detail UI |
| Project overview E2E | Passing for the core flow: quality refs, vendor/VBU/AVL, warehouse/material, GRN, sampling, QC release, issue |

Still genuinely open:

| Area | Gap |
|---|---|
| QMS | Deviation, CAPA workflow extensions, Change Control, Complaints, Risk Register, APQR auto-compilation, QP batch release, and lot traceability are implemented |
| HRMS | Employee entity, user-to-employee linkage, training assignment foundation, and training gate enforcement are implemented |
| Document Control | Controlled document/revision/approval, distribution/acknowledgement, review-date tracking, and MoA SOP revision linkage are implemented |
| Training | Training assignment, role requirement foundation, and SOP/QC operation training gates are implemented |
| Compliance UI | Implemented. `ESignatureDialog` and `AuditTimeline` reusable components built; wired into QC sampling, deviation, GRN, and document approval flows. |
| Dashboard | Implemented. 5 live KPI cards: quarantine lots, pending sampling, open deviations, expiring inventory ≤30d, overdue VBU requalifications. All cards navigate to relevant module pages. |
| LIMS | Equipment/instrument qualification foundation implemented; retention samples implemented; standards, reagents, raw-data traceability still open |
| Alerting | CAPA escalation alerts implemented; broader notification bell remains future polish |

---

## 2. Improvements Before New Feature Work

Do these first so the next phase does not build on stale assumptions.

### Improvement 1: Reconcile docs

Mark `BATCHSPHERE_PROJECT_STATUS_2026-04-30.md` as historical and use this file plus `PHASE_6_PLAN_2026-05-11.md` as the active planning path.

Update stale Phase 6 checklist rows that still show these as open:

- GRN material/supplier/VBU/AVL/spec guards
- QC worksheet mandatory completion gate
- inventory issue expiry/retest guards

### Improvement 2: Add backend regression tests for completed guards

The code exists, but the safety net needs to catch regressions.

Add:

- `GrnEnforcementIntegrationTest`
  - inactive material blocked
  - supplier suspended/disqualified blocked
  - VBU not qualified blocked
  - missing AVL blocked
  - no approved spec blocked
  - approved source passes
- `InventoryIssueGuardIntegrationTest`
  - expired released inventory cannot issue
  - retest-overdue released inventory cannot issue
  - FEFO violation blocked
- `QcWorksheetGateIntegrationTest`
  - QC approval blocked until mandatory rows complete
  - failing result requires closed approved investigation before release

### Improvement 3: Fix known VBU qualification inconsistency

Observed during E2E: a VBU can look approved in UI while backend status remains `CAPA_PENDING`. The E2E currently stabilizes this with an API qualification helper, but product behavior should be fixed.

Implementation status: a regression test now covers the target backend rule: an approved, completed VBU audit sets `qualificationStatus = QUALIFIED`, `isApproved = true`, and requalification dates. If the E2E helper is still needed after this, the remaining bug is likely in the browser flow or selected-site refresh state rather than the service rule.

Target behavior:

- Approved audit or approved qualification action must set `qualificationStatus = QUALIFIED`.
- UI should refresh and show the same status the backend enforces.
- GRN should not require test-only API qualification workarounds.

### Improvement 4: Clarify e-sign API shape

Status: implemented.

The selected API shape is:

- `POST /api/e-signatures` with `{ entityType, entityId, action, username, password, meaning, reason }`
- Keep `GET /api/e-signatures?entityType=&entityId=` for timeline display.

Do not use the older placeholder `POST /api/esignatures/verify` route in new UI work.

---

## 3. Next Development Sequence

### 3A. UX And Frontend Planning Rules

The next implementation work must include UX and frontend planning, not backend-only delivery. Use the existing static mockups in `core/ux-mockups` as the design contract before implementing React pages.

Frontend implementation order for each module:

1. Confirm or update the relevant mockup file.
2. Implement backend migration/API/service/tests.
3. Add UI types and API client methods.
4. Build the React route/page to match the mockup workflow.
5. Add focused E2E coverage only after the UI is stable.

Mockup references:

| Module | Mockup source | React route target |
|---|---|---|
| App shell/nav | `core/ux-mockups/00-shell.html` | shared app shell/sidebar/header |
| Dashboard | `core/ux-mockups/01-dashboard.html` | `/` |
| QMS deviations | `core/ux-mockups/01-qms-mockup.html` | `/qms/deviations`, `/qms/deviations/:id` |
| QMS CAPA board | `core/ux-mockups/03-qms.html` | `/qms/capas`, CAPA panel in deviation detail |
| GRN/CoA | `core/ux-mockups/02-grn.html`, `core/ux-mockups/02b-grn-create.html`, `core/ux-mockups/05-coa-mockup.html` | `/grns`, `/grns/new` |
| WMS | `core/ux-mockups/04-wms.html` | `/warehouse` |
| Sampling/QC | `core/ux-mockups/06-sampling.html` | `/sampling` |
| VMS | `core/ux-mockups/07-vms.html` | `/vendors`, `/vendor-business-units` |
| Materials | `core/ux-mockups/08-materials.html`, `core/ux-mockups/08b-material-create.html` | `/materials`, `/materials/new` |
| Inventory | `core/ux-mockups/09-inventory.html` | `/inventory` |
| Master Data (overview) | `core/ux-mockups/10-masterdata.html` | `/master-data` |
| Spec/MoA | `core/ux-mockups/11-spec-moa.html` | `/master-data/qc-refs/*` |
| HRMS/training | `core/ux-mockups/06-hrms.html`, `core/ux-mockups/03-hrms-mockup.html` | `/admin/employees`, `/training` |
| Document control | `core/ux-mockups/05-documents.html` | `/documents` |
| LIMS | `core/ux-mockups/04-lims-mockup.html`, `core/ux-mockups/08-lims.html` | `/lims` (Phase 8 — not yet built) |
| BPR / Manufacturing | `core/ux-mockups/02-bpr-mockup.html` | `/bpr` (Phase 13 — not yet built) |

Design rules for the React implementation:

- Preserve the operational shell: dense sidebar, compact header, list/detail workflows, status pills, tabs, and action drawers/modals.
- Do not create marketing-style landing pages for internal modules.
- Prefer table/list + detail panel for repeated records, and use a full detail page when the user selects a major record such as deviation, vendor, GRN, document, or employee.
- Reusable compliance components should be built once and reused:
  - `ESignatureDialog`
  - `AuditTimeline`
  - `StatusPill`
  - entity link/source badge for `sourceModule/sourceEntityId`
- Every module page should include empty, loading, error, and permission-denied states.
- E2E should verify realistic role switching where needed: warehouse/procurement/QC/admin.

### Phase 6A: Finish Inbound Compliance

**Goal:** Complete the currently built inbound material flow with formal CoA review and better test coverage.

Ticket 6A.1: GRN CoA Review Workflow

Status: implemented.

- Migration: `V67__add_grn_coa_review_fields.sql`
- Add `CoaReviewStatus`: `PENDING`, `IN_REVIEW`, `ACCEPTED`, `REJECTED`
- Add GRN fields:
  - `coaReviewStatus`
  - `coaReviewedBy`
  - `coaReviewedAt`
  - `coaReviewRemarks`
  - `temperatureOnArrival`
  - `coldChainCompliant`
  - `containerCondition`
  - `labelVerificationStatus`
  - `quantityVarianceReason`
- Add endpoint: `POST /api/grns/{id}/coa-review`
- Add audit event on status change.
- Add UI panel on GRN detail for QC review of CoA and receipt condition.

Ticket 6A.2: Regression Tests For Guard Rails

Status: implemented for current backend guard coverage. Added focused coverage for GRN CoA review, VBU audit qualification consistency, GRN source enforcement, inventory issue guards, and QC worksheet gates.

- GRN regression coverage includes:
  - inactive material blocked
  - suspended supplier blocked
  - unqualified VBU blocked
  - missing approved vendor/material approval blocked
  - missing approved spec blocked
  - approved material-source combination passes
- Inventory issue and QC worksheet gate coverage already exists in the current backend test suite.
- Browser E2E coverage for GRN happy path and role-blocked access is active; deeper blocked-GRN matrix can expand during regression polish.

Ticket 6A.3: VBU Qualification Consistency Fix

Status: backend rule covered by integration test; current UI code refreshes the selected site after audit save and manual qualification updates.

- Fix service/UI state mismatch.
- Add test: audit-approved VBU becomes `QUALIFIED` and can be used in GRN.

Ticket 6A.4: E2E Stabilization For Inbound Compliance

Status: Implemented (2026-05-15) — overview happy path no longer uses the direct VBU qualification API helper; browser flow uses the site qualification action and verifies the qualified state. Existing GRN/auth specs cover role-blocked access and core GRN creation/receive/document/cancel flows.

- Remove test-only API workarounds from inbound happy-path E2E where the browser flow should now support the same behavior.
- Verify VBU qualification updates correctly from the browser flow after audit approval or qualification action.
- Add or repair E2E coverage for blocked GRN creation due to:
  - missing approved vendor/material approval
  - unqualified VBU
  - inactive material
  - missing approved specification
- Confirm GRN source qualification errors are visible and understandable in the UI.
- Re-run the project overview happy path after fixes:
  - quality refs
  - vendor/VBU/AVL
  - warehouse/material
  - GRN/CoA
  - sampling/QC release
  - inventory issue
- Done means the E2E no longer depends on direct API qualification helpers for normal product behavior.

---

### Phase 6B: QMS Foundation

**Goal:** Start QMS with only the parts needed by current QC/warehouse deviations.

Ticket 6B.1: Deviation Module

Status: implemented.

- Migration: `V68__create_qms_deviation.sql`
- Entity: `Deviation`
- Fields: number, title, description, severity, status, source module/entity, detected by/at, root cause, immediate action, closure metadata.
- API:
  - `POST /api/deviations`
  - `GET /api/deviations`
  - `GET /api/deviations/summary`
  - `GET /api/deviations/{id}`
  - `PUT /api/deviations/{id}`
  - `PUT /api/deviations/{id}/status`
- UI:
  - `/qms/deviations`
  - `/qms/deviations/:deviationId`
  - Implemented from `core/ux-mockups/01-qms-mockup.html`.
  - List page: KPI strip, search, status/severity/source filters, deviation table/list, create drawer.
  - Detail page: overview, investigation, root cause, impact assessment, audit timeline, e-sign closure action.
  - Closure uses the generic e-sign backend path through `PUT /api/deviations/{id}/status`.
- Integration:
  - Add "Escalate to Deviation" from QC investigation.
  - Later, GRN rejection and temperature excursions can create deviation candidates.
- Frontend files expected:
  - `core/ui/src/types/deviation.ts`
  - `core/ui/src/features/qms/DeviationListPage.tsx`
  - `core/ui/src/features/qms/DeviationDetailPage.tsx`
  - API methods in `core/ui/src/lib/api.ts`
  - Sidebar route under Quality.
- E2E:
  - create deviation from QMS page
  - open detail page from list
  - update investigation/root cause
  - close with e-sign

Ticket 6B.2: CAPA Module

Status: implemented.

- Migration: `V69__create_qms_capa.sql`
- Entity: `Capa`
- Link CAPA to deviation.
- Status flow: `OPEN -> IN_PROGRESS -> COMPLETED -> EFFECTIVENESS_CHECK -> CLOSED`
- UI inside deviation detail and `/qms/capas`.
- Implemented from `core/ux-mockups/03-qms.html` for CAPA board/list behavior.
- Closure uses e-signature on `QMS_CAPA` with action `CLOSE_CAPA`.
- Creating a CAPA moves the linked deviation to `CAPA_IN_PROGRESS`.
- Frontend:
  - CAPA section inside deviation detail for linked CAPAs.
  - `/qms/capas` board.
  - Create CAPA from deviation detail with owner, due date, corrective action, preventive action, effectiveness check.
- E2E:
  - create CAPA linked to deviation
  - move CAPA through status flow
  - verify deviation shows linked CAPA state

Ticket 6B.3: CAPA Approval Workflow

Status: implemented.

- Add approval statuses such as `PENDING_APPROVAL`, `APPROVED`, and `REJECTED` or add an approval sub-status if the current CAPA lifecycle should remain unchanged.
- Add submit-for-approval action after CAPA action plan completion.
- Add QA/QC manager approval and rejection with comments.
- Require e-sign for approval/rejection decisions.
- Record audit events for submission, approval, rejection, and resubmission.
- UI:
  - approval action panel on CAPA detail
  - approval queue/filter on `/qms/capas`
  - clear rejected state with comments and resubmit action
- Tests:
  - owner can submit CAPA for approval
  - QC/QA manager can approve/reject with e-sign
  - unauthorized role cannot approve

Ticket 6B.4: CAPA Ownership, Assignment, And Reassignment

Status: implemented.

- Replace free-text owner with employee/user ownership once HRMS employee records exist.
- Add reassignment action with reason, previous owner, new owner, assigned by, assigned at.
- Maintain reassignment history.
- Add due-date accountability by owner and department.
- UI:
  - owner selector using employees
  - reassignment drawer/modal with reason
  - ownership history timeline
- Tests:
  - CAPA can be assigned to an active employee
  - reassignment requires reason
  - inactive employee cannot receive new CAPA ownership

Ticket 6B.5: CAPA Attachments And Evidence

Status: implemented.

- Add attachment records for CAPA evidence:
  - investigation evidence
  - corrective action proof
  - preventive action proof
  - effectiveness check evidence
- Store file metadata, uploaded by, uploaded at, stage/purpose, version/reference.
- Record audit events when evidence is uploaded or removed.
- UI:
  - evidence upload area on CAPA detail
  - grouped evidence list by CAPA stage
  - preview/download actions where supported
- Tests:
  - upload evidence for a CAPA stage
  - evidence appears on CAPA detail
  - closed CAPA evidence changes are restricted or audited based on policy

Ticket 6B.6: CAPA Effectiveness Review Expansion

Status: implemented.

- Add scheduled effectiveness review date.
- Add effectiveness reviewer assignment.
- Add pass/fail outcome and reviewer comments.
- If effectiveness fails, support reopening the CAPA or creating a linked follow-up CAPA/deviation.
- Require e-sign for final effectiveness pass/fail.
- UI:
  - effectiveness review section on CAPA detail
  - due/overdue effectiveness review filters on CAPA board
  - failed effectiveness follow-up action
- Tests:
  - CAPA cannot close before effectiveness review when required
  - failed review creates or links follow-up work
  - passed review allows final closure with e-sign

Ticket 6B.7: Recurring CAPA And Deviation Analytics

Status: implemented.

- Add recurrence detection by root cause, department, source module, material, supplier/vendor, and location.
- Add trend summaries:
  - repeated root causes
  - high-frequency departments
  - overdue CAPAs
  - CAPA closure aging
  - repeat deviations by source
- UI:
  - QMS analytics dashboard
  - trend cards and filters
  - drill-down from metric to record list
- Tests:
  - summary endpoint calculates open/overdue/recurring counts
  - filters return expected grouped records

Ticket 6B.8: CAPA Escalation Alerts

Status: Implemented (2026-05-15) — `GET /api/capas/alerts` computes due-soon, overdue, and overdue-effectiveness alerts; CAPA summary includes alert counts; CAPA board shows escalation alert cards.

- Add due-soon and overdue escalation rules.
- Escalate to owner, owner manager, and QA/QC manager based on thresholds.
- Add alert records and notification delivery once alerting exists.
- UI:
  - alert badge/count on CAPA board
  - overdue escalation panel on CAPA detail
  - escalation history timeline
- Tests:
  - due-soon CAPA creates alert
  - overdue CAPA escalates to configured role/manager
  - closed/cancelled CAPA does not continue escalating

Ticket 6B.9: Change Control Module

Status: implemented.

- Add change control entity and workflow for controlled changes to materials, specifications, vendors, warehouse/processes, documents, and system configuration.
- Include impact assessment, affected entities, risk classification, approval routing, implementation tasks, effectiveness verification, and closure e-sign.
- UI:
  - `/qms/change-controls`
  - change control detail page
  - affected entity selector/linking
  - approval and implementation task panels
- Tests:
  - create change control linked to affected entity
  - approval requires authorized role and e-sign
  - closure blocked until implementation tasks and effectiveness checks are complete

---

### Phase 6C: HRMS Foundation

**Goal:** Create real people/site/department context before training and alerts.

Ticket 6C.1: Employee Entity

Status: implemented.

- Migration: `V70__create_employee.sql`
- Entity: `Employee`
- Link users to employees.
- Seed employees for current dev users:
  - `admin`
  - `warehouse.op`
  - `procurement.user`
  - `qc.analyst`
  - `qc.manager`
- API: `/api/employees`
- UI: `/hrms/employees`
- Match `core/ux-mockups/06-hrms.html` and `core/ux-mockups/03-hrms-mockup.html`.
- Frontend:
  - employee directory with search/filter by site, department, role, active status
  - employee detail panel/page with profile, linked user account, training snapshot, qualification status
  - admin create/edit employee drawer
- Implemented route: `/hrms/employees`
- User Management now links users to employees through an employee selector instead of raw UUID entry.
- E2E:
  - admin creates employee
  - admin links user to employee
  - employee appears in directory and detail page

Ticket 6C.2: Auth Hardening

- Status: Implemented.
- Migration: `V71__add_user_security_fields.sql`
- Add failed login attempts, lockout, password changed at, force password change.
- Add unlock endpoint for SUPER_ADMIN.
- Frontend:
  - user management page should show locked/force password change state.
  - admin action to unlock user.
  - login page should show clear lockout/force-reset messaging when backend supports it.
- Implemented:
  - failed login attempts are persisted and reset after successful login.
  - user accounts lock for 15 minutes after 5 failed login attempts.
  - SUPER_ADMIN can unlock a locked account through `POST /api/auth/users/{id}/unlock`.
  - User Management shows failed attempts, locked state, and password-change-required state.
  - edit user form can set force-password-change, and password reset clears lockout state.
  - login page displays lockout and force-reset messages from the backend-supported auth response.

---

### Phase 6D: Document Control MVP

**Goal:** Create controlled SOP/document records instead of loose file paths.

Ticket 6D.1: Controlled Documents

Status: Implemented.

- Migration: `V72__create_controlled_document.sql`
- Entities:
  - `ControlledDocument`
  - `DocumentRevision`
  - `DocumentApproval`
- Approval should record an e-signature.
- UI: `/documents`
- Match `core/ux-mockups/05-documents.html`.
- Frontend:
  - document list with type/status/search filters
  - document detail with current revision, revision history, approval steps, distribution state
  - upload/new revision flow
  - approval action using `ESignatureDialog`
  - audit timeline in detail
- E2E:
  - create draft document
  - submit/approve revision with e-sign
  - verify approved/current version in list
- Implemented:
  - `ControlledDocument`, `DocumentRevision`, and `DocumentApproval` backend model/API.
  - draft creation with initial `v1.0` revision and two approval steps.
  - revision submit-to-review workflow.
  - technical review and QA approval with electronic signature records.
  - final approval promotes the revision to current/effective and calculates next review date.
  - `/documents` UI with search/type/status filters, revision history, approval workflow, new revision flow, distribution placeholder, and audit timeline.
  - integration test coverage for create, submit, approve, e-signature creation, and list search.

Ticket 6D.2: Distribution And Acknowledgment

Status: Implemented.

- Migration: `V73__create_document_distribution.sql`
- Assign approved document revisions to users.
- Users acknowledge assigned SOPs.
- Add `sopDocumentId` link from MoA to controlled document revision.
- Frontend:
  - distribution tab on document detail
  - "My Documents" or "My Acknowledgments" user view
  - acknowledgement action with date/user trail
- E2E:
  - admin distributes SOP
  - assigned user acknowledges SOP
  - document detail shows acknowledgment status
- Implemented:
  - `DocumentDistribution` backend model/API for assigning current approved revisions to users.
  - document distribution list on document detail.
  - "My Acknowledgments" panel on `/documents`.
  - assigned-user acknowledgment action with password-backed e-signature and acknowledgement timestamp.
  - audit event coverage for distribution and acknowledgement actions.
  - integration test coverage for document approval, distribution, acknowledgement, e-signature creation, and my-acknowledgements retrieval.
- Deferred:
  - formal MoA `sopDocumentId`/revision linkage remains for the MoA enhancement pass, because current MoA records still use code-level linkage.

Ticket 6D.3: Fix Document Approval E-Sign Flow

Status: implemented.

Root cause: `ApprovalDialog` in `DocumentsPage.tsx` uses `ESignatureDialog` which only calls `POST /api/e-signatures` (records signature). `approveDocumentRevision` is never called, so `DocumentApproval` status stays `PENDING` and the document revision never advances from `IN_REVIEW`.

Dead code to remove in `DocumentsPage.tsx`:
- `signaturePassword` state
- `approvalComments` state (parent scope)
- `approvalMutation`

Fix:
- Remove `ApprovalDialog` component and its `ESignatureDialog` wrapper.
- Restore inline approval form inside the "Approval Workflow" panel that calls `approvalMutation` directly using `approveDocumentRevision`.
- `approveDocumentRevision` backend endpoint already records the e-signature internally — no separate `ESignatureDialog` needed.
- Clean up orphaned state vars.

Files:
- `core/ui/src/features/documents/DocumentsPage.tsx`

Tests:
- Verify "Approve With E-sign" button advances revision from `IN_REVIEW` → `APPROVED` (or `EFFECTIVE` on final approval step).
- Verify e-signature record is created.
- Verify document status reflects approval in the list.

Ticket 6D.4: Document Control UI Polish

Status: implemented.

Minor gaps found in `DocumentsPage.tsx`:
- "My Acknowledgments" panel uses `.slice(0, 4)` with no "View all" link — truncates silently.
- Distribution form uses comma-separated free-text input for usernames — `managedUsers` datalist exists but multi-select checkboxes would be cleaner UX.
- `RevisionCard` shows `revision.fileName` as plain text — should be a download link calling `GET /api/documents/{id}/revisions/{revId}/file`.

Fix:
- Add "View all" toggle or link in "My Acknowledgments" panel.
- Replace comma-text input with checkbox list of active managed users in distribution form.
- Make `revision.fileName` a download anchor when present.

Files:
- `core/ui/src/features/documents/DocumentsPage.tsx`

---

### Phase 6E: Training

**Goal:** Prepare training records before enforcing training gates.

Ticket 6E.1: Training Assignment

Status: Implemented.

- Migration: `V74__create_training_assignment.sql`
- Entities:
  - `TrainingAssignment`
  - `RoleQualificationRequirement`
- API:
  - `GET /api/training/my-assignments`
  - `PUT /api/training/assignments/{id}/complete`
- UI:
  - My Training
  - Admin assignment view
- Match HRMS/training areas in `core/ux-mockups/06-hrms.html`.
- Frontend:
  - employee detail training tab
  - My Training queue
  - admin assignment list with due/overdue filters
  - training completion action, later with e-sign if required by SOP type
- E2E:
  - admin assigns training
  - user completes training
  - admin sees completed/overdue state
- Implemented:
  - `TrainingAssignment` backend model/API with employee, assigned username, due date, optional controlled document/revision, role, completion comments, and status.
  - `RoleQualificationRequirement` backend model/API for role-based training requirements before enforcement gates are added.
  - `/api/training/my-assignments` user queue.
  - `/api/training/assignments/{id}/complete` completion action by assigned user.
  - `/hrms/training` UI with admin assignment view, My Training queue, and role requirement setup.
  - employee qualification status and training dates are updated when training is assigned/completed.
  - integration test coverage for assign, my queue, complete, requirement create, and requirement list.

Training gates should come after this MVP is stable:

- sampling start requires sampling SOP training
- QC result entry requires analyst training
- QC approval requires manager/reviewer qualification

---

### Phase 6F: Compliance UI Catch-Up

**Goal:** Make the already-built compliance backend visible and usable.

Ticket 6F.1: Reusable E-Signature Dialog

Status: implemented.

- `core/ui/src/components/ESignatureDialog.tsx` built.
- Props: `entityType`, `entityId`, `action`, `defaultMeaning`, `reason`, `onSigned`, `visible`, `onClose`.
- Calls `POST /api/e-signatures` with password-verified credentials.
- Wired into: QC final approval/rejection (`SamplingPage`), deviation closure (`DeviationDetailPage`).

Ticket 6F.2: Audit Timeline

Status: implemented.

- `core/ui/src/components/AuditTimeline.tsx` built.
- Reads `GET /api/audit-events?entityType=&entityId=` via React Query.
- Color-coded by event type: CREATE, UPDATE, STATUS_CHANGE, E_SIGNATURE, WORKFLOW_ACTION.
- Wired into: `SamplingPage`, `GrnPage`, `DeviationDetailPage`, `DocumentsPage`.

Ticket 6F.3: Dashboard Live KPIs

Status: implemented.

- Backend: added `countExpiringBetween` JPQL query to `InventoryRepository`; added `expiringIn30Days` to `InventorySummaryResponse`; updated `InventoryServiceImpl.getInventorySummary()`.
- Frontend type: added `expiringIn30Days: number` to `InventorySummary`.
- Dashboard now shows 5 live KPI cards:
  - Quarantine Lots → `/inventory`
  - Pending Sampling → `/qc/sampling`
  - Open Deviations → `/qms/deviations`
  - Expiring ≤30d → `/inventory`
  - Overdue Audits → `/master-data/partners/vendors`
- Role-gated: each card shows "—" for roles without access.

---

### Phase 6G: Pharma Compliance Gap Backfill

**Goal:** Close regulatory gaps identified after Phase 6B. Each ticket has a specific FDA/EU GMP anchor. Ordered by criticality: fix blockers first, then quick audit-trail wins, then deeper workflow gaps.

---

Ticket 6G.1: Fix Pre-Existing Backend Compile Errors

Status: implemented. Backend compiles clean and the existing backend test suite passes with 97 tests.

Regulatory basis: Blocker. Backend compile failures prevent running integration tests that validate safety guards — a prerequisite for pharma audit readiness.

Backend:
- Fix `AuthDataInitializer.java` compile error. Root cause: constructor/builder mismatch after 6C.2 added security fields (`failedLoginAttempts`, `lockedUntil`, `forcePasswordChange`, `passwordChangedAt`) to `User` — seeded user builder calls are likely missing these.
- Fix `BatchServiceImpl.java` compile error. Root cause: partial batch service implementation references missing fields or methods.
- Run `./mvnw compile` and confirm zero errors across all packages.

Tests:
- `./mvnw test` runs without compile-skip failures.

Done means:
- Backend compiles clean.
- All existing integration tests run.

---

Ticket 6G.2: Audit Timeline Wiring — CAPA and Change Control

Status: implemented. CAPA and Change Control detail pages show audit timelines; CAPA transitions already record audit events; Change Control task and affected-entity actions now record audit events; focused integration coverage verifies CAPA approval and Change Control closure are visible through `/api/audit-events`.

Regulatory basis: FDA 21 CFR Part 11 §11.10(e) requires computer-generated, time-stamped audit trails for all CAPA records and controlled change records. `AuditTimeline` component exists and is wired to deviation, sampling, GRN, and documents — but CAPA detail and Change Control detail are missing it.

Backend:
- Verify `AuditEventService.record(...)` is called for every CAPA state transition: submit-for-approval, approve, reject, effectiveness scheduling, effectiveness outcome, reassign, closure.
- Verify audit events fire for every Change Control transition: submit-for-review, approve, reject, move-to-implementation, all task status updates, close, cancel.
- Add any missing `AuditEventService` calls in `CapaServiceImpl` and `ChangeControlServiceImpl`.

Frontend:
- Add `<AuditTimeline entityType="QMS_CAPA" entityId={selectedCapa.id} />` to CAPA detail panel in `CapaBoardPage.tsx`, as a collapsible section consistent with `DeviationDetailPage`.
- Add `<AuditTimeline entityType="CHANGE_CONTROL" entityId={selectedCC.id} />` to Change Control detail in `ChangeControlPage.tsx`.

Tests:
- CAPA approval generates an audit event visible in timeline response.
- Change Control closure generates an audit event visible in timeline response.

Done means:
- CAPA detail shows complete action history in audit timeline.
- Change Control detail shows complete action history in audit timeline.
- No regulated CAPA or CC action is missing from the audit trail.

---

Ticket 6G.3: Dashboard QMS/Compliance KPI Expansion

Status: implemented. `/api/qms/analytics` now returns open change controls, pending CC approvals, overdue CAPA effectiveness checks, documents awaiting review, and overdue training assignments. Dashboard cards are wired for QMS health and training, and focused integration coverage verifies the new analytics counts.

Regulatory basis: FDA QSIT and EU GMP Chapter 1 require management review of quality metrics. Current dashboard shows inbound/inventory KPIs but does not surface QMS operational health metrics that a QC Manager needs daily.

Backend:
- Extend `QmsAnalyticsResponse` (or `GET /api/qms/analytics`) to include:
  - `openChangeControls`: count of change controls not in `CLOSED` or `CANCELLED`
  - `pendingCCApprovals`: count of change controls in `UNDER_REVIEW`
  - `overdueEffectivenessChecks`: count of CAPAs in `EFFECTIVENESS_CHECK` with `effectivenessReviewDate < today`
  - `documentsAwaitingReview`: count of `ControlledDocument` records where `nextReviewDate ≤ today`
  - `overdueTrainingAssignments`: count of `TrainingAssignment` records past `dueDate` with status not `COMPLETED`
- Compute counts from existing repositories; no new migration needed.

Frontend:
- `DashboardPage.tsx`: add up to 4 new KPI cards below existing row:
  - Open Change Controls → `/qms/change-controls`
  - Overdue Effectiveness Reviews → `/qms/capas`
  - Documents Due for Review → `/documents`
  - Overdue Training → `/hrms/training`
- Cards are role-gated: `QC_MANAGER` + `SUPER_ADMIN` see QMS cards; all roles see their own overdue training card.

Tests:
- Analytics endpoint returns new counts with correct values.
- Dashboard cards render with correct numbers.

Done means:
- QC Manager sees live QMS health on one screen without navigating module-by-module.

---

Ticket 6G.4: Document Review Date Tracking

Status: Implemented (2026-05-15) — V80/V72-era document review fields exist; `ControlledDocumentController` exposes `/api/documents/due-for-review`; `DocumentsPage` shows review status and due-for-review data.

Regulatory basis: EU GMP Chapter 4.7 states documents must be reviewed and updated periodically. SOPs past their review date are effectively uncontrolled documents under GMP. FDA 211.68 requires regular review of lab records procedures.

Migration: `V80__add_document_review_tracking.sql`
- `ALTER TABLE controlled_document ADD COLUMN review_interval_months INT NOT NULL DEFAULT 24`
- `ALTER TABLE controlled_document ADD COLUMN next_review_date DATE`
- `ALTER TABLE controlled_document ADD COLUMN review_status VARCHAR(30) DEFAULT 'CURRENT'` — values: `CURRENT`, `DUE_FOR_REVIEW`, `OVERDUE`

Backend:
- On document final approval (revision promoted to `EFFECTIVE`): compute `nextReviewDate = effectiveDate + reviewIntervalMonths months`, set `reviewStatus = CURRENT`.
- `DocumentServiceImpl.list()` or a scheduler: derive `reviewStatus` from `nextReviewDate` vs today on each read.
- Add `GET /api/documents/due-for-review` returning documents where `nextReviewDate ≤ today + 30 days`.

Frontend:
- Document list in `DocumentsPage.tsx`: add `Next Review` date column and `reviewStatus` badge (`CURRENT` green, `DUE_FOR_REVIEW` amber, `OVERDUE` red).
- Add "Due for Review" filter tab on document list.
- Document detail: show `Review Interval` and `Next Review Date` in metadata section.

Tests:
- Approved document with 24-month interval gets `nextReviewDate = effectiveDate + 24 months`.
- Document past `nextReviewDate` appears in `due-for-review` endpoint.

Done means:
- No SOP can silently age past its review date without visibility.
- Due-for-review documents are filterable and will feed the dashboard KPI in 6G.3.

---

Ticket 6G.5: GRN Rejection → Deviation Auto-Creation

Status: Implemented (2026-05-15) — V91 `add_grn_linked_deviation`, `GrnServiceImpl` auto-creates linked GRN deviations, GRN DTO/UI show `linkedDeviationId`/`linkedDeviationNumber`, and traceability includes linked deviation data.

Regulatory basis: EU GMP Chapter 6.14 requires that material rejection events be investigated and documented. Manual deviation creation after a GRN rejection creates a traceability gap — the investigation record must be automatically linked to the triggering event.

Backend:
- In `GrnServiceImpl`: when GRN status transitions to `REJECTED` or `coaReviewStatus` is set to `REJECTED`:
  - Auto-create a `Deviation`:
    - `sourceModule = "GRN"`, `sourceEntityId = grn.id`
    - `title = "GRN Rejection: " + grn.grnNumber`
    - `severity = MAJOR` (default; QC can change)
    - `status = OPEN`
    - `detectedBy = currentActor`, `detectedAt = now()`
    - `description = "Auto-created from GRN rejection. GRN: [number], Material: [name], Supplier: [name]"`
  - Include `linkedDeviationId` and `linkedDeviationNumber` in the GRN response DTO.
- Optional: if `temperatureExcursionFlag` boolean is added to GRN, also auto-create a deviation titled `"Temperature Excursion: " + grn.grnNumber`.

Frontend:
- After GRN rejection or CoA rejection, show toast: `"Deviation [DEV-XXXX] automatically created."`
- GRN detail page: add "Linked Deviations" section showing deviation number + status as a clickable link to `/qms/deviations/{id}`.

Tests:
- GRN rejection creates a `Deviation` with `sourceModule = "GRN"` and correct `sourceEntityId`.
- CoA review rejection creates a `Deviation` linked to the same GRN.
- Auto-created deviation is visible in deviation list.

Done means:
- Every rejected GRN has a traceable deviation record with no manual step required.
- Deviation → GRN source link is navigable in both directions.

---

Ticket 6G.6: MoA → Controlled SOP Document Linkage

Status: Implemented (2026-05-15) — V92 `add_moa_sop_document_link`, `Moa` entity/DTO/service support `sopDocumentId` and SOP document metadata, and `SpecMoaPage` exposes SOP document linkage.

Regulatory basis: EU GMP Chapter 6.9 requires QC test methods to reference approved analytical procedures. An MoA without a link to its controlling analytical SOP is a traceability gap under GMP inspection.

Migration: `V81__add_moa_sop_document_link.sql`
- `ALTER TABLE moa ADD COLUMN sop_document_id UUID REFERENCES controlled_document(id)`
- `ALTER TABLE moa ADD COLUMN sop_revision_id UUID REFERENCES document_revision(id)`

Backend:
- Add `sopDocumentId`, `sopRevisionId` to `Moa` entity and `MoaResponse`.
- `MoaServiceImpl.update()`: if `sopDocumentId` provided, validate that the document has status `EFFECTIVE`; reject if not.
- `MoaResponse` should include linked document title, document number, revision number, effective date.

Frontend:
- MoA create/edit form: add "Linked SOP" search-selector filtered to `ControlledDocument` with `status = EFFECTIVE`.
- MoA detail: show linked SOP name, revision, and effective date with a link to `/documents`.
- Spec/MoA listing page: show a chain-link icon on MoAs that have a linked SOP.

Tests:
- MoA can be linked to an effective controlled document.
- Linking to a non-effective document is rejected with a clear error.
- MoA response includes linked document metadata.

Done means:
- Every MoA traces to its controlling analytical procedure SOP.
- Inspectors can follow MoA → SOP revision path without manual lookups.

---

Ticket 6G.7: Training Gate Enforcement for Sampling and QC Operations

Status: Implemented (2026-05-15) — `TrainingGateService.assertTrainedForRequirement` wired into `SamplingServiceImpl` at startSampling (SAMPLING_SOP), enterQcResult (QC_ANALYST_TRAINING), finalDisposition (QC_MANAGER_QUALIFICATION). Training gate error propagates to frontend via BusinessConflictException.

Regulatory basis: EU GMP Chapter 2.8–2.9 and FDA 211.68 require that personnel performing regulated operations are qualified for those operations. `TrainingAssignment` and `RoleQualificationRequirement` records exist but no enforcement gate blocks an untrained analyst from starting sampling or entering QC results.

Backend:
- Add `TrainingGateService.assertTrainedForRequirement(String username, String requirementKey)`:
  - Look up `RoleQualificationRequirement` by `requirementKey`.
  - Check `TrainingAssignment` for actor with matching requirement and status `COMPLETED`.
  - Throw `BusinessConflictException("User is not qualified for: " + requirementKey)` if not trained.
- Wire gate into `SamplingServiceImpl`:
  - `startSampling(...)`: assert `SAMPLING_SOP` training for the assigned sampler username.
  - `enterQcResult(...)`: assert `QC_ANALYST_TRAINING` for the actor entering results.
  - `finalDisposition(...)`: assert `QC_MANAGER_QUALIFICATION` for the approving actor.

Frontend:
- When a sampling/QC operation fails the training gate, show error: `"[Name] is not qualified for [SAMPLING_SOP]. Assign training in HRMS → Training."`
- Employee detail training tab: show qualification requirement status — met/pending per `RoleQualificationRequirement`.

Tests:
- Sampling start blocked when sampler has no completed `SAMPLING_SOP` training assignment.
- Sampling start succeeds after training is marked completed.
- QC result entry blocked for analyst without `QC_ANALYST_TRAINING`.

Done means:
- Untrained personnel cannot perform regulated sampling or QC operations at the system boundary.
- Training gate error message points to the resolution path.

---

Ticket 6G.8: OOS/OOT Investigation Two-Phase Workflow

Status: Implemented (2026-05-15) — V93 migration adds phase columns to qc_investigation; CompletePhase1Request/CompletePhase2Request DTOs; QcPhase1Outcome enum; phase1/phase2 endpoints in SamplingController; phase 1 + phase 2 UI panels in SamplingPage with oot_flag toggle.

Regulatory basis: FDA OOS Guidance (2006) and EU GMP Chapter 6.15–6.18 define a mandatory two-phase investigation for Out-of-Specification results. Phase 1 is the laboratory investigation (instrument, analyst, calculation errors). Phase 2 is the full investigation (batch, process, raw materials). Current `QcInvestigation` is a single-step record with no phase structure, which does not meet the FDA OOS procedure requirement.

Migration: `V82__add_oos_investigation_phases.sql`
- Add to `qc_investigation`:
  - `investigation_phase VARCHAR(30)` — `PHASE_1_LAB` | `PHASE_2_FULL` | `COMPLETED`
  - `phase1_outcome VARCHAR(30)` — `ASSIGNABLE_CAUSE_FOUND` | `NO_ASSIGNABLE_CAUSE` | `INVALID_RESULT`
  - `phase1_root_cause TEXT`
  - `phase1_completed_by VARCHAR(100)`, `phase1_completed_at TIMESTAMP`
  - `phase2_required BOOLEAN DEFAULT FALSE`
  - `oot_flag BOOLEAN DEFAULT FALSE`
  - `retest_authorized BOOLEAN DEFAULT FALSE`, `retest_sample_count INT`

Backend:
- `QcInvestigationServiceImpl.completePhase1(...)`:
  - `ASSIGNABLE_CAUSE_FOUND` → close investigation, link root cause to correction.
  - `NO_ASSIGNABLE_CAUSE` → set `phase2Required = true`, advance to `PHASE_2_FULL`.
  - `INVALID_RESULT` → set `retestAuthorized = true`, allow retest sample creation.
- `QcInvestigationServiceImpl.completePhase2(...)`: require root cause category, optional CAPA link, final outcome. Close requires e-sign by QC Manager.
- Phase 1 completion requires analyst role; Phase 2 closure requires QC Manager e-sign.

Frontend:
- QC investigation panel on `SamplingPage`:
  - Phase 1 section: lab check fields, outcome dropdown, "Complete Phase 1" action.
  - Phase 2 section (visible only when `phase2Required = true`): full investigation fields, CAPA link, e-sign close.
  - OOT flag toggle at top of investigation form.
- Investigation status pill: `PHASE_1` / `PHASE_2` / `COMPLETED` / `INVALID_RESULT`.

Tests:
- Phase 1 with `NO_ASSIGNABLE_CAUSE` advances to Phase 2.
- Phase 1 with `INVALID_RESULT` allows retest.
- Phase 2 closure with e-sign marks investigation `COMPLETED`.
- QC disposition blocked until Phase 2 investigation is `COMPLETED`.

Done means:
- OOS investigation follows the FDA two-phase structure.
- Phase transition is explicit and audited.
- OOT results are flagged and tracked separately from OOS.

---

Ticket 6G.9: Lot/Batch Traceability View

Status: Implemented (2026-05-15) — `GET /api/lots/{searchKey}/traceability` searches by GRN number or vendor batch and returns GRN receipt, CoA review, sampling, QC worksheet/results, disposition, inventory transactions, deviations, CAPAs, and a chronological timeline. Frontend page `/qms/traceability` exists with search, timeline, status badges, and source navigation.

Regulatory basis: EU GMP Annex 15 and FDA 211.188 require that for any lot, the complete material history from receipt to disposition be reconstructable. Currently no single view shows a lot's full journey without navigating across 4–5 separate module pages.

Backend:
- No migration. Uses existing entities.
- Add `GET /api/lots/{lotNumber}/traceability` returning `LotTraceabilityResponse`:
  - GRN record and line item (grnNumber, materialName, supplierName, receivedDate, receivedQty, status)
  - All GRN containers (containerNumber, quantity, condition)
  - CoA review status and reviewer
  - Sampling requests linked to this GRN/lot (samplingRequestNumber, requestedDate, status)
  - QC worksheet(s) and test results summary (pass/fail per parameter)
  - QC disposition outcome (released/rejected/quarantine, by whom, at when)
  - Inventory transactions (receipt, sampling consumption, issues, adjustments) in chronological order
  - Linked deviations (by `sourceEntityId = grnId` or `sourceEntityId = samplingRequestId`)
  - Linked CAPAs via those deviations
- Implement via service joins across GRN, inventory, sampling, deviation, CAPA repositories.

Frontend:
- New page: `/qms/traceability`.
- Search field: lot number or GRN number. Show a vertical timeline after search:
  - GRN Received → CoA Reviewed → Sampled → QC Tested → Disposition → Inventory Transactions → Deviations/CAPAs
  - Each step: date, actor, status pill, link to full record in respective module.
- Add nav item in Quality sidebar: "Traceability".

Tests:
- Traceability endpoint returns all linked records for a lot that has gone through full GRN → QC → issue flow.
- Lot with OOS result shows linked deviation in the traceability response.

Done means:
- QC Manager can reconstruct a lot's complete history in one view for inspection readiness.
- Source link from each traceability event to its full record is navigable.

---

Ticket 6G.10: Change Control Affected Entity Navigation and Display

Status: Implemented (2026-05-15) — V94 `add_cc_affected_entity_display_fields`, `ChangeControlServiceImpl` resolves display names/numbers/navigation paths, response DTO includes them, and `ChangeControlPage` renders readable affected-entity labels/links.

Regulatory basis: EU GMP Chapter 13 requires each change record to explicitly identify the controlled items being changed. Currently `ChangeControlAffectedEntity` stores only `affectedEntityType` (enum) and `affectedEntityId` (raw VARCHAR). There are no human-readable names and no navigation links — raw UUIDs are not inspection-readable.

Migration: `V83__add_cc_affected_entity_display_fields.sql`
- `ALTER TABLE qms_change_control_affected_entity ADD COLUMN entity_display_name VARCHAR(255)`
- `ALTER TABLE qms_change_control_affected_entity ADD COLUMN entity_number VARCHAR(100)`

Backend:
- `ChangeControlServiceImpl.addAffectedEntity(...)`: resolve display name and entity number from actual entity tables based on `entityType`:
  - `SPECIFICATION` → look up `Spec` by id → `entityDisplayName = spec.specCode + ": " + spec.title`, `entityNumber = spec.specCode`
  - `DOCUMENT` → look up `ControlledDocument` → display name and document number
  - `MATERIAL` → look up `Material` → material code + name
  - `VENDOR_BU` → look up `VendorBusinessUnit` → site name + vendor name
  - Other types → accept `entityDisplayName` from request body
- Include `entityDisplayName`, `entityNumber`, `navigationPath` (e.g. `/master-data/qc-refs/specs/{id}`) in `ChangeControlAffectedEntityResponse`.

Frontend:
- `ChangeControlPage.tsx` affected entity list: replace raw `entityId` with `entityDisplayName` + `entityNumber` badge.
- Each entity row: clickable link using `navigationPath` to navigate to the actual entity.
- "Add Affected Entity" form: for Material, Specification, Document, VendorBU types — show search/autocomplete picker that resolves to a real entity id + display name instead of manual UUID text entry.

Tests:
- Adding a `SPECIFICATION` affected entity resolves and stores spec code + title.
- Adding a `DOCUMENT` affected entity resolves and stores document title + number.
- `navigationPath` in response is correct for each entity type.

Done means:
- Change Control records show human-readable entity names.
- Inspectors can click from Change Control directly to the changed item.
- No raw UUIDs visible in the Change Control workflow.

---

## 4. Phase 7+ Roadmap

Defer these until Phase 6 is stable.

| Phase | Module | Why later |
|---|---|---|
| Phase 7 | Alert Center | Needs employee, training, document, supplier, inventory ownership |
| Phase 8 | LIMS Foundation | Needs worksheet model stable; then add instrument/reference standard/reagent/raw data |
| Phase 9 | Change Control | Needed before full regulated master-data lifecycle |
| Phase 10 | Environmental Monitoring | Better after QMS deviation exists |
| Phase 11 | Cycle Count / Physical Verification | WMS hardening after inventory/QMS baseline |
| Phase 12 | Recall Traceability | More valuable once manufacturing/BPR exists |
| Phase 13 | BPR / Manufacturing | Large module; should wait until QMS, HRMS, documents, and LIMS are stronger |

---

## 5. Regulatory Anchors Used For Planning

This is not legal advice, but these references shape the technical priorities:

- FDA 21 CFR Part 11 and FDA Part 11 guidance emphasize validation, audit trails, record retention/retrieval, and electronic signatures for regulated electronic records.
- EU GMP Annex 11 emphasizes risk management, validation, identity/access management, audit trails, electronic signatures, backup, archiving, personnel/training, and supplier/service management.
- EU GMP Volume 4 includes Chapter 4 Documentation, Chapter 6 Quality Control, Annex 8 Sampling of Starting and Packaging Materials, Annex 11 Computerised Systems, and Annex 19 Reference and Retention Samples. These directly support prioritizing document control, QC worksheet traceability, sampling records, audit trail, e-signature, and training.

References:

- FDA Part 11 guidance: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application
- eCFR 21 CFR Part 11: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11
- European Commission EudraLex Volume 4: https://health.ec.europa.eu/medicinal-products/eudralex/eudralex-volume-4_en
- European Commission Annex 11 Computerised Systems: https://health.ec.europa.eu/document/download/40231f18-e564-4043-94de-c031f813d38b_en

---

## 6. Recommended Immediate Start

Start with this order:

1. Ticket 6A.2: add regression tests for GRN, inventory issue, and QC worksheet gates. Status: implemented for backend guard coverage.
2. Ticket 6A.3: fix VBU qualification consistency. Status: backend regression covered; current UI refresh path inspected.
3. Ticket 6A.1: implement GRN CoA review workflow. Status: implemented.
4. Improvement 4: expose generic `POST /api/e-signatures`. Status: implemented.
5. Ticket 6B.1: build Deviation MVP with UX from `core/ux-mockups/01-qms-mockup.html`. Status: implemented.
6. Ticket 6B.2: build CAPA MVP with UX from `core/ux-mockups/03-qms.html`. Status: implemented.

Reason: this protects the working inbound/QC flow first, then introduces QMS where real exceptions can land.

---

## 7. Realistic Quality-First Timeline (Updated 2026-05-14)

**Audience:** Pharma QC / QA / Auditors (production product, not demo).  
**Quality bar:** Each ticket ships with backend migration + entity + service + controller + DTOs + validation + integration tests + frontend page + api.ts + React Query hooks + role guards + error/loading states.

### Per-Ticket Effort Estimates

| Ticket | Description / status | Working Days |
|---|---|---|
| 6G.1 | Fix pre-existing compile errors — implemented | 2 |
| 6G.2 | Audit timeline wiring — CAPA + Change Control — implemented | 4 |
| 6H.1 | ALCOA+ data integrity (data lock, SecurityAuditEvent, TIMESTAMPTZ, e-sig) — implemented | 10 |
| Sec 1.1 | Frontend session timeout (idle timer, modal, 21 CFR Part 11) — implemented | 3 |
| Sec 1.2 | TOTP MFA (backend TOTP entity + controller, login step 2, Annex 11) — implemented | 5 |
| Rep 2.1 | PDF export — 5 pharma report templates (OpenPDF) — implemented | 5 |
| Rep 2.2 | CSV export — `?format=csv` on all list endpoints — implemented | 3 |
| 6G.7 | Training gate enforcement before sampling/QC — implemented | 5 |
| 6G.8 | OOS/OOT two-phase investigation workflow — implemented | 5 |
| 6H.3 | Complaint and product defect management (EU GMP Ch.8) — implemented | 10 |
| 6H.4 | Equipment/instrument qualification IQ/OQ/PQ (Annex 15) — implemented | 8 |
| 7.4 | QP batch release + batch certificate (Annex 16) — implemented | 5 |
| 6G.9 | Lot/batch traceability view (recall readiness) — implemented | 5 |
| 7.1 | ICH Q9 risk management FMEA register — implemented | 8 |
| 7.2 | Annual Product Quality Review — auto-compiled (ICH Q10) — implemented | 10 |
| Buffer | Bug fixes, cross-module integration, code review, QA testing | 14 |
| **Total** | | **107 working days** |

### Honest Timeline

| Team size | Duration |
|---|---|
| 1 developer | ~22 weeks (5.5 months) |
| 2 developers (parallel) | ~12 weeks (3 months) |
| 2 developers + 1 QA | ~10 weeks (2.5 months) |

**3-month target requires 2 developers minimum at this quality bar.**  
Solo developer attempting 3 months will produce either incomplete features or untested code — both fail pharma audit.

### Phased Schedule (2-Developer Team, 3-Month Target)

#### Month 1 — Compliance Foundation (Audit-Blockers)
Non-negotiable. Auditor checks these on Day 1.

| Week | Dev A | Dev B |
|---|---|---|
| 1 | 6G.1 compile fix + 6G.2 audit trail | 6H.1 ALCOA+ (start) |
| 2 | Sec 1.1 session timeout + Sec 1.2 MFA | 6H.1 ALCOA+ (finish) |
| 3 | Rep 2.1 PDF export (start) | Rep 2.2 CSV export |
| 4 | Rep 2.1 PDF export (finish) | 6G.7 training gates |

#### Month 2 — Core QMS Workflows (Inspector-Visible)
These are what QA/QC auditors will navigate during inspection.

| Week | Dev A | Dev B |
|---|---|---|
| 5 | 6G.8 OOS two-phase (start) | 6H.3 complaint management (start) |
| 6 | 6G.8 OOS (finish) | 6H.3 complaint (finish) |
| 7 | 6H.4 equipment qualification (start) | 7.4 QP batch release |
| 8 | 6H.4 equipment qualification (finish) | 6G.9 lot traceability |

#### Month 3 — Advanced Modules + Buffer
Build after Month 1+2 foundation is stable and tested.

| Week | Dev A | Dev B |
|---|---|---|
| 9  | 7.1 ICH Q9 risk register (start) | 7.2 APQR (start) |
| 10 | 7.1 risk register (finish) | 7.2 APQR (continue) |
| 11 | 7.2 APQR (finish) | 6G.3 dashboard KPIs |
| 12 | Buffer: cross-module integration + regression + bug fixes | Buffer |

### Deferred to Post-Launch (v1.1)

| Item | Reason deferred |
|---|---|
| 7.3 Supplier Quality Agreement | Implemented on 2026-05-15; keep supplier-detail tab polish as future UX work |
| 6G.4 Document review date tracking | Implemented on 2026-05-15 |
| 6G.5 GRN rejection → deviation auto-link | Implemented on 2026-05-15 |
| 6G.6 MoA → SOP linkage | Implemented on 2026-05-15 |
| 6G.10 Change Control FK navigation | Implemented on 2026-05-15 |
| Sec 1.3 Password policy | Implemented on 2026-05-15 |
| Sec 1.4 Approval delegation | Implemented on 2026-05-15 |
| UX improvements 3.x | Post-launch polish |
| Architecture improvements 4.x | Post-launch |
| Performance improvements 5.x | Post-launch |

### Quality Gates Per Ticket

Every ticket ships with all of the following before marking done:

1. Flyway migration runs clean on fresh DB
2. Service unit tests cover happy path + validation failures
3. Integration test covers API endpoint (auth-gated correctly)
4. Frontend loads without TypeScript errors (`npm run build` passes)
5. Role-gating verified (unauthorized role returns 403)
6. Audit event fires on every state-changing action
7. E-signature captured where action is irreversible (disposition, certification, approval)

---

## 8. Phase 6H — Global Pharma Guidelines Compliance Gaps

**Regulatory sources:** FDA Data Integrity Guidance (2018), EU GMP Annex 15, EU GMP Annex 19, EU GMP Chapter 8, FDA 21 CFR 211.198
**Migration baseline entering Phase 6H:** V83 (last 6G migration)

---

### Ticket 6H.1: ALCOA+ Data Integrity Controls

**Status:** Implemented (2026-05-15) — data lock + 423 on QcTestResult post-disposition, DATA_AMENDMENT e-sign workflow, SecurityAuditEvent entity/service/controller, `/api/audit/security-events`, `hibernate.jdbc.time_zone=UTC`, rootCause ≥20 chars + correctiveAction ≥30 chars + investigation reason ≥20 chars enforced, frontend locked-field UI, SecurityAuditPage at `/admin/security-audit`, char count helpers on all ALCOA+ free-text fields.
**Priority:** High — FDA inspectors cite data integrity violations as the #1 reason for Warning Letters.
**Migration:** None (entity field + service logic only)

#### Regulatory Basis

FDA Data Integrity Guidance (2018) and EU GMP Chapter 4 require all GMP records to follow ALCOA+ principles: Attributable, Legible, Contemporaneous, Original, Accurate, Complete, Consistent, Enduring, Available.

#### Backend

**Data lock after QC disposition:**
- After a `SamplingRequest` reaches `RELEASED` or `REJECTED` disposition, block any `PUT` on `QcTestResult` records linked to that sampling request.
- Only `QC_MANAGER` or `SUPER_ADMIN` can unlock with written justification; create audit event `DATA_AMENDMENT` with justification text and e-sign.
- Add `isLocked: boolean` to `QcTestResult` entity; set true on disposition finalize.
- Return `423 Locked` with message `"QC results are locked after disposition. Contact QC Manager to amend."` if non-authorized edit attempted.

**Security / session audit log:**
- Add `SecurityAuditEvent` entity: `eventType` enum (`LOGIN`, `LOGOUT`, `LOGIN_FAILED`, `SESSION_TIMEOUT`, `PASSWORD_CHANGED`, `ACCOUNT_LOCKED`, `ACCOUNT_UNLOCKED`), `username`, `ipAddress`, `userAgent`, `sessionId`, `timestamp`.
- Record events in `AuthController` for login/fail and in Spring Security logout handler for logout.
- Add `GET /api/audit/security-events?username=&from=&to=` endpoint (SUPER_ADMIN only).

**Timezone-aware timestamps:**
- Audit all Flyway migrations V1–V83: confirm all `TIMESTAMP` columns are `TIMESTAMPTZ`.
- For any plain `TIMESTAMP` column found: create corrective migration `Vxx__fix_timestamp_timezone.sql`.
- Spring Boot JPA: set `spring.jpa.properties.hibernate.jdbc.time_zone=UTC` in `application.yaml`.

**Free-text field minimum length validation:**
- `Deviation.rootCause` — minimum 20 characters when status moves past `OPEN`.
- `Capa.correctiveAction` — minimum 30 characters on create.
- `QcInvestigation.description` — minimum 20 characters.
- Enforce in service layer with `BusinessConflictException` for too-short critical fields.

#### Frontend

- QC test result entry: disable edit fields on results where `isLocked = true`; show lock icon with tooltip "Results locked after disposition. Amendment requires QC Manager authorization."
- Security events log: SUPER_ADMIN page at `/admin/security-audit` — table of login/logout/fail events with date, user, IP, event type filter.
- Validation: show character count helper below free-text mandatory fields; show red border if under minimum on submit attempt.

#### Tests

- `PUT /api/sampling/{id}/results/{resultId}` returns 423 after disposition is finalized.
- `QC_MANAGER` with justification + e-sign can amend a locked result; audit event `DATA_AMENDMENT` created.
- Unauthorized role attempting amendment gets 403.
- Login event appears in security audit log.
- Failed login increments `failedLoginAttempts` and appears in security log.

#### Done Means

- QC test results are immutable after disposition without QA-authorized data amendment trail.
- Every login, logout, and failed login is recorded with IP and timestamp.
- Timezone-aware timestamps throughout all audit records.
- Critical GMP free-text fields cannot be submitted with placeholder content.

---

### Ticket 6H.2: Retention Sample Lifecycle Management

**Status:** Implemented (2026-05-15) — V95 migration, `lims/retentionsample` backend, RetentionSamplePage + RetentionSampleDetailPage frontend.
**Priority:** High — EU GMP Annex 19 compliance gap visible in any sampling audit.
**Migration:** `V95__create_retention_sample.sql`

#### Regulatory Basis

EU GMP Annex 19 requires retention (reference) samples kept for each batch: minimum 2× full test quantity, storage location tracked, retention period = expiry + 12 months minimum, chain of custody, retrieval and testing records, disposal record.

#### Migration SQL

```sql
CREATE TABLE retention_sample (
  id UUID PRIMARY KEY,
  sampling_request_id UUID NOT NULL REFERENCES sampling_request(id),
  lot_number VARCHAR(100) NOT NULL,
  material_id UUID REFERENCES material(id),
  material_name VARCHAR(255),
  quantity NUMERIC(14,4) NOT NULL,
  uom VARCHAR(20) NOT NULL,
  container_description VARCHAR(255),
  storage_location VARCHAR(255) NOT NULL,
  storage_condition VARCHAR(100),
  retention_until DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'STORED',  -- STORED, RETRIEVED, TESTED, DISPOSED
  received_by VARCHAR(100) NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  retrieval_reason TEXT,
  retrieved_by VARCHAR(100),
  retrieved_at TIMESTAMP WITH TIME ZONE,
  test_result_reference VARCHAR(255),
  disposal_reason TEXT,
  disposed_by VARCHAR(100),
  disposed_at TIMESTAMP WITH TIME ZONE,
  disposal_method VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE
);
```

#### Backend

**Package:** `lims/retentionsample`

DTOs: `CreateRetentionSampleRequest`, `RetrieveRetentionSampleRequest`, `DisposeRetentionSampleRequest`, `RetentionSampleResponse` (with computed `daysUntilExpiry`).

Service — `RetentionSampleService` / `RetentionSampleServiceImpl`:
- `createRetentionSample(request)`: validate `samplingRequestId` has RETENTION draw. Auto-calculate `retentionUntil` = material expiry + 12 months if not provided. Record audit event.
- `retrieveSample(id, request)`: set status `RETRIEVED`, record actor, reason, timestamp. Audit event.
- `disposeSample(id, request)`: set status `DISPOSED`. Require `QC_MANAGER` role. Audit event.
- `findDueForDisposal()`: samples where `retentionUntil < today` and status `STORED`.
- `findExpiringSoon(daysAhead)`: samples where `retentionUntil <= today + daysAhead`.

API — `/api/retention-samples`:
- `GET /api/retention-samples?status=&materialId=&lotNumber=`
- `POST /api/retention-samples`
- `GET /api/retention-samples/{id}`
- `POST /api/retention-samples/{id}/retrieve`
- `POST /api/retention-samples/{id}/dispose`
- `GET /api/retention-samples/expiring-soon?days=30`

#### Frontend

Route: `/lims/retention-samples` | Mockup: `core/ux-mockups/14-retention-samples.html`

List: lot number, material, storage location, quantity, retention until, status pill, days remaining (green >60d, amber 30–60d, red <30d).
KPI strip: Total Stored, Expiring 30d, Overdue Disposal, Retrieved This Month.
Detail: storage section, lifecycle timeline (Stored → Retrieved → Disposed), "Record Retrieval" and "Record Disposal" actions, `<AuditTimeline entityType="RETENTION_SAMPLE" entityId={...} />`.

#### Tests

- `POST /api/retention-samples` creates linked to valid sampling request with RETENTION draw.
- Retrieval sets status `RETRIEVED` with actor and reason.
- Disposal restricted to `QC_MANAGER` role.
- `expiring-soon?days=30` returns samples within 30 days of `retentionUntil`.

#### Done Means

- Every batch's retention samples tracked from storage through retrieval to disposal.
- Overdue retention samples surface in dashboard. Annex 19 chain of custody is auditable.

---

### Ticket 6H.3: Complaint and Product Defect Management

**Status:** Implemented (2026-05-14) — V82 migration, `qms/complaint` backend, ComplaintListPage + ComplaintDetailPage frontend.
**Priority:** High — EU GMP Chapter 8 is one of the first areas an inspector reviews. Absence = critical finding.
**Migration:** `V85__create_complaint_management.sql`

#### Regulatory Basis

EU GMP Chapter 8 and FDA 21 CFR 211.198 require: written procedure for product complaints, classification (quality defect/adverse event/labeling error/packaging defect), investigation with root cause and recall consideration, regulatory reporting decision, link to deviation/CAPA, trending.

#### Migration SQL

```sql
CREATE TYPE complaint_source AS ENUM ('CUSTOMER', 'MARKET', 'CLINICAL', 'INTERNAL', 'DISTRIBUTOR', 'REGULATORY_AUTHORITY');
CREATE TYPE complaint_category AS ENUM ('PRODUCT_QUALITY', 'ADVERSE_EVENT', 'LABELING_ERROR', 'PACKAGING_DEFECT', 'EFFICACY', 'CONTAMINATION', 'OTHER');
CREATE TYPE complaint_severity AS ENUM ('CRITICAL', 'MAJOR', 'MINOR', 'INFORMATIONAL');
CREATE TYPE complaint_status AS ENUM ('RECEIVED', 'UNDER_INVESTIGATION', 'PENDING_CLOSURE', 'CLOSED', 'WITHDRAWN');
CREATE TYPE regulatory_reportability AS ENUM ('NOT_ASSESSED', 'REPORTABLE', 'NOT_REPORTABLE', 'REPORTED');

CREATE TABLE complaint (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_number VARCHAR(30) UNIQUE NOT NULL,
  received_date DATE NOT NULL,
  source complaint_source NOT NULL,
  category complaint_category NOT NULL,
  severity complaint_severity NOT NULL,
  status complaint_status NOT NULL DEFAULT 'RECEIVED',
  product_name VARCHAR(255),
  lot_number VARCHAR(100),
  reported_by VARCHAR(255),
  description TEXT NOT NULL,
  initial_assessment TEXT,
  root_cause TEXT,
  impact_assessment TEXT,
  recall_required BOOLEAN DEFAULT FALSE,
  regulatory_reportability regulatory_reportability DEFAULT 'NOT_ASSESSED',
  regulatory_report_date DATE,
  regulatory_authority VARCHAR(100),
  linked_deviation_id UUID REFERENCES qms_deviation(id),
  linked_capa_id UUID REFERENCES qms_capa(id),
  closed_by VARCHAR(100),
  closed_at TIMESTAMP WITH TIME ZONE,
  closure_summary TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE
);
```

#### Backend

**Package:** `qms/complaint`

Enums: `ComplaintSource`, `ComplaintCategory`, `ComplaintSeverity`, `ComplaintStatus`, `RegulatoryReportability`

DTOs: `CreateComplaintRequest`, `UpdateComplaintRequest`, `LinkComplaintRequest`, `CloseComplaintRequest` (with e-sign fields), `ComplaintResponse`, `ComplaintSummary`.

Service — `ComplaintService` / `ComplaintServiceImpl`:
- Auto-generate `complaintNumber` = `"COMP-" + year + "-" + sequence`.
- `linkToDeviation(complaintId, deviationId)`: validate deviation exists; add audit event.
- `linkToCapa(complaintId, capaId)`: similar.
- `closeComplaint(complaintId, request)`: require e-sign, set status `CLOSED`.
- `getSummary()`: counts by status/category/severity for dashboard.

API — `/api/complaints`:
- `GET /api/complaints?status=&category=&severity=&from=&to=`
- `POST /api/complaints`
- `GET /api/complaints/{id}`
- `PUT /api/complaints/{id}`
- `PUT /api/complaints/{id}/status`
- `POST /api/complaints/{id}/link-deviation`
- `POST /api/complaints/{id}/link-capa`
- `GET /api/complaints/summary`

#### Frontend

Route: `/qms/complaints` | Mockup: `core/ux-mockups/12-complaint-management.html`

List: KPI strip (Total Open, Critical, Under Investigation, Regulatory Reportable), filters (source/category/severity/status/date range), table with complaint number/date/source/category/severity/status/product-lot/linked deviation.
Detail: overview, investigation section (root cause, impact, recall flag, regulatory reportability), linked records (deviation + CAPA navigate buttons), e-sign closure, audit timeline.

#### Tests

- `POST /api/complaints` creates with auto-generated `complaintNumber`.
- Closure requires e-sign.
- Link to non-existent deviation returns 404.
- `GET /api/complaints/summary` returns correct counts.
- `QC_ANALYST` can create; `QC_MANAGER` can close.

#### Done Means

- Every product complaint has traceable investigation record. Links to deviations and CAPAs. Regulatory reportability documented. EU GMP Chapter 8 enforced.

---

### Ticket 6H.4: Equipment and Instrument Qualification (IQ/OQ/PQ)

**Status:** Implemented (2026-05-14) — V83 migration, `lims/equipment` backend, EquipmentPage + EquipmentDetailPage frontend.
**Priority:** Medium-High — prerequisite for LIMS Phase 8 and Annex 15 compliance.
**Migration:** `V86__create_equipment_qualification.sql`

#### Regulatory Basis

EU GMP Annex 15 requires all QC equipment formally qualified: IQ (Installation), OQ (Operational), PQ (Performance Qualification). Requalification required after significant maintenance, relocation, or failure. Calibration certificates tracked for expiry.

#### Migration SQL

```sql
CREATE TYPE equipment_type AS ENUM (
  'BALANCE', 'HPLC', 'GC', 'UV_SPECTROPHOTOMETER', 'IR_SPECTROPHOTOMETER',
  'DISSOLUTION', 'PARTICLE_SIZE', 'KF_TITRATOR', 'PH_METER', 'TOC_ANALYZER',
  'STABILITY_CHAMBER', 'REFRIGERATOR', 'AUTOCLAVE', 'LAB_COMPUTER', 'OTHER'
);
CREATE TYPE equipment_status AS ENUM ('ACTIVE', 'UNDER_MAINTENANCE', 'RETIRED', 'PENDING_QUALIFICATION');
CREATE TYPE qualification_type AS ENUM ('IQ', 'OQ', 'PQ', 'REQUALIFICATION', 'CALIBRATION');
CREATE TYPE qualification_result AS ENUM ('PASS', 'FAIL', 'CONDITIONAL_PASS', 'PENDING');

CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  equipment_type equipment_type NOT NULL,
  manufacturer VARCHAR(255),
  model VARCHAR(255),
  serial_number VARCHAR(100),
  location VARCHAR(255) NOT NULL,
  status equipment_status NOT NULL DEFAULT 'PENDING_QUALIFICATION',
  installation_date DATE,
  last_qualification_date DATE,
  next_qualification_due DATE,
  last_calibration_date DATE,
  next_calibration_due DATE,
  calibration_interval_months INT DEFAULT 12,
  responsible_analyst VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE equipment_qualification_record (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  qualification_type qualification_type NOT NULL,
  protocol_reference VARCHAR(255) NOT NULL,
  protocol_document_id UUID REFERENCES controlled_document(id),
  performed_by VARCHAR(100) NOT NULL,
  performed_at DATE NOT NULL,
  reviewed_by VARCHAR(100),
  reviewed_at DATE,
  result qualification_result NOT NULL DEFAULT 'PENDING',
  deviation_noted TEXT,
  next_requalification_due DATE,
  calibration_certificate_number VARCHAR(255),
  calibration_certificate_expiry DATE,
  report_document_id UUID REFERENCES controlled_document(id),
  e_signature_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

#### Backend

**Package:** `lims/equipment`

Entities: `Equipment`, `EquipmentQualificationRecord`

DTOs: `CreateEquipmentRequest`, `UpdateEquipmentRequest`, `CreateQualificationRecordRequest`, `EquipmentResponse` (with `calibrationOverdue`, `qualificationOverdue`, `daysUntilCalibrationDue`), `EquipmentSummary`.

Service — `EquipmentService` / `EquipmentServiceImpl`:
- Auto-generate `equipmentId` = `"EQ-" + type abbreviation + "-" + sequence`.
- Approved PQ record (PASS): update `lastQualificationDate`, `nextQualificationDue`, set status `ACTIVE`.
- Failed qualification: set status `UNDER_MAINTENANCE`.
- `findCalibrationDueSoon(days)`, `findQualificationDueSoon(days)` for dashboard alerts.

API — `/api/equipment`:
- `GET /api/equipment?status=&type=`
- `POST /api/equipment`
- `GET /api/equipment/{id}`
- `PUT /api/equipment/{id}`
- `GET /api/equipment/{id}/qualifications`
- `POST /api/equipment/{id}/qualifications`
- `PUT /api/equipment/{id}/qualifications/{qrId}`
- `GET /api/equipment/summary`

#### Frontend

Route: `/lims/equipment` | Mockup: `core/ux-mockups/15-equipment-qualification.html`

List: KPI strip (Total Active, Calibration Due 30d, Qualification Due, Under Maintenance), color-coded rows (red = overdue, amber = due within 30d).
Detail: equipment specs, Qualification History tab (IQ/OQ/PQ records with result/date/protocol), Calibration tab (certificate number/expiry/doc link), "Add Qualification Record" (QC_MANAGER only), audit timeline.

#### Tests

- `POST /api/equipment` creates with auto-generated equipment ID.
- Approved PQ record updates `equipment.status` to `ACTIVE` and sets `nextQualificationDue`.
- Failed qualification sets status to `UNDER_MAINTENANCE`.
- `GET /api/equipment/summary` returns correct overdue counts.

#### Done Means

- Every QC instrument has traceable IQ/OQ/PQ history. Calibration due dates surfaced in dashboard. Links to controlling SOPs via `ControlledDocument`. EU GMP Annex 15 met.

---

## 9. Phase 7 — Advanced QMS Modules

**Regulatory sources:** ICH Q9, ICH Q10, PIC/S PE 009, WHO TRS 957, EU GMP Annex 16, FDA 21 CFR 211.188
**Prerequisites:** Phase 6G and 6H stable. Employee, document control, deviation, CAPA modules fully wired.
**Migration baseline entering Phase 7:** V86 was planned; actual code now has V84 Risk Assessment and V88 APQR. Next new migration should be V89.

---

### Ticket 7.1: ICH Q9 Quality Risk Management — FMEA and Risk Register

**Status:** Implemented (2026-05-14) — V84 migration, `qms/riskassessment` backend, RiskRegisterPage + RiskAssessmentDetailPage frontend.
**Priority:** High — ICH Q9 adopted by FDA (2006) and EU GMP. Inspectors ask how risk is formally managed.
**Migration:** `V87__create_risk_assessment.sql`

#### Regulatory Basis

ICH Q9 FMEA: Probability × Severity × Detectability = RPN (max 125). Threshold ≥ 50 = mandatory action. Scales 1–5 each.

#### Migration SQL

```sql
CREATE TYPE risk_assessment_status AS ENUM ('DRAFT', 'UNDER_REVIEW', 'ACCEPTED', 'CLOSED');
CREATE TYPE risk_assessment_scope AS ENUM ('PROCESS', 'PRODUCT', 'EQUIPMENT', 'SUPPLIER', 'SYSTEM', 'MATERIAL', 'CHANGE_CONTROL', 'OTHER');
CREATE TYPE risk_control_type AS ENUM ('ELIMINATE', 'REDUCE_PROBABILITY', 'REDUCE_SEVERITY', 'INCREASE_DETECTABILITY', 'ACCEPT');

CREATE TABLE risk_assessment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_number VARCHAR(30) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  scope risk_assessment_scope NOT NULL,
  scope_entity_type VARCHAR(50),
  scope_entity_id UUID,
  scope_entity_display VARCHAR(255),
  status risk_assessment_status NOT NULL DEFAULT 'DRAFT',
  methodology VARCHAR(50) DEFAULT 'FMEA',
  prepared_by VARCHAR(100) NOT NULL,
  reviewed_by VARCHAR(100),
  accepted_by VARCHAR(100),
  accepted_at TIMESTAMP WITH TIME ZONE,
  acceptance_e_signature_id UUID,
  next_review_date DATE,
  residual_risk_acceptable BOOLEAN,
  overall_risk_conclusion TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE risk_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_assessment_id UUID NOT NULL REFERENCES risk_assessment(id),
  sequence_number INT NOT NULL,
  process_step VARCHAR(255),
  failure_mode TEXT NOT NULL,
  failure_effect TEXT NOT NULL,
  failure_cause TEXT NOT NULL,
  current_controls TEXT,
  probability INT NOT NULL CHECK (probability BETWEEN 1 AND 5),
  severity INT NOT NULL CHECK (severity BETWEEN 1 AND 5),
  detectability INT NOT NULL CHECK (detectability BETWEEN 1 AND 5),
  rpn INT GENERATED ALWAYS AS (probability * severity * detectability) STORED,
  risk_control_type risk_control_type,
  proposed_action TEXT,
  action_owner VARCHAR(100),
  action_due_date DATE,
  linked_capa_id UUID REFERENCES qms_capa(id),
  residual_probability INT CHECK (residual_probability BETWEEN 1 AND 5),
  residual_severity INT CHECK (residual_severity BETWEEN 1 AND 5),
  residual_detectability INT CHECK (residual_detectability BETWEEN 1 AND 5),
  residual_rpn INT GENERATED ALWAYS AS (
    COALESCE(residual_probability, probability) *
    COALESCE(residual_severity, severity) *
    COALESCE(residual_detectability, detectability)
  ) STORED,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE
);
```

#### Backend

**Package:** `qms/riskassessment`

DTOs: `CreateRiskAssessmentRequest`, `CreateRiskItemRequest`, `UpdateRiskItemRequest`, `AcceptRiskAssessmentRequest` (with e-sign fields), `RiskAssessmentResponse` (with `highRpnItems` count, `criticalItems` count).

Service — `RiskAssessmentService` / `RiskAssessmentServiceImpl`:
- Auto-generate `assessmentNumber` = `"RA-" + year + "-" + sequence`.
- `acceptRiskAssessment(id, request)`: require `QC_MANAGER` e-sign.
- `getRiskMatrix()`: returns risk items grouped by P×S cell for heat-map display.
- Link suggestion: when CC is `UNDER_REVIEW`, suggest linked risk assessment.

API — `/api/risk-assessments`:
- `GET /api/risk-assessments?scope=&status=`
- `POST /api/risk-assessments`
- `GET /api/risk-assessments/{id}`
- `PUT /api/risk-assessments/{id}`
- `POST /api/risk-assessments/{id}/items`
- `PUT /api/risk-assessments/{id}/items/{itemId}`
- `DELETE /api/risk-assessments/{id}/items/{itemId}` (soft-delete)
- `POST /api/risk-assessments/{id}/accept`

#### Frontend

Route: `/qms/risk-register` | Mockup: `core/ux-mockups/13-risk-assessment.html`

List: KPI strip (Total, High RPN ≥50, Critical S=5, Pending Acceptance), table with RA number/title/scope/status/highest RPN.
Detail: 5×5 risk matrix heat map (P×S, color-coded), Risk Items tab (P/S/D columns, RPN badge color by threshold — red ≥75, orange 50–74, yellow 25–49, green <25), inline add item form with live RPN calculation, Accept Assessment e-sign, audit timeline.

#### Tests

- `POST /{id}/items` creates item; RPN auto-computed = P×S×D (stored column).
- Acceptance requires `QC_MANAGER` e-sign; other roles blocked.
- Items with RPN ≥ 50 appear in `highRpnItems` count.
- Soft-delete sets `isActive = false`; excluded from default list.

#### Done Means

- Every process/product/change risk has formal FMEA. RPN drives prioritization. ICH Q9 lifecycle system-enforced.

---

### Ticket 7.2: Annual Product Quality Review (APQR)

**Status:** Implemented (2026-05-15) — V88 migration and `qms/apqr` backend package exist; APQR frontend route/page, API client/types, sidebar entry, real compilation hooks, password-verified approval e-signature, and focused integration test were added.
**Priority:** High — first document requested in FDA pre-approval or EU GMP routine inspection.
**Migration:** `V88__create_apqr.sql`

#### Regulatory Basis

ICH Q10 §3.2.1 and EU GMP Chapter 1.10: annual review per product covering GRN rejections, OOS/OOT rates, deviations, CAPAs, change controls, complaints, stability, QP status.

#### Migration SQL

```sql
CREATE TYPE apqr_status AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'CLOSED');

CREATE TABLE apqr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apqr_number VARCHAR(30) UNIQUE NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  material_id UUID REFERENCES material(id),
  review_year INT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status apqr_status NOT NULL DEFAULT 'DRAFT',
  total_batches_manufactured INT DEFAULT 0,
  total_grn_received INT DEFAULT 0,
  grn_rejection_count INT DEFAULT 0,
  oos_count INT DEFAULT 0,
  oot_count INT DEFAULT 0,
  deviation_count INT DEFAULT 0,
  open_capa_count INT DEFAULT 0,
  change_control_count INT DEFAULT 0,
  complaint_count INT DEFAULT 0,
  process_in_control BOOLEAN,
  trends_identified TEXT,
  recommendations TEXT,
  prepared_by VARCHAR(100) NOT NULL,
  prepared_at TIMESTAMP WITH TIME ZONE,
  reviewed_by VARCHAR(100),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  approved_by VARCHAR(100),
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_e_signature_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE
);
```

#### Backend

**Package:** `qms/apqr`

DTOs: `CreateApqrRequest`, `ApqrCompileResponse`, `ApqrConclusionRequest`, `ApproveApqrRequest` (with e-sign).

Service — `ApqrService` / `ApqrServiceImpl`:
- `compileApqr(id)`: auto-populate stats by querying DeviationRepository, CapaRepository, ChangeControlRepository, ComplaintRepository, GrnRepository, SamplingRepository for the period and material.
- `approveApqr(id, request)`: require `QC_MANAGER` e-sign.
- `generateApqrSummary()`: products × years matrix showing APQR status and gaps.

Current code note:
- `ApqrController`, `ApqrService`, `ApqrServiceImpl`, `ApqrRepository`, and `Apqr` entity exist.
- API endpoints exist under `/api/apqr`.
- `compileApqr(id)` now moves DRAFT to UNDER_REVIEW and compiles GRN receipt/rejection, distinct batch, OOS/OOT, deviation, open CAPA, change control, and complaint counts from repository queries for the review period.
- `approveApqr(id, request)` now uses the standard password-verified `ESignatureService.sign(...)` flow and persists `approvalESignatureId`.

API — `/api/apqr`:
- `GET /api/apqr?year=&materialId=`
- `POST /api/apqr`
- `GET /api/apqr/{id}`
- `POST /api/apqr/{id}/compile`
- `PUT /api/apqr/{id}/conclusions`
- `POST /api/apqr/{id}/approve`
- `GET /api/apqr/summary`

#### Frontend

Route: `/qms/apqr` | Mockup: `core/ux-mockups/16-apqr.html`

List: KPI strip (Products With APQR This Year, Overdue APQRs, Draft In Progress, Approved), table (product/year/period/status/batches/OOS/deviations/CAPAs).
Detail: "Compile Data" button, stats cards row, linked records tabs (Deviations/CAPAs/Change Controls/Complaints for period), conclusions section with process-in-control toggle, QC Manager e-sign approval, audit timeline.

Current frontend note:
- `/qms/apqr` React page exists with create, compile, conclusion, approval, and close actions.
- APQR UI types/client methods exist.
- App shell nav exposes APQR under Quality.

#### Tests

- `POST /{id}/compile` populates stat fields from related entity counts.
- Approval requires `QC_MANAGER` e-sign.
- `GET /api/apqr/summary` shows products with missing APQR for last full year.

#### Done Means

- Every product has annual quality review. Stats auto-compiled — no manual data entry. ICH Q10 met.

---

### Ticket 7.3: Supplier Quality Agreement Management

**Status:** Implemented on 2026-05-15.
**Priority:** Medium — required by PIC/S and WHO GMP; increasingly scrutinized in EU GMP inspections.
**Migration:** `V89__create_supplier_quality_agreement.sql`

#### Regulatory Basis

PIC/S PE 009 Chapter 7 and WHO TRS 957: formal written quality agreements with all suppliers covering GMP responsibilities, change notification, audit rights, testing responsibilities, retention sample requirements.

#### Migration SQL

```sql
CREATE TYPE sqa_status AS ENUM ('DRAFT', 'UNDER_NEGOTIATION', 'ACTIVE', 'EXPIRED', 'TERMINATED');

CREATE TABLE supplier_quality_agreement (
  id UUID PRIMARY KEY,
  sqa_number VARCHAR(30) UNIQUE NOT NULL,
  supplier_id UUID REFERENCES supplier(id),
  vendor_business_unit_id UUID REFERENCES vendor_business_unit(id),
  title VARCHAR(255) NOT NULL,
  effective_date DATE,
  expiry_date DATE,
  status sqa_status NOT NULL DEFAULT 'DRAFT',
  sop_document_id UUID REFERENCES controlled_document(id),
  gmp_responsibilities TEXT,
  change_notification_requirements TEXT,
  audit_rights TEXT,
  testing_responsibilities TEXT,
  retention_sample_requirements TEXT,
  agreed_acceptance_criteria TEXT,
  our_signatory VARCHAR(100),
  our_signatory_date DATE,
  supplier_signatory VARCHAR(255),
  supplier_signatory_date DATE,
  terminated_reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMP
);
```

#### Backend

**Package:** `masterdata/supplier/sqa`

Service:
- `findExpiringSoon(days)`: SQAs where `expiryDate ≤ today + days`.
- `findSuppliersWithoutSqa()`: suppliers with `QUALIFIED` status but no `ACTIVE` SQA.
- Audit trail records create, update, and status changes as `SUPPLIER_QUALITY_AGREEMENT` events.

API — `/api/supplier-quality-agreements`:
- `GET /api/supplier-quality-agreements?supplierId=&status=`
- `POST /api/supplier-quality-agreements`
- `GET /api/supplier-quality-agreements/{id}`
- `PUT /api/supplier-quality-agreements/{id}`
- `PUT /api/supplier-quality-agreements/{id}/status`
- `GET /api/supplier-quality-agreements/expiring-soon?days=60`
- `GET /api/suppliers/{id}/quality-agreements`

#### Frontend

Implemented first as a standalone `/supplier-quality-agreements` page because supplier detail routing is not split yet. The page includes supplier/site links, title, effective/expiry dates, linked SOP document, text sections for responsibilities/change notification/audit rights/testing/retention/acceptance criteria, expiry warning badge if <60 days, and KPI card for "Suppliers Without SQA".

Future UI polish:
- Add the same agreement list as a tab inside a dedicated Supplier detail page when supplier detail routing is created.

#### Done Means

- Every qualified supplier has formal SQA on record. Expiry tracked. Links to agreement document. PIC/S Chapter 7 met.

#### Verification

- `./mvnw test -Dtest=SupplierQualityAgreementControllerIntegrationTest`
- `./mvnw -DskipTests compile`
- `npm run build`

---

### Ticket 7.4: QP Batch Release and Batch Certificate

**Status:** Implemented (2026-05-15) — V90 migration, `qms/batchrelease` backend, QpBatchReleasePage frontend, all 6 endpoints live.
**Priority:** Medium — required in EU GMP before any batch released for distribution.
**Migration:** `V90__create_qp_batch_release.sql`

#### Regulatory Basis

EU GMP Annex 16: QP certifies each batch before market release. 4-item checklist: QC disposition confirmed, OOS investigations closed, no open critical deviations, documentation complete.

#### Migration SQL

```sql
CREATE TYPE batch_release_status AS ENUM ('PENDING_QP_REVIEW', 'UNDER_REVIEW', 'CERTIFIED', 'REJECTED', 'ON_HOLD');

CREATE TABLE qp_batch_release (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_number VARCHAR(30) UNIQUE NOT NULL,
  lot_number VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  material_id UUID REFERENCES material(id),
  grn_id UUID REFERENCES grn(id),
  batch_size NUMERIC(14,4),
  batch_uom VARCHAR(20),
  manufacture_date DATE,
  expiry_date DATE,
  status batch_release_status NOT NULL DEFAULT 'PENDING_QP_REVIEW',
  qc_disposition_confirmed BOOLEAN DEFAULT FALSE,
  oos_investigations_closed BOOLEAN DEFAULT FALSE,
  no_open_critical_deviations BOOLEAN DEFAULT FALSE,
  documents_complete BOOLEAN DEFAULT FALSE,
  qp_name VARCHAR(255),
  qp_employee_id UUID REFERENCES employee(id),
  qp_certification_statement TEXT,
  certified_at TIMESTAMP WITH TIME ZONE,
  certification_e_signature_id UUID,
  rejection_reason TEXT,
  on_hold_reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE
);
```

#### Backend

**Package:** `qms/batchrelease`

Service — `QpBatchReleaseService` / `QpBatchReleaseServiceImpl`:
- `createBatchRelease(request)`: auto-generate `releaseNumber`. Auto-populate checklist:
  - `SamplingRepository`: lot has `RELEASED` disposition → `qcDispositionConfirmed`.
  - `QcInvestigationRepository`: no open OOS for lot → `oosInvestigationsClosed`.
  - `DeviationRepository`: no `CRITICAL` open deviations for lot → `noOpenCriticalDeviations`.
- `certifyBatch(id, request)`: require `QC_MANAGER` e-sign. Block if any checklist item false.
- `rejectBatch(id, reason)`.
- `getBatchCertificate(id)`: structured `BatchCertificateResponse` for PDF generation.

API — `/api/qp-batch-releases`:
- `GET /api/qp-batch-releases?status=&materialId=`
- `POST /api/qp-batch-releases`
- `GET /api/qp-batch-releases/{id}`
- `POST /api/qp-batch-releases/{id}/certify`
- `POST /api/qp-batch-releases/{id}/reject`
- `GET /api/qp-batch-releases/{id}/certificate`

#### Frontend

Route: `/qms/batch-release` | Mockup: `core/ux-mockups/17-qp-batch-release.html`

Queue list: KPI strip (Pending Review, Certified This Month, Rejected, On Hold), table with release number/lot/product/manufacture date/expiry/status.
QP Review detail: 4-item checklist with green ✓ / red ✗ indicators, batch info, QP Certification section (enabled only when all 4 green), "Certify Batch" e-sign, "Batch Certificate" download button, audit timeline.
Batch Certificate view: formal layout with release number, lot, product, test results summary, QP name, e-sign reference, certification date.

#### Tests

- `POST /api/qp-batch-releases` auto-populates checklist from existing QC/deviation records.
- Certification blocked if any checklist item false.
- Certification requires `QC_MANAGER` e-sign.
- `GET /{id}/certificate` returns full structured certificate data.

#### Done Means

- Every lot has formal QP batch release record before distribution. E-signed, checklist-gated. Batch certificate generatable. EU GMP Annex 16 met.

---

## 10. Technical Improvements (Cross-Cutting)

Full detail: `core/docs/spec/TECH_IMPROVEMENTS.md`

| Priority | Item | Regulatory / Impact | Phase |
|---|---|---|---|
| P0 | Session timeout (30 min idle) | Annex 11 §12 — unattended terminal | Month 1 |
| P0 | Data lock after QC disposition | FDA data integrity | Part of 6H.1 |
| P1 | PDF export — deviation, CAPA, lot, APQR reports | Inspector expects printed GMP records | Implemented (2026-05-15) |
| P1 | CSV export on all list tables | Table-stakes pharma ERP | Implemented (2026-05-15) |
| P1 | OpenAPI / Swagger at `/swagger-ui.html` | Integration readiness | Post-launch |
| P1 | API versioning `/api/v1/` prefix | Long-term stability | Post-launch |
| P2 | Notification bell — pending approvals count | UX — 5-min polling | Post-launch |
| P2 | Column sort on all list tables | UX standard | Post-launch |
| P2 | Supplier scorecard analytics | VMS value | Post-launch |
| P2 | Password policy engine | Annex 11 §12 | Implemented |
| P3 | MFA / TOTP | 21 CFR Part 11 §11.200 | Implemented (2026-05-15) |
| P3 | Approval delegation | Common pharma acting authority | Implemented |
| P4 | Inspector read-only role | Demo professionalism | Post-launch |
| P4 | S3-compatible storage abstraction | Production readiness | Post-launch |

Session timeout (P0) implementation — **Implemented (2026-05-15)**:
- `SessionTimeoutModal.tsx` — idle timer, 25min warning countdown, 30min auto-signout, activity reset on mousemove/keydown/click/scroll.
- `AppShell.tsx` — mounted, `handleSessionTimeout` calls `POST /api/auth/session-timeout` (records `SESSION_TIMEOUT` audit event), clears auth, redirects to `/login?reason=timeout`.
- `LoginPage.tsx` — shows "Session expired due to 30 min inactivity (21 CFR Part 11 §11.10)" banner on `?reason=timeout`.
- Backend: `POST /api/auth/session-timeout` records `SESSION_TIMEOUT` event distinct from `LOGOUT` in SecurityAuditEvent log.

PDF export (P1) — **Implemented (2026-05-15)** — `com.github.librepdf:openpdf:1.3.x`:
- `GET /api/deviations/{id}/report` → deviation closure PDF ✓
- `GET /api/capas/{id}/report` → CAPA closure PDF ✓
- `GET /api/qp-batch-releases/{id}/certificate/pdf` → batch certificate PDF ✓
- `GET /api/apqr/{id}/report` → APQR PDF ✓
- `GET /api/sampling-requests/{id}/report` → lot release package PDF ✓
- Frontend: Download PDF buttons on DeviationDetailPage, CapaBoardPage, QpBatchReleasePage, ApqrPage ✓
- `downloadPdfReport(path, filename)` helper in api.ts ✓

CSV export (P1) — **Implemented (2026-05-15)**:
- All list endpoints support `?format=csv` or `Accept: text/csv`.
- Controllers with CSV export: Deviation, CAPA, Complaint, Equipment, RetentionSample, RiskAssessment, QpBatchRelease, APQR, Sampling.
- Frontend: Export CSV buttons on list pages that support it.
- `downloadCsvExport(path, filename)` helper in api.ts.

MFA / TOTP (P3) — **Implemented (2026-05-15)**:
- Backend: `TotpService` (HMAC-SHA1 TOTP, ±1 step window), `TotpController` at `/api/auth/totp/setup` + `/api/auth/totp/verify`.
- Login flow: `POST /api/auth/login` returns `mfaRequired=true` + `mfaChallengeToken` when TOTP is enabled; frontend prompts for 6-digit code.
- Setup flow: authenticated user calls `POST /api/auth/totp/setup` → receives QR code data URL + manual secret; confirms with `POST /api/auth/totp/verify` (no challengeToken = setup confirmation).
- Frontend: "2FA" button in AppShell header → opens setup modal with QR code, manual secret, and code confirmation field.
- Admin: `POST /api/auth/users/{id}/totp/reset` for SUPER_ADMIN TOTP reset.

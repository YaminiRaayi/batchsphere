# BatchSphere Next Development Plan

**Prepared:** 2026-05-11  
**Inputs reviewed:** `BATCHSPHERE_PROJECT_STATUS_2026-04-30.md`, `IMPLEMENTATION_GAP_ANALYSIS.md`, `CODEX_IMPLEMENTATION_EXECUTION_PLAN.md`, `PHASE_6_PLAN_2026-05-11.md`, current code search through migrations V56-V66.  
**Current baseline:** V72 `Controlled Document`; next new migration should be V73.

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
| QMS | Deviation MVP and CAPA MVP are implemented; Change Control is still open |
| HRMS | No Employee entity or real user-to-employee model yet |
| Document Control | Controlled document/revision/approval MVP implemented; distribution and acknowledgement still pending |
| Training | No SOP training assignment or training gate yet |
| Compliance UI | Backend audit/e-sign exists, but reusable UI for audit timeline and e-sign dialog is incomplete |
| Dashboard | KPI cards still need live operational wiring |
| LIMS | Instrument, standard, reagent, raw-data traceability not started |
| Alerting | Should wait until HRMS/document/training ownership exists |

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
- Browser E2E coverage for blocked GRN cases is parked under Ticket 6A.4.

Ticket 6A.3: VBU Qualification Consistency Fix

Status: backend rule covered by integration test; current UI code refreshes the selected site after audit save and manual qualification updates.

- Fix service/UI state mismatch.
- Add test: audit-approved VBU becomes `QUALIFIED` and can be used in GRN.

Ticket 6A.4: E2E Stabilization For Inbound Compliance

Status: not implemented.

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

Status: not implemented.

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

Status: not implemented. Recommended after Phase 6C HRMS employee foundation.

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

Status: not implemented.

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

Status: not implemented.

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

Status: not implemented. Recommended after enough deviation/CAPA operational data exists.

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

Status: not implemented. Recommended after HRMS ownership and alert/notification foundation.

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

Status: not implemented.

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

---

### Phase 6E: Training

**Goal:** Prepare training records before enforcing training gates.

Ticket 6E.1: Training Assignment

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

Training gates should come after this MVP is stable:

- sampling start requires sampling SOP training
- QC result entry requires analyst training
- QC approval requires manager/reviewer qualification

---

### Phase 6F: Compliance UI Catch-Up

**Goal:** Make the already-built compliance backend visible and usable.

Ticket 6F.1: Reusable E-Signature Dialog

- Build component for username/password/meaning.
- Use `POST /api/e-signatures`.
- Props should include `entityType`, `entityId`, `action`, `defaultMeaning`, `reason`, `onSigned`.
- Show signer, meaning, password field, submit/loading/error states.
- Use it in QC final decision first, then document approval.

Ticket 6F.2: Audit Timeline

- Component reads `GET /api/audit-events?entityType=&entityId=`.
- Add to Sampling detail, GRN detail, and vendor/VBU detail.
- Reuse in deviation, CAPA, document, employee/training details as those modules are built.

Ticket 6F.3: Dashboard Live KPIs

- Replace static cards with actual backend counts:
  - quarantine inventory
  - pending sampling
  - open deviations
  - expiring inventory
  - overdue supplier/VBU audit
- Match `core/ux-mockups/01-dashboard.html`.
- Frontend should make cards navigable to filtered module pages.

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

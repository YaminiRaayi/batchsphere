# BatchSphere — Pharma Domain Gap Analysis & Roadmap to 100%
**Author:** Domain review pass
**Date:** 2026-05-18
**Audience:** Product owner (Yamini Raayi, QC Manager) and engineers new to pharma
**Status:** Initial draft

---

## 0. Why this document exists

`LIMS_MASTER_PLAN.md` covers the LIMS feature deliverables. `TECH_DEBT_BACKLOG.md` covers the engineering/cross-cutting work. This document covers the **pharma domain reality**: what real QC analysts, QC managers, QA reviewers, auditors, warehouse operators, and production staff need in a working pharma site that BatchSphere does not yet provide.

It is written so an engineer with no pharma background can understand both the gap and why pharma cares. Each ticket starts with a short "Why this matters in a real pharma plant" so the rationale isn't trapped in tribal knowledge.

---

## 1. What "100% pharma" actually means

There's no single official 100%. The realistic scope is "everything an inspector would expect to see in a small-to-mid-tier oral solid dose (OSD) pharma plant operating under EU GMP / FDA / WHO GMP / Indian Schedule M." That maps to roughly these capability areas:

1. **Material Management** — vendor qualification, GRN, sampling, quarantine, release, dispensing, BOM consumption, returns
2. **QC Laboratory** — sampling, testing, instrument control, reagent/RS inventory, stability, EM, OOS/OOT, CoA, retention
3. **Quality Management** — deviation, CAPA, change control, complaint, APQR, audit (internal + external), SOP/document control
4. **Manufacturing** — Master Batch Record (MBR), executed BMR (eBMR), Batch Packaging Record (BPR), in-process controls, yield reconciliation, cleaning verification, line clearance
5. **Warehouse / Distribution** — receipt, putaway, dispensing, picking, shipment, returns, recall
6. **HR / Training** — qualification, training records, role-curriculum, SOP-training linkage, gate-at-task
7. **Engineering / Facilities** — equipment qualification (covered), preventive maintenance, breakdown maintenance, calibration master, utility monitoring (water, HVAC, compressed air, nitrogen), spare parts
8. **Regulatory & Compliance** — 21 CFR Part 11, EU GMP Annex 11, ALCOA+, Schedule M, Computer System Validation (CSV) of the system itself, inspection readiness, regulatory submissions
9. **Site & IT** — site master file, electronic batch records, backup/DR, periodic access review, system configuration audit

BatchSphere today covers roughly: **all of #2 (QC)**, **most of #3 (QMS) but missing SOP control and internal audit**, **part of #1 (material) — no dispensing/BOM**, **part of #5 (warehouse) — no cycle count/picking**, **part of #6 (HR) — no role-curriculum or task gate**, **none of #4 (manufacturing)**, **part of #7 (facilities) — equipment yes, utilities and maintenance no**, **the building blocks of #8 but not the deliverables**.

So the answer to "how far are we?" is honestly: **about 55-60% of a working pharma plant** by functional surface area, but the 60% is the highest-leverage 60% (the QC backbone). The remaining 40% is what separates a "QC LIMS+QMS suite" from a "pharma ERP".

---

## 2. Short regulatory primer (for non-pharma engineers)

You don't need to memorize these, but knowing what each means helps you understand why each ticket exists.

| Standard | Issued by | What it covers | Key product implication |
|---|---|---|---|
| **21 CFR Part 11** | US FDA | Electronic records + electronic signatures | Audit trail, e-sign with meaning, no record alteration without trail |
| **21 CFR Part 211** | US FDA | cGMP for finished pharma | Master records, batch records, lab records, OOS handling |
| **21 CFR Part 210** | US FDA | cGMP general scope | Building, equipment, personnel, materials |
| **EU GMP Annex 11** | EMA | Computerised systems | Validation of software, access control, data integrity |
| **EU GMP Annex 15** | EMA | Qualification and validation | IQ/OQ/PQ, process validation, cleaning validation |
| **EU GMP Annex 16** | EMA | QP certification of batch | What a Qualified Person sees and signs before release |
| **ICH Q1A–Q1F** | ICH | Stability testing | Study protocols, conditions, frequencies, OOT handling |
| **ICH Q2(R2)** | ICH | Analytical procedure validation | Method validation parameters — specificity, accuracy, etc. |
| **ICH Q7** | ICH | GMP for active pharmaceutical ingredients | API-specific batch record + QC requirements |
| **ICH Q9** | ICH | Quality risk management | Risk register, FMEA, risk-based decisions |
| **ICH Q10** | ICH | Pharmaceutical quality system | CAPA, change control, management review |
| **WHO TRS series** | WHO | GMP technical reports | Often adopted by emerging-market regulators |
| **Schedule M** | India CDSCO | Indian GMP requirements | Documentation, premises, personnel, equipment |
| **USP <1058>** | USP | Analytical instrument qualification | IQ/OQ/PQ for HPLC, balances, etc. |
| **USP <1010>** | USP | Analytical data interpretation | OOS handling guidance |
| **GAMP 5** | ISPE | Risk-based software validation | Categorize software, validate per category |
| **MHRA Data Integrity Guidance** | UK MHRA | Data integrity practical guidance | ALCOA+ enforcement, audit trail review |

A working pharma product needs to demonstrably support 21 CFR 11, EU GMP Annex 11, ICH Q1A/Q2/Q7/Q9/Q10, and the local regulator's requirements (Schedule M for India, etc.). BatchSphere has the technical primitives but not the inspection-ready deliverables yet.

---

## 3. Persona × capability matrix

Quick heat map. ✅ = built and usable, 🟡 = partial/needs polish, ❌ = missing.

| Capability | QC Analyst | QC Manager | QA | Auditor | Warehouse | Production | HR | Engineering |
|---|---|---|---|---|---|---|---|---|
| Daily work queue / inbox | ❌ | ❌ | ❌ | n/a | 🟡 | n/a | n/a | n/a |
| Sample receipt + chain of custody | 🟡 | n/a | n/a | n/a | 🟡 | n/a | n/a | n/a |
| Worksheet result entry | ✅ | ✅ | n/a | n/a | n/a | n/a | n/a | n/a |
| Raw instrument data attachment | ❌ | ❌ | ❌ | ❌ | n/a | n/a | n/a | n/a |
| Solution / mobile-phase prep record | ❌ | 🟡 | ❌ | ❌ | n/a | n/a | n/a | n/a |
| Column logbook | ❌ | ❌ | ❌ | ❌ | n/a | n/a | n/a | n/a |
| Volumetric standardisation | ❌ | 🟡 | n/a | ❌ | n/a | n/a | n/a | n/a |
| Method validation records (ICH Q2) | n/a | ❌ | ❌ | ❌ | n/a | n/a | n/a | n/a |
| Method transfer | n/a | ❌ | ❌ | ❌ | n/a | n/a | n/a | n/a |
| OOS Phase I + II | ✅ | ✅ | ✅ | ✅ | n/a | n/a | n/a | n/a |
| Stability | ✅ | ✅ | ✅ | ✅ | n/a | n/a | n/a | n/a |
| EM | ✅ | ✅ | ✅ | ✅ | n/a | n/a | n/a | n/a |
| CoA dual e-sign | ✅ | ✅ | ✅ | ✅ | n/a | n/a | n/a | n/a |
| Retention sample lifecycle | ✅ | ✅ | ✅ | ✅ | n/a | n/a | n/a | n/a |
| Training-gate at action | ❌ | ❌ | ❌ | ❌ | n/a | n/a | ❌ | n/a |
| Role-based curriculum | n/a | 🟡 | 🟡 | ❌ | n/a | n/a | ❌ | n/a |
| Periodic re-qualification | n/a | ❌ | ❌ | ❌ | n/a | n/a | ❌ | ❌ |
| SOP/Document control | 🟡 | 🟡 | ❌ | ❌ | n/a | n/a | n/a | n/a |
| Internal audit module | n/a | n/a | ❌ | n/a | n/a | n/a | n/a | n/a |
| Inspection readiness pack | n/a | n/a | ❌ | ❌ | n/a | n/a | n/a | n/a |
| Single-record audit-trail PDF | n/a | n/a | ❌ | ❌ | n/a | n/a | n/a | n/a |
| User-access historical review | n/a | n/a | ❌ | ❌ | n/a | n/a | n/a | n/a |
| GRN | n/a | n/a | n/a | n/a | ✅ | n/a | n/a | n/a |
| Inventory | n/a | n/a | n/a | n/a | ✅ | n/a | n/a | n/a |
| Dispensing / weighing | n/a | n/a | n/a | n/a | ❌ | ❌ | n/a | n/a |
| BOM consumption / issue to prod | n/a | n/a | n/a | n/a | ❌ | ❌ | n/a | n/a |
| Cycle count / stock take | n/a | n/a | n/a | n/a | ❌ | n/a | n/a | n/a |
| Returns to vendor | n/a | n/a | n/a | n/a | ❌ | n/a | n/a | n/a |
| Master Batch Record (MBR) | n/a | n/a | ❌ | ❌ | n/a | ❌ | n/a | n/a |
| Executed BMR | n/a | n/a | ❌ | ❌ | n/a | ❌ | n/a | n/a |
| Batch Packaging Record | n/a | n/a | ❌ | ❌ | n/a | ❌ | n/a | n/a |
| In-process controls | n/a | n/a | ❌ | ❌ | n/a | ❌ | n/a | n/a |
| Yield reconciliation | n/a | n/a | ❌ | ❌ | n/a | ❌ | n/a | n/a |
| Cleaning verification | n/a | n/a | ❌ | ❌ | n/a | ❌ | n/a | n/a |
| Line clearance | n/a | n/a | ❌ | ❌ | n/a | ❌ | n/a | n/a |
| Equipment qualification (IQ/OQ/PQ) | n/a | ✅ | ✅ | ✅ | n/a | n/a | n/a | ✅ |
| Calibration master + reminder | n/a | 🟡 | n/a | ❌ | n/a | n/a | n/a | 🟡 |
| Preventive maintenance plan | n/a | n/a | n/a | ❌ | n/a | n/a | n/a | ❌ |
| Breakdown maintenance | n/a | n/a | n/a | ❌ | n/a | n/a | n/a | ❌ |
| Utility eLogbook (water, HVAC, gas) | n/a | n/a | n/a | ❌ | n/a | n/a | n/a | ❌ |
| Recall / batch withdrawal | n/a | n/a | ❌ | ❌ | ❌ | ❌ | n/a | n/a |
| Customer complaint handling | n/a | ✅ | ✅ | ✅ | n/a | n/a | n/a | n/a |
| Annual Product Quality Review | n/a | 🟡 | 🟡 | ❌ | n/a | n/a | n/a | n/a |
| Continued Process Verification | n/a | n/a | ❌ | ❌ | n/a | ❌ | n/a | n/a |
| Computer System Validation pack | n/a | n/a | ❌ | ❌ | n/a | n/a | n/a | n/a |

The ❌-density on the right four columns (Production, Engineering, internal audit, regulatory deliverables) is where most of the work ahead lives.

---

## 4. Tickets

Format follows `LIMS_MASTER_PLAN.md`. Each ticket includes a "Domain background" subsection so the engineer building it understands the pharma context.

---

### PHA-1 — SOP / Controlled Document Management
**Priority:** P0 | **Effort:** 6 days | **Risk:** medium — central to many other modules

**Domain background:** A Standard Operating Procedure (SOP) is the authoritative written instruction for any GMP activity (sampling, testing, cleaning, releasing). Every controlled document has a number, an effective date, a periodic review date (usually 2-3 years), supersession history, and an approval chain. Analysts must be trained on the current effective version before performing any task it covers. Auditors ask "show me the SOP for X" first thing. This is one of the three top QMS modules along with Deviation and CAPA.

**Problem:** A `documents/` route exists but it's a generic document library, not an SOP control system. Missing version chain, effective date enforcement, periodic-review trigger, training linkage, retired-version archival, controlled-copy issuance log.

**Backend (`compliance/sop/`):**
- `Sop` entity: `documentCode` (e.g., SOP-QC-001), `title`, `category`, `currentVersionId`, `ownerDepartment`, `effectiveDate`, `nextReviewDate`, `status` (DRAFT/UNDER_REVIEW/EFFECTIVE/SUPERSEDED/RETIRED).
- `SopVersion`: `versionNumber`, `effectiveDate`, `supersededDate`, `pdfDocumentId`, `changeSummary`, `previousVersionId`, `approvedBy`, `approvedAt`.
- `SopTrainingLink`: which roles/employees must train, which curriculum it belongs to.
- `SopReviewSchedule`: nightly job marks SOPs as `REVIEW_OVERDUE` when `nextReviewDate < today`.
- Endpoints: list/search by code/title/category, version history, link new draft, route through review approvals, publish (supersedes prior), retire.
- Audit and e-sign on Approve and on Retire (Part 11 requirement).

**Frontend:**
- `/qms/sops` — list with filters (category, owner department, status, due-for-review)
- `/qms/sops/:id` — detail with version timeline, current PDF preview, training roster, controlled-copy log

**Acceptance criteria:**
- [ ] SOP can be drafted, reviewed, approved with e-sign, becomes EFFECTIVE on effective date.
- [ ] Effective date in the future → version stays UNDER_REVIEW until that date (scheduled job).
- [ ] Superseding a version archives the old; old PDF still retrievable.
- [ ] Periodic-review overdue surfaces on QA dashboard.
- [ ] Linked-task gate (PHA-2) consumes "is analyst trained on current effective version of this SOP?".

---

### PHA-2 — Training-to-Task Gate
**Priority:** P0 | **Effort:** 2 days | **Risk:** workflow friction

**Domain background:** Pharma data integrity (ALCOA+ "Attributable" + "Accurate") requires that anyone performing a GMP activity is currently qualified for it. "Qualified" means: trained on the current effective SOP and method, training documented, training not expired. Today, BatchSphere has training records but the worksheet save path doesn't check them. An auditor running their finger down the audit trail and finding a result entered by a user with no training record on that method would write that up.

**Problem:** Worksheet result entry, sampling actions, disposition, and investigation steps don't verify training. Section 11 line: `[ ] Training gate checked before analyst enters results` — still open.

**Backend:**
- Extend `Training` to support `competencyType` ENUM (SAMPLING, METHOD_X, INSTRUMENT_Y, DEVIATION_HANDLING, ...) and `expiryDate`.
- `TrainingQualificationService.isQualified(userId, competency)` → boolean + reason if not.
- Hook into:
  - `QcTestResultServiceImpl.recordResult()` — analyst must be trained on the method linked to that spec parameter
  - `SamplingRequestService.createSampling()` — sampler must be trained on sampling
  - `QcDispositionService` — manager must be trained on disposition
  - `DeviationService.create()` — initiator must be trained on deviation handling
- Throw `BusinessConflictException("User {x} not currently trained on {competency}; training expired {date}")` with HTTP 409.

**Frontend:**
- Inline warning when an analyst opens a worksheet row for an untrained method (so they can fix before submitting).
- Manager override path with e-sign + reason (for urgent fills).

**Acceptance criteria:**
- [ ] Recording a result without current training returns 409 with specific reason.
- [ ] Training expired → same 409.
- [ ] Manager override creates an audit event with reason text.

---

### PHA-3 — Role-Based Training Curriculum
**Priority:** P0 | **Effort:** 3 days | **Risk:** moderate (HR domain expansion)

**Domain background:** Every role (QC Analyst, QC Manager, Warehouse Operator, Production Operator) has a defined training curriculum: induction, GMP basics, role-specific SOPs, instrument qualifications. When you hire a new analyst, the system should generate their training plan automatically. When an SOP revises, anyone whose curriculum includes it gets a retraining task.

**Problem:** Training records exist but there's no curriculum-by-role model. Hiring an analyst = manually adding training tasks one at a time. SOP revision = no automatic retraining task generation.

**Backend (`hrms/curriculum/`):**
- `TrainingCurriculum`: `name`, `targetRoles`, `targetDepartments`
- `CurriculumItem`: links curriculum to SOPs and competencies, marks initial vs refresher, sets cadence (e.g., refresh every 24 months)
- `EmployeeCurriculumAssignment`: when employee role is set, curriculum is auto-assigned
- SOP-revision listener: queries every employee whose curriculum includes the revised SOP and generates a training task
- Endpoints: CRUD curricula, assign/unassign, generate-tasks (manual + auto)

**Frontend:**
- `/hrms/curricula` — define curricula
- `/hrms/employees/:id` — show curriculum status: completed / in-progress / overdue per item

**Acceptance criteria:**
- [ ] New employee role = auto-curriculum-assignment.
- [ ] SOP revision triggers training tasks for everyone whose curriculum includes it.
- [ ] Curriculum compliance shows on HR dashboard and manager dashboard.

---

### PHA-4 — Raw Instrument Data Attachment to Test Results
**Priority:** P0 | **Effort:** 2 days | **Risk:** low

**Domain background:** Every quantitative QC test produces raw data — HPLC chromatograms (PDF or .raw), FTIR spectra, balance printouts. Under 21 CFR Part 11 and ALCOA+ "Original", the raw data is the primary record and the transcribed number in the worksheet is the secondary one. Inspectors ask: "show me the chromatogram for this assay value of 99.5%." Without an attachment slot the answer is "in a paper folder" — which is fine but defeats the purpose of an electronic system.

**Problem:** `QcTestResult` has no raw-data attachment slot.

**Backend:**
- `QcTestResultRawData` entity: `testResultId`, `documentId` (FK to existing storage), `dataType` (CHROMATOGRAM/SPECTRUM/PRINTOUT/RAW_FILE), `instrumentId`, `acquiredAt`, `acquiredBy`, `checksum`.
- Endpoints: `POST /api/sampling-requests/{reqId}/results/{resultId}/raw-data` (multipart), `GET .../raw-data`, `DELETE` (soft).
- Hash on upload (SHA-256) for integrity verification.
- Audit event on attach + on dissociation.

**Frontend:**
- Inside worksheet row: paper-clip icon → opens attach drawer. Shows attached files with type icon, acquired-at, analyst.
- CoA PDF includes "Raw data references" appendix listing checksums.

**Acceptance criteria:**
- [ ] Analyst attaches PDF/RAW to result, sees it in detail view.
- [ ] Each attachment carries a SHA-256 checksum.
- [ ] CoA PDF lists raw-data references.
- [ ] Attempt to detach a raw-data file from a locked test result → 409.

---

### PHA-5 — Solution / Mobile-Phase Preparation Records
**Priority:** P1 | **Effort:** 3 days | **Risk:** low

**Domain background:** In any HPLC or wet-chemistry test, analysts prepare working solutions (mobile phase, standard solutions, sample diluent) on the day. Each prep is recorded: components, weights, volumes, prepared-by, expiry of the prep (usually 24h to 7d). The test result must reference the specific prep used. This is one of the most common inspection findings — "show me the mobile phase prep record for this injection."

**Problem:** No entity exists. Today reagent lots are referenced from results, but mobile-phase preps (which are themselves derived from multiple reagent lots) have nowhere to live.

**Backend (`lims/preparation/`):**
- `SolutionPreparation`: `preparationCode`, `solutionType` (MOBILE_PHASE / STANDARD / DILUENT / TITRANT), `preparedAt`, `preparedBy`, `expiryAt`, `notes`, `referenceSpecId`.
- `PreparationComponent`: `preparationId`, `reagentLotId` (or referenceStandardLotId), `quantityUsed`, `unit`.
- Hook into `QcTestResult`: optional `preparationId` field on the test result.
- Endpoints: create prep, list active preps, link to test result.
- Auto-mark prep `EXPIRED` when past `expiryAt`.

**Frontend:**
- `/lims/preparations` — list and create preps. Components picker shows only active reagent lots.
- Worksheet row: prep dropdown alongside reagent and instrument.

**Acceptance criteria:**
- [ ] Prep links N reagent lots.
- [ ] Expired prep cannot be selected on a new test result.
- [ ] Reagent quantity-used tally rolls up from prep components.

---

### PHA-6 — Chromatographic Column Logbook
**Priority:** P1 | **Effort:** 2 days | **Risk:** low

**Domain background:** HPLC/UPLC columns are consumables with finite lifetime — measured in injections or in months. Each column has a serial number, chemistry (e.g., C18 250×4.6mm), and a logbook tracking every use. When a column degrades (peak tailing, retention shift), the lab needs the usage history to investigate. Inspectors specifically ask: "show me the column logbook for this batch's assay."

**Problem:** No `Column` entity. The instrument logbook tracks instrument use but not column-specific events.

**Backend (`lims/column/`):**
- `ChromatographicColumn`: `columnCode`, `partNumber`, `serialNumber`, `chemistry`, `dimensions`, `manufacturer`, `firstUseDate`, `injectionCount`, `status` (ACTIVE/RETIRED).
- `ColumnUsageEvent`: `columnId`, `instrumentId`, `samplingRequestId`, `injectionsAdded`, `pressureNote`, `usedBy`, `usedAt`.
- Auto-bump `injectionCount` per usage event.

**Frontend:**
- `/lims/columns` — list with injection-count, last-used, condition flags.
- Detail page: usage timeline, linked test results.
- Worksheet row: optional column-selector when method is HPLC.

**Acceptance criteria:**
- [ ] Column injection count visible and incremented on each use.
- [ ] Column over threshold → warning flag.
- [ ] Test result optionally references column used.

---

### PHA-7 — Volumetric Solution Standardisation Log
**Priority:** P2 | **Effort:** 1.5 days | **Risk:** low

**Domain background:** Titrants like 0.1 N HCl or 0.1 N NaOH are made nominally but the actual concentration must be standardised against a primary reference standard (e.g., KHP for base, sodium carbonate for acid). The standardisation factor (e.g., 0.0998 N actual) is used to correct titration calculations. Records of each standardisation, when it was done, by whom, and against which reference are required.

**Problem:** No entity for standardisation records. Reagent lot tracks the bulk solution but not its potency factor over time.

**Backend:**
- `VolumetricStandardisation`: `reagentLotId`, `referenceStandardLotId`, `nominalConcentration`, `actualFactor`, `standardisedBy`, `standardisedAt`, `expiryDate`, `notes`.
- Service: latest valid standardisation factor per reagent lot.

**Frontend:**
- Tab on reagent lot detail page: "Standardisation history".

**Acceptance criteria:**
- [ ] Record standardisation referencing both reagent lot and primary RS lot.
- [ ] Latest factor exposed via API for test-calculation use.

---

### PHA-8 — Master Batch Record (MBR) Library
**Priority:** P1 | **Effort:** 6 days | **Risk:** high — net-new module

**Domain background:** A Master Batch Record (MBR) is the master recipe for manufacturing a product: ingredients (by code, qty, grade), step-by-step process instructions, equipment, in-process controls, expected yield. The MBR is authored, reviewed, approved, and becomes the template from which executed batch records (eBMRs — PHA-9) are produced. It's a controlled document like an SOP but structured. ICH Q7 and 21 CFR Part 211.186 require MBRs for finished pharma.

**Problem:** No manufacturing module exists. Without it the product cannot honestly call itself a pharma ERP.

**Backend (`manufacturing/mbr/`):**
- `MasterBatchRecord`: `productId`, `mbrCode`, `currentVersionId`, `status`.
- `MbrVersion`: `versionNumber`, `effectiveDate`, `approvedBy`, `approvedAt`, `pdfDocumentId`.
- `MbrIngredient`: `mbrVersionId`, `materialId`, `quantityPerBatch`, `unit`, `criticalityClass`.
- `MbrStep`: `mbrVersionId`, `stepNumber`, `instructionText`, `equipmentType`, `expectedDurationMinutes`, `inProcessControls`.
- `MbrInProcessControl`: `stepId`, `parameterName`, `lowerLimit`, `upperLimit`, `unit`, `frequency`.
- Endpoints: draft, review, approve, supersede, retire.

**Frontend:**
- `/manufacturing/mbr` — list
- `/manufacturing/mbr/:id` — version timeline, ingredient table, step-by-step editor, IPC schedule

**Acceptance criteria:**
- [ ] MBR authored, reviewed, approved, supersedes prior version.
- [ ] Effective MBR used as template for new eBMR (PHA-9).
- [ ] Ingredients reference material master; quantity per batch validated.

---

### PHA-9 — Executed Batch Manufacturing Record (eBMR)
**Priority:** P1 | **Effort:** 8 days | **Risk:** high — long-running stateful workflow

**Domain background:** The executed batch record is what production fills in for each actual batch manufactured. It captures every step, every weight, every IPC reading, every operator and verifier, every deviation. It's the legal record proving GMP compliance for that batch. A QP cannot release a batch without reviewing the executed BMR. Average pharma plant runs 10-200 batches per week per product.

**Problem:** None of this exists.

**Backend (`manufacturing/ebmr/`):**
- `BatchRecord`: `batchNumber`, `productId`, `mbrVersionId`, `plannedStartAt`, `actualStartAt`, `status` (DRAFT/IN_PROCESS/COMPLETE/REJECTED), `releasedAt`.
- `BatchStepExecution`: `batchRecordId`, `mbrStepId`, `startedAt`, `endedAt`, `performedBy`, `verifiedBy`, `actualParameters`, `notes`.
- `BatchIngredientConsumption`: `batchRecordId`, `materialId`, `inventoryLotId`, `quantityActual`, `quantityExpected`, `dispensedBy`, `dispensedAt`.
- `BatchInProcessControlResult`: `stepExecutionId`, `parameterName`, `value`, `inLimits`, `recordedBy`, `recordedAt`.
- `BatchYieldReconciliation`: `batchRecordId`, `theoreticalYield`, `actualYield`, `yieldPercentage`, `wastageNote`.
- Deviations on this batch link via `Deviation.sourceEntityId`.

**Frontend:**
- `/manufacturing/batches` — list with status filter
- `/manufacturing/batches/:id` — Gantt-like step timeline + ingredient consumption + IPC table + yield reconciliation

**Acceptance criteria:**
- [ ] eBMR generated from approved MBR.
- [ ] Each step requires operator + verifier e-sign before next step.
- [ ] IPC out-of-limit auto-creates deviation.
- [ ] Yield reconciliation enforced before status → COMPLETE.
- [ ] QP cannot release batch until eBMR is COMPLETE.

---

### PHA-10 — Batch Packaging Record (BPR)
**Priority:** P2 | **Effort:** 4 days | **Risk:** moderate

**Domain background:** After bulk manufacturing, the product is packaged — strips, blisters, bottles, cartons, label print, leaflet insertion, secondary packing. This is a separate record (BPR) with its own line clearance, IPC (e.g., leak test, label challenge), and material reconciliation (printed vs used vs scrapped). Inspector concerns here are around mix-ups, missing leaflets, and incorrect labels.

**Problem:** None of this exists.

**Backend (`manufacturing/bpr/`):**
- Pattern parallels MBR/eBMR: master packaging record, executed packaging record, packaging material consumption, label reconciliation, leak/print challenge IPC.

**Frontend:**
- `/manufacturing/packaging` — list + detail

**Acceptance criteria:**
- [ ] BPR linked to BMR.
- [ ] Label reconciliation enforced (printed = used + scrap + reference samples).
- [ ] BPR completion + QC release of finished product gates final batch release.

---

### PHA-11 — Dispensing / Weighing Module
**Priority:** P0 | **Effort:** 4 days | **Risk:** moderate — bridge between warehouse and production

**Domain background:** Production needs raw materials weighed exactly per the MBR. Dispensing happens in a controlled booth with a calibrated balance, integrated with a barcode scanner. The scanner reads the material container label → system confirms it's the right material, the right lot, hasn't expired, has been QC-released. Operator weighs into a tared dispense container, system records the weight, prints a dispense label, allocates to that batch's pick list. This is the highest-throughput operation in a plant and the highest mix-up risk.

**Problem:** No dispensing model. Inventory has transactions but no dispensing-against-MBR flow.

**Backend (`transactions/dispensing/`):**
- `DispensingOrder`: `batchRecordId`, `materialId`, `quantityRequired`, `status`.
- `DispensingExecution`: `dispensingOrderId`, `inventoryLotId`, `weighedQuantity`, `dispensedAt`, `dispensedBy`, `verifiedBy`, `balanceEquipmentId`, `dispenseContainerLabel`.
- Verifications: material matches, lot is QC-released, not expired, balance calibrated, operator trained.

**Frontend:**
- `/manufacturing/dispensing` — operator console with scanner input, weight display, verifier slot

**Acceptance criteria:**
- [ ] Scan wrong material → blocked with "expected X got Y".
- [ ] Lot quarantined / expired → blocked.
- [ ] Calibration expired on balance → blocked.
- [ ] Operator not trained → blocked.
- [ ] Each dispense generates a dispense label with QR.

---

### PHA-12 — Cycle Counting / Stock Take
**Priority:** P2 | **Effort:** 3 days | **Risk:** low

**Domain background:** Pharma plants do periodic counts (cycle counts) of inventory and an annual full stock take. Discrepancies trigger an investigation (deviation). Required by 21 CFR 211.196.

**Problem:** Inventory transactions support adjustments but there's no count-cycle workflow.

**Backend:**
- `CycleCount`: `countNumber`, `scope` (LOCATION/CATEGORY/FULL), `plannedAt`, `executedAt`, `status`.
- `CycleCountLine`: `cycleCountId`, `materialId`, `locationId`, `inventoryLotId`, `systemQuantity`, `countedQuantity`, `varianceQuantity`, `countedBy`, `recountedBy`.
- Variance → auto-creates inventory adjustment + linked deviation if over tolerance.

**Frontend:**
- `/inventory/cycle-counts` — schedule, execute, review

**Acceptance criteria:**
- [ ] Variance > tolerance auto-creates deviation.
- [ ] Recount required when variance flagged.
- [ ] Approved adjustment posts to inventory.

---

### PHA-13 — Material Recall / Batch Withdrawal Workflow
**Priority:** P1 | **Effort:** 4 days | **Risk:** high — touches many domains

**Domain background:** When a quality defect is found after a batch has been distributed, the company must initiate a recall — Class I (life-threatening), II, or III. The system needs to: identify the batch, list every customer who received it, list every component lot that went into it, freeze further distribution, log communications, and report to regulators. ICH Q10 + 21 CFR 7.

**Problem:** Lot traceability exists for tracing inputs; no recall workflow.

**Backend (`qms/recall/`):**
- `Recall`: `recallNumber`, `triggerType` (COMPLAINT/INSPECTION/INTERNAL_FINDING), `recallClass`, `productId`, `affectedBatchIds`, `status` (INITIATED/IN_PROGRESS/CLOSED), `initiatedBy`.
- Distribution-side stub: `BatchShipment`: batch → customer + quantity (placeholder until distribution module exists).
- Notifications dispatched to customers (PHA-23 notification channel).
- Regulator-report PDF generator.

**Frontend:**
- `/qms/recalls` — list and workflow

**Acceptance criteria:**
- [ ] Recall on a batch lists every customer that received it.
- [ ] Recall freezes that batch from any further movement.
- [ ] Recall report exportable as PDF with traceability.

---

### PHA-14 — Internal Audit Module
**Priority:** P1 | **Effort:** 4 days | **Risk:** moderate

**Domain background:** Self-inspection (internal audit) is required by EU GMP and ICH Q10. QA schedules audits of every department periodically (annual cycle), audit team produces observations, observations become CAPAs, CAPAs are tracked. Auditors will ask for the self-inspection schedule and last three reports.

**Problem:** Deviation/CAPA handles operational issues but there's no audit-plan / audit-execution model.

**Backend (`qms/internalaudit/`):**
- `AuditPlan`: `year`, `quarter`, `scope`, `auditorTeamIds`, `auditeeDepartments`, `plannedAt`.
- `AuditExecution`: `planId`, `executedAt`, `executedBy`, `findings`, `reportPdfId`.
- `AuditObservation`: `executionId`, `severity` (CRITICAL/MAJOR/MINOR), `description`, `linkedCapaId`.

**Frontend:**
- `/qms/internal-audits` — calendar, plan, execute, observations, linked CAPAs

**Acceptance criteria:**
- [ ] Annual audit plan generated and visible.
- [ ] Each observation linkable to a CAPA.
- [ ] Overdue audits surface on QA dashboard.

---

### PHA-15 — Inspection Readiness & Single-Record Audit Trail Report
**Priority:** P0 | **Effort:** 3 days | **Risk:** low — pure read, high regulator value

**Domain background:** When an inspector asks "show me everything about batch X-2026-001", they want one PDF or screen with: batch metadata, every status change, every e-sign, linked deviations, linked CAPAs, every test result, the CoA, every audit-trail row, every user action. Today this would require 10 separate screens. The single-record audit trail is one of the most valuable inspection-readiness outputs.

**Problem:** Audit events are stored but there's no consolidated per-entity timeline report.

**Backend:**
- `AuditEventService.timelineForEntity(entityType, entityId)` — returns ordered events + linked sub-entity events (deviations, capas, test results) via reflection of parent-child links already in the model.
- `/api/audit-trail/timeline/{entityType}/{entityId}` — JSON.
- `/api/audit-trail/timeline/{entityType}/{entityId}/pdf` — PDF with header, summary, table, signatures.

**Frontend:**
- New "Audit Trail" tab on every major entity detail page (batch release, sampling request, deviation, CoA, equipment).

**Acceptance criteria:**
- [ ] Timeline includes parent + linked entity events ordered by timestamp.
- [ ] PDF includes ALCOA+ headers and entity ID.
- [ ] Audit trail of the audit-trail view itself recorded (who viewed when).

---

### PHA-16 — Computer System Validation (CSV) Pack for BatchSphere Itself
**Priority:** P0 | **Effort:** 5 days | **Risk:** documentation-heavy, low code

**Domain background:** GAMP 5 and EU GMP Annex 11 require that the LIMS itself be validated. The validation pack contains: User Requirements Spec (URS), Functional Spec (FS), Design Spec (DS), Installation Qualification (IQ), Operational Qualification (OQ), Performance Qualification (PQ), Traceability Matrix, Validation Summary Report. This is a deliverable to produce, not code to write — but it can be partly auto-generated from existing artifacts.

**Problem:** No CSV pack exists. Auditor's first question for a new system: "show me your validation documentation."

**Action:**
- Document set under `core/docs/csv/`:
  - `URS_BatchSphere_v1.md` — derive from CLAUDE.md + LIMS_MASTER_PLAN module-built table
  - `FS_BatchSphere_v1.md` — from API surface (auto-generate from OpenAPI when TD-11 lands)
  - `DS_BatchSphere_v1.md` — from existing architecture docs
  - `IQ_Protocol.md` — install steps, environment, dependencies, evidence checklist
  - `OQ_Protocol.md` — endpoint smoke tests, role tests, e-sign tests — many already exist as integration tests; produce a results report from CI
  - `PQ_Protocol.md` — user workflow walkthroughs
  - `TraceabilityMatrix.csv` — URS line → FS line → test case → result
  - `ValidationSummaryReport.md`
- Establish revalidation triggers: major version, significant configuration change, regulatory change.

**Acceptance criteria:**
- [ ] All seven artifacts exist and are linked from `core/docs/INDEX.md`.
- [ ] OQ results auto-published from CI run.
- [ ] Validation summary signed (e-sign or PDF stamp) by QC Manager + IT Owner.

---

### PHA-17 — User Access Historical Review
**Priority:** P1 | **Effort:** 1.5 days | **Risk:** low

**Domain background:** Auditors ask "at time T, who had access to X and what role did they have?" Today the user-management module shows current state. Role changes aren't journalled.

**Backend:**
- `UserRoleHistory`: `userId`, `roleBefore`, `roleAfter`, `changedBy`, `changedAt`, `reason`.
- Endpoint: `/api/admin/user-access?at=2026-04-15` returns the role roster as of that date.

**Frontend:**
- `/admin/user-access` — historical viewer + export.

**Acceptance criteria:**
- [ ] Every role change writes a history row.
- [ ] Historical role view returns correct state at any past timestamp.

---

### PHA-18 — Preventive Maintenance & Breakdown Maintenance
**Priority:** P1 | **Effort:** 5 days | **Risk:** moderate

**Domain background:** Every piece of GMP equipment has a preventive maintenance (PM) schedule — daily checks, weekly cleans, quarterly service. Breakdowns trigger an unplanned maintenance with deviation. Engineering keeps a log of every intervention. Inspectors ask: "show me the PM record for HPLC-001 for the past year."

**Problem:** Equipment has qualification (IQ/OQ/PQ) but no PM/BM workflow.

**Backend (`engineering/maintenance/`):**
- `MaintenancePlan`: per equipment, list of `MaintenanceTask` (frequency, instructions).
- `MaintenanceTaskExecution`: scheduled, performed, performedBy, verifiedBy, partsUsed, evidence.
- `BreakdownEvent`: equipment, downAt, restoredAt, rootCause, linkedDeviationId, linkedCapaId.
- Job: nightly task that creates upcoming executions from plan.

**Frontend:**
- Equipment detail tab: "Maintenance" (PM schedule + history + breakdown events)
- `/engineering/maintenance` — cross-equipment view

**Acceptance criteria:**
- [ ] PM plan auto-generates tasks per schedule.
- [ ] Overdue PM blocks instrument use (cooperates with calibration gate).
- [ ] Breakdown auto-creates deviation.

---

### PHA-19 — Utility eLogbook (Water, HVAC, Compressed Air, Nitrogen)
**Priority:** P2 | **Effort:** 3 days | **Risk:** low

**Domain background:** Utility systems serving GMP areas are themselves GMP-relevant. Purified water and water for injection (WFI) have microbial + TOC limits monitored on a daily/weekly basis. HVAC has differential pressures and particle counts. Compressed air and N2 have moisture and oil. All require eLogbooks similar to env-monitoring but for system parameters.

**Problem:** EM module covers room temperature/humidity/particle but not utility-system parameters which have their own sampling points and limits.

**Backend:**
- Reuse `EmMonitoringPoint` + `EmResult` with an additional `pointCategory` (ROOM / UTILITY / EQUIPMENT) and `systemType` (PURIFIED_WATER / WFI / HVAC / COMPRESSED_AIR / NITROGEN).
- Optionally separate tables if utility parameters diverge enough.

**Frontend:**
- `/lims/utilities` — tab inside EM page or its own route.

**Acceptance criteria:**
- [ ] Utility readings recorded with same breach + audit semantics as EM.
- [ ] Reports separate utility from room monitoring.

---

### PHA-20 — Method Validation Records (ICH Q2)
**Priority:** P1 | **Effort:** 4 days | **Risk:** moderate

**Domain background:** Before an analytical method (e.g., HPLC assay) can be used for GMP release, it must be validated per ICH Q2 across parameters: specificity, linearity, accuracy, precision (repeatability + intermediate precision), range, robustness, LOD, LOQ, system suitability. The validation report is a formal document referenced by every batch using that method. Method transfer between sites is a separate but related dossier.

**Problem:** Spec and MoA exist but no method-validation entity.

**Backend (`masterdata/methodvalidation/`):**
- `MethodValidation`: `moaId`, `validationNumber`, `protocolDocumentId`, `reportDocumentId`, `status` (DRAFT/IN_PROGRESS/APPROVED/EXPIRED).
- `MethodValidationParameter`: standard ICH Q2 set with results.
- Periodic-review reminder.

**Frontend:**
- `/master-data/qc-refs/method-validations` — list + detail.

**Acceptance criteria:**
- [ ] Approved MV linked to MoA.
- [ ] Worksheet recording disabled if MoA's MV is not APPROVED + current.

---

### PHA-21 — Continued Process Verification (CPV) Dashboard
**Priority:** P2 | **Effort:** 3 days | **Risk:** low

**Domain background:** Post-launch, every product needs ongoing process capability monitoring — Cpk/Ppk for critical quality attributes, trend across batches, alerts for drift. ICH Q8/Q9/Q10 and FDA process validation guidance require this as Stage 3.

**Problem:** APQR exists annually; CPV is the continuous version. No live capability dashboard.

**Backend:**
- Aggregate query across `qc_test_result` joined to batch.
- `CpkSnapshotJob` recomputes Cpk/Ppk per product × parameter weekly.

**Frontend:**
- `/qms/cpv` — per product, per parameter trend + Cpk badge + recent breaches.

**Acceptance criteria:**
- [ ] Cpk visible per critical parameter.
- [ ] Drift alert (3-sigma move) creates a notification.

---

### PHA-22 — Calibration Master & Reminder Workflow
**Priority:** P1 | **Effort:** 2 days | **Risk:** low

**Domain background:** Every measuring instrument (balance, thermometer, pH meter, even a ruler in some contexts) has a calibration certificate from an accredited lab and a recalibration cycle. Equipment in LIMS has `nextCalibrationDue` but the full master (certificate, accredited lab, calibration constants) is missing.

**Problem:** Calibration date is a field; the certificate, lab, and constants aren't modelled.

**Backend:**
- `EquipmentCalibration`: `equipmentId`, `calibrationDate`, `nextDue`, `certificateDocumentId`, `calibratedByLab`, `accreditationNumber`, `calibrationConstants` (JSON), `performedBy`, `e-sign`.
- Daily job: `nextDue` within 30 days → notification.

**Frontend:**
- Equipment detail tab: "Calibration history" — currently only a single date.

**Acceptance criteria:**
- [ ] Calibration certificate attachable per cycle.
- [ ] Reminder 30/7/0 days before due.
- [ ] Expired calibration hard-blocks instrument use (already enforced via existing gate; verify with attachment).

---

### PHA-23 — Notification Channel (cross-references TD-7)
**Priority:** P1 | **Effort:** 2 days

This is the same ticket as TD-7 in `TECH_DEBT_BACKLOG.md`. The pharma domain has many actors who need notifications (calibration due, training due, CoA awaiting issue, breach unattended). Tracking here so the pharma roadmap reflects the cross-link.

---

### PHA-24 — Daily / Awaiting-Me Inbox per Role
**Priority:** P1 | **Effort:** 2 days | **Risk:** low

**Domain background:** Real users live in their inbox. Today a QC Manager has to walk multiple screens to see what awaits action. A "to do" view per role consolidates everything: CoAs awaiting issue, breaches without deviation, investigations awaiting QA, change controls awaiting QA review, expired-soon reagents, due-soon timepoints.

**Backend:**
- `/api/inbox/me` — service that aggregates "awaiting <role>" items across modules into a unified shape.

**Frontend:**
- Dashboard landing page becomes the inbox.

**Acceptance criteria:**
- [ ] QC Manager sees consolidated queue.
- [ ] Clicking any row jumps to that record.

---

### PHA-25 — Pharmacopoeia Compliance & Spec Linkage
**Priority:** P2 | **Effort:** 2 days | **Risk:** low

**Domain background:** Specs in pharma are often anchored to a pharmacopoeial monograph: USP, EP, BP, IP, JP. The spec must reference the monograph + edition + revision. When the monograph revises, the spec needs review. Inspectors check that specs are current to the latest mandatory edition.

**Problem:** Spec entity doesn't carry pharmacopoeia + edition + monograph reference as a first-class field with revision tracking.

**Backend:**
- Extend `Spec` with `pharmacopoeia`, `pharmacopoeiaEdition`, `monographReference`, `monographRevisionDate`.
- `PharmacopoeiaRevisionNotice` table — when an edition releases, flag affected specs for review.

**Frontend:**
- Spec form: pharmacopoeia + edition + monograph fields.

**Acceptance criteria:**
- [ ] Specs filterable by pharmacopoeia + edition.
- [ ] Edition update flags affected specs for review.

---

### PHA-26 — Out-of-Calibration & Out-of-Trend Beyond Stability
**Priority:** P2 | **Effort:** 2 days | **Risk:** moderate

**Domain background:** OOS (out-of-specification) is a binary fail of a spec limit. OOT (out-of-trend) is a value that's within spec but unusual relative to history. Stability today flags OOT against the prior timepoint. The same logic applies to routine QC across batches — that's where CPV (PHA-21) overlaps. OOC (out-of-calibration) is when an instrument is found out of cal at next calibration — and every result since the last calibration becomes suspect.

**Backend:**
- `OocFindingService`: when an `EquipmentCalibration` is recorded with `outOfTolerance = true`, retrospectively flag all `QcTestResult` rows on that equipment since the prior good calibration.
- Trigger an investigation per affected result.

**Frontend:**
- Equipment calibration page: "Mark out of tolerance" → triggers retrospective workflow.

**Acceptance criteria:**
- [ ] OOC discovery creates investigations on all affected results.
- [ ] Each investigation appears in the manager inbox.

---

### PHA-27 — Periodic Review Calendar (SOPs, Specs, Suppliers, Methods)
**Priority:** P2 | **Effort:** 1.5 days | **Risk:** low

**Domain background:** Every controlled element has a periodic-review cadence. A consolidated calendar showing "due in next 90 days" across SOPs (PHA-1), specs, methods (PHA-20), suppliers, method validations is what QA uses to plan their month.

**Backend:**
- Cross-domain query.
- `/api/qms/periodic-reviews?from=&to=` — unified list.

**Frontend:**
- `/qms/periodic-reviews` — calendar view.

**Acceptance criteria:**
- [ ] One page surfaces every due review.
- [ ] Click jumps to record.

---

### PHA-28 — Site Master File Snapshot
**Priority:** P3 | **Effort:** 2 days | **Risk:** low

**Domain background:** A Site Master File (SMF) is a fixed-format document describing the manufacturing site — premises, equipment, products, key personnel, organisational chart. Required by EU GMP. It changes slowly but needs to be current.

**Action:** Generate SMF PDF auto-populated from existing masters (equipment, products, employees) with editable narrative sections.

---

### PHA-29 — Backup & Disaster Recovery Evidence
**Priority:** P2 | **Effort:** 1.5 days | **Risk:** low

**Domain background:** GMP systems need documented backup procedures + periodic restore tests. Inspectors ask: "when was the last restore test?"

**Backend:**
- `BackupRun`, `RestoreTest` entities. Cron job records nightly DB backup metadata.
- Manual restore-test logging endpoint.

**Frontend:**
- `/admin/backup` — list runs + restore tests.

**Acceptance criteria:**
- [ ] Each backup logged with size, duration, target.
- [ ] Last restore test surfaces on IT dashboard.

---

### PHA-30 — Audit Trail Review (ATR) Workflow
**Priority:** P1 | **Effort:** 2 days | **Risk:** low

**Domain background:** MHRA Data Integrity guidance explicitly requires "audit trail review" as a periodic activity — a designated reviewer looks through the audit trail of critical activities (results entry, dispositions, e-signs) and confirms no anomalies. Required to be evidenced.

**Problem:** Audit trail exists; the review activity around it doesn't.

**Backend:**
- `AuditTrailReview`: `reviewerId`, `periodStart`, `periodEnd`, `scopeEntityTypes`, `findings`, `signedAt`, `signatureMeaning`.
- Periodic-review job (weekly/monthly) creates the next ATR task.

**Frontend:**
- `/qms/audit-trail-review` — workflow.

**Acceptance criteria:**
- [ ] ATR can be scheduled, executed, e-signed.
- [ ] Overdue ATR surfaces on QA dashboard.

---

## 5. Roadmap — phasing to "100% pharma"

The 30 tickets above are not a single sprint. Realistic phasing:

### Phase A — "Inspection-Ready QC + QMS" (4-6 weeks)
Goal: be able to host an internal mock audit and not fail.

| Order | Ticket | Outcome |
|---|---|---|
| 1 | PHA-15 | Single-record audit-trail PDF — biggest auditor win |
| 2 | PHA-16 | CSV validation pack — required to even host an inspection |
| 3 | PHA-17 | User-access historical review |
| 4 | PHA-1 | SOP/document control |
| 5 | PHA-2 | Training-to-task gate |
| 6 | PHA-4 | Raw-data attachment to test results |
| 7 | PHA-30 | Audit-trail review workflow |
| 8 | PHA-24 | Awaiting-me inbox |

### Phase B — "QC Lab Completeness" (3-4 weeks)
Goal: a QC analyst's daily workflow has no missing entities.

| Order | Ticket | Outcome |
|---|---|---|
| 9 | PHA-5 | Solution preparation records |
| 10 | PHA-6 | Column logbook |
| 11 | PHA-20 | Method validation records |
| 12 | PHA-22 | Calibration master |
| 13 | PHA-25 | Pharmacopoeia linkage |
| 14 | PHA-3 | Role-based training curriculum |
| 15 | PHA-7 | Volumetric standardisation |
| 16 | PHA-21 | CPV dashboard |
| 17 | PHA-26 | OOC + retrospective trigger |

### Phase C — "Warehouse + Material Flow Completeness" (3-4 weeks)
Goal: physical material flows are fully modelled.

| Order | Ticket | Outcome |
|---|---|---|
| 18 | PHA-11 | Dispensing module |
| 19 | PHA-12 | Cycle counting |
| 20 | PHA-13 | Recall workflow |
| 21 | PHA-18 | Preventive + breakdown maintenance |

### Phase D — "Quality Operations Depth" (3-4 weeks)
Goal: QA can run their year.

| Order | Ticket | Outcome |
|---|---|---|
| 22 | PHA-14 | Internal audit module |
| 23 | PHA-27 | Periodic review calendar |
| 24 | PHA-19 | Utility eLogbook |

### Phase E — "Manufacturing" (8-12 weeks)
Goal: the product becomes a pharma ERP, not a QC+QMS suite. Single biggest scope.

| Order | Ticket | Outcome |
|---|---|---|
| 25 | PHA-8 | Master Batch Record |
| 26 | PHA-9 | Executed BMR |
| 27 | PHA-10 | Batch Packaging Record |

### Phase F — "Operations & Polish" (2-3 weeks)
| Order | Ticket | Outcome |
|---|---|---|
| 28 | PHA-29 | Backup / DR evidence |
| 29 | PHA-28 | Site master file |
| 30 | PHA-23 | Notification channel (cross-ref TD-7) |

**Total**: ~24-33 engineering weeks for everything. With one engineer that's roughly 6-8 months. With two engineers and parallelism on independent modules, 4-5 months.

---

## 6. Definition of "100%" — exit criteria

You can credibly say "BatchSphere is a full pharma ERP" when:

1. A QP can release a batch using only the system (no shadow paper records).
2. An FDA / EU inspector can spend a day in the system and produce no observations relating to system capability.
3. The CSV pack (PHA-16) exists, is current, and is on file.
4. Every Section-11 ALCOA++ checkbox is closed.
5. A new analyst can be onboarded entirely through the system: account → role → curriculum → training → first task.
6. A recalled batch can be traced from finished product back through every input lot, every prep, every reagent, every analyst, every instrument.
7. SOPs, methods, specs, supplier qualifications, and equipment qualifications all have current periodic-review status.

Until these are true, the product is closer to "the strongest part of a pharma ERP" than "a pharma ERP".

---

## 7. How to think about scope

A few practical heuristics that apply when picking what to build next, especially for someone new to the domain:

- **Inspectors prioritise data integrity over feature richness.** A bare-bones module with complete audit trail beats a fancy module that loses history. Spend on PHA-15, PHA-16, PHA-17 first.
- **A QC manager will use the product 6 hours a day.** Spend on PHA-24 (inbox) and PHA-2 (training gate) because those are felt every hour.
- **A QA reviewer's life is periodic review.** Spend on PHA-1 (SOP control) and PHA-27 (review calendar) because those drive their week.
- **Manufacturing is the big differentiator.** Until you build PHA-8/9/10 the product cannot compete with a true pharma ERP. But it can compete strongly in the LIMS+QMS segment without it. Decide based on target market.
- **Education first, automation second.** For someone new to pharma — build the artefacts inspectors expect (PDFs, certificates, signed records) before optimising the UI flow.

---

## 8. What this document is not

- Not a regulatory submission. Anything inspection-bound needs review by a qualified RA/QA professional before going to a regulator.
- Not a substitute for site-specific procedures. Every plant has nuances around their products, premises, and history.
- Not a price quote. Effort estimates are engineering days, not calendar days, and don't include domain SME review time.

---

## 9. Change log

| Date | Author | Change |
|---|---|---|
| 2026-05-18 | Domain review pass | Initial draft following persona-driven gap analysis |

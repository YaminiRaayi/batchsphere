# QC Sampling — Complete Implementation Plan

Last updated: 2026-04-25
Scope: Full QC Sampling + Spec/MOA implementation plan for BatchSphere
Based on: Full codebase analysis + SPEC_MOA_DESIGN.md + QC_SAMPLING_IMPLEMENTATION_PLAN.md + pharma regulatory research

---

## 1. Current State (Verified from Code)

| Phase | Status | Evidence |
|---|---|---|
| Phase 0: Stable WMS coupling | ✅ Done | InventoryService.transitionInventoryStatus() audits all transitions. InventoryTransaction written for every change. |
| Phase 1: Full sampling workflow | ✅ Done | REQUESTED → PLAN_DEFINED → IN_PROGRESS → SAMPLED → HANDED_TO_QC → COMPLETED all implemented. |
| Phase 2: Sample + QcDisposition entities | ⚠️ Partial | Sample, SampleContainerLink, QcDisposition tables exist. BUT QC receipt/review steps missing. Test result entry not possible. |
| Phase 3: OOS investigation + resample | ❌ Not started | No investigation entity. No resample cycle. No UNDER_INVESTIGATION status. |
| Phase 4: Audit + compliance hardening | ❌ Not started | No quality events. No role restrictions. No e-sign. |

### What works today (verified end-to-end)

```
GRN receive → SamplingRequest(REQUESTED) → Inventory(QUARANTINE)
     ↓
createSamplingPlan → spec + method resolved → containers calculated
     ↓
startSampling → Inventory(SAMPLING)
     ↓
completeSampling → Sample created → SampleContainerLink → containers reconciled
     ↓
handoffToQc → QcDisposition(PENDING) → Inventory(UNDER_TEST)
     ↓
recordQcDecision(approve/reject) → QcDisposition(APPROVED/REJECTED) → Inventory(RELEASED/REJECTED)
```

### Critical gaps blocking pharma-compliant QC

1. **QcDispositionStatus too thin** — only PENDING/APPROVED/REJECTED. Missing RECEIVED, UNDER_REVIEW, UNDER_INVESTIGATION, BLOCKED, RESAMPLE_REQUIRED, RETEST_REQUIRED.
2. **SpecParameter does not exist** — cannot generate test worksheet. Cannot validate results automatically. Cannot trace which MOA was used per test.
3. **No test result entry** — no QcTestResult entity. QC has no way to record actual vs expected per test.
4. **No OOS workflow** — borderline result has no investigation path. System forces binary approve/reject.
5. **Spec entity too thin** — no specType, no status lifecycle, no targetMarket, no compendialRef, no approvedBy/At, no effectiveDate.
6. **MOA entity too thin** — no moaType, no validationStatus, no principle, no compendialRef.
7. **No QC receipt step** — handoff creates QcDisposition(PENDING) but no explicit "sample received in QC lab" event.
8. **CoA path has no sample entity** — CoA-based release produces a QcDisposition with null sampleId. No document traceability.

---

## 2. Architecture Decision

**Ownership rule (unchanged from QC_SAMPLING_IMPLEMENTATION_PLAN.md):**

```
WMS         → owns inventory status, movement restrictions, location, FEFO
Sampling    → owns sampling plan, container selection, sample collection, custody handoff
QC          → owns receipt, test result entry, OOS investigation, final disposition
Spec/MOA    → owns test definitions and acceptance criteria (drives what QC does and how)
```

**New architecture rule for this plan:**

```
Spec.parameters (SpecParameter list) → drives QcTestWorksheet generation at QC receipt
QcTestResult (one row per SpecParameter per sample) → stores actual result + pass/fail
QcDisposition (one row per sample) → aggregates test results → drives final disposition
OosInvestigation (one per failing test result) → FDA 3-phase investigation model
ResampleRequest (linked to parent SamplingRequest) → new sampling cycle on same batch
```

**Key design principle:**

> QC disposition must be backed by evidence. Evidence = test results against spec parameters. No test results → no approval. This is EU GMP Chapter 6 and FDA 21 CFR 211.192.

---

## 3. Complete Entity Model

### 3.1 Spec (enhanced — add to `spec_master`)

Add these columns:

```
specType         ENUM: MATERIAL / IN_PROCESS / FINISHED_PRODUCT / PACKAGING
status           ENUM: DRAFT / UNDER_REVIEW / APPROVED / OBSOLETE
targetMarket     ENUM: EU / US_FDA / UK_MHRA / INDIA_CDSCO / JAPAN_PMDA / CHINA_NMPA / WHO_PREQUALIFICATION / GLOBAL / INTERNAL
effectiveDate    DATE
expiryDate       DATE (nullable)
compendialRef    ENUM: PH_EUR / USP / BP / JP / IP / CHN_PHARMACOPOEIA / WHO_INT / MULTI_COMPENDIAL / IN_HOUSE / NONE
compendialEdition VARCHAR(100) (nullable) — e.g. "Ph. Eur. 11th Ed."
referenceDocumentNo VARCHAR(100) (nullable)
referenceAttachment VARCHAR(500) (nullable)
approvedBy       VARCHAR(100)
approvedAt       TIMESTAMP
submittedBy      VARCHAR(100)
submittedAt      TIMESTAMP
reviewedBy       VARCHAR(100)
reviewedAt       TIMESTAMP
reviewRemarks    TEXT
reviewRoute      ENUM: QC_ONLY / QC_THEN_QA / QA_ONLY
previousSpecId   UUID (nullable, FK → spec_master, self-reference for version chain)
```

Status lifecycle:
```
DRAFT → UNDER_REVIEW → APPROVED → OBSOLETE
         ↑
    (reject → back to DRAFT)
```

Rules:
- Only APPROVED specs can be linked to materials or used in sampling plans
- New revision action: create new DRAFT with previousSpecId = current APPROVED
- OBSOLETE stays readable for audit, cannot be linked
- `Submit for Review` puts the spec into a review queue.
- For the current release, default `reviewRoute = QC_ONLY`.
- QA-stage approval can be added later by enabling `QC_THEN_QA` or `QA_ONLY` without changing the lifecycle itself.
- Reject requires `reviewRemarks` and sends the spec back to `DRAFT`.

### 3.2 SpecParameter (new table: `spec_parameter`)

This is the CRITICAL missing entity. One row per test per spec.

```
id                    UUID PK
specId                UUID FK → spec_master (not nullable)
parameterName         VARCHAR(255) — "Assay", "Loss on Drying", "Identification (IR)"
testType              ENUM: IDENTITY / ASSAY / PURITY / PHYSICAL / CHEMICAL / MICROBIOLOGICAL / DESCRIPTION
moaId                 UUID FK → moa_master (nullable — some tests visual/descriptive)
criteriaType          ENUM: NLT / NMT / RANGE / PASS_FAIL / COMPLIES / TEXT
lowerLimit            DECIMAL(18,4) (nullable — used for NLT and RANGE)
upperLimit            DECIMAL(18,4) (nullable — used for NMT and RANGE)
textCriteria          VARCHAR(500) (nullable — used for COMPLIES, TEXT, PASS_FAIL)
compendialChapterRef  VARCHAR(200) (nullable — for COMPLIES type: "Ph. Eur. 5.1.4 Cat. 3A", "USP <61>/<62>")
unit                  VARCHAR(50) (nullable — %, ppm, µm, mg/mL, cfu/g)
isMandatory           BOOLEAN (default true)
sequence              INT (display + execution order)
notes                 TEXT (nullable — special analyst instructions)
isActive              BOOLEAN (default true)
createdBy             VARCHAR(100)
createdAt             TIMESTAMP
updatedBy             VARCHAR(100)
updatedAt             TIMESTAMP
```

criteriaType semantics:
- `NLT` → result >= lowerLimit (Not Less Than)
- `NMT` → result <= upperLimit (Not More Than)
- `RANGE` → lowerLimit <= result <= upperLimit
- `PASS_FAIL` → analyst enters PASS or FAIL. textCriteria holds description.
- `COMPLIES` → analyst confirms compliance. textCriteria + compendialChapterRef hold the reference.
- `TEXT` → descriptive. textCriteria holds expected description. No numeric validation.

### 3.3 MaterialSpecLink (new table: `material_spec_link`)

```
id              UUID PK
materialId      UUID FK → material_master (not nullable)
specId          UUID FK → spec_master (not nullable)
isActive        BOOLEAN — only one active spec per material
linkedBy        VARCHAR(100)
linkedAt        TIMESTAMP
delinkedBy      VARCHAR(100) (nullable)
delinkedAt      TIMESTAMP (nullable)
notes           TEXT (nullable)
createdAt       TIMESTAMP
```

Rules:
- `isActive = true` on only one row per material at a time
- Delink sets isActive = false + delinkedBy/At on old row
- Link creates new row with isActive = true
- Multiple historical rows allowed for audit trail

### 3.4 Moa (enhanced — add to `moa_master`)

Add these columns:

```
moaType                    ENUM: HPLC / GC / UV_VIS / IR / TITRATION / KARL_FISCHER / LOD_OVEN / PHYSICAL / MICROBIOLOGICAL / VISUAL / OTHER
principle                  TEXT (nullable) — brief analytical principle description
compendialRef              ENUM: PH_EUR / USP / BP / JP / IP / CHN_PHARMACOPOEIA / WHO_INT / IN_HOUSE / NONE
instrumentType             VARCHAR(200) (nullable) — "HPLC system", "KF apparatus", "IR spectrometer"
reagentsAndStandards       TEXT (nullable) — reference standard, mobile phase, titrant
systemSuitabilityCriteria  TEXT (nullable) — e.g. "RSD ≤ 2.0% for 5 injections, tailing factor ≤ 1.5"
calculationFormula         TEXT (nullable) — assay calculation expression
reportableRange            VARCHAR(100) (nullable) — "0.05% – 2.0%"
validationReferenceNo      VARCHAR(100) (nullable)
validationAttachment       VARCHAR(500) (nullable)
sampleSolutionStabilityValue DECIMAL(18,2) (nullable)
sampleSolutionStabilityUnit  ENUM: MINUTES / HOURS / DAYS
sampleSolutionStabilityCondition VARCHAR(200) (nullable)
validationStatus           ENUM: NOT_VALIDATED / IN_VALIDATION / VALIDATED / VALIDATED_COMPENDIAL
status                     ENUM: DRAFT / APPROVED / OBSOLETE
approvedBy                 VARCHAR(100)
approvedAt                 TIMESTAMP
submittedBy                VARCHAR(100)
submittedAt                TIMESTAMP
reviewedBy                 VARCHAR(100)
reviewedAt                 TIMESTAMP
reviewRemarks              TEXT
reviewRoute                ENUM: QC_ONLY / QC_THEN_QA / QA_ONLY
```

Validation status rules:
- `VALIDATED_COMPENDIAL` — method comes from pharmacopoeia (Ph. Eur. / USP / etc.), treated as pre-validated
- `VALIDATED` — in-house validated per ICH Q2(R1)
- `IN_VALIDATION` — validation in progress, not yet usable in APPROVED spec
- `NOT_VALIDATED` — blocks spec approval if linked
- `validationReferenceNo` is the primary method-validation document reference for audit and search.
- `validationAttachment` stores the linked validation protocol/report or controlled document path.
- `sampleSolutionStability*` must be captured because the usable life of prepared sample solution affects lab execution and retest validity.
- MOA submit/review follows the same review queue pattern as Spec; default route for now should be QC-first.

### 3.5 QcDispositionStatus (expand enum)

Current: PENDING / APPROVED / REJECTED

Expand to:
```
PENDING               — QcDisposition created on handoff, awaiting QC receipt
RECEIVED              — sample physically received and logged in QC lab
UNDER_REVIEW          — QC analyst actively running tests, entering results
UNDER_INVESTIGATION   — OOS/OOT result flagged, investigation in progress
BLOCKED               — batch on quality hold pending investigation outcome
RESAMPLE_REQUIRED     — investigation concluded, new sampling cycle needed
RETEST_REQUIRED       — investigation concluded, retest of retained sample needed
APPROVED              — all mandatory parameters passed, batch released
REJECTED              — one or more mandatory parameters failed after investigation
```

Status flow:
```
PENDING → RECEIVED → UNDER_REVIEW → APPROVED
                                  ↘ UNDER_INVESTIGATION → BLOCKED → RESAMPLE_REQUIRED
                                                                   → RETEST_REQUIRED
                                                                   → APPROVED (after investigation)
                                                                   → REJECTED
```

### 3.6 SamplingRequestStatus (expand enum)

Current: REQUESTED / PLAN_DEFINED / IN_PROGRESS / SAMPLED / HANDED_TO_QC / COMPLETED / APPROVED (legacy) / REJECTED (legacy) / CANCELLED

Expand:
```
RESAMPLE_REQUIRED     — QC flagged, new sampling cycle needed
```

### 3.7 QcTestResult (new table: `qc_test_result`)

One row per test parameter per sample. This is the test worksheet row.

```
id                  UUID PK
sampleId            UUID FK → qc_sample (not nullable)
specParameterId     UUID FK → spec_parameter (not nullable)
moaIdUsed           UUID FK → moa_master (nullable — MOA actually used, may differ from spec default)
analystCode         VARCHAR(100) (not nullable)
resultValue         DECIMAL(18,6) (nullable — for NLT/NMT/RANGE)
resultText          VARCHAR(500) (nullable — for PASS_FAIL/COMPLIES/TEXT)
status              ENUM: PENDING / PASS / FAIL / OOS / INCONCLUSIVE
passFailFlag        BOOLEAN (nullable — computed: true = pass, false = fail/OOS)
lowerLimitApplied   DECIMAL(18,4) (nullable — snapshot of spec limit at test time)
upperLimitApplied   DECIMAL(18,4) (nullable — snapshot)
criteriaTypeApplied ENUM (snapshot of spec criteriaType at test time)
unitApplied         VARCHAR(50) (snapshot)
enteredAt           TIMESTAMP
reviewedBy          VARCHAR(100) (nullable)
reviewedAt          TIMESTAMP (nullable)
remarks             VARCHAR(500) (nullable)
isActive            BOOLEAN (default true)
createdBy           VARCHAR(100)
createdAt           TIMESTAMP
updatedBy           VARCHAR(100)
updatedAt           TIMESTAMP
```

QcTestResultStatus:
```
PENDING        — worksheet row generated, analyst has not entered result yet
PASS           — result meets acceptance criteria
FAIL           — result outside acceptance criteria → triggers OOS investigation
OOS            — result confirmed out-of-spec after Phase I lab investigation
INCONCLUSIVE   — analyst flagged result as requiring review (borderline, instrument issue)
```

Snapshot rule: `lowerLimitApplied`, `upperLimitApplied`, `criteriaTypeApplied`, `unitApplied` are captured FROM the SpecParameter at worksheet generation time. This protects historical accuracy if the spec is revised later.

### 3.8 OosInvestigation (new table: `oos_investigation`)

FDA 3-phase OOS model. One per failing QcTestResult.

```
id                    UUID PK
qcTestResultId        UUID FK → qc_test_result (not nullable)
sampleId              UUID FK → qc_sample
samplingRequestId     UUID FK → sampling_request
investigationNumber   VARCHAR(100) unique — auto-generated "OOS-YYYYMMDD-NNNN"
status                ENUM: PHASE_I / PHASE_II / CLOSED_INVALID / CLOSED_CONFIRMED / CLOSED_RESAMPLE / CLOSED_RETEST
phase1Summary         TEXT (nullable) — lab error check outcome
phase1AssignableCause BOOLEAN (nullable) — true = found, false = not found → result stands
phase1ClosedBy        VARCHAR(100)
phase1ClosedAt        TIMESTAMP
phase2Summary         TEXT (nullable)
phase2Retest          BOOLEAN (nullable)
phase2RetestResult    TEXT (nullable)
phase2ClosedBy        VARCHAR(100)
phase2ClosedAt        TIMESTAMP
finalOutcome          ENUM: RESULT_INVALIDATED / OOS_CONFIRMED / BATCH_RELEASE_JUSTIFIED / BATCH_REJECTED
finalRemarks          TEXT
closedBy              VARCHAR(100)
closedAt              TIMESTAMP
isActive              BOOLEAN
createdBy             VARCHAR(100)
createdAt             TIMESTAMP
updatedBy             VARCHAR(100)
updatedAt             TIMESTAMP
```

OOS investigation status:
```
PHASE_I          — Phase I lab investigation (analyst checks instrument, calculation, preparation errors)
PHASE_II         — Phase II full investigation (no assignable cause in Phase I, expand scope)
CLOSED_INVALID   — investigation confirmed assignable cause, result invalidated, retest authorized
CLOSED_CONFIRMED — investigation confirmed OOS, no assignable cause, result valid
CLOSED_RESAMPLE  — investigation outcome: request new sampling cycle
CLOSED_RETEST    — investigation outcome: retest retained sample
```

### 3.9 ResampleRequest (new table: `resample_request`)

Linked to parent SamplingRequest when resample is required.

```
id                    UUID PK
parentSamplingReqId   UUID FK → sampling_request (not nullable)
triggerSampleId       UUID FK → qc_sample (the sample that triggered resample)
oosInvestigationId    UUID FK → oos_investigation (nullable — if triggered by investigation)
reason                TEXT (not nullable)
requestedBy           VARCHAR(100)
requestedAt           TIMESTAMP
newSamplingRequestId  UUID FK → sampling_request (nullable — filled when new cycle created)
status                ENUM: PENDING / NEW_CYCLE_CREATED / CANCELLED
isActive              BOOLEAN
createdBy             VARCHAR(100)
createdAt             TIMESTAMP
```

### 3.10 Sample (add fields)

Add to `qc_sample`:

```
receiptCondition        VARCHAR(500) (nullable) — QC lab entry: "intact seals, correct label, temp OK"
receivedByQc            VARCHAR(100) (nullable)
receivedAtQc            TIMESTAMP (nullable)
sampleStorageLocation   VARCHAR(150) (nullable) — location inside QC lab / cold room
retainedFlag            BOOLEAN (default false) — portion set aside for retention period
consumedFlag            BOOLEAN (default false) — test portion consumed by testing
destroyedFlag           BOOLEAN (default false) — sample disposed/destroyed
retainedQuantity        DECIMAL(18,3) (nullable) — quantity retained for re-inspection period
retainedUntil           DATE (nullable) — retention period end date
```

### 3.11 InventoryStatus (add transition)

Add to ALLOWED_TRANSITIONS:

```
BLOCKED → QUARANTINE    (resample triggered: return to QUARANTINE to allow new sampling cycle)
BLOCKED → REJECTED      (investigation confirmed rejection)
BLOCKED → RELEASED      (investigation concluded batch is releasable with deviation documentation)
UNDER_TEST → BLOCKED    (OOS result triggers investigation → block stock)
```

---

## 4. Service Architecture

### 4.1 New/Modified Services

```
SpecParameterService         → CRUD for spec parameters, draft/approve/obsolete lifecycle
MaterialSpecLinkService      → link/delink material to spec, resolve active spec for material
MoaEnhancementService        → add moaType, validationStatus, status lifecycle to MOA
QcWorksheetService           → generate QcTestResult rows from SpecParameters on receipt
QcTestResultService          → record test results, validate against criteria, flag OOS
OosInvestigationService      → Phase I/II investigation workflow, outcome recording
ResampleRequestService       → create/approve/cancel resample requests
```

### 4.2 Modified SamplingService methods

`handoffToQc()`:
- Create QcDisposition with status = `PENDING` (no change)
- Create QcWorksheet stub — no auto-generation of test rows yet (only on receipt)

`recordQcDecision()`:
- REMOVE: direct APPROVED/REJECTED path without test results
- REPLACE: validate all mandatory QcTestResults have status PASS before allowing APPROVED
- REQUIRE: at least one FAIL to allow REJECTED (prevent QC approving a spec-failed batch)
- Keep legacy CoA path (PLAN_DEFINED → COMPLETED) but add a note record

### 4.3 Modified InventoryService

Add to ALLOWED_TRANSITIONS:
```java
InventoryStatus.UNDER_TEST, EnumSet.of(RELEASED, REJECTED, BLOCKED),
InventoryStatus.BLOCKED,    EnumSet.of(QUARANTINE, REJECTED, RELEASED)
```

Add `InventoryReferenceType.QC_INVESTIGATION` for investigation-triggered transitions.

### 4.4 QcWorksheetService (new)

```java
public interface QcWorksheetService {
    // Called on QC receipt. Fetches Spec → SpecParameters → creates QcTestResult rows.
    List<QcTestResult> generateWorksheet(UUID sampleId, UUID specId, String actor);

    // Returns worksheet for QC analyst UI
    List<QcTestResultResponse> getWorksheet(UUID sampleId);

    // Analyst enters result for one test row
    QcTestResultResponse recordResult(UUID testResultId, RecordTestResultRequest request, String actor);

    // Validates ALL mandatory rows PASS → returns true if eligible for APPROVED
    boolean isWorksheetComplete(UUID sampleId);

    // Returns list of FAIL/OOS rows for investigation
    List<QcTestResult> getFailingResults(UUID sampleId);
}
```

### 4.5 Validation rules in QcTestResultService

For each criteriaType:

```
NLT     → PASS if resultValue >= lowerLimit
NMT     → PASS if resultValue <= upperLimit
RANGE   → PASS if lowerLimit <= resultValue <= upperLimit
PASS_FAIL → PASS if resultText = "PASS" (analyst explicitly sets)
COMPLIES  → PASS if resultText = "COMPLIES" or "PASS" (analyst confirms)
TEXT      → always PASS (descriptive only, no validation)
```

If validation fails → status = `FAIL`
If result is within specification but deviates from historical trend → status = `OOS` (OOT — out of trend, not blocking by default)
If system detects a numeric value far outside typical range → flag as `INCONCLUSIVE`

### 4.6 OOS trigger logic

When QcTestResultService.recordResult() sets a result to FAIL:
1. Set QcTestResult.status = FAIL
2. Create OosInvestigation with status = PHASE_I
3. Update QcDisposition.status = UNDER_INVESTIGATION
4. Transition Inventory to BLOCKED (via InventoryService, referenceType = QC_INVESTIGATION, referenceId = oosInvestigation.id)
5. Write InventoryTransaction with BLOCKED transition

---

## 5. API Design (All New Endpoints)

### 5.1 Spec Lifecycle

```
POST   /api/specs/{id}/submit      → DRAFT → UNDER_REVIEW
POST   /api/specs/{id}/approve     → UNDER_REVIEW → APPROVED (QC Manager role)
POST   /api/specs/{id}/reject      → UNDER_REVIEW → DRAFT (with rejection reason)
POST   /api/specs/{id}/revise      → create new DRAFT revision, previousSpecId = current
POST   /api/specs/{id}/obsolete    → APPROVED → OBSOLETE
GET    /api/specs/review-queue     → pending review queue
```

### 5.2 SpecParameter CRUD

```
POST   /api/specs/{id}/parameters           → add test parameter
GET    /api/specs/{id}/parameters           → list parameters (ordered by sequence)
PUT    /api/specs/{id}/parameters/{pid}     → update parameter (DRAFT spec only)
DELETE /api/specs/{id}/parameters/{pid}     → remove parameter (DRAFT spec only)
PUT    /api/specs/{id}/parameters/reorder   → reorder parameters (sequence update)
```

### 5.3 Material-Spec Link

```
POST   /api/materials/{id}/spec             → link material to spec (activate)
DELETE /api/materials/{id}/spec             → delink (sets isActive = false)
GET    /api/materials/{id}/spec             → get current active spec with parameters
GET    /api/materials/{id}/spec/history     → spec version history for this material
```

### 5.4 MOA Lifecycle

```
POST   /api/moas/{id}/approve              → DRAFT → APPROVED (QC Manager role)
POST   /api/moas/{id}/submit               → DRAFT → UNDER_REVIEW
POST   /api/moas/{id}/reject               → UNDER_REVIEW → DRAFT
POST   /api/moas/{id}/obsolete             → APPROVED → OBSOLETE
GET    /api/moas/{id}/linked-specs         → impact analysis: which specs use this MOA
GET    /api/moas/review-queue              → pending review queue
```

### 5.5 QC Receipt & Review

```
POST   /api/sampling-requests/{id}/qc-receipt
    Request: { receivedBy, receiptCondition, receiptTimestamp, sampleStorageLocation }
    Effect:
      - QcDisposition PENDING → RECEIVED
      - Sample.receivedByQc = receivedBy, receivedAtQc = timestamp
      - Sample.receiptCondition = condition
      - QcWorksheetService.generateWorksheet() called → QcTestResult rows created
    Response: SamplingRequestResponse + worksheet preview

POST   /api/sampling-requests/{id}/start-review
    Request: { analystCode }
    Effect:
      - QcDisposition RECEIVED → UNDER_REVIEW
    Response: SamplingRequestResponse
```

### 5.6 Test Result Entry

```
GET    /api/sampling-requests/{id}/worksheet
    Response: List<QcTestResultResponse> ordered by sequence

PUT    /api/sampling-requests/{id}/worksheet/{testResultId}
    Request: { resultValue, resultText, moaIdUsed, remarks }
    Effect:
      - RecordTestResultRequest → QcTestResultService.recordResult()
      - Auto-validates against criteriaType + limits
      - Sets status: PASS / FAIL / OOS / INCONCLUSIVE
      - If FAIL: creates OosInvestigation, moves QcDisposition to UNDER_INVESTIGATION,
                  transitions inventory to BLOCKED
    Response: QcTestResultResponse (with passFailFlag)
```

### 5.7 QC Disposition (updated)

```
POST   /api/sampling-requests/{id}/qc-decision
    Request: { decision: "APPROVE" | "REJECT", remarks }
    Validation:
      - APPROVE: all mandatory QcTestResults must be PASS
      - REJECT: must have at least one FAIL/OOS result
      - APPROVE requires QcDisposition.status = UNDER_REVIEW (no open investigations)
    Effect:
      - QcDisposition → APPROVED or REJECTED
      - SamplingRequest → COMPLETED
      - Inventory → RELEASED or REJECTED
    Response: SamplingRequestResponse
```

### 5.8 OOS Investigation

```
GET    /api/oos-investigations/{id}
    Response: OosInvestigationResponse (full phase details)

POST   /api/oos-investigations/{id}/close-phase-1
    Request: { phaseISummary, assignableCauseFound: boolean, resultInvalidated: boolean }
    Effect:
      - assignableCauseFound = true → investigation CLOSED_INVALID, QcTestResult invalidated,
          retest QcTestResult created, analyst re-enters result
      - assignableCauseFound = false → investigation moves to PHASE_II
    Response: OosInvestigationResponse

POST   /api/oos-investigations/{id}/close-phase-2
    Request: { phaseIISummary, outcome: RESAMPLE | RETEST | BATCH_REJECT | BATCH_RELEASE_JUSTIFIED }
    Effect:
      - RESAMPLE → creates ResampleRequest, QcDisposition = RESAMPLE_REQUIRED,
          inventory stays BLOCKED until new cycle complete
      - RETEST → QcDisposition = RETEST_REQUIRED, new QcTestResult created from retained sample
      - BATCH_REJECT → inventory BLOCKED → REJECTED, QcDisposition = REJECTED
      - BATCH_RELEASE_JUSTIFIED → inventory BLOCKED → RELEASED, QcDisposition = APPROVED
    Response: OosInvestigationResponse

GET    /api/oos-investigations
    Query params: status, samplingRequestId, sampleId, dateFrom, dateTo
    Response: Page<OosInvestigationResponse>
```

### 5.9 Resample Request

```
GET    /api/resample-requests/{id}
    Response: ResampleRequestResponse

POST   /api/resample-requests/{id}/create-new-cycle
    Effect: creates new SamplingRequest for same batch, links to parent via ResampleRequest.newSamplingRequestId
    Response: ResampleRequestResponse with new SamplingRequest ID

POST   /api/resample-requests/{id}/cancel
    Request: { reason }
    Effect: sets status = CANCELLED, if no other open investigations → QcDisposition = REJECTED
    Response: ResampleRequestResponse
```

---

## 6. Phase-by-Phase Implementation Plan

### Phase 2a — QC Receipt and Review (Next Sprint)

**Objective:** Add explicit receipt and review steps between handoff and decision.

**Effort estimate:** 3–4 days backend + 2 days UI

**Tasks:**

1. **QcDispositionStatus enum:** Add RECEIVED, UNDER_REVIEW
   - File: `SamplingRequestStatus.java` (no change needed)
   - File: `QcDispositionStatus.java` — add RECEIVED, UNDER_REVIEW
   - Add allowed transition validation in QcDispositionService

2. **Sample entity:** Add `receiptCondition`, `receivedByQc`, `receivedAtQc`, `sampleStorageLocation`, `retainedFlag`, `retainedQuantity`, `retainedUntil`
   - File: `Sample.java` — add fields
   - Migration: `ALTER TABLE qc_sample ADD COLUMN ...`

3. **QcReceiptRequest DTO:** new DTO with receivedBy, receiptCondition, receiptTimestamp, sampleStorageLocation

4. **SamplingService.receiveInQc():** new method
   - Validates QcDisposition.status = PENDING
   - Updates Sample fields
   - Updates QcDisposition.status = RECEIVED
   - Calls QcWorksheetService.generateWorksheet() (stub: creates empty QcTestResult rows using SpecParameter list)
   - Returns SamplingRequestResponse

5. **SamplingService.startReview():** new method
   - Validates QcDisposition.status = RECEIVED
   - Updates QcDisposition.status = UNDER_REVIEW

6. **SamplingController:** add POST /qc-receipt, POST /start-review endpoints

7. **UI update (06-sampling.html):** Add QC receipt button + form in the QC stage of sampling detail. Add "Start Review" button.

8. **Integration test:** extend SamplingServiceIntegrationTest to cover PENDING → RECEIVED → UNDER_REVIEW path.

---

### Phase 2b — Spec Enhancement + SpecParameter + MaterialSpecLink

**Objective:** Create the spec test parameter model. This unlocks all QC test result entry.

**Effort estimate:** 5–7 days backend + 3 days UI

**Tasks:**

1. **Spec entity enhancement:** Add specType, status, targetMarket, effectiveDate, compendialRef, compendialEdition, approvedBy, approvedAt, previousSpecId
   - Also add referenceDocumentNo, referenceAttachment, submittedBy/At, reviewedBy/At, reviewRemarks, reviewRoute
   - File: `Spec.java`
   - New enums: `SpecType.java`, `SpecStatus.java`, `TargetMarket.java` (CompendialRef enum already needed for MOA too)
   - Migration: `ALTER TABLE spec_master ADD COLUMN ...`

2. **SpecParameter entity:** New entity + repository
   - File: `SpecParameter.java` with all fields from section 3.2
   - New enums: `TestType.java`, `CriteriaType.java`
   - Table: `spec_parameter`
   - Migration: CREATE TABLE spec_parameter

3. **MaterialSpecLink entity:** New entity + repository
   - File: `MaterialSpecLink.java` with all fields from section 3.3
   - Table: `material_spec_link`
   - Migration: CREATE TABLE material_spec_link

4. **SpecParameterService:** CRUD methods
   - addParameter(specId, CreateSpecParameterRequest) — validates spec is DRAFT
   - updateParameter(specId, parameterId, UpdateSpecParameterRequest) — DRAFT only
   - removeParameter(specId, parameterId) — DRAFT only
   - reorderParameters(specId, List<UUID>) — updates sequence
   - getParametersBySpec(specId) — ordered by sequence

5. **SpecLifecycleService:** Status transition methods
   - submitForReview(specId) — DRAFT → UNDER_REVIEW, validates ≥1 mandatory parameter
   - approveSpec(specId, actor) — UNDER_REVIEW → APPROVED
   - rejectSpec(specId, reason) — UNDER_REVIEW → DRAFT (rejection reason stored in notes)
   - reviseSpec(specId, actor) — APPROVED → creates new DRAFT with previousSpecId set
   - obsoleteSpec(specId, actor) — APPROVED → OBSOLETE
   - routeSpecForReview(specId) should create a review queue item; for now default route is QC_ONLY

6. **MaterialSpecLinkService:** Link management
   - linkSpec(materialId, specId, actor) — deactivate old link, create new active link
   - delinkSpec(materialId, actor) — deactivate current link
   - getActiveSpec(materialId) — returns current APPROVED active spec with parameters
   - getSpecHistory(materialId) — all historical links

7. **Moa entity enhancement:** Add moaType, principle, compendialRef, instrumentType, reagentsAndStandards, systemSuitabilityCriteria, calculationFormula, reportableRange, validationStatus, status, approvedBy, approvedAt
   - Also add validationReferenceNo, validationAttachment, sampleSolutionStabilityValue, sampleSolutionStabilityUnit, sampleSolutionStabilityCondition, submittedBy/At, reviewedBy/At, reviewRemarks, reviewRoute
   - File: `Moa.java`
   - New enums: `MoaType.java`, `MoaValidationStatus.java` (reuse SpecStatus for MOA status)
   - Migration: `ALTER TABLE moa_master ADD COLUMN ...`

8. **SpecController + MoaController:** Add lifecycle endpoints (submit/approve/reject/revise/obsolete) + review queue endpoints

9. **SpecParameterController:** Full CRUD at /api/specs/{id}/parameters

10. **MaterialSpecLinkController:** Link management at /api/materials/{id}/spec

11. **SamplingService.createSamplingPlan() update:** Change to use MaterialSpecLink.getActiveSpec() instead of Material.specId

12. **UI update (11-spec-moa.html):** Wire spec lifecycle buttons. SpecParameter table should be editable in DRAFT state. Show APPROVED status lock. Show MOA validation status.

13. **Integration tests:**
    - spec DRAFT → APPROVE → OBSOLETE lifecycle
    - SpecParameter CRUD and sequence reorder
    - MaterialSpecLink link/delink/history
    - SamplingPlan creation using MaterialSpecLink-resolved spec

---

### Phase 2c — QC Test Worksheet + Result Entry

**Objective:** Allow QC analyst to enter results per test, auto-validate against spec, flag OOS.

**Effort estimate:** 6–8 days backend + 4 days UI

**Tasks:**

1. **QcTestResult entity:** New entity + repository
   - File: `QcTestResult.java` with all fields from section 3.7
   - New enum: `QcTestResultStatus.java`
   - Table: `qc_test_result`
   - Migration: CREATE TABLE qc_test_result

2. **QcWorksheetService:** Worksheet generation
   - generateWorksheet(sampleId, specId, actor):
     - Fetch SpecParameter list ordered by sequence
     - For each SpecParameter: create QcTestResult row with status = PENDING, snapshot criteria fields
     - Return List<QcTestResult>
   - getWorksheet(sampleId): return ordered list with current status
   - isWorksheetComplete(sampleId): all mandatory rows PASS → true

3. **QcTestResultService:** Result recording and validation
   - recordResult(testResultId, RecordTestResultRequest, actor):
     - Validate QcDisposition.status = UNDER_REVIEW
     - Set resultValue/resultText per request
     - Apply validation logic (NLT/NMT/RANGE/PASS_FAIL/COMPLIES/TEXT)
     - Set passFailFlag
     - If FAIL: trigger OOS flow (see Phase 3a)
   - getResult(testResultId)
   - getFailingResults(sampleId)

4. **recordQcDecision() update (SamplingService):**
   - APPROVE path: validate QcWorksheetService.isWorksheetComplete(sampleId)
   - REJECT path: validate at least one FAIL/OOS result exists
   - Block if QcDisposition.status = UNDER_INVESTIGATION (open investigation)

5. **New controller:** QcWorksheetController
   - GET /api/sampling-requests/{id}/worksheet
   - PUT /api/sampling-requests/{id}/worksheet/{testResultId}

6. **UI update (06-sampling.html):**
   - New "QC Worksheet" section on sampling detail for UNDER_REVIEW state
   - Table with: # | Test | Type | MOA | Criteria | Your Result | Status
   - Result input per row (numeric or pass/fail dropdown per criteriaType)
   - Green PASS / red FAIL indicators on each row
   - Overall worksheet status bar: "8/10 complete · 1 FAIL"

7. **Integration tests:**
   - Worksheet generation from SpecParameters
   - NLT/NMT/RANGE/PASS_FAIL criteria validation
   - OOS trigger on FAIL result
   - QC APPROVE blocked when incomplete worksheet
   - QC APPROVE blocked when open investigation

---

### Phase 3a — OOS Investigation (FDA 3-Phase)

**Objective:** Full OOS workflow — Phase I lab investigation, Phase II full investigation, outcome + inventory state management.

**Effort estimate:** 6–8 days backend + 4 days UI

**Tasks:**

1. **QcDispositionStatus enum:** Add UNDER_INVESTIGATION, BLOCKED
   - Migration: ALTER TYPE qc_disposition_status ADD VALUE ...

2. **OosInvestigation entity:** New entity + repository
   - File: `OosInvestigation.java` with all fields from section 3.8
   - New enum: `OosInvestigationStatus.java`, `OosFinalOutcome.java`
   - Table: `oos_investigation`
   - Migration: CREATE TABLE oos_investigation

3. **InventoryStatus BLOCKED transitions:** Add BLOCKED → QUARANTINE, BLOCKED → REJECTED, BLOCKED → RELEASED to ALLOWED_TRANSITIONS

4. **InventoryReferenceType:** Add QC_INVESTIGATION

5. **OosInvestigationService:**
   - createInvestigation(qcTestResultId, actor) — auto-triggered by FAIL result
   - closePhaseI(investigationId, ClosePhaseIRequest, actor)
   - closePhaseII(investigationId, ClosePhaseIIRequest, actor)
   - getInvestigation(investigationId)
   - getInvestigationsBySamplingRequest(samplingRequestId)

6. **OosInvestigationController:**
   - GET /api/oos-investigations/{id}
   - POST /api/oos-investigations/{id}/close-phase-1
   - POST /api/oos-investigations/{id}/close-phase-2
   - GET /api/oos-investigations

7. **Integration with QcDisposition and Inventory:**
   - On investigation created: Inventory UNDER_TEST → BLOCKED
   - Phase I assignable cause found → invalidate result → new result row → back to UNDER_REVIEW
   - Phase II outcome BATCH_REJECT → Inventory BLOCKED → REJECTED
   - Phase II outcome BATCH_RELEASE_JUSTIFIED → Inventory BLOCKED → RELEASED

8. **UI update:**
   - New "OOS Investigation" section on sampling detail when investigation is open
   - Phase I form: instrument check, assignable cause Y/N, notes
   - Phase II form: expanded scope, outcome selection
   - Timeline view of phase progress

9. **Integration tests:**
   - FAIL result → OOS investigation auto-created → BLOCKED inventory
   - Phase I assignable cause found → result invalidated → retest → PASS → APPROVED
   - Phase II BATCH_REJECT → inventory REJECTED
   - Phase II RESAMPLE_REQUIRED → ResampleRequest created

---

### Phase 3b — Resample and Retest Cycles

**Objective:** Allow QC to request new sampling or retest of retained sample after investigation conclusion.

**Effort estimate:** 4–5 days backend + 2 days UI

**Tasks:**

1. **QcDispositionStatus enum:** Add RESAMPLE_REQUIRED, RETEST_REQUIRED
2. **SamplingRequestStatus enum:** Add RESAMPLE_REQUIRED

3. **ResampleRequest entity:** New entity + repository
   - File: `ResampleRequest.java` from section 3.9
   - New enum: `ResampleRequestStatus.java`
   - Table: `resample_request`
   - Migration: CREATE TABLE resample_request

4. **ResampleRequestService:**
   - createResampleRequest(oosInvestigationId, reason, actor)
   - createNewSamplingCycle(resampleRequestId, actor):
     - Creates new SamplingRequest with same materialId, batchId, grnItemId
     - Sets ResampleRequest.newSamplingRequestId
     - Sets ResampleRequest.status = NEW_CYCLE_CREATED
     - Transitions inventory BLOCKED → QUARANTINE (ready for resampling)
   - cancelResampleRequest(resampleRequestId, reason, actor)

5. **Retest path:**
   - New QcTestResult row created from retained sample portion
   - Existing OosInvestigation.phase2Retest = true
   - QcDisposition = RETEST_REQUIRED (informational status while new result pending)
   - When retest result enters as PASS → resume normal UNDER_REVIEW → APPROVED path

6. **ResampleRequestController:**
   - GET /api/resample-requests/{id}
   - POST /api/resample-requests/{id}/create-new-cycle
   - POST /api/resample-requests/{id}/cancel

7. **Integration tests:**
   - Resample request created from Phase II outcome
   - New sampling cycle created and linked
   - Inventory transitions BLOCKED → QUARANTINE on new cycle creation
   - Original SamplingRequest marked RESAMPLE_REQUIRED

---

### Phase 4 — Audit and Compliance Hardening

**Objective:** QualityEvent log, retained sample lifecycle, role-based restrictions, reason codes.

**Effort estimate:** 5–7 days

**Tasks:**

1. **QualityEvent entity:** New table `quality_event`
   - eventType: QUARANTINE / SAMPLING_STARTED / SAMPLE_COLLECTED / HANDOFF_TO_QC / QC_RECEIPT / REVIEW_STARTED / OOS_DETECTED / INVESTIGATION_OPENED / INVESTIGATION_CLOSED / BATCH_RELEASED / BATCH_REJECTED / RESAMPLE_REQUESTED / DEVIATION_LINKED
   - moduleType: SAMPLING / QC / INVENTORY / WMS
   - referenceId, inventoryId, sampleId
   - performedBy, performedAt, remarks
   - Write event rows at each major state transition across all services

2. **RetainedSample lifecycle:**
   - Add retainedFlag, retainedQuantity, retainedUntil to Sample
   - Alert when retainedUntil approaches (weekly job)
   - Record destroyedAt when retention period ends

3. **Role-based restrictions:**
   - Spec approve action: role = QC_MANAGER
   - QC final decision: role = QC_MANAGER or QA_MANAGER
   - Investigation Phase II close: role = QC_MANAGER
   - Batch release on investigation: role = QA_MANAGER
   - Add @PreAuthorize annotations on controller methods

4. **Reason codes on critical transitions:**
   - InventoryStatusUpdateRequest: add mandatory reasonCode field for BLOCKED, RELEASED (after investigation), REJECTED
   - OosInvestigationService: capture reason code from standard list at phase close

5. **Deviation/CAPA reference hooks:**
   - OosInvestigation: add optional deviationRef (VARCHAR 200), capaRef (VARCHAR 200)
   - These are free-text references to external deviation system (future integration point)

---

## 7. Database Migration Sequence

### Phase 2a migrations

```sql
-- Add new enum values to qc_disposition_status
ALTER TYPE qc_disposition_status ADD VALUE 'RECEIVED' BEFORE 'APPROVED';
ALTER TYPE qc_disposition_status ADD VALUE 'UNDER_REVIEW' BEFORE 'APPROVED';

-- Add receipt fields to qc_sample
ALTER TABLE qc_sample
  ADD COLUMN receipt_condition VARCHAR(500),
  ADD COLUMN received_by_qc VARCHAR(100),
  ADD COLUMN received_at_qc TIMESTAMP,
  ADD COLUMN sample_storage_location VARCHAR(150),
  ADD COLUMN retained_flag BOOLEAN DEFAULT FALSE,
  ADD COLUMN retained_quantity DECIMAL(18,3),
  ADD COLUMN retained_until DATE;
```

### Phase 2b migrations

```sql
-- Spec entity enhancements
ALTER TABLE spec_master
  ADD COLUMN spec_type VARCHAR(50),
  ADD COLUMN status VARCHAR(50) DEFAULT 'APPROVED', -- backfill existing as APPROVED
  ADD COLUMN target_market VARCHAR(50),
  ADD COLUMN effective_date DATE,
  ADD COLUMN expiry_date DATE,
  ADD COLUMN compendial_ref VARCHAR(50),
  ADD COLUMN compendial_edition VARCHAR(100),
  ADD COLUMN approved_by VARCHAR(100),
  ADD COLUMN approved_at TIMESTAMP,
  ADD COLUMN previous_spec_id UUID REFERENCES spec_master(id);

-- Backfill: set all existing specs to APPROVED status and MATERIAL type
UPDATE spec_master SET status = 'APPROVED', spec_type = 'MATERIAL' WHERE status IS NULL;

-- SpecParameter table
CREATE TABLE spec_parameter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_id UUID NOT NULL REFERENCES spec_master(id),
  parameter_name VARCHAR(255) NOT NULL,
  test_type VARCHAR(50) NOT NULL,
  moa_id UUID REFERENCES moa_master(id),
  criteria_type VARCHAR(50) NOT NULL,
  lower_limit DECIMAL(18,4),
  upper_limit DECIMAL(18,4),
  text_criteria VARCHAR(500),
  compendial_chapter_ref VARCHAR(200),
  unit VARCHAR(50),
  is_mandatory BOOLEAN DEFAULT TRUE,
  sequence INT NOT NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(100),
  created_at TIMESTAMP,
  updated_by VARCHAR(100),
  updated_at TIMESTAMP
);
CREATE INDEX idx_spec_parameter_spec_id ON spec_parameter(spec_id);

-- MaterialSpecLink table
CREATE TABLE material_spec_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL,
  spec_id UUID NOT NULL REFERENCES spec_master(id),
  is_active BOOLEAN DEFAULT TRUE,
  linked_by VARCHAR(100),
  linked_at TIMESTAMP,
  delinked_by VARCHAR(100),
  delinked_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP
);
CREATE INDEX idx_material_spec_link_material ON material_spec_link(material_id);
CREATE INDEX idx_material_spec_link_active ON material_spec_link(material_id, is_active);

-- Backfill: migrate existing Material.specId into material_spec_link
INSERT INTO material_spec_link (id, material_id, spec_id, is_active, linked_by, linked_at, created_at)
SELECT gen_random_uuid(), m.id, m.spec_id, TRUE, 'migration', now(), now()
FROM material_master m WHERE m.spec_id IS NOT NULL;

-- MOA entity enhancements
ALTER TABLE moa_master
  ADD COLUMN moa_type VARCHAR(50),
  ADD COLUMN principle TEXT,
  ADD COLUMN compendial_ref VARCHAR(50),
  ADD COLUMN instrument_type VARCHAR(200),
  ADD COLUMN reagents_and_standards TEXT,
  ADD COLUMN system_suitability_criteria TEXT,
  ADD COLUMN calculation_formula TEXT,
  ADD COLUMN reportable_range VARCHAR(100),
  ADD COLUMN validation_status VARCHAR(50) DEFAULT 'VALIDATED',
  ADD COLUMN status VARCHAR(50) DEFAULT 'APPROVED',
  ADD COLUMN approved_by VARCHAR(100),
  ADD COLUMN approved_at TIMESTAMP;

-- Backfill: existing MOAs are assumed VALIDATED and APPROVED
UPDATE moa_master SET validation_status = 'VALIDATED', status = 'APPROVED'
WHERE validation_status IS NULL;
```

### Phase 2c migrations

```sql
-- QcTestResult table
CREATE TABLE qc_test_result (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL REFERENCES qc_sample(id),
  spec_parameter_id UUID NOT NULL REFERENCES spec_parameter(id),
  moa_id_used UUID REFERENCES moa_master(id),
  analyst_code VARCHAR(100) NOT NULL,
  result_value DECIMAL(18,6),
  result_text VARCHAR(500),
  status VARCHAR(50) DEFAULT 'PENDING',
  pass_fail_flag BOOLEAN,
  lower_limit_applied DECIMAL(18,4),
  upper_limit_applied DECIMAL(18,4),
  criteria_type_applied VARCHAR(50),
  unit_applied VARCHAR(50),
  entered_at TIMESTAMP,
  reviewed_by VARCHAR(100),
  reviewed_at TIMESTAMP,
  remarks VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(100),
  created_at TIMESTAMP,
  updated_by VARCHAR(100),
  updated_at TIMESTAMP
);
CREATE INDEX idx_qc_test_result_sample ON qc_test_result(sample_id);
CREATE UNIQUE INDEX idx_qc_test_result_sample_param ON qc_test_result(sample_id, spec_parameter_id)
  WHERE is_active = TRUE; -- one active result per test per sample
```

### Phase 3a migrations

```sql
-- Add QcDispositionStatus values
ALTER TYPE qc_disposition_status ADD VALUE 'UNDER_INVESTIGATION';
ALTER TYPE qc_disposition_status ADD VALUE 'BLOCKED';

-- Add InventoryReferenceType value
ALTER TYPE inventory_reference_type ADD VALUE 'QC_INVESTIGATION';

-- OosInvestigation table
CREATE TABLE oos_investigation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qc_test_result_id UUID NOT NULL REFERENCES qc_test_result(id),
  sample_id UUID REFERENCES qc_sample(id),
  sampling_request_id UUID REFERENCES sampling_request(id),
  investigation_number VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PHASE_I',
  phase1_summary TEXT,
  phase1_assignable_cause BOOLEAN,
  phase1_closed_by VARCHAR(100),
  phase1_closed_at TIMESTAMP,
  phase2_summary TEXT,
  phase2_retest BOOLEAN,
  phase2_retest_result TEXT,
  phase2_closed_by VARCHAR(100),
  phase2_closed_at TIMESTAMP,
  final_outcome VARCHAR(50),
  final_remarks TEXT,
  closed_by VARCHAR(100),
  closed_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(100),
  created_at TIMESTAMP,
  updated_by VARCHAR(100),
  updated_at TIMESTAMP
);
CREATE INDEX idx_oos_investigation_sample ON oos_investigation(sample_id);
CREATE INDEX idx_oos_investigation_sr ON oos_investigation(sampling_request_id);
```

### Phase 3b migrations

```sql
-- Add SamplingRequestStatus value
ALTER TYPE sampling_request_status ADD VALUE 'RESAMPLE_REQUIRED';

-- Add QcDispositionStatus values
ALTER TYPE qc_disposition_status ADD VALUE 'RESAMPLE_REQUIRED';
ALTER TYPE qc_disposition_status ADD VALUE 'RETEST_REQUIRED';

-- ResampleRequest table
CREATE TABLE resample_request (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_sampling_req_id UUID NOT NULL REFERENCES sampling_request(id),
  trigger_sample_id UUID REFERENCES qc_sample(id),
  oos_investigation_id UUID REFERENCES oos_investigation(id),
  reason TEXT NOT NULL,
  requested_by VARCHAR(100),
  requested_at TIMESTAMP,
  new_sampling_request_id UUID REFERENCES sampling_request(id),
  status VARCHAR(50) DEFAULT 'PENDING',
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(100),
  created_at TIMESTAMP
);
```

### Phase 4 migrations

```sql
-- Quality event table
CREATE TABLE quality_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  module_type VARCHAR(50) NOT NULL,
  reference_id UUID,
  inventory_id UUID,
  sample_id UUID,
  performed_by VARCHAR(100),
  performed_at TIMESTAMP,
  remarks VARCHAR(500)
);
CREATE INDEX idx_quality_event_sample ON quality_event(sample_id);
CREATE INDEX idx_quality_event_inventory ON quality_event(inventory_id);
CREATE INDEX idx_quality_event_type ON quality_event(event_type, performed_at);
```

---

## 8. UI Implementation Plan

### 8.1 06-sampling.html (QC Sampling screen) — extend for full workflow

**Current:** Shows sampling request list and create-sampling-plan modal.

**Add per phase:**

**Phase 2a:**
- Detail view: add "QC Lab" stage card after Handoff card
- "Receive Sample in QC" button (when status = HANDED_TO_QC)
  - Form: received by, receipt condition (dropdown: OK / Damaged Seal / Temperature Deviation / Quantity Mismatch / Other), storage location, timestamp
- "Start Review" button (when QcDisposition = RECEIVED)
- Status timeline bar: REQUESTED → PLAN_DEFINED → IN_PROGRESS → SAMPLED → HANDED_TO_QC → RECEIVED → UNDER_REVIEW → [result entry] → COMPLETED

**Phase 2c:**
- QC Worksheet section (appears when UNDER_REVIEW):
  - Table: # | Test Name | Type | MOA | Criteria | Result Input | Status
  - Criteria column shows formatted: "Range: 98.0 – 102.0 %" or "NMT 0.5 %" or "Complies Ph. Eur. 5.1.4 Cat. 3A"
  - Result input adapts to criteriaType: number input (RANGE/NLT/NMT) or pass/fail dropdown (PASS_FAIL/COMPLIES)
  - Row status: grey PENDING / green PASS / red FAIL
  - Worksheet progress bar: "6 / 10 entered · 5 PASS · 1 FAIL"
- "Record Decision" button only enabled when worksheet complete and no open investigations

**Phase 3a:**
- OOS Investigation panel (appears when QcDisposition = UNDER_INVESTIGATION):
  - Phase I form: instrument calibration checked Y/N, calculation verified Y/N, sample preparation reviewed Y/N, assignable cause Y/N, summary text
  - Phase II form (appears if Phase I = no assignable cause): full investigation scope, outcome selection
  - Timeline showing investigation phases
  - Inventory BLOCKED warning banner

**Phase 3b:**
- Resample request badge on parent sampling request when linked child cycle exists
- New sampling cycle appears in list with "(Resample of SRQ-XXXX)" subtitle

### 8.2 11-spec-moa.html (Spec & MOA screen) — extend for lifecycle

**Already has:**
- Spec list with status pills, Target Market tags
- Spec detail with test parameter table (view-only)
- Create spec slide-over with parameter edit table

**Add per phase:**

**Phase 2b:**
- Wire lifecycle action buttons (Submit for Review, Approve, Reject, Create New Revision, Obsolete)
- Edit spec in DRAFT: test parameter table fully editable
- APPROVED spec: all fields read-only, show "Create New Revision" button
- MOA detail view: show validation status badge (VALIDATED green / IN_VALIDATION amber / NOT_VALIDATED red)
- MOA create/edit: add moaType dropdown, validationStatus, principle, system suitability fields
- Material-Spec link section: search and link material from spec detail

---

## 9. Testing Strategy

### Phase 2a tests

```
SamplingServiceIntegrationTest.java — extend:
  - testQcReceiptTransition: HANDED_TO_QC → (qc-receipt) → RECEIVED, check Sample.receivedAtQc set
  - testStartReviewTransition: RECEIVED → (start-review) → UNDER_REVIEW
  - testQcReceiptGeneratesWorksheetStubs: verify QcTestResult rows created on receipt
```

### Phase 2b tests

```
SpecParameterServiceTest.java — new:
  - testAddParameterToDraftSpec
  - testAddParameterToApprovedSpecFails
  - testSpecSubmitValidationRequiresMandatoryParameter
  - testSpecApproveTransition
  - testReviseSpecCreatesNewDraft

MaterialSpecLinkServiceTest.java — new:
  - testLinkMaterial
  - testRelinkMaterialDeactivatesOld
  - testGetActiveSpec
  - testGetSpecHistory

SamplingPlanUsesActiveSpec — extend SamplingServiceIntegrationTest:
  - verify createSamplingPlan uses MaterialSpecLink.getActiveSpec() not Material.specId
```

### Phase 2c tests

```
QcWorksheetServiceTest.java — new:
  - testWorksheetGenerationFromSpecParameters
  - testNLTValidationPass: resultValue >= lowerLimit
  - testNLTValidationFail: resultValue < lowerLimit → FAIL status
  - testNMTValidationPass
  - testNMTValidationFail
  - testRangeValidationPass
  - testRangeValidationFail
  - testPassFailValidation
  - testCompliesValidation
  - testTextParameterAlwaysPasses
  - testWorksheetCompleteAllPass
  - testWorksheetIncompleteBlocksApproval
  - testQcApprovalBlockedWithOpenInvestigation
```

### Phase 3a tests

```
OosInvestigationServiceTest.java — new:
  - testFailResultTriggersOosInvestigation
  - testFailResultTransitionsInventoryToBlocked
  - testPhaseIAssignableCauseFound: investigation CLOSED_INVALID, new test result created
  - testPhaseINoAssignableCauseMovesToPhaseII
  - testPhaseIIOutcomeBatchReject: inventory BLOCKED → REJECTED
  - testPhaseIIOutcomeBatchReleaseJustified: inventory BLOCKED → RELEASED
  - testPhaseIIOutcomeResample: ResampleRequest created
```

### Phase 3b tests

```
ResampleRequestServiceTest.java — new:
  - testCreateResampleRequestFromInvestigation
  - testCreateNewSamplingCycleTransitionsInventory: BLOCKED → QUARANTINE
  - testNewCycleLinkedToParent
  - testCancelResampleRequest
```

---

## 10. Build Sequence (Recommended)

Build strictly in this order. Each phase unblocks the next.

```
Sprint 1  →  Phase 2a: QC receipt + review steps
              (3–4 days backend, 2 days UI)
              Deliverable: QC team can record receipt and start review

Sprint 2–3 → Phase 2b: Spec enhancement + SpecParameter + MaterialSpecLink
              (5–7 days backend, 3 days UI)
              Deliverable: QC can define test list per spec. Sampling plan uses versioned spec.

Sprint 4–5 → Phase 2c: QC test worksheet + result entry
              (6–8 days backend, 4 days UI)
              Deliverable: QC enters actual results, system validates, flags OOS. Decision backed by evidence.

Sprint 6–7 → Phase 3a: OOS investigation (FDA 3-phase)
              (6–8 days backend, 4 days UI)
              Deliverable: OOS result triggers investigation. Phase I/II workflow. Inventory blocked until resolved.

Sprint 8   → Phase 3b: Resample + retest cycles
              (4–5 days backend, 2 days UI)
              Deliverable: Full pharma-compliant repeat sampling cycle support.

Sprint 9+  → Phase 4: Quality events + retained samples + role restrictions
```

**Why this order:**

- Phase 2a does not require SpecParameter. Small, delivers visible value immediately.
- Phase 2b is the architectural foundation. Nothing in Phase 2c works without it.
- Phase 2c is where QC becomes spec-driven. Cannot skip.
- Phase 3a requires Phase 2c (you cannot have OOS without test results).
- Phase 3b requires Phase 3a (resample is triggered by investigation outcome).
- Phase 4 is additive hardening. Does not block anything.

**Do not skip Phase 2b to jump to Phase 3a.** Without SpecParameter, there are no test results. Without test results, there is nothing to investigate.

---

## 11. Coupling Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Backfill of existing specs into SpecParameter | Medium — existing specs have no test parameters; sampling plans reference them | Phase 2b migration: backfill existing specs with placeholder parameter. Alert QC to complete parameter list before re-approving. |
| Material.specId vs MaterialSpecLink dual source of truth | Medium — two systems for the same relationship | Phase 2b: deprecate Material.specId once all materials backfilled into material_spec_link. Keep field non-null until migration verified. |
| QcDispositionStatus enum extension | Low — additive change | PostgreSQL ALTER TYPE ADD VALUE is non-destructive. Test on staging before production. |
| ALLOWED_TRANSITIONS map in InventoryService | Medium — hard-coded map, adding BLOCKED → QUARANTINE introduces reverse path | Test all transition paths in integration suite before releasing Phase 3. |
| CoA path has null sampleId on QcDisposition | Low currently — will break QcWorksheetService.generateWorksheet() | Add explicit guard: if samplingMethod = COA_BASED_RELEASE, skip worksheet generation. Separately track CoA document reference. |
| Concurrent OOS investigations on same sample | Low — possible if two tests fail simultaneously | Add unique constraint: one OPEN investigation per test result. Check for open investigations before creating new. |

---

## 12. Regulatory Alignment Summary

This plan is designed to satisfy:

| Requirement | Source | Phase |
|---|---|---|
| Written and approved specifications with test parameters | EU GMP Chapter 6.20, FDA 21 CFR 211.160(b) | Phase 2b |
| Test results recorded per parameter per sample | EU GMP 6.26, FDA 211.194(a) | Phase 2c |
| OOS investigation with documented phases before batch decision | FDA 2006 OOS Guidance, EU GMP 6.33 | Phase 3a |
| Resample/retest policy for OOS confirmation | FDA OOS Guidance Phase II, ICH Q10 | Phase 3b |
| Sample receipt condition documented | WHO TRS 992, FDA 21 CFR 211.194 | Phase 2a |
| Retained sample tracking | EU GMP 6.14, FDA 211.170 | Phase 4 |
| Spec revision chain and version history | EU GMP 6.22, ICH Q10 | Phase 2b |
| Qualified MOA (validated method) required before use | ICH Q2(R1), EU GMP 6.15 | Phase 2b |
| Role-based decision restrictions | EU GMP Chapter 2 (Qualified Person), FDA 211.22 | Phase 4 |
| Audit trail for all quality decisions | EU GMP Annex 11, FDA 21 CFR Part 11 | Phases 2–4 (InventoryTransaction already exists, expand to QualityEvent in Phase 4) |

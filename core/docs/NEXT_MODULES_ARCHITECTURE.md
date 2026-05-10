# BatchSphere — Next Modules Architecture

**Date:** 2026-05-08  
**Author:** Yamini Raayi (QC Manager)  
**Status:** Design — pre-implementation

This document covers the architecture for the five modules planned after the current build:
1. QMS — Deviations & CAPAs
2. Batch Manufacturing Record (BPR)
3. HRMS
4. CoA Auto-Generation
5. LIMS

---

## BPR — When Does It Come Into the Workflow?

BPR is triggered by **inventory lot status = `RELEASED`**. The full trigger chain:

```
GRN received
    ↓
Inventory lot created  (status = QUARANTINE)
    ↓
QC Sampling Request raised against that lot
    ↓
Sampling → Plan → In Progress → Sampled → Handed to QC → Received → Under Review
    ↓
QC Manager approves disposition  (SamplingRequest status = APPROVED)
    ↓
Inventory lot status changed → RELEASED
    ↓
──────────────────────────────────────────────
  BPR STARTS HERE
  Batch Manufacturing Order created
  RELEASED lots dispensed → OUTBOUND inventory transaction
  In-process checks run during manufacturing
  Finished product recorded → INBOUND inventory (status = QUARANTINE)
  Finished product QC Sampling raised  ← re-enters the same sampling flow
  Finished product QC approved → RELEASED
──────────────────────────────────────────────
```

BPR cannot start on a QUARANTINE lot. It produces a new QUARANTINE finished-goods lot
that must pass its own QC cycle before release — closing the full pharma material loop.

---

## Implementation Order

```
Phase 1 (current):   Playwright E2E scaffolding + 01-auth.spec.ts
Phase 2:             HRMS                 — simpler entities, standalone, good demo value
Phase 3:             QMS Deviations + CAPAs — connects existing sampling/GRN/inventory modules
Phase 4:             CoA Auto-Generation  — high demo impact, moderate effort
Phase 5:             LIMS                 — instrument management, stability studies, formal OOS investigation
Phase 6:             Batch Manufacturing  — most complex; all other modules feed into it
```

Batch Manufacturing is last because it depends on Inventory being solid, QMS to receive
deviations from batch checks, HRMS to record who dispensed/approved, and LIMS for
finished product testing after the batch is complete.

---

## Module 1 — QMS: Deviations & CAPAs

### Why first (among QMS/BPR/HRMS)

The sampling investigation entity already exists. A proper Deviation module wraps it into a
formal quality loop — Deviation raised → root cause analysed → CAPA assigned → effectiveness
verified → Deviation closed. This is what regulators look for.

### Backend package layout

```
transactions/
  qms/
    deviation/
      entity/       Deviation.java
                    DeviationSeverity.java   (enum)
                    DeviationStatus.java     (enum)
                    DeviationSource.java     (enum)
      dto/          CreateDeviationRequest.java
                    DeviationResponse.java
                    UpdateDeviationStatusRequest.java
      repository/   DeviationRepository.java
      service/      DeviationService.java
                    DeviationServiceImpl.java
      controller/   DeviationController.java
    capa/
      entity/       Capa.java
                    CapaType.java            (enum)
                    CapaStatus.java          (enum)
      dto/          CreateCapaRequest.java
                    CapaResponse.java
                    CompleteCapaRequest.java
      repository/   CapaRepository.java
      service/      CapaService.java
                    CapaServiceImpl.java
      controller/   CapaController.java
```

### Entity: `Deviation`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `deviationNumber` | String | Auto: `DEV-YYYYMMDD-NNN` |
| `title` | String | Short description |
| `description` | String | Full narrative |
| `type` | Enum | `MATERIAL \| PROCESS \| EQUIPMENT \| DOCUMENTATION \| ENVIRONMENTAL` |
| `severity` | Enum | `MINOR \| MAJOR \| CRITICAL` |
| `status` | Enum | `OPEN \| UNDER_INVESTIGATION \| CAPA_IN_PROGRESS \| CLOSED` |
| `sourceType` | Enum | `SAMPLING \| GRN \| INVENTORY \| BATCH \| MANUAL` |
| `sourceId` | UUID | Nullable — FK to the triggering entity |
| `detectedBy` | String | Username |
| `detectedAt` | LocalDateTime | |
| `department` | String | |
| `rootCause` | String | Filled during investigation |
| `immediateAction` | String | Immediate containment action taken |
| `createdBy` | String | |
| `createdAt` | LocalDateTime | |

### Entity: `Capa`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `capaNumber` | String | Auto: `CAPA-YYYYMMDD-NNN` |
| `deviationId` | UUID | FK → Deviation |
| `actionType` | Enum | `CORRECTIVE \| PREVENTIVE` |
| `description` | String | |
| `assignedTo` | String | Username |
| `dueDate` | LocalDate | |
| `status` | Enum | `OPEN \| IN_PROGRESS \| COMPLETED \| EFFECTIVENESS_CHECK \| CLOSED` |
| `completedDate` | LocalDate | |
| `effectivenessRemarks` | String | |
| `verifiedBy` | String | |
| `createdBy` | String | |

### API routes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/deviations` | Create deviation |
| `GET` | `/api/deviations` | List — filter by `status`, `severity`, `sourceType` |
| `GET` | `/api/deviations/{id}` | Detail with associated CAPAs |
| `PUT` | `/api/deviations/{id}/status` | Status transition |
| `POST` | `/api/deviations/{id}/capas` | Add CAPA to deviation |
| `PUT` | `/api/capas/{id}` | Update CAPA |
| `PUT` | `/api/capas/{id}/complete` | Mark CAPA complete |
| `PUT` | `/api/capas/{id}/verify` | Verify effectiveness → close CAPA |

### Integration points

- Sampling `UNDER_INVESTIGATION` → "Escalate to Deviation" button → auto-creates Deviation
  with `sourceType=SAMPLING`, `sourceId=samplingRequestId`
- GRN cancellation / QC rejection → manual Deviation creation with `sourceType=GRN`
- Batch in-process check `FAIL` → auto-creates Deviation with `sourceType=BATCH`

### Frontend routes

| Path | Page |
|------|------|
| `/qms/deviations` | Deviation list — filter bar (status, severity, source), summary counts |
| `/qms/deviations/{id}` | Detail — description, root cause, immediate action, CAPA list with add/complete/verify |

### Role access

| Role | Deviation | CAPA |
|------|-----------|------|
| `SUPER_ADMIN` | Full | Full |
| `QC_MANAGER` | Create, update, close | Assign, verify |
| `QC_ANALYST` | Create, view | View |
| `WAREHOUSE_OP` | Create (GRN/inventory source) | View |
| `PROCUREMENT` | View | View |

### DB migrations

- `V56__qms_deviations.sql`
- `V57__qms_capas.sql`

---

## Module 2 — Batch Manufacturing Record (BPR)

### Why

This is the spine of pharma ERP. Material flows from GRN → inventory lot → batch dispensing →
in-process checks → finished product → release. Every module built so far feeds into this.

### Backend package layout

```
transactions/
  batch/
    entity/       BatchOrder.java
                  BatchStatus.java           (enum)
                  BatchMaterialLine.java
                  BatchProcessStep.java
                  InProcessCheck.java
                  InProcessCheckResult.java  (enum)
                  FinishedProduct.java
                  FinishedProductStatus.java (enum)
      dto/        CreateBatchOrderRequest.java
                  BatchOrderResponse.java
                  DispenseMaterialRequest.java
                  AddProcessStepRequest.java
                  RecordInProcessCheckRequest.java
                  FinishedProductRequest.java
                  FinishedProductResponse.java
      repository/ BatchOrderRepository.java
                  BatchMaterialLineRepository.java
                  BatchProcessStepRepository.java
                  InProcessCheckRepository.java
                  FinishedProductRepository.java
      service/    BatchService.java
                  BatchServiceImpl.java
      controller/ BatchController.java
```

### Entity: `BatchOrder`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `batchNumber` | String | Auto: `BATCH-YYYYMMDD-NNN` |
| `productName` | String | |
| `productCode` | String | |
| `batchSize` | BigDecimal | |
| `batchSizeUom` | String | |
| `status` | Enum | `PLANNED \| IN_PROGRESS \| COMPLETED \| QC_PENDING \| RELEASED \| REJECTED` |
| `scheduledDate` | LocalDate | |
| `startDate` | LocalDateTime | |
| `completedDate` | LocalDateTime | |
| `manufacturedBy` | String | Username |
| `reviewedBy` | String | Username |
| `createdBy` | String | |

### Entity: `BatchMaterialLine` (dispensing record)

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `batchOrderId` | UUID | FK → BatchOrder |
| `materialId` | UUID | FK → Material |
| `inventoryId` | UUID | FK → InventoryTransaction lot |
| `requiredQty` | BigDecimal | |
| `dispensedQty` | BigDecimal | |
| `uom` | String | |
| `dispensedBy` | String | |
| `dispensedAt` | LocalDateTime | |

> On dispense: creates an `OUTBOUND` InventoryTransaction with `referenceType=BATCH`.

### Entity: `BatchProcessStep`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `batchOrderId` | UUID | FK → BatchOrder |
| `stepNumber` | Integer | Ordered |
| `stepName` | String | |
| `description` | String | |
| `status` | Enum | `PENDING \| IN_PROGRESS \| COMPLETED` |
| `performedBy` | String | |
| `performedAt` | LocalDateTime | |
| `durationMinutes` | Integer | |

### Entity: `InProcessCheck` (per step)

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `stepId` | UUID | FK → BatchProcessStep |
| `parameterName` | String | |
| `specMin` | BigDecimal | Nullable |
| `specMax` | BigDecimal | Nullable |
| `unit` | String | |
| `actualValue` | String | String to accommodate numeric and text results |
| `result` | Enum | `PASS \| FAIL \| NOT_TESTED` |
| `checkedBy` | String | |
| `checkedAt` | LocalDateTime | |
| `remarks` | String | |

> FAIL result → auto-creates Deviation with `sourceType=BATCH`.

### Entity: `FinishedProduct`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `batchOrderId` | UUID | FK → BatchOrder |
| `productBatchNumber` | String | |
| `quantity` | BigDecimal | |
| `uom` | String | |
| `yieldPercentage` | BigDecimal | |
| `status` | Enum | `QUARANTINE \| RELEASED \| REJECTED` |

> On creation: creates an `INBOUND` InventoryTransaction for the finished goods lot.

### API routes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/batch-orders` | Create planned batch |
| `GET` | `/api/batch-orders` | List — filter by `status`, date range |
| `GET` | `/api/batch-orders/{id}` | Full detail |
| `PUT` | `/api/batch-orders/{id}/start` | Start batch |
| `POST` | `/api/batch-orders/{id}/material-lines` | Dispense material from inventory lot |
| `POST` | `/api/batch-orders/{id}/steps` | Add process step |
| `POST` | `/api/batch-orders/{id}/steps/{stepId}/checks` | Record in-process check |
| `PUT` | `/api/batch-orders/{id}/complete` | Complete batch |
| `POST` | `/api/batch-orders/{id}/finished-product` | Record output |
| `PUT` | `/api/batch-orders/{id}/release` | Release to inventory |

### Integration points

- `BatchMaterialLine` dispense → `POST /api/inventory/{id}/issue` with `referenceType=BATCH`
- `InProcessCheck` FAIL → auto-create `Deviation` (sourceType=BATCH)
- `FinishedProduct` create → `INBOUND` inventory transaction for finished goods
- CoA can be generated from batch if linked to a product Spec

### Frontend routes

| Path | Page |
|------|------|
| `/batch/orders` | Batch list — status filter, KPI cards (in progress, QC pending, released) |
| `/batch/orders/new` | Create batch — product details + material requirements list |
| `/batch/orders/{id}` | Detail — Dispensing tab, Process Steps tab, In-Process Checks tab, Finished Product tab |

### Role access

| Role | Access |
|------|--------|
| `SUPER_ADMIN` | Full |
| `QC_MANAGER` | View, review, release/reject finished product |
| `QC_ANALYST` | View, record in-process checks |
| `WAREHOUSE_OP` | Dispense materials |
| `PROCUREMENT` | View only |

### DB migrations

- `V58__batch_orders.sql`
- `V59__batch_material_lines.sql`
- `V60__batch_process_steps.sql`
- `V61__inprocess_checks.sql`
- `V62__finished_products.sql`

---

## Module 3 — HRMS

### Why

In pharma, training compliance and employee qualification records are audit-critical.
Regulators check that operators are trained before they performed a task (e.g., who dispensed
batch materials must have a valid GMP training record).

### Backend package layout

```
hrms/
  employee/
    entity/       Employee.java
                  EmployeeStatus.java   (enum)
                  Department.java       (enum)
    dto/          CreateEmployeeRequest.java
                  EmployeeResponse.java
                  UpdateEmployeeRequest.java
    repository/   EmployeeRepository.java
    service/      EmployeeService.java
                  EmployeeServiceImpl.java
    controller/   EmployeeController.java
  training/
    entity/       TrainingRecord.java
                  TrainingType.java     (enum)
                  TrainingStatus.java   (enum)
    dto/          CreateTrainingRequest.java
                  TrainingResponse.java
    repository/   TrainingRepository.java
    service/      TrainingService.java
                  TrainingServiceImpl.java
    controller/   TrainingController.java
```

### Entity: `Employee`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `employeeCode` | String | Auto: `EMP-NNNN` |
| `firstName`, `lastName` | String | |
| `email` | String | |
| `department` | Enum | `QC \| QA \| WAREHOUSE \| PROCUREMENT \| MANUFACTURING \| HR \| ADMIN` |
| `designation` | String | Job title |
| `userId` | UUID | Nullable FK → auth.User (not all employees have system access) |
| `joiningDate` | LocalDate | |
| `status` | Enum | `ACTIVE \| INACTIVE \| ON_LEAVE` |
| `createdBy` | String | |

### Entity: `TrainingRecord`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `employeeId` | UUID | FK → Employee |
| `trainingName` | String | |
| `trainingType` | Enum | `SOP \| GMP \| EQUIPMENT \| SAFETY \| QC \| REGULATORY` |
| `completedDate` | LocalDate | |
| `expiryDate` | LocalDate | Key for compliance dashboard |
| `certificatePath` | String | Nullable — stored in local storage |
| `trainedBy` | String | External trainer name or internal username |
| `status` | Enum | `VALID \| EXPIRING_SOON \| EXPIRED` — computed from `expiryDate` |
| `remarks` | String | |
| `createdBy` | String | |

### API routes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/hrms/employees` | Create employee |
| `GET` | `/api/hrms/employees` | List — filter by `department`, `status` |
| `GET` | `/api/hrms/employees/{id}` | Detail |
| `PUT` | `/api/hrms/employees/{id}` | Update |
| `POST` | `/api/hrms/employees/{id}/training` | Add training record |
| `GET` | `/api/hrms/employees/{id}/training` | Training history |
| `GET` | `/api/hrms/training/expiring-soon` | Records expiring in 30 / 60 / 90 days — dashboard widget |

### Frontend routes

| Path | Page |
|------|------|
| `/hrms/employees` | Employee list + quick stats (active count, expiring training count) |
| `/hrms/employees/{id}` | Employee detail with Training tab |
| `/hrms/training` | Compliance view — all expiring records, filter by department / type |

### Role access

| Role | Access |
|------|--------|
| `SUPER_ADMIN` | Full |
| `QC_MANAGER` | View + manage QC/QA department employees and training |
| `WAREHOUSE_OP` | View own record only |
| `PROCUREMENT` | View only |

### DB migrations

- `V63__hrms_employees.sql`
- `V64__hrms_training_records.sql`

---

## Module 4 — CoA Auto-Generation

Not a standalone module — an enhancement to the existing Sampling module.

### When triggered

When a `SamplingRequest` reaches status `APPROVED`, the QC Manager can generate a
Certificate of Analysis (CoA) PDF from the captured test data.

### What goes on the CoA

- Material name, material code, vendor batch number
- GRN number and receipt date
- Linked Spec name, version
- Each spec parameter: limit (min/max/range), actual test result, PASS/FAIL
- QC Manager who approved and date of approval
- BatchSphere footer with generation timestamp

### Backend addition

```
transactions/sampling/
  coa/
    CoaGeneratorService.java    uses Apache PDFBox (open source, no licensing issues)
    CoaController.java          GET /api/sampling-requests/{id}/coa → PDF bytes (Content-Type: application/pdf)
```

Add `coaDocumentPath` (String, nullable) field to `SamplingRequest` entity.
Generated PDFs stored at `core/storage/coa/{samplingRequestId}.pdf`.

New migration: `V65__sampling_request_coa_path.sql` (single ALTER TABLE column add).

### Frontend addition

- Button on approved sampling request detail: **"Download CoA"**
- On click: `GET /api/sampling-requests/{id}/coa` → triggers browser PDF download
- If no CoA yet, button shows "Generate & Download CoA"

### Role access

`QC_MANAGER`, `QC_ANALYST`, `SUPER_ADMIN` can generate and download.
`PROCUREMENT` can download (for vendor communication). `WAREHOUSE_OP` view only.

---

## Module 5 — LIMS (Laboratory Information Management System)

### What LIMS adds beyond the current Sampling module

The current Sampling module covers the sampling workflow end-to-end (request → plan → test
results → disposition). LIMS extends the lab itself — the instruments used, the stability
of materials over time, and a formal Out-of-Specification (OOS) investigation protocol that
is more structured than the current sampling investigation.

| Area | Current (Sampling module) | LIMS adds |
|------|--------------------------|-----------|
| Instruments | Not tracked | Calibration schedule, calibration records, qualification status |
| Stability | Not tracked | Stability studies, timepoint testing, trending |
| OOS Investigation | Informal (phase enum on SamplingRequest) | Formal Phase I / Phase II protocol with hypothesis, retest protocol, assignee, conclusion |
| Reference Standards | Not tracked | Primary/secondary standards, expiry, usage log |

### Backend package layout

```
lims/
  instrument/
    entity/       LabInstrument.java
                  InstrumentStatus.java        (enum)
                  CalibrationRecord.java
                  CalibrationResult.java       (enum)
    dto/          CreateInstrumentRequest.java
                  InstrumentResponse.java
                  CreateCalibrationRequest.java
                  CalibrationResponse.java
    repository/   LabInstrumentRepository.java
                  CalibrationRecordRepository.java
    service/      InstrumentService.java
                  InstrumentServiceImpl.java
    controller/   InstrumentController.java

  stability/
    entity/       StabilityStudy.java
                  StabilityStatus.java         (enum)
                  StabilityTimepoint.java
                  StabilitySample.java
                  StabilityResult.java
    dto/          CreateStabilityStudyRequest.java
                  StabilityStudyResponse.java
                  RecordStabilityResultRequest.java
    repository/   StabilityStudyRepository.java
                  StabilityTimepointRepository.java
    service/      StabilityService.java
                  StabilityServiceImpl.java
    controller/   StabilityController.java

  oos/
    entity/       OosInvestigation.java
                  OosPhase.java                (enum)
                  OosConclusion.java           (enum)
    dto/          CreateOosRequest.java
                  OosResponse.java
                  UpdateOosPhaseRequest.java
    repository/   OosInvestigationRepository.java
    service/      OosService.java
                  OosServiceImpl.java
    controller/   OosController.java
```

---

### Instrument Management

#### Entity: `LabInstrument`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `instrumentCode` | String | Auto: `INST-NNNN` |
| `instrumentName` | String | e.g., "HPLC System 1" |
| `make`, `model`, `serialNumber` | String | |
| `location` | String | Room / lab area |
| `status` | Enum | `ACTIVE \| UNDER_CALIBRATION \| OUT_OF_SERVICE \| RETIRED` |
| `qualificationStatus` | Enum | `IQ_DONE \| OQ_DONE \| PQ_DONE \| QUALIFIED \| REQUALIFICATION_DUE` |
| `lastCalibrationDate` | LocalDate | |
| `nextCalibrationDue` | LocalDate | Key for compliance dashboard |
| `createdBy` | String | |

#### Entity: `CalibrationRecord`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `instrumentId` | UUID | FK → LabInstrument |
| `calibrationDate` | LocalDate | |
| `calibratedBy` | String | Analyst username or external lab |
| `dueDate` | LocalDate | Next calibration due |
| `result` | Enum | `PASS \| FAIL \| CONDITIONAL` |
| `certificatePath` | String | Uploaded calibration certificate |
| `remarks` | String | |
| `createdBy` | String | |

#### API routes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/lims/instruments` | Create instrument |
| `GET` | `/api/lims/instruments` | List — filter by `status`, `qualificationStatus` |
| `GET` | `/api/lims/instruments/{id}` | Detail with calibration history |
| `PUT` | `/api/lims/instruments/{id}` | Update |
| `POST` | `/api/lims/instruments/{id}/calibrations` | Add calibration record |
| `GET` | `/api/lims/instruments/calibration-due` | Instruments with calibration due ≤ 30 days — dashboard widget |

---

### Stability Studies

#### Entity: `StabilityStudy`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `studyCode` | String | Auto: `STAB-YYYYMMDD-NNN` |
| `materialId` | UUID | FK → Material |
| `batchNumber` | String | Batch under study |
| `storageCondition` | String | e.g., "25°C / 60% RH" |
| `startDate` | LocalDate | |
| `studyDurationMonths` | Integer | |
| `status` | Enum | `ACTIVE \| ON_HOLD \| COMPLETED \| DISCONTINUED` |
| `linkedSpecId` | UUID | FK → Spec — defines pass/fail limits |
| `createdBy` | String | |

#### Entity: `StabilityTimepoint`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `studyId` | UUID | FK → StabilityStudy |
| `timepointLabel` | String | e.g., "T=0", "T=3M", "T=6M", "T=12M" |
| `scheduledDate` | LocalDate | |
| `actualDate` | LocalDate | Nullable until tested |
| `status` | Enum | `PENDING \| IN_PROGRESS \| COMPLETED \| MISSED` |

#### Entity: `StabilityResult` (per parameter per timepoint)

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `timepointId` | UUID | FK → StabilityTimepoint |
| `parameterName` | String | |
| `specMin`, `specMax` | BigDecimal | Nullable |
| `unit` | String | |
| `actualValue` | String | |
| `result` | Enum | `PASS \| FAIL \| NOT_TESTED` |
| `testedBy` | String | |

#### API routes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/lims/stability-studies` | Create study |
| `GET` | `/api/lims/stability-studies` | List — filter by `status`, `materialId` |
| `GET` | `/api/lims/stability-studies/{id}` | Full detail with timepoints and results |
| `POST` | `/api/lims/stability-studies/{id}/timepoints` | Add timepoint |
| `PUT` | `/api/lims/stability-studies/{id}/timepoints/{tpId}/start` | Mark timepoint in progress |
| `POST` | `/api/lims/stability-studies/{id}/timepoints/{tpId}/results` | Record results |
| `PUT` | `/api/lims/stability-studies/{id}/complete` | Close study |

---

### OOS Investigation (Formal)

Replaces / formalises the current informal investigation on `SamplingRequest`.
Triggered when a test result is out-of-specification.

#### Entity: `OosInvestigation`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `oosNumber` | String | Auto: `OOS-YYYYMMDD-NNN` |
| `samplingRequestId` | UUID | FK → SamplingRequest (triggering request) |
| `affectedParameterName` | String | Which parameter failed |
| `affectedResult` | String | The OOS value |
| `phase` | Enum | `PHASE_I \| PHASE_II` |
| `phaseIFindings` | String | Lab error check — analyst notes |
| `phaseIConclusion` | Enum | `LAB_ERROR_CONFIRMED \| ESCALATE_TO_PHASE_II` |
| `phaseIIHypothesis` | String | Root cause hypothesis |
| `phaseIIRetestProtocol` | String | Protocol for retest |
| `conclusion` | Enum | `INVALIDATED \| CONFIRMED_OOS \| INCONCLUSIVE` |
| `assignedTo` | String | Analyst handling investigation |
| `status` | Enum | `OPEN \| PHASE_I_COMPLETE \| PHASE_II_IN_PROGRESS \| CLOSED` |
| `closedBy`, `closedAt` | String / LocalDateTime | |
| `linkedDeviationId` | UUID | Nullable — if escalated to QMS Deviation |
| `createdBy` | String | |

#### API routes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/lims/oos` | Create OOS investigation (from failed test result) |
| `GET` | `/api/lims/oos` | List — filter by `status`, `phase` |
| `GET` | `/api/lims/oos/{id}` | Detail |
| `PUT` | `/api/lims/oos/{id}/phase-i` | Submit Phase I findings and conclusion |
| `PUT` | `/api/lims/oos/{id}/phase-ii` | Submit Phase II hypothesis and retest protocol |
| `PUT` | `/api/lims/oos/{id}/close` | Close with conclusion |

#### Integration points

- Failing test result in `SamplingRequest` worksheet → "Initiate OOS Investigation" button
  → creates `OosInvestigation` with `samplingRequestId` and `affectedParameterName`
- `OosInvestigation` CONFIRMED_OOS conclusion → "Escalate to Deviation" button → auto-creates
  QMS `Deviation` with `sourceType=SAMPLING` and `linkedOosId`

### Frontend routes

| Path | Page |
|------|------|
| `/lims/instruments` | Instrument list with calibration-due alerts |
| `/lims/instruments/{id}` | Detail — calibration history, qualification status |
| `/lims/stability` | Stability study list |
| `/lims/stability/{id}` | Study detail — timepoint table, enter results per parameter |
| `/lims/oos` | OOS investigation list |
| `/lims/oos/{id}` | Phase I / Phase II workflow — findings, hypothesis, retest, conclusion |

### Role access

| Role | Instruments | Stability | OOS |
|------|-------------|-----------|-----|
| `SUPER_ADMIN` | Full | Full | Full |
| `QC_MANAGER` | Full | Approve/close | Review Phase II, close |
| `QC_ANALYST` | View, add calibration | Create, enter results | Create, Phase I |
| `WAREHOUSE_OP` | View only | View only | View only |
| `PROCUREMENT` | — | — | — |

### DB migrations

- `V66__lims_instruments.sql`
- `V67__lims_calibration_records.sql`
- `V68__lims_stability_studies.sql`
- `V69__lims_stability_timepoints.sql`
- `V70__lims_stability_results.sql`
- `V71__lims_oos_investigations.sql`

---

## Migration Number Summary

| Migration | File | Module |
|-----------|------|--------|
| V56 | `V56__qms_deviations.sql` | QMS |
| V57 | `V57__qms_capas.sql` | QMS |
| V58 | `V58__batch_orders.sql` | BPR |
| V59 | `V59__batch_material_lines.sql` | BPR |
| V60 | `V60__batch_process_steps.sql` | BPR |
| V61 | `V61__inprocess_checks.sql` | BPR |
| V62 | `V62__finished_products.sql` | BPR |
| V63 | `V63__hrms_employees.sql` | HRMS |
| V64 | `V64__hrms_training_records.sql` | HRMS |
| V65 | `V65__sampling_request_coa_path.sql` | CoA |
| V66 | `V66__lims_instruments.sql` | LIMS |
| V67 | `V67__lims_calibration_records.sql` | LIMS |
| V68 | `V68__lims_stability_studies.sql` | LIMS |
| V69 | `V69__lims_stability_timepoints.sql` | LIMS |
| V70 | `V70__lims_stability_results.sql` | LIMS |
| V71 | `V71__lims_oos_investigations.sql` | LIMS |

---

## Cross-Module Integration Map

```
GRN ──────────────────────────────→ Deviation (sourceType=GRN)
         │
         ↓
    Inventory (QUARANTINE lot)
         │
         ├──→ Sampling Request ──→ Test Result (OOS?) ──→ OOS Investigation (LIMS)
         │         │                                              │
         │         │                                             → Deviation (sourceType=SAMPLING)
         │         └──→ APPROVED → CoA PDF
         │
         └──→ [lot RELEASED] ──→ Batch Order (BPR)
                                       │
                                       ├──→ Batch Material Line (OUTBOUND inventory)
                                       ├──→ In-Process Check ──→ Deviation (sourceType=BATCH)
                                       └──→ Finished Product (INBOUND, QUARANTINE)
                                                  │
                                                  └──→ Sampling Request (finished goods QC)
                                                             │
                                                             └──→ CoA PDF (on APPROVED)

HRMS ─────────────────────────────→ Employee training compliance
         └──→ (future) link dispensedBy / calibratedBy / checkedBy to Employee for full audit trail

LIMS Instruments ─────────────────→ Used in Sampling (analyst selects instrument per test)
                                  → Calibration due alerts on dashboard

LIMS Stability ───────────────────→ Long-running study per material batch
                                  → Timepoint results feed trending dashboard
```

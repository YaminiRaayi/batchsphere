# BatchSphere — Implementation Gap Analysis

**Date:** 2026-05-10  
**Based on:** Codebase audit of V1–V55 migrations and all Java entities as of branch `Phase-1-QMS`  
**Purpose:** Single reference showing exactly what is built, what is missing, and what to build next.

> **Note:** `core/docs/Codex_plan_later.md` is a line-for-line duplicate of `PHARMA_IMPROVEMENTS_AND_ROADMAP.md`. It adds no information. Safe to delete.

---

## How To Read This Document

Each section has three parts:

- **BUILT** — what actually exists in code today (entity fields, services, enforced rules)
- **MISSING** — specific gaps with exact field/entity names needed
- **ENFORCEMENT GAP** — rules that exist in the roadmap but are not enforced even though the data partially exists

---

## Cross-Cutting Infrastructure — Audit Trail & E-Signature

These are not a module. They affect every other module. Until these exist, no module can claim compliance-readiness.

### BUILT

| What | How |
|---|---|
| Basic who/when on all entities | Every entity has `createdBy`, `createdAt`, `updatedBy`, `updatedAt` |
| Pseudo-e-signature on QC decision | `qcDecisionConfirmedBy`, `qcDecisionConfirmationText`, `qcDecisionConfirmationAt` on `SamplingRequest` |
| Pseudo-e-signature on QA investigation review | `qaReviewConfirmedBy`, `qaReviewConfirmationText`, `qaReviewConfirmationAt` on `QcInvestigation` |

### MISSING — No `AuditEvent` infrastructure exists

No entity tracks field-level changes: old value, new value, reason for change.

```
infrastructure/audit/
  AuditEvent         — entityType, entityId, eventType, fieldName, oldValue, newValue,
                       reasonForChange, performedBy, performedAt, sourceIp, correlationId
  AuditEventType     — CREATE, UPDATE, STATUS_CHANGE, DELETE, LOGIN, LOGOUT, SIGNATURE
  AuditEntityListener — JPA listener to intercept entity changes
```

No e-signature service exists. The "confirmation" fields on `SamplingRequest` and `QcInvestigation` are text fields — they do not re-verify the user's credentials.

```
infrastructure/esignature/
  ESignatureRecord   — signer, purpose, entityType, entityId, timestamp, meaningText, credential verified
  ESignatureService  — verifyAndRecord(username, password, purpose, entityId)
```

### MISSING — No central `StatusTransitionService`

Each module manages its own transitions:
- Inventory transitions live in `InventoryServiceImpl` (ALLOWED_TRANSITIONS map)
- Sampling transitions live in `SamplingServiceImpl`
- Spec/MoA lifecycle transitions live in `SpecServiceImpl` / `MoaServiceImpl`

No central guard. No central audit of "who moved what from status A to status B and why."

### MISSING — No alerting / notification system

No scheduler or notification entity exists. No one is alerted when:
- GMP certificate expires (VBU.gmpCertExpiry, Supplier.gmpcertExpiryDate)
- Audit is overdue (VBU.nextRequalificationDue, Vendor.nextAuditDue)
- Inventory retest is overdue (Batch.retestDate)
- Training expires (not built yet)
- Instrument calibration is due (not built yet)

---

## Module 1 — Auth & User Management

### BUILT

| What | Where |
|---|---|
| JWT login / refresh token | `AuthController`, `JwtService`, `JwtAuthenticationFilter` |
| 6 roles | `UserRole` enum: SUPER_ADMIN, WAREHOUSE_OP, QC_ANALYST, QC_MANAGER, PROCUREMENT, VIEWER |
| isActive on user | `User.isActive` |
| CRUD user management | `UserManagementController` (SUPER_ADMIN only) |
| `employeeId` FK on `User` | Field exists but no `Employee` entity exists |

### MISSING

```java
// On User entity — none of these fields exist:
private LocalDateTime passwordChangedAt;
private Boolean forcePasswordChange;
private Integer failedLoginAttempts;
private LocalDateTime lockedUntil;
private Integer sessionTimeoutMinutes;
private String department;
private String siteCode;
```

No entities for:

```
UserRoleAssignment  — multi-role per user per site/department
UserTrainingQualification — SOP training records per user (gating enforcement)
```

### ENFORCEMENT GAP

No training gating anywhere. Any user with the correct role can:
- Start sampling without sampling SOP training
- Enter QC test results without analyst qualification
- Approve QC disposition without manager training check

---

## Module 2 — Material Master

### BUILT

| Field | Status |
|---|---|
| materialCode, materialName, materialType, uom | Built |
| storageCondition (enum), maxHumidity, lightSensitivity | Built |
| photosensitive, hygroscopic, hazardous, selectiveMaterial | Built |
| vendorCoaReleaseAllowed, controlledSubstance | Built |
| samplingRequired, shelfLifeMonths, retestPeriodMonths | Built |
| specId (FK to Spec) | Built |
| casNumber, pharmacopoeialRef | Built (V54) |
| hsnCode, reorderLevel, leadTimeDays | Built (V54) |
| isActive (boolean) | Built |

### MISSING

```java
// Material.java — missing fields:
private String einecsNumber;                           // EINECS/ECCS regulatory identifier
private String pharmacopoeialMonographCode;            // specific monograph code (e.g. USP <731>)
@Enumerated(EnumType.STRING)
private ControlledSubstanceSchedule controlledSubstanceSchedule;  // H/H1/N/X
@Enumerated(EnumType.STRING)
private MaterialStatus status;                         // DRAFT, ACTIVE, DISCONTINUED, OBSOLETE
                                                       // Currently just isActive boolean — not pharma lifecycle
```

No `MaterialStatus` lifecycle enum. `isActive` boolean cannot express DISCONTINUED or OBSOLETE states, which behave differently — discontinued means no new GRNs but existing inventory is still usable; obsolete means completely retired.

### ENFORCEMENT GAP

- GRN can be created with a material in any state — no "ACTIVE material only" check in `GrnServiceImpl`
- GRN can be received without an approved Spec linked to the material — no spec check in receipt path
- `controlledSubstance = true` materials have no restricted warehouse zone enforcement

---

## Module 3 — Supplier, Vendor & VBU

### BUILT — Vendor

| Field | Status |
|---|---|
| vendorCode, vendorName, vendorCategory | Built |
| Full address (city, state, country, pincode) | Built |
| gstin, pan, website | Built |
| paymentTermsDays | Built |
| approvedSince, lastAuditDate, nextAuditDue | Built |
| qaRating, deliveryScore, rejectionRate, openCapaCount | Built |
| isApproved, isActive | Built |
| VendorDocument (corporate docs with type, expiry) | Built |

### BUILT — VendorBusinessUnit

| Field | Status |
|---|---|
| unitName, buCode, siteType | Built |
| Full address + contact | Built |
| drugLicenseNumber, drugLicenseExpiry | Built |
| gmpCertBody, gmpCertNumber, gmpCertExpiry | Built |
| isWhoGmpCertified, isUsfda, isEuGmp (flags) | Built |
| qualificationStatus (QualificationStatus enum) | Built |
| qualifiedDate, nextRequalificationDue, lastAuditDate | Built |
| qaRating, deliveryScore, rejectionRate, openCapaCount | Built |
| VendorAudit (type, date, outcome, auditors) | Built |
| VendorDocument (VBU-level with approval workflow) | Built |

### BUILT — Supplier

| Field | Status |
|---|---|
| supplierCode, supplierName | Built |
| contactPerson, email, phone | Built |
| isActive (boolean) | Built |

**Supplier is a bare contact card. No pharma qualification fields at all.**  
Requirements written in `SUPPLIER_ENHANCEMENT_REQUIREMENTS.md` — not yet implemented (waiting for V56).

### MISSING — Supplier (see `SUPPLIER_ENHANCEMENT_REQUIREMENTS.md`)

```java
// ALL of these are missing from Supplier.java:
private SupplierType supplierType;                // MANUFACTURER / CONTRACT_MANUFACTURER / DISTRIBUTOR / BROKER
private SupplierQualificationStatus qualificationStatus;  // replaces isActive boolean
private String countryOfManufacture;
private String gmpcertNumber;
private String gmpcertIssuingAuthority;
private LocalDate gmpcertExpiryDate;
private LocalDate approvedSince;
private LocalDate lastAuditDate;
private LocalDate nextAuditDue;
private BigDecimal rejectionRate;
private Integer openCapaCount;
```

### MISSING — AVL (Approved Vendor List)

No `VendorMaterialApproval` / `SupplierMaterialApproval` junction entity exists anywhere. This is the most critical missing enforcement piece in the inbound flow.

```
VendorMaterialApproval
  vendorId, vendorBusinessUnitId, supplierId, materialId
  status          // PENDING, APPROVED, CONDITIONAL, SUSPENDED, DISQUALIFIED
  qualificationDate, nextRequalificationDate
  approvedBy, approvalBasis  // AUDIT / DOCUMENT_REVIEW / HISTORICAL / REGULATORY
```

### MISSING — Vendor Change Control

Gap listed in roadmap. No `VendorChangeRequest` entity exists. Vendor and VBU records can be edited without any QA approval gate.

### ENFORCEMENT GAP

`GrnServiceImpl.createGrn()` does not check:
- Supplier qualificationStatus (SUSPENDED/DISQUALIFIED should block)
- VBU qualificationStatus
- Whether the supplier/VBU is approved for the specific material (AVL)
- Whether GMP certificate is expired

All of this is data that partly exists (VBU.qualificationStatus, VBU.gmpCertExpiry) but none of it is read during GRN creation.

---

## Module 4 — Spec & MoA

### BUILT — Spec

| Field | Status |
|---|---|
| specCode, specName, revision, specType | Built |
| status lifecycle (DRAFT → REVIEW → APPROVED → OBSOLETE) | Built |
| samplingMethod, targetMarket | Built |
| effectiveDate, expiryDate | Built |
| compendialRef (enum), compendialEdition, referenceDocumentNo | Built |
| referenceAttachment (file path) | Built |
| submittedBy/At, reviewedBy/At, approvedBy/At, reviewRemarks | Built |
| reviewRoute | Built |
| previousSpecId (revision chain) | Built |
| MaterialSpecLink (material-to-spec junction) | Built |

### BUILT — SpecParameter

| Field | Status |
|---|---|
| parameterName, testType | Built |
| criteriaType (NLT/NMT/RANGE/PASS_FAIL/COMPLIES/TEXT) | Built |
| lowerLimit, upperLimit, textCriteria, unit | Built |
| compendialChapterRef, isMandatory, sequence | Built |
| moaId (FK to MoA) | Built |

### BUILT — MoA

| Field | Status |
|---|---|
| moaCode, moaName, revision, moaType | Built |
| principle, compendialRef, instrumentType (text) | Built |
| reagentsAndStandards, systemSuitabilityCriteria (text blobs) | Built |
| calculationFormula, reportableRange | Built |
| validationReferenceNo, validationAttachment | Built |
| sampleSolutionStability (value/unit/condition) | Built |
| validationStatus, status, reviewRoute, lifecycle | Built |

### MISSING

```java
// Spec.java — missing field:
private LocalDate periodicReviewDue;   // ICH Q10 periodic review requirement
```

No `MethodValidation` entity. MoA has `validationReferenceNo` and `validationAttachment` as file pointers but no structured validation characteristics:

```
MethodValidation
  moaId, validationProtocolNo, validationReportNo
  specificity, accuracy, precision, linearity, range, lod, loq, robustness
  solutionStability, approvedBy, approvedAt
```

### ENFORCEMENT GAP

- Spec/MoA approval does not require e-signature credential re-verification
- `GrnServiceImpl` does not check whether `material.specId` points to an APPROVED spec before allowing receipt
- `QcWorksheetServiceImpl` exists and generates one `QcTestResult` row per `SpecParameter` when a sample is received in QC — but no `QcWorksheet` **entity** exists. Results link only via `sampleId`. The "all mandatory params complete" check (`isWorksheetComplete()`) is implemented but not enforced as a gate before disposition.

---

## Module 5 — GRN & Inbound Receipt

### BUILT

| What | Status |
|---|---|
| Grn header: supplierId, vendorId, vendorBusinessUnitId, receiptDate, invoiceNumber | Built |
| GrnItem: materialId, batchId, received/accepted/rejectedQty, vendorBatch | Built |
| GrnItem: manufactureDate, expiryDate, retestDate | Built |
| GrnItem: containerType, numberOfContainers, quantityPerContainer | Built |
| GrnItem: unitPrice, totalPrice, qcStatus | Built |
| GrnContainer: auto-generated on receipt | Built |
| MaterialLabel: QR codes, label types | Built |
| GrnDocument: file upload per item | Built |
| GrnStatus: DRAFT → RECEIVED (triggers inventory + sampling) | Built |
| Batch auto-created on receipt with expiry/retest dates | Built |

### MISSING

```java
// Grn.java — all these fields are missing:
private CoaReviewStatus coaReviewStatus;          // PENDING / IN_REVIEW / ACCEPTED / REJECTED
private String coaReviewedBy;
private LocalDateTime coaReviewedAt;
private String coaReviewRemarks;
private String temperatureOnArrival;
private Boolean coldChainCompliant;
private String containerCondition;               // INTACT / DAMAGED / TAMPERED
private String labelVerificationStatus;          // VERIFIED / DISCREPANCY
private String quantityVarianceReason;
```

No CoA review workflow exists at all. Documents can be uploaded to GrnItems but nobody reviews CoA values against spec.

### ENFORCEMENT GAP

`GrnServiceImpl.createGrn()` does not enforce:
- Material must be ACTIVE
- Supplier must not be SUSPENDED or DISQUALIFIED
- VBU must not be DISQUALIFIED
- Supplier/VBU must be on Approved Vendor List for this material
- Material must have an approved Spec

---

## Module 6 — WMS & Inventory

### BUILT

| What | Status |
|---|---|
| Inventory: materialId, batchId, palletId, warehouseLocation, quantityOnHand, uom, status | Built |
| InventoryStatus: QUARANTINE, SAMPLING, UNDER_TEST, RELEASED, REJECTED, BLOCKED | Built |
| InventoryTransaction: INBOUND, OUTBOUND, ADJUSTMENT, STATUS_CHANGE, TRANSFER | Built |
| InventoryTransaction: before/after quantity tracking | Built (V55) |
| Status transition guard (ALLOWED_TRANSITIONS map in InventoryServiceImpl) | Built |
| Storage-condition validation on transfer | Built |
| Warehouse zone rule validation on transfer | Built |
| FEFO enforcement on issue/adjustment | Built (reads from Batch.expiryDate / Batch.retestDate) |
| Issue requires RELEASED status + valid reference type | Built |

### MISSING — Critical: Inventory has no expiry/retest date

`Inventory` entity does not carry `expiryDate` or `retestDate`. Dates exist on `Batch` and on `GrnItem`, but:
- `Inventory` has no direct expiry/retest date
- System cannot query "all inventory expiring in the next 30 days"
- No background job can auto-move expired inventory to BLOCKED
- FEFO logic depends on `Batch.expiryDate` being populated — if it is null, FEFO falls back to Batch number

```java
// Inventory.java — missing fields:
private LocalDate expiryDate;      // propagated from GrnItem at receipt
private LocalDate retestDueDate;   // propagated from GrnItem at receipt
```

### MISSING — No destruction workflow

```
InventoryTransactionType.DESTRUCTION  — does not exist in enum (only INBOUND/OUTBOUND/ADJUSTMENT/STATUS_CHANGE/TRANSFER)

MaterialDestructionRecord
  inventoryId, quantityDestroyed, destructionMethod
  witnessedBy, approvedBy, destroyedAt, destructionDocumentPath
```

### MISSING — No temperature excursion model

```
TemperatureExcursion
  inventoryId, warehouseId, roomId
  excursionStart, excursionEnd, minTempRecorded, maxTempRecorded
  assessment, linkedDeviationId
```

### MISSING — No cycle count / physical reconciliation

No physical stock count entity or reconciliation workflow exists.

### ENFORCEMENT GAP

- Expired inventory is not auto-blocked — there is no scheduler or enforced expiry check
- Retest-overdue inventory is not auto-blocked
- `FEFO` only enforces ordering on issue/reduction — it does not prevent issuing from an expired lot
- Destruction not modelled in transaction types or as a formal record

---

## Module 7 — Sampling

### BUILT

| What | Status |
|---|---|
| SamplingRequest: linked to GRN/GrnItem, status lifecycle, material flags | Built |
| SamplingRequest: resample lineage (parentId, rootId, cycleNumber) | Built |
| SamplingPlan: specId, moaId, samplingMethod, sampleType, container counts, qty, analyst, tool, rationale | Built |
| SamplingContainerSample: per-container sample record | Built |
| Sample: type (IDENTITY/COMPOSITE_QC/RETENTION), status, qty, collectedBy/At | Built |
| Sample: handoff chain — handoffToQcBy/At, receivedByQc/At, receiptCondition, qcStorageLocation | Built |
| Sample: retainedFlag, destroyedFlag, consumedFlag, retainedQuantity, retainedUntil | Built |
| SampleContainerLink: sample-to-container mapping | Built |
| Resample/retest workflow: ExecuteResampleRequest, ExecuteRetestRequest | Built |

### MISSING

No `SamplingPolicy` entity. `SamplingPlan.coaBasedRelease` exists as a boolean but has no governing approval policy:

```
SamplingPolicy
  materialId, vendorBusinessUnitId, supplierId
  selectionRule       // ALL_CONTAINERS / SQRT_N_PLUS_1 / RISK_BASED_REDUCED / COA_BASED
  reducedSamplingJustification
  effectiveFrom, approvedBy
```

No formal `SampleChainOfCustody` event log. `Sample` has handoff fields but only one handoff point. Multiple handoff events (lab-to-lab, sub-contracted analysis, internal transfer) cannot be tracked.

```
SampleChainOfCustody
  sampleId, handedOverBy, handedOverAt
  receivedBy, receivedAt, receiptCondition, location
```

Retention sample lifecycle is incomplete. `retainedUntil` exists but:
- No destruction approval workflow for retained samples
- No `DestroyRetainedSampleRequest` enforced through a formal QA approval (just a flag flip today)

### MISSING — Per-container test-type distinction

`SamplingContainerSample` stores one `sampledQuantity` per container row. It cannot record "100g identity" + "200g assay" from the same physical container as separate trackable quantities. A `testType` field is absent:

```java
// SamplingContainerSample.java — missing field:
private SampleTestType testType;   // IDENTITY / ASSAY / APPEARANCE / RETENTION
```

The same gap exists on `SampleContainerLink` (post-completion link between Sample and containers).

### MISSING — Multiple sample types per sampling request

`Sample.samplingRequestId` has `@Column(unique = true)`. The system allows only ONE Sample per SamplingRequest. A single physical sampling event against one GRN item should produce three:
1. Identity sample (from every container)
2. Composite QC sample (from selected containers, pooled)
3. Retention sample (archived)

The unique constraint must be relaxed to `UNIQUE(samplingRequestId, sampleType)` and the service must allow creating all three in one flow.

### MISSING — Inventory balance not deducted on sampling

`GrnContainer.sampledQuantity` is updated when sampling completes (correct). But `Inventory.quantityOnHand` is **not** reduced. A batch received as 500 kg and sampled for 1.5 kg total still shows 500 kg in the inventory ledger. The overstatement accumulates across every GRN until a manual adjustment is made.

```java
// Fix needed in SamplingServiceImpl.completeSampling():
// After reconcileContainerSamples(), calculate totalSampledQty
// and issue an ADJUSTMENT InventoryTransaction (type: SAMPLING_CONSUMPTION)
// reducing Inventory.quantityOnHand by that amount for the batch/pallet
```

### ENFORCEMENT GAP

- No duplicate container detection — same container can be added to multiple SamplingContainerSample records
- No sampling-exceeds-container-balance check
- Reduced sampling (coaBasedRelease) requires no approved SamplingPolicy
- Retest/resample does not enforce QA/QC manager formal authorization (just role check)
- `Inventory.quantityOnHand` not reduced when sampling completes — displayed balance overstated by total sampled quantity across all containers

---

## Sampling — How It Works in Pharma (Plain-Language Context)

> This section explains the pharma sampling model before listing gaps. It is written for readers new to pharma. If you already know EU GMP Annex 8 / USP \<1151\>, skip directly to Module 8.

### Why sampling works the way it does

When 20 bags of raw material arrive (e.g., paracetamol powder, 25 kg per bag), you cannot test every molecule. Sampling picks representative portions from containers, tests them, and uses the results to infer quality for the whole batch.

Different types of tests need different sample sizes. Not every container needs to give samples for every test.

### Three types of samples — all from the same receipt event

| Sample type | Purpose | Taken from | Typical quantity |
|---|---|---|---|
| **Identity** | Confirm the material is what the label says (IR spectrum, visual check) | **Every single container** | Small — 50–100 g |
| **Composite QC** | Full testing: assay, purity, water content, particle size | Only selected containers (√N+1 rule) — combined into one pooled sample | Larger — 100–200 g per selected bag |
| **Retention** | Archive copy. Never tested. Stored until batch expiry + a defined period. | Any container | 2× the amount needed for one full test |

**√N+1 rule (EU GMP Annex 8):** For a shipment of N = 20 bags, you select √20 + 1 ≈ 5–6 bags for composite testing. You still take identity samples from **all 20** bags.

### Different quantities per bag — this is correct and expected

Bag 3 is selected for composite testing: 100 g identity + 200 g assay = 300 g total taken from this bag.  
Bag 7 is not selected for composite: 100 g identity sample only.  
Remaining in Bag 3 = 24.7 kg. Remaining in Bag 7 = 24.9 kg. This is normal.

The system must track sampled quantity per container, and remaining = received qty − sampled qty per container.

### What happens to the remaining material in the bag

The bag is resealed. A sampling label is applied (showing lot, container number, sampled qty, remaining qty, sampled by, date). The bag stays in **QUARANTINE** status. Once QC releases the batch, the full remaining quantity across all bags moves to **RELEASED** and is available for manufacturing. The sampled material is consumed in testing or archived.

### What the current system handles vs what is missing

| Capability | Status |
|---|---|
| Different planned sample quantities per container | ✓ Built — `SamplingContainerSample.sampledQuantity` is per container row |
| `GrnContainer.sampledQuantity` updated on completion | ✓ Built — `reconcileContainerSamples()` in `SamplingServiceImpl` |
| Remaining quantity derivable per container | ⚠ Calculable only — `GrnContainer.quantity − sampledQuantity`; not a stored field |
| "100g identity" + "200g assay" tracked as separate records from same bag | ✗ Missing — no `testType` on `SamplingContainerSample` |
| Identity + Composite QC + Retention samples created from same sampling event | ✗ Missing — `Sample.samplingRequestId` unique constraint blocks this |
| Inventory balance (`quantityOnHand`) reduced when sampling material is consumed | ✗ Missing — `Inventory.quantityOnHand` not deducted on sampling completion |

### What happens today when a batch is released

All containers transition to `RELEASED`. `Inventory.quantityOnHand` still shows the full received quantity. No deduction for sampled material ever happened. The inventory ledger is overstated by the total sampled quantity. For a material with multiple GRNs over months, this error accumulates.

---

## Module 8 — QC Execution & Disposition

### BUILT

| What | Status |
|---|---|
| QcTestResult: sampleId, specParameterId, moaIdUsed | Built |
| QcTestResult: analystCode, resultValue, resultText | Built |
| QcTestResult: passFailFlag, lowerLimitApplied, upperLimitApplied, criteriaTypeApplied, unitApplied | Built |
| QcTestResult: status, reviewedBy/At, remarks | Built |
| QcDisposition: status (lifecycle), decisionBy/At, decisionRemarks | Built |
| QcInvestigation: OOS, OOT, GENERAL types, Phase 1 / Phase 2 | Built |
| QcInvestigation: rootCause, resolution, capaRequired, capaReference (string) | Built |
| QcInvestigation: QA review workflow (qaReviewDecision, qaReviewedBy/At, confirmationFields) | Built |
| QcInvestigation: closureCategory | Built |

### MISSING — No QcWorksheet entity (service partially exists)

`QcWorksheetServiceImpl` IS built. When a sample reaches QC receipt (`receiveInQc()`), `generateWorksheet()` auto-creates one `QcTestResult` row per `SpecParameter` from the linked spec — with limits copied from the spec, status = PENDING. So the worksheet content is correctly seeded from the approved spec.

What does NOT exist:
- No `QcWorksheet` entity — worksheet is an implicit set of `QcTestResult` rows tied together only by `sampleId`
- No worksheet-level status field (PENDING / IN_PROGRESS / UNDER_REVIEW / COMPLETE)
- No FK from `QcTestResult` to a parent worksheet record
- `isWorksheetComplete()` and `hasFailingResults()` are implemented in the service but are NOT called as a mandatory gate before `QcDisposition` can be submitted

```
QcWorksheet
  id, samplingRequestId, specId, status
  assignedAnalyst, reviewer
  generatedAt, generatedBy
  — QcTestResults link via worksheetId (instead of directly to sampleId only)
```

### MISSING — No lab traceability on QcTestResult

```java
// QcTestResult.java — these are missing:
private UUID instrumentId;            // LabInstrument FK
private UUID referenceStandardId;     // ReferenceStandard FK
private UUID reagentLotId;            // ReagentLot FK
private UUID rawDataAttachmentId;     // RawDataAttachment FK
```

### ENFORCEMENT GAP

- `QcDisposition` can be submitted even if mandatory SpecParameters have no corresponding QcTestResult
- QC disposition approval does not require e-signature credential re-verification (only records a string confirmation text)
- Same analyst can review their own test results — no analyst/reviewer separation enforcement
- `QcInvestigation.capaReference` is a free-text string, not a FK to an actual CAPA record

---

## Module 9 — QMS (Deviation, CAPA, Change Control)

### BUILT

`QcInvestigation` handles OOS/OOT/GENERAL lab-level investigations. This is a QC investigation, not a full QMS deviation.

No true QMS module exists.

### MISSING — Entire module

```
Deviation
  sourceModule      // GRN / INVENTORY / SAMPLING / QC / WAREHOUSE / MANUFACTURING
  sourceEntityId    // FK to the triggering record
  severity          // CRITICAL / MAJOR / MINOR / OBSERVATION
  immediateAction
  investigationSummary, rootCause
  disposition       // OPEN / IN_INVESTIGATION / CLOSED / ESCALATED

CAPA
  deviationId
  correctiveAction, preventiveAction
  owner, dueDate
  effectivenessCheckDue, effectivenessStatus

ChangeRequest
  changeType        // SPEC / MATERIAL / VENDOR / PROCESS / DOCUMENT
  impactedEntities
  riskLevel, impactAssessment
  qaApproval, implementationEvidence, effectivenessCheck

RiskAssessment
  method            // FMEA / HACCP / simple risk matrix
  severity, occurrence, detectability, riskPriority
```

### MISSING — Trigger linkage

None of these triggers exist:
- GRN rejection does not auto-create a Deviation candidate
- Temperature excursion does not auto-create a Deviation (entity doesn't exist)
- OOS investigation closure does not auto-promote to Deviation if root cause is systemic
- Spec/Material/Vendor edit does not auto-require a ChangeRequest

---

## Module 10 — LIMS Foundation

### BUILT

| What | Status |
|---|---|
| MoA.instrumentType (text field) | Built — plain text, not a FK |
| MoA.reagentsAndStandards (text blob) | Built — plain text, not structured |
| MoA.validationReferenceNo, MoA.validationAttachment | Built — file path only |
| QcTestResult.moaIdUsed | Built |

### MISSING — All core LIMS entities

```
LabInstrument
  instrumentCode, instrumentType
  calibrationStatus   // VALID / OVERDUE / OUT_OF_CALIBRATION
  calibrationDue, qualificationStatus

ReferenceStandard
  standardCode, source, lotNumber, purity
  expiryDate, openedDate, storageCondition, certificateDocumentId

ReagentLot
  reagentName, lotNumber
  preparedBy, preparedAt, expiresAt, storageCondition

RawDataAttachment
  worksheetId, testResultId
  fileName, fileStoragePath, checksum, uploadedBy
```

All four are missing. `QcTestResult` has no FK to any of them.

---

## Module 11 — Document Control

### BUILT

| What | Status |
|---|---|
| VendorDocument (corporate): type, file, expiry, issued by | Built |
| VendorDocument (VBU-level): type, status, approval, expiry | Built (rich model) |
| GrnDocument: document upload per GRN item | Built |
| MoA.referenceAttachment, MoA.validationAttachment | Built — file paths |
| Spec.referenceAttachment | Built — file path |
| LocalStorageService: file I/O | Built |

### MISSING — No controlled document system for SOPs and policies

Vendor/VBU documents are qualification evidence, not internal controlled documents. No SOP, policy, or validation report management exists.

```
ControlledDocument
  documentNumber, title, documentType
  owningDepartment, status, currentRevisionId

DocumentRevision
  documentId, revision, effectiveDate, supersedesRevisionId
  fileStoragePath, checksum

DocumentApproval
  revisionId, approverRole, approvedBy, approvedAt, eSignatureId

DocumentDistribution
  revisionId, userId, acknowledgedAt
```

### MISSING — Link from MoA to SOP

MoA has `reagentsAndStandards` as a text blob. In a controlled system, MoA should reference a controlled SOP document. This link does not exist.

---

## Module 12 — HRMS & Training

### BUILT

`User.employeeId` — FK field exists. No `Employee` entity exists.

### MISSING — Entire module

```
Employee
  employeeCode, fullName, department, designation
  userId (FK to User — the auth account)
  siteCode

TrainingAssignment
  userId, documentRevisionId
  assignedAt, dueDate, completedAt
  effectivenessRequired, effectivenessStatus

RoleQualificationRequirement
  role, department
  requiredTraining, requiredQualification
```

---

## Module 13 — BPR / Manufacturing

Not started. Correctly deferred. No gaps to document yet.

---

## Frontend Page Gaps

| Module | Page Status |
|---|---|
| Auth / Login | Built |
| Dashboard | Built (static cards — no live counts from gap modules) |
| GRN | Built |
| Inventory | Built |
| Sampling (full workflow + QC disposition + investigation) | Built |
| Warehouse locations | Built |
| Material master | Built |
| Supplier | Built — form is bare (V56 not yet applied) |
| Vendor + VBU | Built |
| Spec + MoA + Sampling Tools | Built |
| User Management | Built |
| **QMS (Deviation / CAPA / Change Control)** | **Not started** |
| **LIMS (instruments / standards / reagents)** | **Not started** |
| **HRMS** | **Not started** |
| **Document Control** | **Not started** |
| **Audit Trail UI tab** | **Not started — no backend to support it** |
| **E-signature dialog** | **Not started — no backend to support it** |
| **Notification / alert centre** | **Not started** |

---

## Complete Gap Register

| Priority | Gap | Module | Flyway | Entity needed |
|---|---|---|---|---|
| P0 | Supplier pharma fields + qualification status | Supplier | V56 | `Supplier` fields + 2 new enums |
| P0 | Inventory.expiryDate + retestDueDate fields | Inventory | V57 | Add to `Inventory` entity |
| P0 | Auto-block expired / retest-overdue inventory | Inventory | — | Scheduler + status rule |
| P0 | GRN supplier/VBU qualification check | GRN | — | Service guard in `GrnServiceImpl` |
| P0 | GRN approved spec required check | GRN | — | Service guard in `GrnServiceImpl` |
| P0 | Approved Vendor List (AVL) entity | Supplier/VMS | V58 | `VendorMaterialApproval` |
| P0 | GRN AVL enforcement | GRN | — | Service guard using AVL |
| P0 | CoA review workflow on GRN | GRN | V59 | `Grn` CoA fields + status enum |
| P0 | QcWorksheet entity | QC | V60 | `QcWorksheet` entity + service |
| P0 | Mandatory parameter completion check before disposition | QC | — | Service guard in `QcWorksheetServiceImpl` |
| P0 | Audit trail infrastructure | All | V61 | `AuditEvent` + listener |
| P0 | E-signature service | All | V62 | `ESignatureRecord` + service |
| P1 | Material status lifecycle (DRAFT/ACTIVE/DISCONTINUED/OBSOLETE) | Material | V63 | `MaterialStatus` enum |
| P1 | LabInstrument entity | LIMS | V64 | `LabInstrument` |
| P1 | ReferenceStandard entity | LIMS | V64 | `ReferenceStandard` |
| P1 | ReagentLot entity | LIMS | V64 | `ReagentLot` |
| P1 | Lab traceability FK on QcTestResult | QC/LIMS | V65 | Add FKs to `QcTestResult` |
| P1 | RawDataAttachment entity | QC/LIMS | V65 | `RawDataAttachment` |
| P1 | Deviation entity | QMS | V66 | `Deviation` |
| P1 | CAPA entity | QMS | V67 | `CAPA` |
| P1 | ChangeRequest entity | QMS | V68 | `ChangeRequest` |
| P1 | Destruction transaction + MaterialDestructionRecord | Inventory | V69 | New type + entity |
| P1 | SamplingPolicy entity | Sampling | V70 | `SamplingPolicy` |
| P1 | Retained sample destruction approval workflow | Sampling | — | Service logic |
| P1 | Auth: password policy + account lockout | Auth | V71 | Add fields to `User` |
| P1 | `SamplingContainerSample` testType field (identity vs assay vs retention) | Sampling | V82 | Add `test_type` column to `sampling_container_sample` |
| P1 | Sample: allow identity + composite + retention per request (relax unique constraint) | Sampling | V83 | Replace `UNIQUE(sampling_request_id)` with `UNIQUE(sampling_request_id, sample_type)` |
| P1 | Inventory balance deduction when sampling consumes material | Sampling | — | Service fix in `SamplingServiceImpl.completeSampling()` — new ADJUSTMENT transaction |
| P2 | Alerting infrastructure (expiry / audit due / calibration / training) | All | V72 | Scheduler + `AlertEvent` — build after HRMS |
| P2 | MethodValidation entity | MoA/LIMS | V73 | `MethodValidation` |
| P2 | TemperatureExcursion entity | WMS | V74 | `TemperatureExcursion` |
| P2 | Controlled document system (SOPs) | Docs | V75 | `ControlledDocument` + revisions |
| P2 | TrainingAssignment + HRMS foundation | HRMS | V76 | `Employee`, `TrainingAssignment` |
| P2 | VendorChangeRequest entity | VMS | V77 | `VendorChangeRequest` |
| P2 | Spec periodicReviewDue field | Spec | V78 | Add field to `spec_master` |
| P2 | Inventory cycle count / reconciliation | Inventory | V79 | `CycleCountRecord` |
| P3 | Training gating on sampling start | Sampling | — | Service guard using TrainingAssignment |
| P3 | Training gating on QC result entry | QC | — | Service guard |
| P3 | Analyst/reviewer separation enforcement | QC | — | Service guard |
| P3 | SampleChainOfCustody event log | Sampling | V80 | `SampleChainOfCustody` |
| P3 | LIMS instrument integration | LIMS | — | Channel adapters, raw payload store |
| P3 | Recall traceability | QMS | — | Batch forward-trace query |
| P3 | Complaint handling | QMS | V81 | `CustomerComplaint` |

---

## Recommended Build Sequence

### Phase A — Harden The Existing Flow (build now)

1. `V56` — Supplier pharma fields (`SUPPLIER_ENHANCEMENT_REQUIREMENTS.md`)
2. `V57` — Add `expiryDate` + `retestDueDate` to `Inventory`, propagate from GrnItem on receipt
3. GRN service guards: material ACTIVE check, supplier not SUSPENDED/DISQUALIFIED, approved spec required
4. `V58` — `VendorMaterialApproval` AVL entity + GRN AVL enforcement
5. `V59` — CoA review fields on GRN + CoA review workflow
6. `V60` — `QcWorksheet` entity + mandatory parameter completion guard before disposition

### Phase B — Compliance Infrastructure

7. `V61–V62` — `AuditEvent` + `ESignatureRecord` infrastructure
8. Auth password policy + lockout (`User` field additions)
9. Status transition service (extract from InventoryServiceImpl)

### Phase C — QMS Foundation

11. `V66–V68` — Deviation, CAPA, ChangeRequest
12. Link GRN rejection + OOS investigation closure → Deviation creation
13. Change control gate on Spec/Material/Vendor edits

### Phase D — LIMS Foundation

14. `V64–V65` — LabInstrument, ReferenceStandard, ReagentLot, RawDataAttachment
15. Add lab traceability FKs to `QcTestResult`
16. Analyst qualification check (requires HRMS training assignment)

### Phase E — HRMS & Training

17. `V71, V76` — `Employee`, `TrainingAssignment`, `RoleQualificationRequirement`
18. Training gating on sampling start + QC result entry
19. `V72` — Alerting scheduler for expiry / audit due / calibration / training (needs HRMS training data to be useful)

---

## Related Documents

- [PHARMA_IMPROVEMENTS_AND_ROADMAP.md](./PHARMA_IMPROVEMENTS_AND_ROADMAP.md)
- [SUPPLIER_ENHANCEMENT_REQUIREMENTS.md](./SUPPLIER_ENHANCEMENT_REQUIREMENTS.md)
- [SPEC_MOA_DESIGN.md](./SPEC_MOA_DESIGN.md)
- [QC_SAMPLING_IMPLEMENTATION_PLAN.md](./QC_SAMPLING_IMPLEMENTATION_PLAN.md)
- [QC_SAMPLING_GAP_ANALYSIS.md](./QC_SAMPLING_GAP_ANALYSIS.md)
- [INVENTORY_ISSUE_AND_ADJUSTMENT_DEVELOPMENT_PLAN.md](./INVENTORY_ISSUE_AND_ADJUSTMENT_DEVELOPMENT_PLAN.md)
- ~~[Codex_plan_later.md](./Codex_plan_later.md)~~ — exact duplicate of PHARMA_IMPROVEMENTS_AND_ROADMAP.md, safe to delete

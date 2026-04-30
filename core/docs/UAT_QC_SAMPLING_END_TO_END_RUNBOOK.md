# UAT QC Sampling End-to-End Runbook

Date prepared: 2026-04-28
Purpose: Full hands-on UAT runbook for the implemented BatchSphere scope from login through QC sampling, investigation, QA review, retest, resample, and final disposition

## Scope

This runbook is for testing the project scope that is currently implemented and ready for manual verification:

- login and role-based access
- MOA creation and approval
- Spec creation and approval
- Spec parameter setup
- material creation
- GRN creation
- sampling workflow
- QC receipt and worksheet flow
- investigation and QA review
- retest and resample paths
- final QC decision and inventory transitions

This runbook does not include future-only areas such as:

- environmental monitoring
- warehouse cycle count
- recall locator
- warehouse excursion management

## Users to Use

In local/test environments, these users are auto-seeded on backend startup and active:

| Username | Role | Password |
|---|---|---|
| `admin` | `SUPER_ADMIN` | `Admin@123` |
| `qc.analyst` | `QC_ANALYST` | `Admin@123` |
| `qc.manager` | `QC_MANAGER` | `Admin@123` |

## Existing Master Data You Can Reuse

### Supplier

| Field | Value |
|---|---|
| `supplierId` | `26eaff3b-9fd6-4c88-8fa8-38830e93b481` |
| `supplierCode` | `NIKON001` |
| `supplierName` | `Nikon Logistics Pvt Ltd` |

### Vendor

| Field | Value |
|---|---|
| `vendorId` | `b9200754-b605-4ce0-822a-bf7f955cc2a4` |
| `vendorCode` | `VENREDDY-002` |
| `vendorName` | `Dr. Reddy's pvt ltd` |

### Vendor Business Unit

| Field | Value |
|---|---|
| `vendorBusinessUnitId` | `6ba33d47-5eea-4564-8048-c69dd04cef7f` |
| `unitName` | `Dr.Reddy's MiryalaGuda` |
| `buCode` | `DRMIR-001` |
| `siteType` | `MANUFACTURING` |

### Warehouse Path / Pallet

| Level | Value |
|---|---|
| `warehouseId` | `ab7512bc-fd7e-4f6e-afe3-4a486ddb4a3b` |
| `warehouseCode` | `WH-HYD-RM-01` |
| `roomId` | `5a1234b4-fe2c-483a-a87a-2e81e0aa8003` |
| `roomCode` | `R-01` |
| `rackId` | `4c44c061-d77b-4ea1-9ca8-73354df7e419` |
| `rackCode` | `R-01-RK-01` |
| `shelfId` | `8fdc8dab-c6ee-4809-9604-1ff7ea262363` |
| `shelfCode` | `S-01` |
| `palletId` | `9100d386-94d5-4676-b659-529e5377cf5d` |
| `palletCode` | `P-010101` |

## Important Order

Use this order. Do not create Material before Spec.

Correct executable order:

1. Login as `admin`
2. Create MOA
3. Create Spec
4. Approve MOA and Spec
5. Add Spec Parameters
6. Create Material
7. Create GRN
8. Continue sampling and QC flow

Reason:

- Material creation requires a valid `specId`
- Sampling plan and worksheet depend on approved Spec + MOA + Spec Parameters

## Recommended New Test Data

Use these exact values unless a field must be unique in your environment.

### MOA

| Field | Value |
|---|---|
| `moaCode` | `MOA-UAT-001` |
| `moaName` | `UAT Assay by HPLC` |
| `revision` | `v1` |
| `moaType` | `HPLC` |
| `principle` | `Assay by HPLC area comparison against approved standard` |
| `compendialRef` | `PH_EUR` |
| `instrumentType` | `HPLC System` |
| `reagentsAndStandards` | `Acetonitrile, buffer, reference standard` |
| `systemSuitabilityCriteria` | `RSD <= 2.0%, tailing <= 1.5` |
| `calculationFormula` | `Sample area / Standard area * potency factor` |
| `reportableRange` | `98.0% - 102.0%` |
| `validationReferenceNo` | `VAL-UAT-001` |
| `validationAttachment` | `VAL-UAT-001.pdf` |
| `sampleSolutionStabilityValue` | `24` |
| `sampleSolutionStabilityUnit` | `HOURS` |
| `sampleSolutionStabilityCondition` | `Room temperature, protected from light` |
| `validationStatus` | `VALIDATED` |
| `reviewRoute` | `QC_ONLY` |
| `createdBy` | `admin` |

### Spec

| Field | Value |
|---|---|
| `specCode` | `SP-UAT-001` |
| `specName` | `UAT Raw Material Specification` |
| `revision` | `v1` |
| `specType` | `MATERIAL` |
| `samplingMethod` | `SQRT_N_PLUS_1` |
| `targetMarket` | `GLOBAL` |
| `effectiveDate` | today |
| `compendialRef` | `PH_EUR` |
| `compendialEdition` | `Ph. Eur. 11th Ed.` |
| `referenceDocumentNo` | `SPEC-UAT-001` |
| `referenceAttachment` | `SPEC-UAT-001.pdf` |
| `reviewRoute` | `QC_ONLY` |
| `createdBy` | `admin` |

### Spec Parameters

| Sequence | Field | Value |
|---|---|---|
| 1 | `parameterName` | `Assay` |
| 1 | `testType` | `ASSAY` |
| 1 | `criteriaType` | `RANGE` |
| 1 | `lowerLimit` | `98.0` |
| 1 | `upperLimit` | `102.0` |
| 1 | `unit` | `%` |
| 1 | `isMandatory` | `true` |
| 2 | `parameterName` | `Identification` |
| 2 | `testType` | `IDENTITY` |
| 2 | `criteriaType` | `COMPLIES` |
| 2 | `textCriteria` | `Complies` |
| 2 | `compendialChapterRef` | `Ph. Eur.` |
| 2 | `isMandatory` | `true` |
| 3 | `parameterName` | `Loss on Drying` |
| 3 | `testType` | `PHYSICAL` |
| 3 | `criteriaType` | `NMT` |
| 3 | `upperLimit` | `0.5` |
| 3 | `unit` | `%` |
| 3 | `isMandatory` | `true` |

Use the created MOA for all 3 parameters where MOA selection is needed.

### Material

| Field | Value |
|---|---|
| `materialCode` | `RM-UAT-001` |
| `materialName` | `UAT Raw Material 001` |
| `materialType` | `CRITICAL` |
| `uom` | `KG` |
| `specId` | use created Spec |
| `storageCondition` | `AMBIENT` |
| `photosensitive` | `false` |
| `hygroscopic` | `false` |
| `hazardous` | `false` |
| `selectiveMaterial` | `false` |
| `vendorCoaReleaseAllowed` | `false` |
| `samplingRequired` | `true` |
| `description` | `UAT test material for QC flow` |
| `createdBy` | `admin` |

Valid `materialType` values currently supported by the UI/backend:

- `CRITICAL`
- `NON_CRITICAL`
- `FINISHED_GOODS`
- `IN_PROCESS`

### GRN

| Field | Value |
|---|---|
| `grnNumber` | `GRN-UAT-001` |
| `supplierId` | `26eaff3b-9fd6-4c88-8fa8-38830e93b481` |
| `vendorId` | `b9200754-b605-4ce0-822a-bf7f955cc2a4` |
| `vendorBusinessUnitId` | `6ba33d47-5eea-4564-8048-c69dd04cef7f` |
| `receiptDate` | today |
| `invoiceNumber` | `INV-UAT-001` |
| `remarks` | `UAT GRN for QC sampling flow` |
| `createdBy` | `admin` |

### GRN Item

| Field | Value |
|---|---|
| `materialId` | use created Material |
| `receivedQuantity` | `100.000` |
| `acceptedQuantity` | `100.000` |
| `rejectedQuantity` | `0.000` |
| `uom` | `KG` |
| `palletId` | `9100d386-94d5-4676-b659-529e5377cf5d` |
| `containerType` | use valid UI option, prefer bag/drum already supported there |
| `numberOfContainers` | `10` |
| `quantityPerContainer` | `10.000` |
| `vendorBatch` | `VB-UAT-001` (shown in UI as Vendor / Supplier Batch No.) |
| `manufactureDate` | today minus 30 days |
| `expiryDate` | today plus 365 days |
| `retestDate` | today plus 180 days |
| `unitPrice` | `100.00` |
| `qcStatus` | use initial pending/quarantine option available in UI |
| `description` | `UAT GRN line item` |

### Sampling Plan

| Field | Value |
|---|---|
| `samplingMethod` | comes automatically from the approved Spec linked in Material Master |
| `sampleType` | `COMPOSITE` |
| `moaId` | auto-selected when exactly one MoA is linked through Spec Parameters; otherwise choose from linked MoAs only |
| `containersToSample` | system-calculated from the spec sampling method and total containers |
| `individualSampleQuantity` | `0.100` |
| `compositeSampleQuantity` | system-calculated from selected container sample quantities |
| `samplingLocation` | `Sampling Booth A` |
| `analystEmployeeCode` | `QC-AN-01` |
| `photosensitiveHandlingRequired` | auto-derived from Material Master |
| `hygroscopicHandlingRequired` | auto-derived from Material Master |
| `coaBasedRelease` | auto-derived from the effective sampling method |
| `rationale` | `UAT representative sampling plan` |

### QC Receipt

| Field | Value |
|---|---|
| `receivedBy` | `qc.analyst` |
| `receiptCondition` | `Container intact and acceptable` |
| `sampleStorageLocation` | `QC Room Shelf 1` |
| `retainedFlag` | `true` |
| `retainedQuantity` | `0.050` |
| `retainedUntil` | today plus 180 days |

### Worksheet Result Values

#### Pass values

| Parameter | Value |
|---|---|
| `Assay` | `99.5` |
| `Identification` | `Complies` |
| `Loss on Drying` | `0.3` |

#### Fail values

| Parameter | Value |
|---|---|
| `Assay` | `96.0` |

### Investigation Values

| Field | Value |
|---|---|
| `investigationType` | `OOS` |
| `reason` | `Assay below lower limit` |
| `initialAssessment` | `Instrument and sample prep to be reviewed` |
| `phaseOneSummary` | `No assignable lab error found in Phase I` |
| `phaseTwoAssessment` | `Extend investigation to full batch and process review` |
| `phaseSummary` | `Phase II confirms retained-sample retest is required` |
| `rootCause` | `Sampling or preparation variation suspected` |
| `resolutionRemarks` | `Move to retained-sample retest` |
| `capaRequired` | `true` |
| `capaReference` | `CAPA-001` |

### QA Review Values

#### Return to QC

| Field | Value |
|---|---|
| `approved` | `false` |
| `qaReviewRemarks` | `Add stronger root cause justification` |
| `confirmedBy` | `qc.manager` |
| `confirmationText` | `I RETURN THIS INVESTIGATION TO QC` |

#### Approve QA Review

| Field | Value |
|---|---|
| `approved` | `true` |
| `qaReviewRemarks` | `Approved after investigation review` |
| `confirmedBy` | `qc.manager` |
| `confirmationText` | `I APPROVE THIS QA REVIEW` |

### Final QC Decision Values

#### Approve

| Field | Value |
|---|---|
| `approved` | `true` |
| `remarks` | `Approved as per specification` |
| `confirmedBy` | `qc.manager` |
| `confirmationText` | `I APPROVE THIS FINAL QC DECISION` |

#### Reject

| Field | Value |
|---|---|
| `approved` | `false` |
| `remarks` | `Batch rejected` |
| `confirmedBy` | `qc.manager` |
| `confirmationText` | `I REJECT THIS FINAL QC DECISION` |

## UAT Flow

### Phase 1: Login and Access Check

#### Step 1. Login as `admin`

Verify:

- login succeeds
- `admin` can access:
  - MOA
  - Spec
  - Material
  - GRN
  - Sampling

#### Step 2. Login as `qc.analyst`

Verify:

- login succeeds
- user can access sampling and QC workflow screens
- user cannot perform manager-only closure actions

#### Step 3. Login as `qc.manager`

Verify:

- login succeeds
- user can access QA review and final QC decision actions

### Phase 2: MOA Setup

Login user:

- `admin`

Action:

- create MOA with the values from the table above

Verify fields:

- `moaCode`
- `moaName`
- `revision`
- `moaType`
- `principle`
- `compendialRef`
- `instrumentType`
- `reagentsAndStandards`
- `systemSuitabilityCriteria`
- `calculationFormula`
- `reportableRange`
- `validationReferenceNo`
- `validationAttachment`
- `sampleSolutionStabilityValue`
- `sampleSolutionStabilityUnit`
- `sampleSolutionStabilityCondition`
- `validationStatus`
- `reviewRoute`
- `status`

Expected:

- MOA saves successfully
- move MOA through review until usable/approved

### Phase 3: Spec Setup

Login user:

- `admin`

Action:

- create Spec with the values above

Verify fields:

- `specCode`
- `specName`
- `revision`
- `specType`
- `samplingMethod`
- `targetMarket`
- `effectiveDate`
- `compendialRef`
- `compendialEdition`
- `referenceDocumentNo`
- `referenceAttachment`
- `reviewRoute`
- `status`

Expected lifecycle:

- `DRAFT -> UNDER_REVIEW -> APPROVED`

### Phase 4: Spec Parameter Setup

Login user:

- `admin`

Action:

- add the 3 spec parameters

Verify fields on each parameter:

- `parameterName`
- `testType`
- `moaId`
- `criteriaType`
- `lowerLimit`
- `upperLimit`
- `textCriteria`
- `compendialChapterRef`
- `unit`
- `isMandatory`
- `sequence`
- `notes`

Expected:

- rows save correctly
- sequence is respected

### Phase 5: Material Creation

Login user:

- `admin`

Action:

- create material using the newly approved spec
- in the material form, use the `Material Type` dropdown in the `Basic Information` section
- select `CRITICAL` for this UAT run

Verify fields:

- `materialCode`
- `materialName`
- `materialType`
- `uom`
- `specId`
- `storageCondition`
- `photosensitive`
- `hygroscopic`
- `hazardous`
- `selectiveMaterial`
- `vendorCoaReleaseAllowed`
- `samplingRequired`
- `description`
- `createdBy`

Expected:

- material saves successfully
- spec is linked correctly

Important UI note:

- `materialType` is present in the material creation UI
- label shown in UI: `Material Type`
- recommended selection for this UAT: `Raw Material (RM)` which saves as `CRITICAL`

### Phase 6: GRN Creation

Login user:

- `admin`

Reuse:

- supplier `NIKON001`
- vendor `VENREDDY-002`
- vendor business unit `DRMIR-001`
- pallet `P-010101`

Action:

- create new GRN and one GRN item

Verify GRN fields:

- `grnNumber`
- `supplierId`
- `vendorId`
- `vendorBusinessUnitId`
- `receiptDate`
- `invoiceNumber`
- `remarks`
- `createdBy`

Verify GRN item fields:

- `materialId`
- `receivedQuantity`
- `acceptedQuantity`
- `rejectedQuantity`
- `uom`
- `palletId`
- `containerType`
- `numberOfContainers`
- `quantityPerContainer`
- `vendorBatch`
- `manufactureDate`
- `expiryDate`
- `retestDate`
- `unitPrice`
- `qcStatus`
- `description`

Expected:

- inventory created in `QUARANTINE`
- sampling request auto-created in `REQUESTED`
- containers generated for the item

### Phase 7: Sampling Plan and Execution

Login user:

- `qc.analyst`

Action:

- open sampling request
- create sampling plan
- confirm the Sampling Method field is read-only and matches the approved Spec
- confirm the MoA dropdown shows only MoAs linked through the selected Spec Parameters

Verify plan fields:

- `samplingMethod`
- `sampleType`
- `specId`
- `moaId`
- `containersToSample`
- `individualSampleQuantity`
- `compositeSampleQuantity`
- `samplingLocation`
- `analystEmployeeCode`
- `photosensitiveHandlingRequired`
- `hygroscopicHandlingRequired`

GRN supporting documents:

- supporting documents are attached per GRN line item
- enter `documentName`, `documentType`, optional `documentUrl`, and choose the target line item before upload
- uploads above 20MB are rejected
- `coaBasedRelease`
- `rationale`

Expected:

- request moves to `PLAN_DEFINED`

Action:

- start sampling

Expected:

- request = `IN_PROGRESS`
- inventory = `SAMPLING`

Action:

- complete sampling

Expected:

- request = `SAMPLED`
- sample created

Verify sample fields:

- `sampleNumber`
- `sampleQuantity`
- `sampleType`
- `collectedBy`
- `collectedAt`
- `samplingLocation`

### Phase 8: Handoff and QC Receipt

Login user:

- `qc.analyst`

Action:

- handoff sample to QC

Expected:

- request = `HANDED_TO_QC`
- QC disposition = `PENDING`
- inventory = `UNDER_TEST`

Action:

- receive in QC with retained sample enabled

Verify fields:

- `receivedBy`
- `receiptCondition`
- `sampleStorageLocation`
- `retainedFlag`
- `retainedQuantity`
- `retainedUntil`

Expected:

- request = `RECEIVED`
- retained details stored on sample

### Phase 9: QC Review and Straight Approval Path

Login user:

- `qc.analyst`

Action:

- start QC review

Expected:

- request = `UNDER_REVIEW`

Action:

- open worksheet

Expected:

- worksheet rows generated from spec parameters

Verify each row:

- `parameterName`
- `testType`
- `criteriaTypeApplied`
- `lowerLimitApplied`
- `upperLimitApplied`
- `unitApplied`
- `mandatory`
- `sequence`
- `status = PENDING`

Action:

- enter pass values:
  - `Assay = 99.5`
  - `Identification = Complies`
  - `Loss on Drying = 0.3`

Expected:

- all mandatory rows = `PASS`

Login user:

- `qc.manager`

Action:

- record final QC approve

Use:

- `remarks = Approved as per specification`
- `confirmedBy = qc.manager`
- `confirmationText = I APPROVE THIS FINAL QC DECISION`

Expected:

- request final decision fields populated
- inventory = `RELEASED`

### Phase 10: Investigation, QA Return, and QA Approval Path

Create a second GRN or second sampling cycle with the same material for this path.

Login user:

- `qc.analyst`

Action:

- drive request to worksheet stage
- enter failing assay:
  - `Assay = 96.0`

Expected:

- failing row created
- final approve blocked

Action:

- open investigation

Use:

- `investigationType = OOS`
- `reason = Assay below lower limit`
- `initialAssessment = Instrument and sample prep to be reviewed`

Expected:

- investigation = `PHASE_I`
- request = `UNDER_INVESTIGATION`
- inventory = `BLOCKED`

Action:

- escalate to Phase II

Use:

- `phaseOneSummary = No assignable lab error found in Phase I`
- `phaseTwoAssessment = Extend investigation to full batch and process review`

Expected:

- investigation = `PHASE_II`

Action:

- resolve for QA review

Use:

- `outcome = RETEST_REQUIRED`
- `phaseSummary = Phase II confirms retained-sample retest is required`
- `rootCause = Sampling or preparation variation suspected`
- `resolutionRemarks = Move to retained-sample retest`
- `capaRequired = true`
- `capaReference = CAPA-001`

Expected:

- investigation = `QA_REVIEW_PENDING`

Login user:

- `qc.manager`

Action:

- return investigation to QC

Use:

- `qaReviewRemarks = Add stronger root cause justification`
- `confirmedBy = qc.manager`
- `confirmationText = I RETURN THIS INVESTIGATION TO QC`

Expected:

- investigation returns to active phase
- returned banner visible in UI

Login user:

- `qc.analyst`

Action:

- update investigation details
- resubmit for QA review

Login user:

- `qc.manager`

Action:

- approve QA review

Use:

- `qaReviewRemarks = Approved after investigation review`
- `confirmedBy = qc.manager`
- `confirmationText = I APPROVE THIS QA REVIEW`

Expected:

- QA review audit fields captured
- closure fields captured

### Phase 11: Retest Path

Prerequisite:

- investigation outcome approved as `RETEST_REQUIRED`

Login user:

- `qc.analyst`

Action:

- execute retest

Use:

- `analystCode = QC-AN-02`
- `remarks = Retest from retained sample`

Expected:

- request returns to active review flow
- retained sample auto-consumed
- `consumedFlag = true`

### Phase 12: Retest Blocking Rules

Validate these conditions on a suitable sample:

- retained sample missing
- retained sample expired
- retained sample consumed
- retained sample destroyed

Expected:

- retest blocked in all 4 cases

### Phase 13: Retained Sample Destruction

Login user:

- `qc.analyst`

Action:

- destroy retained sample

Use:

- `remarks = Container damaged`

Expected:

- `destroyedFlag = true`
- retest not available afterwards

### Phase 14: Resample Path

Create another failing cycle if needed.

Login user:

- `qc.analyst`

Action:

- resolve investigation with:
  - `outcome = RESAMPLE_REQUIRED`
  - `phaseSummary = Fresh resample required after investigation`
  - `resolutionRemarks = Proceed to new sample cycle`

Login user:

- `qc.manager`

Action:

- approve QA review

Expected:

- request becomes eligible for resample

Login user:

- `qc.analyst`

Action:

- create resample cycle

Use:

- `reason = Fresh sample required after confirmed issue`

Expected:

- child request created
- `parentSamplingRequestId` populated
- `rootSamplingRequestId` inherited
- `cycleNumber = 2`
- parent request = `RESAMPLED`

### Phase 15: Final Reject Path

Create another failing cycle if needed.

Login user:

- `qc.analyst`

Action:

- resolve investigation with:
  - `outcome = REJECTED`
  - `phaseSummary = Failure confirmed after full review`
  - `resolutionRemarks = Reject batch`

Login user:

- `qc.manager`

Action:

- approve QA review

Expected:

- closure category reflects rejection path
- inventory moves to `REJECTED`

If final QC reject step is still required in the exact UI path you follow, use:

- `remarks = Batch rejected`
- `confirmedBy = qc.manager`
- `confirmationText = I REJECT THIS FINAL QC DECISION`

### Phase 16: Role Validation

#### As `qc.analyst`

Verify:

- cannot complete QA review
- cannot record final QC decision

#### As `qc.manager`

Verify:

- can complete QA review
- can record final QC decision

#### As `admin`

Verify:

- can perform both actions as `SUPER_ADMIN`

### Phase 17: UI Audit and History Validation

Verify audit timeline can show:

- `Opened by`
- `Escalated to Phase II by`
- `Submitted to QA by`
- `Returned to QC by`
- `QA returned/approved by`
- `QA sign-off captured from`
- `Closed by`

Verify cycle history shows:

- current cycle
- root cycle
- resampled historical parent

Verify final QC section shows:

- final sign-off user
- final sign-off timestamp

## Quick Reuse Option

If you do not want to create a fresh GRN immediately, there is already one GRN in DB with multiple containers:

| Field | Value |
|---|---|
| `grnId` | `f61cc5ba-22dd-45f8-9584-65e4703c2f05` |
| `containerCount` | `27` |

You can use it for exploratory testing, but for structured UAT the recommended path is to create a fresh material and fresh GRN using this runbook.

## Pass/Fail Sheet

Use this sheet while testing:

| ID | Login User | Scenario | Input Values | Expected Result | Actual Result | Pass/Fail | Notes |
|---|---|---|---|---|---|---|---|
| 1 | `admin` | Login | `admin / Admin@123` | login success |  |  |  |
| 2 | `admin` | Create MOA | `MOA-UAT-001` | saved and reviewable |  |  |  |
| 3 | `admin` | Create Spec | `SP-UAT-001` | saved and approvable |  |  |  |
| 4 | `admin` | Add Parameters | `Assay/Identification/LOD` | worksheet-ready |  |  |  |
| 5 | `admin` | Create Material | `RM-UAT-001` | saved |  |  |  |
| 6 | `admin` | Create GRN | `GRN-UAT-001` | request auto-created |  |  |  |
| 7 | `qc.analyst` | Sampling plan | `SQRT_N_PLUS_1` | `PLAN_DEFINED` |  |  |  |
| 8 | `qc.analyst` | Sampling start |  | `IN_PROGRESS` |  |  |  |
| 9 | `qc.analyst` | Sampling complete |  | sample created |  |  |  |
| 10 | `qc.analyst` | QC receipt | retained sample enabled | `RECEIVED` |  |  |  |
| 11 | `qc.analyst` | Worksheet pass | `99.5 / Complies / 0.3` | all pass |  |  |  |
| 12 | `qc.manager` | Final approve | approval phrase | inventory `RELEASED` |  |  |  |
| 13 | `qc.analyst` | Failing result | `Assay=96.0` | fail created |  |  |  |
| 14 | `qc.analyst` | Investigation open | OOS reason | inventory `BLOCKED` |  |  |  |
| 15 | `qc.manager` | QA return | return phrase | returned to QC |  |  |  |
| 16 | `qc.manager` | QA approve | approval phrase | closed with audit |  |  |  |
| 17 | `qc.analyst` | Retest | retained sample | active review resumed |  |  |  |
| 18 | `qc.analyst` | Resample | resample reason | child cycle created |  |  |  |
| 19 | `qc.analyst` | Role block check | analyst tries QA/final close | blocked |  |  |  |
| 20 | `qc.manager` | Final reject | reject phrase | inventory `REJECTED` |  |  |  |

## Recommended Execution Strategy

1. Run the straight pass path first.
2. Run the failure + investigation + QA return + QA approve path second.
3. Run retest third.
4. Run resample fourth.
5. Run final reject fifth.
6. Finish with role and audit checks.

This order gives you fast confidence in the happy path before spending time on exception workflows.

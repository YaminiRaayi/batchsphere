# QC Sampling Test Checklist

Date prepared: 2026-04-28
Scope: Implemented QC sampling, QC review, investigation, QA review, retest, resample, and final disposition flows

## Purpose

This document is the manual QA checklist for the currently implemented QC sampling scope in BatchSphere.

It is intended for:

- functional testing
- regression testing
- role/permission verification
- audit-field verification
- workflow state verification

This checklist does not attempt to cover the broader future WMS roadmap such as environmental monitoring, recall locator, or warehouse cycle count.

## Test Preconditions

Before starting, ensure these are available:

- one material master record
- one approved MOA
- one approved Spec linked to the material
- at least one GRN for that material with multiple containers
- users for these roles:
  - `QC_ANALYST`
  - `QC_MANAGER`
  - `SUPER_ADMIN`

Recommended sample master data:

- Material: `Paracetamol RM`
- Spec code: `RM-PARACETAMOL-001`
- MOA code: `MOA-HPLC-001`
- Sampling tool: any valid active sampling tool
- Analyst code: `QC-AN-01`
- Manager username: `qc.manager`

## Recommended Test Data

Use these example values where practical:

| Area | Field | Example Value |
|---|---|---|
| Spec | `specCode` | `RM-PARACETAMOL-001` |
| Spec | `specName` | `Paracetamol RM Spec` |
| Spec | `specType` | `MATERIAL` |
| Spec | `targetMarket` | `INDIA_CDSCO` |
| Spec | `compendialRef` | `IP` |
| Spec | `compendialEdition` | `IP 2022` |
| Spec | `reviewRoute` | `QC_ONLY` |
| MOA | `moaCode` | `MOA-HPLC-001` |
| MOA | `moaName` | `Assay by HPLC` |
| MOA | `moaType` | `HPLC` |
| MOA | `validationStatus` | `VALIDATED` |
| Sampling Plan | `samplingMethod` | `SQRT_N_PLUS_1` |
| Sampling Plan | `sampleType` | `COMPOSITE` |
| Sampling Plan | `samplingLocation` | `Sampling Booth A` |
| Sampling Plan | `analystEmployeeCode` | `QC-AN-01` |
| QC Receipt | `receiptCondition` | `Container intact and acceptable` |
| QC Receipt | `sampleStorageLocation` | `QC Room Shelf 1` |
| Investigation | `investigationType` | `OOS` |
| Investigation | `reason` | `Assay below lower limit` |
| Investigation | `initialAssessment` | `Instrument and sample prep to be reviewed` |
| CAPA | `capaReference` | `CAPA-001` |

Recommended Spec Parameters:

| Sequence | Parameter | Test Type | Criteria Type | Limits / Text | Unit | Mandatory |
|---|---|---|---|---|---|---|
| 1 | `Assay` | `ASSAY` | `RANGE` | `98.0 - 102.0` | `%` | `true` |
| 2 | `Identification` | `IDENTITY` | `COMPLIES` | `Complies` | — | `true` |
| 3 | `Loss on Drying` | `PHYSICAL` | `NMT` | `0.5` | `%` | `true` |

Recommended worksheet result values:

| Scenario | Parameter | Input Value | Expected Status |
|---|---|---|---|
| Pass | `Assay` | `99.5` | `PASS` |
| Pass | `Identification` | `Complies` | `PASS` |
| Pass | `Loss on Drying` | `0.3` | `PASS` |
| Fail | `Assay` | `96.0` | `FAIL` or `OOS` |

## Section A: Spec and MOA Setup

### A1. Create Spec

Action:

- create a new spec

Fields to verify:

- `specCode`
- `specName`
- `specType`
- `status`
- `targetMarket`
- `compendialRef`
- `compendialEdition`
- `effectiveDate`
- `expiryDate`
- `referenceDocumentNo`
- `referenceAttachment`
- `reviewRoute`
- `reviewRemarks`
- `submittedBy`
- `submittedAt`
- `reviewedBy`
- `reviewedAt`
- `approvedBy`
- `approvedAt`
- `previousSpecId`
- `isActive`

Expected:

- initial `status = DRAFT`
- saved values reload correctly

### A2. Move Spec Through Review

Action:

- submit and approve the spec

Expected lifecycle:

- `DRAFT -> UNDER_REVIEW -> APPROVED`

Expected fields populated after review:

- `submittedBy`
- `submittedAt`
- `reviewedBy`
- `reviewedAt`
- `approvedBy`
- `approvedAt`

Expected rule:

- only `APPROVED` specs can be linked to materials or used in sampling plans

### A3. Create Spec Parameters

Action:

- add parameter rows to the approved spec

Fields to verify:

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
- `isActive`

Expected:

- rows save in correct `sequence`
- rows remain active and visible to worksheet generation

### A4. Create MOA

Action:

- create MOA records used by spec parameters

Fields to verify:

- `moaCode`
- `moaName`
- `moaType`
- `status`
- `compendialRef`
- `principle`
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
- `reviewRemarks`
- `submittedBy`
- `submittedAt`
- `reviewedBy`
- `reviewedAt`
- `approvedBy`
- `approvedAt`
- `isActive`

Expected:

- approved and valid MOA can be linked to spec parameters

### A5. Link Spec to Material

Action:

- link the approved spec to the material

Fields to verify:

- `materialId`
- `specId`
- `isActive`
- `linkedBy`
- `linkedAt`
- `delinkedBy`
- `delinkedAt`
- `notes`

Expected:

- active link created with `isActive = true`
- only one active spec link per material

## Section B: GRN to Sampling

### B1. GRN Receipt Creates Sampling Request

Action:

- receive a GRN for the linked material

Sampling request fields to verify:

- `grnId`
- `grnItemId`
- `materialId`
- `batchId`
- `palletId`
- `totalContainers`
- `requestStatus`
- `warehouseLabelApplied`
- `samplingLabelRequired`
- `vendorCoaReleaseAllowed`
- `photosensitiveMaterial`
- `hygroscopicMaterial`
- `hazardousMaterial`
- `selectiveMaterial`
- `remarks`
- `parentSamplingRequestId`
- `rootSamplingRequestId`
- `cycleNumber`
- `resampleReason`
- `isActive`

Expected:

- `requestStatus = REQUESTED`
- `parentSamplingRequestId = null`
- `rootSamplingRequestId = current request id`
- `cycleNumber = 1`

Inventory expected:

- `inventoryStatus = QUARANTINE`

### B2. Create Sampling Plan

Fields to fill and verify:

- `samplingMethod`
- `sampleType`
- `specId`
- `moaId`
- `totalContainers`
- `containersToSample`
- `individualSampleQuantity`
- `compositeSampleQuantity`
- `samplingLocation`
- `analystEmployeeCode`
- `samplingToolId`
- `photosensitiveHandlingRequired`
- `hygroscopicHandlingRequired`
- `coaBasedRelease`
- `rationale`
- `samplingLabelApplied`

Expected:

- `requestStatus = PLAN_DEFINED`

### B3. Container Selection Rules

Fields to verify per selected container:

- `grnContainerId`
- `containerNumber`
- `sampledQuantity`

Expected:

- no duplicate container selection
- sampled quantity cannot exceed container quantity
- container count follows plan

### B4. Start Sampling

Action:

- start sampling

Expected:

- `requestStatus = IN_PROGRESS`
- inventory moves to `SAMPLING`

### B5. Complete Sampling

Action:

- complete sampling

Expected:

- `requestStatus = SAMPLED`
- sample record created

Sample fields to verify:

- `sampleNumber`
- `samplingRequestId`
- `batchId`
- `materialId`
- `sampleType`
- `sampleStatus`
- `sampleQuantity`
- `uom`
- `collectedBy`
- `collectedAt`
- `samplingLocation`
- `remarks`

Sample-container link fields:

- `grnContainerId`
- `containerNumber`
- `sampledQuantity`

### B6. Handoff to QC

Action:

- handoff sample to QC

Expected:

- `requestStatus = HANDED_TO_QC`
- `QcDisposition.status = PENDING`
- inventory = `UNDER_TEST`

Verify sample handoff fields:

- `handoffToQcBy`
- `handoffToQcAt`

## Section C: QC Receipt and Review

### C1. QC Receipt

Fields to fill:

- `receivedBy`
- `receiptCondition`
- `sampleStorageLocation`
- optional retained sample fields

Example values:

- `receivedBy = qc.manager`
- `receiptCondition = Container intact and acceptable`
- `sampleStorageLocation = QC Room Shelf 1`

Expected:

- `requestStatus = RECEIVED`

Sample fields to verify:

- `receivedByQc`
- `receivedAtQc`
- `receiptCondition`
- `qcStorageLocation`

### C2. Retained Sample Capture

Fields:

- `retainedFlag`
- `retainedQuantity`
- `retainedUntil`

Example:

- `retainedFlag = true`
- `retainedQuantity = 0.050`
- `retainedUntil = future date`

Expected:

- values save on sample

Negative checks:

- `retainedFlag = true` with no quantity should fail
- `retainedFlag = true` with no until-date should fail
- retained quantity above total sample quantity should fail

### C3. Start QC Review

Field:

- `analystCode`

Example:

- `QC-AN-01`

Expected:

- `requestStatus = UNDER_REVIEW`
- QC disposition reflects review state

### C4. Worksheet Generation

Action:

- open worksheet after QC review starts

Expected:

- one row generated per active spec parameter

Worksheet row fields to verify:

- `sampleId`
- `specParameterId`
- `moaIdUsed`
- `moaCodeUsed`
- `analystCode`
- `parameterName`
- `testType`
- `specMoaCode`
- `specMoaId`
- `criteriaTypeApplied`
- `lowerLimitApplied`
- `upperLimitApplied`
- `unitApplied`
- `criteriaDisplay`
- `mandatory`
- `sequence`
- `status`

Expected initial values:

- `status = PENDING`
- limits and criteria reflect the spec at worksheet-generation time

### C5. Worksheet Result Entry

Action:

- enter passing results

Example values:

- `Assay -> resultValue = 99.5`
- `Identification -> resultText = Complies`
- `Loss on Drying -> resultValue = 0.3`

Fields to verify after save:

- `resultValue`
- `resultText`
- `remarks`
- `enteredAt`
- `status`
- `passFailFlag`

Expected:

- all mandatory rows show `PASS`

## Section D: Straight Pass Final Approval

### D1. Final QC Approve

Role:

- `QC_MANAGER` or `SUPER_ADMIN`

Fields:

- `approved = true`
- `remarks = Approved as per spec`
- `confirmedBy = logged-in username`
- `confirmationText = I APPROVE THIS FINAL QC DECISION`

Expected sampling request fields:

- `qcDecisionRemarks = Approved as per spec`
- `qcDecidedBy = logged-in actor`
- `qcDecidedAt != null`
- `qcDecisionConfirmedBy = logged-in actor`
- `qcDecisionConfirmationText = I APPROVE THIS FINAL QC DECISION`
- `qcDecisionConfirmationAt != null`

Inventory expected:

- `RELEASED`

## Section E: Investigation and QA Review

### E1. Create a Failing Result

Action:

- use a fresh request/cycle and enter failing assay

Example:

- `Assay -> resultValue = 96.0`

Expected:

- worksheet row `status = FAIL` or `OOS`
- direct final approval is blocked

### E2. Open Investigation

Fields:

- `investigationType`
- `reason`
- `initialAssessment`

Example:

- `investigationType = OOS`
- `reason = Assay below lower limit`
- `initialAssessment = Instrument and sample prep to be reviewed`

Expected investigation fields:

- `investigationNumber`
- `status = PHASE_I`
- `phase = PHASE_I`
- `reason`
- `initialAssessment`
- `openedBy`
- `openedAt`

Expected workflow effects:

- request = `UNDER_INVESTIGATION`
- disposition = `UNDER_INVESTIGATION`
- inventory = `BLOCKED`

### E3. Escalate to Phase II

Fields:

- `phaseOneSummary`
- `phaseTwoAssessment`

Example:

- `phaseOneSummary = No assignable lab error found in Phase I`
- `phaseTwoAssessment = Extend investigation to full batch and process review`

Expected:

- `phase = PHASE_II`
- `status = PHASE_II`
- `phaseOneSummary` saved
- `phaseTwoAssessment` saved
- `phaseTwoEscalatedBy` populated
- `phaseTwoEscalatedAt` populated

### E4. Resolve Investigation for QA Review

Fields:

- `outcome`
- `phaseSummary`
- `rootCause`
- `resolutionRemarks`
- `capaRequired`
- `capaReference`

Example:

- `outcome = RETEST_REQUIRED`
- `phaseSummary = Phase II confirms retained-sample retest is required`
- `rootCause = Sampling or preparation variation suspected`
- `resolutionRemarks = Move to retained-sample retest`
- `capaRequired = true`
- `capaReference = CAPA-001`

Expected:

- `status = QA_REVIEW_PENDING`
- `outcomeSubmittedBy` populated
- `outcomeSubmittedAt` populated
- `capaRequired = true`
- `capaReference = CAPA-001`

Negative check:

- `capaRequired = true` without `capaReference` should fail

### E5. QA Return to QC

Role:

- `QC_MANAGER` or `SUPER_ADMIN`

Fields:

- `approved = false`
- `qaReviewRemarks = Add stronger root cause justification`
- `confirmedBy = logged-in username`
- `confirmationText = I RETURN THIS INVESTIGATION TO QC`

Expected:

- `qaReviewDecision = RETURNED`
- `returnedToQcBy = actor`
- `returnedToQcAt != null`
- `returnedToQcRemarks = Add stronger root cause justification`
- status returns to active phase (`PHASE_I` or `PHASE_II`)

UI expected:

- returned-investigation banner visible
- returned remarks visible

### E6. QA Approve Investigation

Action:

- QC updates and resubmits investigation
- QA approves

Fields:

- `approved = true`
- `qaReviewRemarks = Approved after investigation review`
- `confirmedBy = logged-in QA reviewer`
- `confirmationText = I APPROVE THIS QA REVIEW`

Expected:

- `qaReviewedBy = actor`
- `qaReviewedAt != null`
- `qaReviewConfirmedBy = actor`
- `qaReviewConfirmationText = I APPROVE THIS QA REVIEW`
- `qaReviewConfirmationAt != null`
- `closedBy = actor`
- `closedAt != null`

### E7. QA Reviewer Independence

Action:

- submit investigation outcome as one user
- try to complete QA review using the same user

Expected:

- blocked

Expected message meaning:

- QA reviewer must be different from the QC outcome submitter

### E8. Closure Category

Verify these mappings:

| Outcome | Expected `closureCategory` |
|---|---|
| `RESUME_REVIEW` | `INVALIDATED_NO_ASSIGNABLE_CAUSE` |
| `RETEST_REQUIRED` | `RETEST_FROM_RETAINED_SAMPLE` |
| `RESAMPLE_REQUIRED` | `FRESH_RESAMPLE_REQUIRED` |
| `REJECTED` | `MATERIAL_REJECTION_CONFIRMED` |

## Section F: Retest and Resample

### F1. Retest Path

Prerequisite:

- approved QA outcome `RETEST_REQUIRED`

Action:

- execute retest

Fields:

- `analystCode`
- optional `remarks`

Example:

- `analystCode = QC-AN-02`
- `remarks = Retest from retained sample`

Expected:

- request returns to active review path
- disposition returns to active review path
- sample returns to active review path
- retained sample is auto-consumed

Sample field expected:

- `consumedFlag = true`

### F2. Retest Blocking Rules

Verify retest is blocked when:

- `retainedFlag = false`
- `retainedUntil < today`
- `consumedFlag = true`
- `destroyedFlag = true`

### F3. Retained Sample Destruction

Field:

- `remarks = Container damaged`

Expected:

- `destroyedFlag = true`
- retest becomes unavailable afterwards

### F4. Resample Path

Prerequisite:

- approved QA outcome `RESAMPLE_REQUIRED`

Action:

- create resample cycle

Field:

- `reason = Fresh sample required after confirmed issue`

Expected child cycle fields:

- `parentSamplingRequestId = original request id`
- `rootSamplingRequestId = original root id`
- `cycleNumber = 2`
- `resampleReason = Fresh sample required after confirmed issue`

Expected parent:

- `requestStatus = RESAMPLED`

### F5. Duplicate Resample Protection

Action:

- try to create a second child from the same parent

Expected:

- blocked with conflict

## Section G: Final Rejection

### G1. Final Reject Path

Action:

- complete the failing investigation path with approved QA outcome `REJECTED`
- if the flow reaches final QC reject, record final reject signoff

Fields:

- `approved = false`
- `remarks = Batch rejected`
- `confirmedBy = actor`
- `confirmationText = I REJECT THIS FINAL QC DECISION`

Expected:

- final request fields populated for reject signoff
- inventory = `REJECTED`

## Section H: Roles and UI

### H1. Role Checks

Login as `QC_ANALYST` and verify:

- cannot complete QA review
- cannot record final QC decision

Login as `QC_MANAGER` and verify:

- can complete QA review
- can record final QC decision

Login as `SUPER_ADMIN` and verify:

- can complete QA review
- can record final QC decision

### H2. Investigation Audit Timeline

Verify timeline shows, where applicable:

- `Opened by`
- `Escalated to Phase II by`
- `Submitted to QA by`
- `Returned to QC by`
- `QA approved/returned by`
- `QA sign-off captured from`
- `Closed by`

### H3. Cycle History UI

Verify cycle history shows:

- `Cycle #1`
- root indicator
- current indicator
- historical resampled parent still readable

### H4. Final QC Signoff Display

After final QC decision, verify UI message shows:

- `Final QC sign-off captured from <username> on <timestamp>`

## Section I: CoA-Based Release

### I1. CoA-Based Release Path

Create a plan with:

- `samplingMethod = COA_BASED_RELEASE`
- `coaBasedRelease = true`

Expected:

- decision possible from plan-defined state
- final QC signoff still required
- inventory updates correctly

## Expected Inventory Mapping

Verify these state mappings across the flow:

| Event | Expected Inventory Status |
|---|---|
| GRN receipt | `QUARANTINE` |
| Sampling start | `SAMPLING` |
| QC handoff / receipt / review | `UNDER_TEST` |
| Investigation open | `BLOCKED` |
| QA-approved `RESUME_REVIEW` | `UNDER_TEST` |
| QA-approved `RETEST_REQUIRED` | `UNDER_TEST` |
| QA-approved `RESAMPLE_REQUIRED` | `SAMPLING` |
| QA-approved `REJECTED` | `REJECTED` |
| Final QC approve | `RELEASED` |
| Final QC reject | `REJECTED` |

## Pass/Fail Tracking Sheet

Use one row per test case.

| ID | Scenario | Input Values | Expected Result | Actual Result | Pass/Fail | Notes |
|---|---|---|---|---|---|---|
| 1 | Spec create | `specCode=RM-PARACETAMOL-001` | `status=DRAFT` |  |  |  |
| 2 | Spec approve | `reviewRoute=QC_ONLY` | `status=APPROVED` |  |  |  |
| 3 | Worksheet pass | `Assay=99.5` | `row status=PASS` |  |  |  |
| 4 | Investigation return | `qaReviewRemarks=Add stronger root cause justification` | returned to active phase |  |  |  |
| 5 | Retest blocked expired | `retainedUntil=past date` | retest blocked |  |  |  |
| 6 | Resample child cycle | `reason=Fresh sample required` | `cycleNumber=2` |  |  |  |
| 7 | Final QC approve | approval phrase entered | inventory `RELEASED` |  |  |  |
| 8 | Final QC reject | rejection phrase entered | inventory `REJECTED` |  |  |  |

## Recommended Test Order

1. Spec + MOA setup
2. GRN -> sampling -> QC receipt -> worksheet -> straight approval
3. Failing result -> investigation -> QA return -> resubmit -> QA approve
4. Retest path
5. Resample path
6. Final reject path
7. Role and audit checks
8. CoA-based release path

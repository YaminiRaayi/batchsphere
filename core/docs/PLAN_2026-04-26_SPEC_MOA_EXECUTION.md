# Plan for 2026-04-26 — Spec & MOA Execution

## Purpose

This is the working execution note for `2026-04-26`.

It should be read together with:

- [QC_SAMPLING_COMPLETE_IMPLEMENTATION_PLAN.md](/Users/induraghav/gitrepo/batchsphere/core/docs/QC_SAMPLING_COMPLETE_IMPLEMENTATION_PLAN.md)
- [SPEC_MOA_DESIGN.md](/Users/induraghav/gitrepo/batchsphere/core/docs/SPEC_MOA_DESIGN.md)

Those two remain the master design documents.

This file records what we discussed and defines the exact next implementation slice to resume from.

---

## Summary of What We Discussed

### 1. Product direction

BatchSphere is still being implemented from the WMS/inventory backbone outward, but Sampling, QC, and Spec/MOA are tightly coupled and cannot be treated as separate later-only modules.

The architecture direction remains:

`WMS owns stock state and movement rules. Sampling and QC own events that request WMS state changes.`

### 2. Current implementation state

Already completed:

- audited inventory transition path
- explicit sampling workflow:
  - `PLAN_DEFINED`
  - `IN_PROGRESS`
  - `SAMPLED`
  - `HANDED_TO_QC`
  - `COMPLETED`
- first-class `Sample`
- sample-to-container linkage
- first-class `QcDisposition`
- live data backfill and compatibility fixes

Still missing for real QC execution:

- QC receipt and review depth
- parameter-level test worksheet
- OOS investigation
- resample / retest
- full Spec/MOA rule model

### 3. Key conclusion from today's review

The next build focus should be **Spec and MOA foundation first**, because QC worksheet generation and meaningful QC result entry depend on it.

Even though the complete implementation plan lists `Phase 2a` before `Phase 2b`, we agreed on one important clarification:

- QC receipt/review can exist as status and custody tracking
- but true worksheet generation must wait until `SpecParameter` exists

So the practical dependency order is:

1. enhance `Spec`
2. enhance `Moa`
3. add `SpecParameter`
4. add `MaterialSpecLink`
5. update sampling plan resolution to use active spec by material
6. then deepen QC receipt / worksheet / result entry

### 4. SpecParameter clarification

We discussed why `SpecParameter.lowerLimit`, `upperLimit`, and `textCriteria` are required:

- `lowerLimit` supports `NLT`
- `upperLimit` supports `NMT`
- both support `RANGE`
- `textCriteria` supports non-numeric criteria such as:
  - description
  - complies
  - pass/fail expectations

Without these, BatchSphere cannot automatically validate QC results against the specification.

### 5. Additional fields requested today

We agreed to update the design so it captures document-control and review workflow fields.

Added to design:

For `Spec`:
- `referenceDocumentNo`
- `referenceAttachment`
- `submittedBy`
- `submittedAt`
- `reviewedBy`
- `reviewedAt`
- `reviewRemarks`
- `reviewRoute`

For `Moa`:
- `validationReferenceNo`
- `validationAttachment`
- `sampleSolutionStabilityValue`
- `sampleSolutionStabilityUnit`
- `sampleSolutionStabilityCondition`
- `submittedBy`
- `submittedAt`
- `reviewedBy`
- `reviewedAt`
- `reviewRemarks`
- `reviewRoute`

### 6. Review flow decision

We clarified what happens after `Submit for Review`.

For now:

- `DRAFT -> UNDER_REVIEW`
- item goes to a review queue
- default review route should be `QC_ONLY`
- QC Manager reviews first

Later:

- support `QC_THEN_QA`
- support `QA_ONLY`

This lets QA be added later without redesigning the entity lifecycle.

---

## Objective for 2026-04-26

Start the **Spec/MOA foundation slice** and complete the first clean backend step.

The goal for the day is not full QC result entry.

The goal is to establish the data model and lifecycle required for future QC execution.

---

## Planned Scope for 2026-04-26

### In scope

1. Enhance `spec_master`
2. Enhance `moa_master`
3. Add required enums for Spec and MOA lifecycle/data classification
4. Update Spec and MoA entities, DTOs, services, and controllers
5. Add lifecycle endpoints:
   - submit
   - approve
   - reject
   - obsolete
6. Add review queue endpoints for Spec and MOA

### If time permits

7. Start `SpecParameter`
8. Start `MaterialSpecLink`

### Out of scope for 2026-04-26

- QC worksheet generation
- QC result entry
- OOS investigation
- resample / retest
- QA review implementation
- UI polishing beyond what is required for backend alignment

---

## First Coding Slice

### Step 1: Spec enhancement

Add to `Spec`:

- `specType`
- `status`
- `targetMarket`
- `effectiveDate`
- `expiryDate`
- `compendialRef`
- `compendialEdition`
- `referenceDocumentNo`
- `referenceAttachment`
- `submittedBy`
- `submittedAt`
- `reviewedBy`
- `reviewedAt`
- `reviewRemarks`
- `reviewRoute`
- `approvedBy`
- `approvedAt`
- `previousSpecId`

### Step 2: MoA enhancement

Add to `Moa`:

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
- `status`
- `submittedBy`
- `submittedAt`
- `reviewedBy`
- `reviewedAt`
- `reviewRemarks`
- `reviewRoute`
- `approvedBy`
- `approvedAt`

### Step 3: Lifecycle endpoints

Spec:

- `POST /api/specs/{id}/submit`
- `POST /api/specs/{id}/approve`
- `POST /api/specs/{id}/reject`
- `POST /api/specs/{id}/obsolete`
- `GET /api/specs/review-queue`

MOA:

- `POST /api/moas/{id}/submit`
- `POST /api/moas/{id}/approve`
- `POST /api/moas/{id}/reject`
- `POST /api/moas/{id}/obsolete`
- `GET /api/moas/review-queue`

---

## Expected Files To Touch

Likely backend files:

- `src/main/java/com/batchsphere/core/masterdata/spec/entity/Spec.java`
- `src/main/java/com/batchsphere/core/masterdata/moa/entity/Moa.java`
- `src/main/java/com/batchsphere/core/masterdata/spec/dto/*`
- `src/main/java/com/batchsphere/core/masterdata/moa/dto/*`
- `src/main/java/com/batchsphere/core/masterdata/spec/service/*`
- `src/main/java/com/batchsphere/core/masterdata/moa/service/*`
- `src/main/java/com/batchsphere/core/masterdata/spec/controller/*`
- `src/main/java/com/batchsphere/core/masterdata/moa/controller/*`
- `src/main/resources/db/migration/*`

Likely new enum files:

- `SpecType`
- `SpecStatus`
- `TargetMarket`
- `CompendialRef`
- `ReviewRoute`
- `MoaType`
- `MoaValidationStatus`
- `SampleSolutionStabilityUnit`

---

## Validation Checklist

At minimum, tomorrow’s slice should finish with:

- schema migration applies cleanly
- existing Spec/MOA CRUD still works with new fields
- submit/approve/reject/obsolete lifecycle works
- review queue returns only `UNDER_REVIEW` records
- compile passes

If possible:

- add integration tests for Spec/MOA lifecycle

---

## Resume Note

When resuming work, start here:

1. re-read this file
2. use the master references:
   - [QC_SAMPLING_COMPLETE_IMPLEMENTATION_PLAN.md](/Users/induraghav/gitrepo/batchsphere/core/docs/QC_SAMPLING_COMPLETE_IMPLEMENTATION_PLAN.md)
   - [SPEC_MOA_DESIGN.md](/Users/induraghav/gitrepo/batchsphere/core/docs/SPEC_MOA_DESIGN.md)
3. begin with the `Spec` and `Moa` schema/entity enhancement slice

This is the agreed next step.

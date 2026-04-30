# QC Sampling Progress Summary

Date: 2026-04-28

## Current Position

The QC sampling implementation is now beyond the original MVP foundation. The normal sampling-to-QC path is implemented, the main exception paths are implemented, retained-sample lifecycle handling is in place, resample lineage is working, and the investigation flow now includes an explicit QA review hold before final closure.

## Completed

### 1. Spec, MOA, and QC Data Foundation

- Revision-aware Spec and MOA lifecycle is implemented.
- `SpecParameter` and `MaterialSpecLink` are implemented and actively used by sampling/QC flows.
- QC sample, QC disposition, QC worksheet/test-result, retained-sample, investigation, and cycle-lineage schema support is in place through migrations up to `V50`.

### 2. Sampling Normal Workflow

- Sampling requests are auto-created from GRN receipt.
- Sampling plans can be created and updated.
- Sampling start and completion are implemented.
- Sample reconciliation against GRN container quantity is implemented.
- QC handoff, QC receipt, and QC review start are implemented.
- QC worksheet rows are generated and can be recorded during review.
- QC approval/rejection updates sample, disposition, and inventory state.

### 3. Retained Sample Lifecycle

- Retained sample receipt details are captured:
  - `retainedFlag`
  - `retainedQuantity`
  - `retainedUntil`
  - QC storage location
- Retained sample lifecycle flags are implemented:
  - `consumedFlag`
  - `destroyedFlag`
  - computed `retentionExpired`
- Retained sample is auto-consumed when retest is started.
- Retained sample can be explicitly destroyed through API.
- Retest is blocked when retained sample is:
  - missing
  - expired
  - consumed
  - destroyed

### 4. Investigation and Exception Workflow

- Investigations are persisted in `QcInvestigation`.
- Investigation open/list/phase-II escalation/resolve flows are implemented.
- Investigation structure now includes:
  - `investigationNumber`
  - `investigationType` (`OOS`, `OOT`, `GENERAL`)
  - `phase` (`PHASE_I`, `PHASE_II`)
  - `phaseTwoAssessment`
- Investigation status taxonomy is implemented:
  - active: `PHASE_I`, `PHASE_II`
  - pending QA: `QA_REVIEW_PENDING`
  - closed: `CLOSED_INVALID`, `CLOSED_CONFIRMED`, `CLOSED_RETEST`, `CLOSED_RESAMPLE`
- QC no longer closes investigations directly when a disposition is proposed.
- QC now submits investigation outcome for QA review.
- QA completion endpoint is implemented and finalizes or returns the investigation.
- QA review metadata is captured:
  - `qaReviewRemarks`
  - `qaReviewedBy`
  - `qaReviewedAt`

### 5. Retest Flow

- Retest from retained sample is implemented.
- Worksheet rows reset to `PENDING` during retest start.
- Analyst reassignment for retest is supported.
- Request, disposition, and sample move back to active review state after retest start.

### 6. Resample Flow and Lineage

- Resample is implemented as a true child sampling cycle.
- `SamplingRequest` lineage fields are implemented:
  - `parentSamplingRequestId`
  - `rootSamplingRequestId`
  - `cycleNumber`
  - `resampleReason`
- Cycle history API is implemented.
- Parent cycle no longer remains `RESAMPLE_REQUIRED` after child creation.
- Parent now transitions to `RESAMPLED`.
- Parent remarks indicate supersession by child cycle.
- Duplicate child-cycle creation from the same parent is blocked.

### 7. Inventory and Disposition Hardening

- Investigation open moves inventory to `BLOCKED`.
- Investigation QA-approved outcomes drive correct downstream inventory state:
  - `RESUME_REVIEW` -> `UNDER_TEST`
  - `RETEST_REQUIRED` -> `UNDER_TEST`
  - `RESAMPLE_REQUIRED` -> `SAMPLING`
  - `REJECTED` -> `REJECTED`
- QC decision is blocked while:
  - an investigation is still open
  - an investigation is pending QA review

### 8. API and Controller Coverage

- Controller-level integration coverage exists for:
  - investigations open/list/phase-II/resolve
  - retained-sample destroy
  - retest
  - resample
  - cycle history
  - QA review completion
- Service integration coverage exists for:
  - normal sampling/QC flow
  - retained sample handling
  - investigation escalation and closure
  - retest
  - resample child-cycle creation
  - inventory/disposition behavior

### 9. UI Wiring Already Completed

- Sampling UI is wired for:
  - investigation open
  - phase-II escalation
  - QC submit-for-QA-review
  - QA approve / return actions
  - retained sample destroy
  - retained sample state display
  - retest
  - resample
  - cycle history
- UI shows blocked retest reasons for retained-sample edge cases.
- UI shows historical `RESAMPLED` parent cycles and child-cycle navigation context.
- Shared frontend types and API client are updated for the implemented backend endpoints.

## Pending

### 1. Compliance and Audit Enrichment

- E-sign style confirmation or stronger approval-signature semantics for:
  - QA review approval
  - QA review return
  - final QC decision
- Richer audit metadata around investigation transitions if compliance requires it.
- Possible dedicated audit timeline presentation in UI.

### 2. Role Tightening

- Backend currently enforces QA completion role at service level for `QC_MANAGER` / `SUPER_ADMIN`.
- Further endpoint-level or route-level hardening can still be added if you want stricter separation between:
  - `QC_ANALYST`
  - `QC_MANAGER`
  - `SUPER_ADMIN`
- UI can still be tightened to hide more analyst-only vs manager-only actions rather than just disabling them where applicable.

### 3. Deeper Investigation Model

- Current investigation model is a practical structured version, not a full pharma-compliance workflow engine.
- Still pending if required:
  - more formal OOS/OOT phase summaries
  - richer closure taxonomy beyond current statuses
  - CAPA linkage
  - reviewer/checker separation beyond current QA gate

### 4. Additional UI Polish

- More explicit role-specific UX around QA review can still be added.
- Additional explanation banners for returned investigations could be improved.
- Historical cycle presentation can still be refined further if needed.

## Key Files Touched In This Progress Window

- `src/main/java/com/batchsphere/core/transactions/sampling/service/SamplingServiceImpl.java`
- `src/main/java/com/batchsphere/core/transactions/sampling/controller/SamplingController.java`
- `src/main/java/com/batchsphere/core/transactions/sampling/service/SamplingService.java`
- `src/main/java/com/batchsphere/core/transactions/sampling/entity/QcInvestigation.java`
- `src/main/java/com/batchsphere/core/transactions/sampling/entity/QcInvestigationStatus.java`
- `src/main/java/com/batchsphere/core/auth/service/AuthenticatedActorService.java`
- `src/test/java/com/batchsphere/core/transactions/sampling/service/SamplingServiceIntegrationTest.java`
- `src/test/java/com/batchsphere/core/transactions/sampling/controller/SamplingControllerIntegrationTest.java`
- `ui/src/features/sampling/SamplingPage.tsx`
- `ui/src/lib/api.ts`
- `ui/src/types/sampling.ts`

## Verification Completed

Validated locally:

- `./mvnw -q -Dtest=SamplingControllerIntegrationTest,SamplingServiceIntegrationTest test`
- `cd ui && npm run build`

## Summary

Accurate status as of 2026-04-28:

- Core sampling and QC workflow: done
- Exception workflow: done
- Retained-sample lifecycle: done
- Resample lineage and history: done
- Investigation phase structure: done
- QA review gate before final investigation closure: done
- Backend and UI wiring for implemented slices: done

Main remaining work is compliance enrichment and tighter role/audit behavior, not missing core workflow implementation.

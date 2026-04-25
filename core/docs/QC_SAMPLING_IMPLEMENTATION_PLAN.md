# QC Sampling Implementation Plan

Last updated: 2026-04-25

## Purpose

This document turns the current WMS, Sampling, and QC analysis into a practical implementation plan for BatchSphere.

The goal is to strengthen `Sampling` and `QC` in a way that fits the current codebase and does not force a WMS rewrite.

This is the working design and rollout plan for phased implementation.

## Why This Plan Is Needed Now

BatchSphere WMS is no longer only a warehouse hierarchy module.

It already controls:

- inventory creation on GRN receipt
- quarantine placement
- status-based storage segregation
- pallet-level movement
- FEFO enforcement for released stock
- material-to-location routing rules

That means `WMS`, `Sampling`, and `QC` are already operationally coupled.

The current system works as an MVP, but the quality workflow is still too compressed:

- one `SamplingRequest`
- one `SamplingPlan`
- one final QC approve/reject step

If more WMS behavior is built on top of that simplified workflow, later retrofitting will be expensive.

## Research Basis

This design direction is consistent with official pharma guidance:

- EU GMP Chapter 3 expects clear segregation of quarantined, released, rejected, returned, and recalled materials, and normally a separate sampling area for starting materials.
  Source: https://health.ec.europa.eu/system/files/2016-11/pharmig_gmp_chapter_3_0.pdf
- EU GMP Chapter 6 treats quality control as sampling, specifications, testing, documentation, and release procedures, not only final testing.
  Source: https://health.ec.europa.eu/system/files/2016-11/mallet_gmp_chapter_6_0.pdf
- WHO good practices for pharmaceutical quality control laboratories emphasize incoming sample control, sample receipt, handling, storage, documentation, and retained samples.
  Source: https://www.who.int/publications/m/item/who-good-practices-for-pharmaceutical-quality-control-laboratories

These sources support the same conclusion reached in the internal analysis:

- warehouse stock state must remain controlled until authorized release
- sample custody must be explicit
- QC receipt and review must be explicit
- release and rejection must drive WMS usability rules

## Current Code Reality

### Already working

- `GRN receive` creates inventory in `QUARANTINE`
- `GRN receive` creates `SamplingRequest`
- inventory is stored by `material + batch + pallet`
- WMS room rules already enforce quarantine vs rejected segregation
- FEFO is already enforced for `RELEASED` stock
- container-level sampling data already exists

Relevant implementation:

- [InventoryServiceImpl.java](/Users/induraghav/gitrepo/batchsphere/core/src/main/java/com/batchsphere/core/transactions/inventory/service/InventoryServiceImpl.java:277)
- [SamplingServiceImpl.java](/Users/induraghav/gitrepo/batchsphere/core/src/main/java/com/batchsphere/core/transactions/sampling/service/SamplingServiceImpl.java:66)
- [WarehouseLocationServiceImpl.java](/Users/induraghav/gitrepo/batchsphere/core/src/main/java/com/batchsphere/core/masterdata/warehouselocation/service/WarehouseLocationServiceImpl.java:605)

### Important current gaps

1. Inventory state changes driven by Sampling/QC bypass the full WMS status-change path.

Current internal status updates do not validate transitions and do not write inventory history entries:

- [InventoryServiceImpl.java](/Users/induraghav/gitrepo/batchsphere/core/src/main/java/com/batchsphere/core/transactions/inventory/service/InventoryServiceImpl.java:343)

2. The implemented workflow skips explicit physical sampling stages.

Current inventory transition rules expect:

- `QUARANTINE -> SAMPLING -> UNDER_TEST`

But sampling completion currently moves directly to:

- `UNDER_TEST`

Relevant implementation:

- [InventoryServiceImpl.java](/Users/induraghav/gitrepo/batchsphere/core/src/main/java/com/batchsphere/core/transactions/inventory/service/InventoryServiceImpl.java:70)
- [SamplingServiceImpl.java](/Users/induraghav/gitrepo/batchsphere/core/src/main/java/com/batchsphere/core/transactions/sampling/service/SamplingServiceImpl.java:263)

3. Sample custody is not yet a first-class model.

The system tracks selected containers and sampled quantities, but not a real `Sample` lifecycle with warehouse handoff and QC receipt.

4. Sampling status and QC disposition are still collapsed too much.

That makes it difficult to represent:

- handoff to QC
- QC receipt
- under investigation
- resample required
- retest

## Design Decision

The key architecture rule for the next implementation phase is:

`WMS owns physical stock state and movement rules.`

`Sampling and QC own operational events that request WMS state changes.`

This means:

- WMS remains the source of truth for whether stock is usable, movable, or issuable
- Sampling owns planning, collection, and transfer of samples
- QC owns receipt, test progress, review, and disposition
- WMS state changes should happen through controlled service methods with audit logging

## Ownership Model

### WMS owns

- inventory status
- pallet and location placement
- movement restrictions
- segregation rules
- FEFO for released stock
- inventory transaction history

### Sampling owns

- sampling request
- sampling plan
- container selection
- sample collection
- sample handoff to QC

### QC owns

- sample receipt
- testing progress
- review status
- investigation state
- final disposition
- resample and retest decisions

### QA may later own

- final batch release authorization
- deviation closure
- exception approval

## Recommended Target Model

Three linked but separate status domains must exist.

### 1. Inventory Status

Physical stock state in WMS:

- `QUARANTINE`
- `SAMPLING`
- `UNDER_TEST`
- `RELEASED`
- `REJECTED`
- `BLOCKED`

Later optional:

- `RETURNED`
- `RECALLED`
- `EXPIRED`

### 2. Sampling Workflow Status

Sampling execution and custody:

- `REQUESTED`
- `ASSIGNED`
- `PLAN_DEFINED`
- `IN_PROGRESS`
- `SAMPLED`
- `HANDED_TO_QC`
- `COMPLETED`
- `CANCELLED`
- `RESAMPLE_REQUIRED`

### 3. QC Disposition Status

QC review and decision:

- `PENDING`
- `RECEIVED`
- `UNDER_REVIEW`
- `UNDER_INVESTIGATION`
- `APPROVED`
- `REJECTED`
- `BLOCKED`
- `RESAMPLE_REQUIRED`
- `RETEST_REQUIRED`

## Recommended Event Model

These events should drive the next design.

### GRN received

System actions:

- create inventory
- set inventory `QUARANTINE`
- create sampling request
- create inbound inventory transaction

### Sampling plan approved

System actions:

- sampling request `PLAN_DEFINED`
- inventory remains `QUARANTINE`

### Sampling started physically

System actions:

- sampling request `IN_PROGRESS`
- inventory `SAMPLING`
- write inventory status change transaction

### Sample collected

System actions:

- sampling request `SAMPLED`
- update sampled containers
- create sample record
- inventory remains `SAMPLING` or moves to `UNDER_TEST` based on policy

Recommendation:

- keep inventory in `SAMPLING` until the sample is actually handed to QC

### Sample handed to QC

System actions:

- sampling request `HANDED_TO_QC`
- sample custody updated
- inventory `UNDER_TEST`
- write inventory status change transaction

### Sample received in QC

System actions:

- QC disposition `RECEIVED`
- sample receipt details recorded
- inventory remains `UNDER_TEST`

### QC review starts

System actions:

- QC disposition `UNDER_REVIEW`

### Investigation required

System actions:

- QC disposition `UNDER_INVESTIGATION`
- inventory `BLOCKED`
- write inventory status change transaction

### QC approved

System actions:

- QC disposition `APPROVED`
- sampling request `COMPLETED`
- inventory `RELEASED`
- write inventory status change transaction

### QC rejected

System actions:

- QC disposition `REJECTED`
- sampling request `COMPLETED`
- inventory `REJECTED`
- write inventory status change transaction

### Resample required

System actions:

- QC disposition `RESAMPLE_REQUIRED`
- sampling request `RESAMPLE_REQUIRED`
- inventory `BLOCKED`
- optionally create a follow-on sampling cycle linked to the same batch

## Entity Design

### Keep and strengthen

#### `Inventory`

Keep as the WMS stock truth.

Recommended additions later:

- `subStatus`
- `holdReason`
- `movementReason`
- `lastQualityEventType`
- `lastQualityEventId`

#### `SamplingRequest`

Keep as the per-GRN-item quality workflow entry point.

Recommended additions:

- `assignedTo`
- `assignedAt`
- `samplingStartedAt`
- `samplingCompletedAt`
- `handoffToQcAt`
- `handoffToQcBy`
- `resampleOfRequestId`

#### `SamplingPlan`

Keep as the execution plan.

Recommended additions:

- `approvedBy`
- `approvedAt`
- `samplingAreaType`
- `precautionNotes`

### Add new entities

#### `Sample`

This should be introduced in the next design phase.

Purpose:

- represent the withdrawn test sample independently from remaining warehouse stock

Suggested fields:

- `id`
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
- `handoffToQcBy`
- `handoffToQcAt`
- `receivedByQc`
- `receivedAtQc`
- `sampleStorageLocation`
- `retainedFlag`
- `consumedFlag`
- `destroyedFlag`
- `remarks`

#### `SampleContainerLink`

Purpose:

- map one sample to one or more sampled GRN containers

Suggested fields:

- `id`
- `sampleId`
- `grnContainerId`
- `sampledQuantity`

#### `QcDisposition`

Purpose:

- separate QC review and decision from sampling execution

Suggested fields:

- `id`
- `sampleId`
- `samplingRequestId`
- `status`
- `investigationRef`
- `decisionRemarks`
- `decisionBy`
- `decisionAt`
- `resampleRequired`
- `retestRequired`

#### `QualityEvent`

Purpose:

- capture cross-module audit events that may later feed deviation or CAPA linkage

Suggested fields:

- `id`
- `eventType`
- `moduleType`
- `referenceId`
- `inventoryId`
- `sampleId`
- `performedBy`
- `performedAt`
- `remarks`

## Service Design Rules

### Rule 1

Remove direct inventory status mutation from Sampling/QC paths.

Instead, Sampling/QC should call one WMS-owned method that:

- validates the transition
- updates inventory
- writes `InventoryTransaction`
- records the triggering reference type and reason

### Rule 2

Container updates and inventory updates must stay consistent in one transaction.

If container sampling is recorded, the related inventory and sample lifecycle updates should succeed or fail together.

### Rule 3

QC must not directly manipulate warehouse movement rules.

QC records disposition. WMS interprets the disposition and updates stock usability.

### Rule 4

No UI should infer warehouse usability from sampling request status alone.

The source of truth for usability remains `Inventory.status`.

## API Design Direction

### Phase 1 APIs

Keep existing endpoints where possible and extend behavior:

- `POST /sampling-requests/{id}/plans`
- `PUT /sampling-requests/{id}/plans/{planId}`
- `POST /sampling-requests/{id}/start`
- `POST /sampling-requests/{id}/complete`
- `POST /sampling-requests/{id}/handoff-to-qc`
- `POST /sampling-requests/{id}/qc-decision`

### Phase 2 APIs

Add first-class sample and QC actions:

- `GET /samples/{id}`
- `POST /sampling-requests/{id}/samples`
- `POST /samples/{id}/handoff-to-qc`
- `POST /samples/{id}/receive-in-qc`
- `POST /samples/{id}/start-review`
- `POST /samples/{id}/investigate`
- `POST /samples/{id}/decision`

### Phase 3 APIs

Add exception and repeat-cycle support:

- `POST /samples/{id}/request-resample`
- `POST /samples/{id}/request-retest`
- `GET /quality-events`

## UI Design Direction

### WMS should show

- inventory status
- linked sampling request status
- linked QC disposition
- whether movement is allowed
- whether issue is allowed
- sample pending / under review warning

### Sampling screen should show

- request header
- warehouse location
- selected containers
- planned sample quantity
- actual sample quantity
- sample record
- handoff to QC

### QC screen should show

- received sample
- sample condition on receipt
- review status
- investigation state
- final disposition

## Phase-Wise Rollout

### Phase 0: Stabilize current WMS coupling

Objective:

- make current WMS and Sampling integration safe before deeper redesign

Scope:

- standardize terminology on `SAMPLING` across docs and code
- make Sampling-driven inventory updates go through one audited WMS transition path
- ensure inventory history is written for Sampling/QC-driven status changes
- add explicit transition method for `QUARANTINE -> SAMPLING`
- keep current public API shape as much as possible

Deliverables:

- inventory transition refactor
- WMS transaction history correctness
- no direct status bypass from Sampling service

Why first:

- this reduces architectural drift while preserving current behavior

### Phase 1: Strengthen sampling workflow without full QC redesign

Objective:

- make sampling execution explicit while keeping the schema change moderate

Scope:

- extend `SamplingRequestStatus`
- add `startSampling` action
- add `handoffToQc` action
- record sampler, timestamps, and custody fields on sampling request
- align container updates with new statuses
- update WMS map and detail UI to show `SAMPLING` clearly

Deliverables:

- explicit `REQUESTED -> PLAN_DEFINED -> IN_PROGRESS -> SAMPLED -> HANDED_TO_QC`
- WMS inventory transitions aligned to physical events

Why second:

- this gives immediate operational value with lower schema risk

### Phase 2: Introduce first-class Sample and QC disposition

Objective:

- separate sample lifecycle from warehouse stock and from QC decision

Scope:

- add `sample` table
- add `sample_container_link` table
- add `qc_disposition` table
- add QC receipt and review events
- stop using `SamplingRequestStatus` as the main QC decision store
- connect QC disposition to WMS state changes through one inventory transition service

Deliverables:

- explicit sample custody
- explicit QC receipt
- explicit QC review and final disposition

Why third:

- this is the core model improvement and should be built only after Phase 0 and 1 stabilize the transition path

### Phase 3: Investigation, resample, and repeat-cycle support

Objective:

- support realistic pharma exception handling

Scope:

- add `UNDER_INVESTIGATION`
- add `RESAMPLE_REQUIRED`
- add `RETEST_REQUIRED`
- add follow-on sampling cycle linkage
- add quality event logging
- drive WMS `BLOCKED` state from investigation and resample cases

Deliverables:

- investigation-aware workflow
- repeatable sampling and QC cycles on the same batch

### Phase 4: Audit and compliance hardening

Objective:

- make the design scale to stronger GMP-style traceability

Scope:

- reason codes on critical transitions
- role-based action restrictions
- e-sign or approval hook points
- retained sample handling
- deviation / CAPA reference hooks

Deliverables:

- compliance-ready workflow foundation

## Recommended Implementation Sequence

Build in this order:

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4

Do not jump straight to Phase 2 before Phase 0 is completed.

If the status transition path remains split, later sample and QC design will keep producing WMS inconsistencies.

## Database Migration Strategy

### Phase 0 migrations

- adjust enum values only if needed
- add inventory transaction reference support if required for quality-triggered transitions

### Phase 1 migrations

- add operational timing and custody columns to `sampling_request`

### Phase 2 migrations

- create `sample`
- create `sample_container_link`
- create `qc_disposition`

### Phase 3 migrations

- create `quality_event`
- add optional back-reference columns as needed

Migration rule:

- prefer additive migrations first
- keep current data readable without destructive transformation
- migrate existing `APPROVED` and `REJECTED` sampling requests into `qc_disposition` only when the Phase 2 runtime path is ready

## Testing Strategy

### Phase 0

- inventory transition unit tests
- transaction history tests
- sampling-to-inventory integration tests

### Phase 1

- sampling lifecycle tests from `REQUESTED` to `HANDED_TO_QC`
- WMS map and status visibility checks
- container reconciliation tests

### Phase 2

- sample creation and custody tests
- QC receipt and decision tests
- inventory disposition sync tests

### Phase 3

- investigation to blocked-stock tests
- resample and retest cycle tests

## Immediate Next Build Recommendation

Start with `Phase 0`.

The first code change should be to consolidate inventory status transitions so that:

- Sampling cannot bypass WMS audit logic
- every status change writes inventory history
- `SAMPLING` becomes a real operational state instead of a mostly theoretical one

After Phase 0 is merged, move directly into `Phase 1`.

That will let BatchSphere continue WMS implementation without building on top of a weak Sampling/QC transition model.

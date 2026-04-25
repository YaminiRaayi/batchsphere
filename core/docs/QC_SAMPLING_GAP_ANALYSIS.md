# QC And Sampling Gap Analysis

Last updated: 2026-04-24

## Purpose

This note captures where the current `GRN -> Warehouse -> Sampling -> QC -> Release` flow stands today and where it is still too basic for a stronger pharma-oriented design.

The goal is not to redesign everything immediately.

The goal is to decide now, while the flow is still mid-stream, whether BatchSphere should:

- keep the current lightweight model and harden it later, or
- strengthen the design now before more features accumulate on top of weak workflow assumptions

This document is analysis only.

## Short Answer

Yes, `Warehouse Management`, `Sampling`, and `QC` should be strongly tied.

In a pharma-style operating model:

- `Warehouse` controls physical stock, segregation, location, and status visibility
- `Sampling` controls how representative material is withdrawn from warehouse stock
- `QC` controls testing, review, and final disposition

The current BatchSphere model already connects these areas, but only at a basic `status transition` level.

That is acceptable for an MVP, but it is not yet strong enough if the product is expected to support more realistic GMP-style operations.

## Current BatchSphere Flow

### What exists today

Current implemented operational flow:

1. `GRN` is created as draft
2. `GRN receive` generates in-house batches
3. `GRN receive` creates inventory in `QUARANTINE`
4. `GRN receive` creates `SamplingRequest`
5. `Sampling plan` is defined
6. `Sampling complete` moves inventory to `UNDER_TEST`
7. `QC decision` moves inventory to `RELEASED` or `REJECTED`

Related implementation points:

- GRN receive creates inventory and sampling requests in
  [GrnServiceImpl.java](/Users/induraghav/gitrepo/batchsphere/core/src/main/java/com/batchsphere/core/transactions/grn/service/GrnServiceImpl.java:213)
- Sampling completion moves inventory to `UNDER_TEST` in
  [SamplingServiceImpl.java](/Users/induraghav/gitrepo/batchsphere/core/src/main/java/com/batchsphere/core/transactions/sampling/service/SamplingServiceImpl.java:260)
- QC decision moves inventory to `RELEASED` or `REJECTED` in
  [SamplingServiceImpl.java](/Users/induraghav/gitrepo/batchsphere/core/src/main/java/com/batchsphere/core/transactions/sampling/service/SamplingServiceImpl.java:294)

### Current status models

Sampling workflow states:

- `REQUESTED`
- `PLAN_DEFINED`
- `UNDER_TEST`
- `APPROVED`
- `REJECTED`
- `CANCELLED`

Defined in:
[SamplingRequestStatus.java](/Users/induraghav/gitrepo/batchsphere/core/src/main/java/com/batchsphere/core/transactions/sampling/entity/SamplingRequestStatus.java:1)

Warehouse inventory states:

- `QUARANTINE`
- `SAMPLING`
- `UNDER_TEST`
- `RELEASED`
- `REJECTED`
- `BLOCKED`

Defined in:
[InventoryStatus.java](/Users/induraghav/gitrepo/batchsphere/core/src/main/java/com/batchsphere/core/transactions/inventory/entity/InventoryStatus.java:1)

## What Is Good In The Current Model

The current design already gets several important things right:

- incoming stock does not go directly to released inventory
- warehouse stock is created at GRN receive
- sampling requests are automatically created from GRN receive
- inventory is tied to batch and pallet
- QC decision is linked back to inventory disposition
- warehouse status and sampling status are already connected
- FEFO only becomes relevant after release, which is correct

This is a solid base.

## Main Gaps In The Current Design

### 1. Sampling is still too coarse

The current sampling workflow is mostly:

`REQUESTED -> PLAN_DEFINED -> UNDER_TEST -> APPROVED/REJECTED`

This is too compressed for stronger operational control.

What is missing:

- explicit `sampling assigned`
- explicit `sampling in progress`
- explicit `sample collected`
- explicit `sample transferred to QC`
- explicit `sample received in lab`
- explicit `investigation / OOS / OOT`
- explicit `re-sample`
- explicit `re-test`

Today, sampling is represented mainly as one request and one plan.

That works for a basic MVP, but it is too flat for real operational traceability.

### 2. QC is modeled mostly as one final decision

Current QC treatment is effectively:

- plan exists
- sampling completed
- QC approves or rejects

This is too basic.

Typical QC flow usually includes:

- sample receipt
- test assignment
- test execution
- result entry
- review
- OOS/OOT/investigation if needed
- final disposition

Right now, BatchSphere mostly collapses that into a single approval/rejection step.

### 3. Sample is not a strong first-class object

Warehouse stock and QC sample are related, but they are not the same thing.

A stronger model should treat a sample as its own controlled entity with:

- unique sample ID
- source GRN / batch / pallet / container
- sampled quantity
- sample type
- date/time of sampling
- sampled by
- transferred to QC by
- received in QC by
- retained / consumed / destroyed status

Current code does track some container sampling detail, but the sample itself is not yet a complete lifecycle object.

### 4. Warehouse-to-QC handoff is too implicit

At present, warehouse and QC are connected mainly by status update.

What is still missing is a stronger explicit handoff model:

- warehouse owns quarantined goods
- sample is withdrawn from warehouse
- sample is handed over to QC
- QC confirms receipt and condition
- warehouse stock remains controlled independently from sample material

This distinction becomes important in investigations and audit situations.

### 5. Deviation / investigation path is missing

A pharma-oriented flow cannot realistically jump only from:

`UNDER_TEST -> APPROVED/REJECTED`

There must usually be support for:

- OOS
- OOT
- under investigation
- hold pending QA review
- re-sample required
- re-test authorized

Without this, the QC model stays too idealized.

### 6. Container-level and batch-level logic are not fully separated

The system already has `GrnContainer` and container sample quantities, which is good.

But the business model is still centered mostly on batch and pallet.

For many pharma raw materials, sampling is operationally container-driven:

- which containers were sampled
- whether the sample came from all required containers
- whether containers were resealed
- whether a sample label was applied
- whether sampled containers remain available or partially consumed

This needs stronger visibility if the flow is to be made robust.

### 7. Some status semantics are still mixed

Today there are at least three concepts:

- warehouse stock status
- sampling workflow status
- QC decision outcome

These should be linked, but not collapsed into one thing.

Recommended distinction:

- `inventory status`
  physical stock condition in warehouse
- `sampling request status`
  operational progress of sample planning and collection
- `QC disposition`
  quality decision on the lot / batch

Keeping these concepts separate reduces confusion and allows better auditability.

## Why Warehouse Really Is Strongly Tied To Sampling And QC

The warehouse relationship is not optional in a pharma-style model.

Warehouse is strongly tied because:

- incoming stock starts in quarantine
- warehouse is the physical custodian before release
- warehouse controls sampled vs unsampled vs under-test material locations
- QC disposition determines whether warehouse can move, issue, or reject stock
- sample withdrawal is a warehouse event with QC consequences
- release changes stock usability in WMS
- reject/block changes storage segregation requirements
- recalls and investigations rely on warehouse traceability

So yes, WMS should be strongly linked to Sampling and QC.

But the linkage should be designed carefully rather than only by copying status names across modules.

## GMP / Pharma Expectations That Support This

### EU GMP Chapter 3

Key storage expectations include:

- separate handling of `quarantine`, `released`, `rejected`, `returned`, and `recalled` materials
- separate sampling area for starting materials in the normal case
- if sampling occurs in storage areas, contamination and cross-contamination must be prevented

Source:
European Commission, EU GMP Chapter 3
https://health.ec.europa.eu/document/download/1f450c21-6d3a-487a-a00c-87308c42f57d_en?filename=pharmig_gmp_chapter_3.pdf&prefLang=bg

### EU GMP Chapter 6

Key QC expectations include:

- QC is not only testing; it also includes sampling, specifications, documentation, and release procedures
- QC should be independent
- QC personnel should have access to production/storage areas for sampling and investigation as appropriate

Source:
European Commission, EU GMP Chapter 6
https://health.ec.europa.eu/system/files/2016-11/mallet_gmp_chapter_6_0.pdf

### WHO Storage / Distribution Guidance

Key expectations include:

- goods remain controlled after sampling until authorized release
- quarantined, rejected, returned, and recalled material require clear control and segregation

Source:
WHO TRS 1025 Annex 7
https://cdn.who.int/media/docs/default-source/medicines/who-technical-report-series-who-expert-committee-on-specifications-for-pharmaceutical-preparations/trs1025-annex7.pdf?sfvrsn=9b8f538c_2

### WHO Quality Control Laboratory Guidance

Key expectations include:

- sample receipt
- identification
- sample handling
- storage
- testing
- documentation
- result integrity and review

Source:
WHO good practices for pharmaceutical quality control laboratories
https://www.who.int/publications/m/item/who-good-practices-for-pharmaceutical-quality-control-laboratories

## Recommended Stronger Future Model

If the flow is strengthened now, a better operational model would look like this:

### Warehouse / Sampling / QC lifecycle

1. `GRN received`
2. `inventory created in quarantine`
3. `sampling request generated`
4. `sampling task assigned`
5. `containers selected for sampling`
6. `sample drawn`
7. `sample label applied`
8. `sample transferred to QC`
9. `sample received in QC`
10. `testing in progress`
11. `investigation / OOS / OOT if needed`
12. `QC final disposition`
13. `inventory auto-updated to RELEASED / REJECTED / BLOCKED`
14. `warehouse movement/issue rules updated accordingly`

## Recommended State Model

### Inventory Status

Keep physical stock state focused on WMS:

- `QUARANTINE`
- `SAMPLING`
- `UNDER_TEST`
- `RELEASED`
- `REJECTED`
- `BLOCKED`
- optionally later: `RETURNED`, `RECALLED`, `EXPIRED`

### Sampling Request Status

Suggested stronger workflow:

- `REQUESTED`
- `ASSIGNED`
- `PLAN_DEFINED`
- `IN_PROGRESS`
- `SAMPLED`
- `HANDED_TO_QC`
- `UNDER_TEST`
- `RESAMPLE_REQUIRED`
- `APPROVED`
- `REJECTED`
- `CANCELLED`

### QC Disposition

Suggested separate decision model:

- `PENDING`
- `UNDER_REVIEW`
- `APPROVED`
- `REJECTED`
- `BLOCKED`
- `INVESTIGATION`
- `RESAMPLE_REQUIRED`

## Most Important Design Improvements

If changes are made while the design is still in motion, these are the highest-value improvements:

1. `Make sample a first-class object`
   Track sample identity, quantity, custody, and lifecycle independently from warehouse stock.

2. `Separate sampling status from QC disposition`
   Do not force one status field to represent both.

3. `Add investigation states`
   OOS/OOT/investigation should sit between testing and final disposition.

4. `Add warehouse-to-QC custody handoff`
   Explicitly track when the sample leaves warehouse control and enters QC control.

5. `Strengthen container-level visibility`
   Especially for incoming raw materials where sampling is done by container selection logic.

6. `Automate inventory status from QC workflow`
   The system should drive warehouse stock states more consistently from actual QC events.

7. `Improve audit trail`
   Every critical event should show who did it, when, why, and against which batch/container/sample.

## Recommended Decision Now

Because the product is already in the middle of WMS work, this is a good time to strengthen the flow.

Recommendation:

- do not throw away the current model
- keep the current WMS inventory status structure
- strengthen `Sampling` and `QC` now before more downstream features depend on the current simplified lifecycle

That will be easier than trying to retrofit:

- sample custody
- investigation states
- QC disposition logic
- warehouse-QC handoff

after many more screens and APIs are already built.

## Practical Next Analysis Step

Before implementation, the next useful document would be:

- `QC_SAMPLING_TARGET_FLOW.md`

That document should define:

- target entities
- target states
- state transition rules
- which module owns each transition
- what should be automatic vs manual
- what warehouse should show at each stage

This is the right next design step before changing code deeply.

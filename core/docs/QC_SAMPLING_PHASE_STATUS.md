# QC Sampling Phase Status

Last updated: 2026-04-25

## Purpose

This note records the current implementation status of the Sampling and QC plan so the project can continue in a controlled way without overbuilding ahead of the WMS roadmap.

## Current Position

BatchSphere is still primarily in a `WMS / inventory-led` implementation stage.

Sampling and QC have been strengthened only where required to keep inventory status, warehouse control, and traceability correct.

This means:

- WMS remains the operational backbone
- Sampling and QC are being expanded only where they directly affect stock control
- a full independent QC module is not built yet

## What Is Implemented

### Phase 0

- one audited inventory transition path for Sampling/QC-driven status changes
- WMS transaction history written for quality-driven stock state changes
- inventory transition ownership kept inside WMS/inventory service

### Phase 1

- explicit sampling workflow split:
  - `PLAN_DEFINED`
  - `IN_PROGRESS`
  - `SAMPLED`
  - `HANDED_TO_QC`
  - `COMPLETED`
- explicit API actions:
  - start sampling
  - complete sampling
  - handoff to QC

### Phase 2 implemented slice

- first-class `Sample`
- `Sample -> container` linkage
- separate `QcDisposition`
- historical backfill of old approved sampling rows
- old sampling statuses normalized to `COMPLETED`

## What Is Deferred

Not yet implemented:

- QC receipt step
- QC review step
- investigation / OOS / OOT
- resample / retest
- retained sample handling
- advanced reduced-sampling policy engine

## Live Verification Status

Live API verification has confirmed:

- historical approved records are now returned as `COMPLETED`
- historical records now expose:
  - `sample`
  - `qcDisposition`
- the runtime backfill path is working on current live data

Still recommended:

- create one fresh record and validate the full new runtime flow end to end

## Next Planned Step

The next planned coding slice is still inside Phase 2:

- add explicit QC receipt
- add explicit QC review

This should happen before any investigation or resample implementation.

## Rule For The Next Iteration

Do not expand into full QC complexity just because the model now exists.

Continue only in this order:

1. validate current flow
2. document current state
3. add QC receipt/review
4. only then move to investigation/resample

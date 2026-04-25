# QC And Sampling Target Flow

Last updated: 2026-04-24

## Purpose

This document defines the target operating model for `Warehouse`, `Sampling`, and `QC` so BatchSphere can strengthen the current design before too many downstream features depend on the simplified MVP workflow.

This is a target design note, not an implementation specification.

## Design Goal

Move from the current basic flow:

`GRN -> QUARANTINE -> Sampling Request -> UNDER_TEST -> APPROVED/REJECTED`

to a stronger operational model where:

- warehouse controls physical stock
- sampling controls withdrawal and sample custody
- QC controls testing, review, and disposition
- inventory state changes are driven consistently by quality events

## Core Principle

Three things must stay linked, but separate:

1. `Warehouse stock status`
   Physical state of the received material in WMS

2. `Sampling workflow status`
   Operational progress of planning and collecting samples

3. `QC disposition status`
   Quality decision on the lot / batch after review

If these are collapsed into one concept, the system becomes harder to audit and harder to extend.

## Target High-Level Flow

### Incoming Material Lifecycle

1. `GRN received`
2. `batch and inventory created`
3. `inventory placed in QUARANTINE`
4. `sampling request auto-generated`
5. `sampling assigned / planned`
6. `containers selected for sampling`
7. `sample collected`
8. `sample transferred to QC`
9. `sample received in QC`
10. `QC testing in progress`
11. `QC review / investigation / OOS if required`
12. `QC final disposition recorded`
13. `warehouse inventory updated automatically`
14. `warehouse movement / issue permissions updated`

## Ownership Model

### Warehouse owns

- storage location
- quarantine control
- segregation
- pallet / rack / room placement
- movement restrictions
- released vs rejected vs blocked usability
- FEFO after release

### Sampling owns

- sampling request
- sample plan
- selected containers
- sampled quantities
- sample labels
- sample collection event
- handoff to QC

### QC owns

- sample receipt
- testing progress
- result recording
- deviation / investigation handling
- approval / rejection / block decision
- retest / resample decision

### QA or final quality authority may later own

- final batch release authorization
- investigation closure
- exception handling

This can be introduced later if required.

## Target Entity Model

### 1. Inventory

Represents the physical stock in warehouse.

Should remain linked to:

- material
- batch
- pallet
- quantity
- storage condition
- inventory status

### 2. Sampling Request

Represents the need to sample a received lot.

Should include:

- linked GRN / GRN item
- linked batch
- linked pallet / warehouse location
- reason for sampling
- total containers
- requested by
- current sampling workflow status

### 3. Sampling Plan

Represents how the sample should be taken.

Should include:

- sampling method
- containers to sample
- sample quantity rules
- analyst / sampler assignment
- sampling tools
- sampling location
- precautions for photosensitive / hygroscopic / hazardous materials

### 4. Sample

This should become a stronger first-class entity.

Suggested fields:

- sample ID / sample number
- sampling request ID
- batch ID
- container references
- total sampled quantity
- sample type
- collected by
- collected at
- handed to QC by
- handed to QC at
- received by QC
- received at
- sample storage location
- sample status
- retained / consumed / destroyed flag

### 5. QC Review / Disposition

Represents the quality decision layer.

Suggested fields:

- sample ID or sampling request ID
- review status
- decision status
- approved / rejected / blocked flag
- OOS / OOT / investigation reference
- decided by
- decided at
- remarks
- linked COA / result summary / test record

## Target Status Models

### Inventory Status

Recommended warehouse states:

- `QUARANTINE`
- `SAMPLING`
- `UNDER_TEST`
- `RELEASED`
- `REJECTED`
- `BLOCKED`
- later optional:
  - `RETURNED`
  - `RECALLED`
  - `EXPIRED`

### Sampling Workflow Status

Recommended sampling workflow states:

- `REQUESTED`
- `ASSIGNED`
- `PLAN_DEFINED`
- `IN_PROGRESS`
- `SAMPLED`
- `HANDED_TO_QC`
- `RECEIVED_IN_QC`
- `UNDER_TEST`
- `RESAMPLE_REQUIRED`
- `COMPLETED`
- `CANCELLED`

### QC Disposition Status

Recommended QC decision states:

- `PENDING`
- `UNDER_REVIEW`
- `UNDER_INVESTIGATION`
- `APPROVED`
- `REJECTED`
- `BLOCKED`
- `RESAMPLE_REQUIRED`

## Recommended Status Mapping Rules

These rules define how the modules should interact.

### GRN Receive

Event:
- GRN is received

System actions:
- create batch
- create inventory
- create sampling request
- set inventory status to `QUARANTINE`

### Sampling Plan Defined

Event:
- sampling plan created and approved for execution

System actions:
- sampling request status -> `PLAN_DEFINED`
- inventory remains `QUARANTINE`

### Sampling In Progress

Event:
- warehouse begins sample withdrawal

System actions:
- sampling request status -> `IN_PROGRESS`
- inventory status may remain `QUARANTINE` or move to `SAMPLING`

Recommendation:
- move inventory to `SAMPLING` only when sampling starts physically

### Sampling Completed

Event:
- sample withdrawn and recorded

System actions:
- sampling request status -> `HANDED_TO_QC` or `RECEIVED_IN_QC`
- inventory status -> `UNDER_TEST`

### QC Under Review

Event:
- QC receives sample and testing/review begins

System actions:
- QC disposition -> `UNDER_REVIEW`
- inventory remains `UNDER_TEST`

### QC Investigation / OOS / OOT

Event:
- abnormal results or investigation required

System actions:
- QC disposition -> `UNDER_INVESTIGATION`
- inventory status -> `BLOCKED`

### QC Approved

Event:
- QC accepts batch

System actions:
- QC disposition -> `APPROVED`
- sampling workflow -> `COMPLETED`
- inventory status -> `RELEASED`

### QC Rejected

Event:
- QC rejects batch

System actions:
- QC disposition -> `REJECTED`
- sampling workflow -> `COMPLETED`
- inventory status -> `REJECTED`

### Resample Required

Event:
- QC or QA requests additional sampling

System actions:
- QC disposition -> `RESAMPLE_REQUIRED`
- sampling workflow -> `RESAMPLE_REQUIRED`
- inventory status -> `BLOCKED` or remain `UNDER_TEST` based on policy

Recommendation:
- use `BLOCKED` for safety and clarity

## Warehouse UI Expectations

Warehouse should show quality-relevant physical state clearly.

### In map / pallet detail

Show:

- stock status
- linked batch
- expiry / FEFO rank
- linked sampling request status
- linked QC disposition
- whether movement is allowed
- whether issue is allowed

### Recommended WMS behavior by status

- `QUARANTINE`
  - can store and move only within quarantine rules
  - cannot issue

- `SAMPLING`
  - can be sampled
  - restricted movement only
  - cannot issue

- `UNDER_TEST`
  - cannot issue
  - movement only by policy

- `BLOCKED`
  - no issue
  - highly restricted movement

- `RELEASED`
  - normal putaway / issue / FEFO eligible

- `REJECTED`
  - rejected area only
  - no issue

## Sampling UI Expectations

Sampling should show the workflow, not only the request list.

Should include:

- request header
- warehouse location
- batch and pallet
- container count
- selected containers
- planned sample quantity
- actual sample quantity
- sample labels
- custody handoff to QC
- resample / investigation visibility

## QC UI Expectations

QC should not only record final decision.

Should show:

- received sample
- linked batch / material / sampling request
- test status
- review status
- investigation / OOS / OOT
- final disposition
- remarks and evidence

## What Should Be Automatic Vs Manual

### Automatic

- GRN receive creates inventory
- GRN receive creates sampling request
- GRN receive sets inventory to `QUARANTINE`
- QC approval updates inventory to `RELEASED`
- QC rejection updates inventory to `REJECTED`
- investigation can set inventory to `BLOCKED`

### Manual

- define sampling plan
- choose containers to sample
- capture actual sampled quantity
- confirm handoff to QC
- record QC review / remarks / decision
- trigger resample or investigation when needed

## Design Recommendations Before More Coding

Before implementing deeper changes, decide these points clearly:

1. Should `Sample` become its own entity now?
2. Should `QC disposition` be separate from `Sampling status`?
3. Should `BLOCKED` be used for investigation states?
4. Should warehouse move to `SAMPLING` only when physical sampling begins?
5. Should QC sample receipt be an explicit event?
6. Should retained samples be modeled now or later?

## Recommended Next Design Step

Before code changes, prepare one more detailed note:

- `QC_SAMPLING_IMPLEMENTATION_PLAN.md`

That plan should define:

- entity/table changes
- API changes
- transition ownership
- screen-level changes
- migration strategy from current workflow

## Suggested Direction

Because the system is already in the middle of WMS work, the best path is:

- keep the current WMS foundation
- strengthen Sampling and QC now
- avoid layering more warehouse behavior on top of a simplified quality workflow

That will be easier than retrofitting later.

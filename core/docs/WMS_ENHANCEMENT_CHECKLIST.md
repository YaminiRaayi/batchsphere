# WMS Enhancement Checklist

Date prepared: 2026-04-24

This checklist captures the next level of Warehouse Management System capabilities that should be added if BatchSphere WMS is expected to support stronger pharma operations in the future.

It is written as a practical implementation checklist, not just a concept note.

## Objective

Move the current WMS from:

`warehouse hierarchy + visual map + material location rules`

toward:

`pharma-aware warehouse control + traceability + status segregation + future audit readiness`

## Current Baseline

Already available in the codebase:

- `Business Unit -> Warehouse -> Room -> Rack -> Shelf -> Pallet`
- WMS location creation flow
- room-level zone rules
- material default / quarantine location mapping
- warehouse map visualization
- intra-warehouse movement action
- occupancy / room summary

Related reference:
- [WMS_MATERIAL_FLOW_STATUS.md](/Users/induraghav/gitrepo/batchsphere/core/docs/WMS_MATERIAL_FLOW_STATUS.md:1)

## Priority Plan

### Phase 1: Core Operational Controls

These should be implemented first because they directly improve daily warehouse control.

- `Stock status segregation`
  Add explicit warehouse inventory states:
  - `QUARANTINE`
  - `UNDER_SAMPLING`
  - `UNDER_TEST`
  - `RELEASED`
  - `REJECTED`
  - `BLOCKED`
  - `RETURNED`
  - `RECALLED`
  - `EXPIRED`

- `Status-based movement restrictions`
  Prevent invalid warehouse actions such as:
  - moving released stock into quarantine-only zones without reason
  - issuing quarantined or rejected stock
  - placing expired stock into normal usable areas

- `FEFO allocation`
  Add `first-expiry-first-out` selection during putaway / issue / transfer.

- `Movement history`
  Every move should create an immutable record with:
  - material
  - batch / lot
  - source location
  - destination location
  - quantity
  - movement reason
  - user
  - timestamp
  - related transaction reference

- `Putaway suggestion`
  Auto-suggest the preferred location based on:
  - material location rule
  - storage condition
  - allowed material type
  - available capacity
  - quarantine / released status

### Phase 2: Pharma Warehouse Controls

- `Sampling workflow integration`
  Add direct warehouse flow:
  - received
  - quarantined
  - sample requested
  - sample picked
  - under test
  - released / rejected

- `Environmental monitoring`
  Add room-level and warehouse-level:
  - temperature logs
  - humidity logs
  - excursion alerts
  - logger/device assignment
  - review status

- `Room qualification / temperature mapping records`
  Track:
  - room qualification date
  - mapping study date
  - next review due
  - linked report/document
  - approved by

- `Capacity validation`
  Enforce:
  - pallet capacity
  - shelf capacity
  - rack capacity
  - room capacity
  - weight / volume / lot count where needed

- `Material compatibility rules`
  Add support for:
  - dedicated storage
  - incompatible category restrictions
  - restricted storage zones
  - hazardous / reject / quarantine-only control

### Phase 3: Audit, Compliance, and Scale

- `Cycle count / physical verification`
  Add:
  - scheduled counts
  - blind counts
  - variance review
  - approved stock adjustment

- `Warehouse deviation / CAPA linkage`
  Link warehouse events such as:
  - temperature excursion
  - wrong-location storage
  - blocked/recalled stock handling
  - count mismatch
  - damaged pallet/container

- `Recall locator`
  Search instantly by:
  - material
  - batch
  - GRN
  - status
  - warehouse / room / rack / pallet

- `Role-based warehouse controls`
  Separate permissions for:
  - create location
  - move stock
  - release stock
  - block / reject stock
  - count adjustment
  - restricted zone access override

- `Critical action approval / e-sign support`
  For future maturity:
  - stock status override
  - movement from quarantine to released area
  - blocked stock release
  - stock adjustment approval

## Recommended Data Additions

### Inventory / Location Control

- `inventory_status`
- `inventory_sub_status`
- `hold_reason`
- `movement_reason`
- `location_type`
- `location_restriction_type`
- `dedicated_material_id`
- `max_pallet_capacity`
- `max_weight_capacity`
- `current_weight_load`

### Monitoring / Qualification

- `temperature_min_limit`
- `temperature_max_limit`
- `humidity_min_limit`
- `humidity_max_limit`
- `mapping_last_done_on`
- `mapping_due_on`
- `qualification_status`
- `qualification_last_done_on`

### Audit Trail

- `warehouse_movement`
- `warehouse_cycle_count`
- `warehouse_excursion`
- `warehouse_deviation_link`

## UI Enhancements Recommended

- `Status-first map view`
  Show visual location state by:
  - empty
  - quarantined
  - under test
  - released
  - rejected
  - blocked

- `FEFO badge in pallet details`
  Show:
  - expiry date
  - FEFO rank
  - near-expiry warning

- `Warehouse exception dashboard`
  Add quick cards for:
  - expired stock
  - near-expiry stock
  - blocked stock
  - quarantine pending release
  - temperature excursion rooms
  - locations over capacity

- `Path selector`
  Already partly improved. Continue with:
  - warehouse
  - room
  - rack
  - shelf
  - pallet
  without long-scroll navigation

- `Location history drawer`
  Clicking a pallet/location should show:
  - current stock
  - prior movements
  - current status
  - linked GRN / batch / QC state

## Implementation Order Recommended

### Sprint A

- stock status segregation
- movement history
- putaway suggestion
- FEFO logic

### Sprint B

- sampling workflow integration
- capacity checks
- restricted zone rules
- location history view

### Sprint C

- environmental monitoring
- excursion handling
- cycle count
- recall locator

### Sprint D

- approval matrix
- deviation/CAPA linkage
- e-sign / critical control workflow

## Suggested Immediate Next Build

If only one WMS enhancement should be implemented next, the best choice is:

`Warehouse movement history + status-based segregation`

Reason:

- highest operational value
- supports audits later
- improves traceability now
- becomes the foundation for FEFO, recall, and sampling-linked storage

## Practical Checklist

Use this as the working checklist.

- [ ] Add inventory status model for warehouse-controlled stock
- [ ] Add status-based location restrictions
- [ ] Add warehouse movement history table and UI
- [ ] Add FEFO prioritization logic
- [ ] Add putaway recommendation engine
- [ ] Add sampling-linked warehouse status transitions
- [ ] Add capacity validation per location level
- [ ] Add environmental monitoring entities and UI
- [ ] Add cycle count workflow
- [ ] Add recall locator and search filters
- [ ] Add deviation/CAPA linkage
- [ ] Add approval / e-sign support for critical warehouse actions

## External Guidance Used

These are the main regulatory / industry directions this checklist is aligned with:

- WHO good storage / distribution expectations
- EU GMP Chapter 3 storage expectations
- FDA cGMP warehouse and component status control expectations
- GDP / temperature mapping best-practice direction

Reference links:

- https://iris.who.int/handle/10665/330887
- https://www.who.int/docs/default-source/medicines/norms-and-standards/guidelines/distribution/trs957-annex5-who-good-distribution-practices-for-pharmaceutical-products.pdf
- https://health.ec.europa.eu/document/download/1f450c21-6d3a-487a-a00c-87308c42f57d_en?filename=pharmig_gmp_chapter_3.pdf&prefLang=bg
- https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/inspection-guides/dosage-form-drug-manufacturers-cgmps-1093
- https://picscheme.org/docview/6235

# BatchSphere Project Overview

## What BatchSphere Is

BatchSphere is a pharma-oriented ERP and operations platform for managing the lifecycle of incoming materials from master data setup and procurement through receipt, warehouse control, sampling, QC disposition, and operational release.

The current codebase is centered on:

- material and vendor master data
- warehouse hierarchy and storage controls
- GRN and inbound receipt processing
- containerized inventory in quarantine/release states
- sampling workflow
- early QC disposition modeling
- specification and method-of-analysis master data foundation

---

## Why This Project Exists

Pharmaceutical operations are tightly controlled, but many teams still work across disconnected systems, spreadsheets, paper records, email trails, and partial ERP setups.

That creates recurring problems:

- warehouse stock is visible, but not quality-usable
- QC and warehouse teams do not share the same stock truth
- sampling is tracked manually and loses container-level traceability
- vendor CoA review, specifications, and methods are disconnected from execution
- release decisions are hard to audit across GRN, inventory, sample, and QC records
- deviations, holds, rejections, and investigations are hard to follow end to end

BatchSphere exists to close that gap.

The goal is to give pharma operations one connected system where:

- master data defines the rules
- warehouse controls the physical stock
- sampling controls the physical collection event
- QC controls the quality decision
- every transition is traceable back to the material, batch, containers, and governing specification

In short:

`BatchSphere is being built to connect physical inventory control with quality-controlled pharma release workflows.`

---

## Business Problem It Solves

In a pharmaceutical environment, incoming raw materials cannot be treated as usable stock immediately after receipt.

They must move through a controlled process:

1. material is received physically
2. inventory is placed in quarantine
3. sampling is planned and performed
4. QC reviews sample data and test requirements
5. stock is either released, rejected, or held

BatchSphere is being designed to manage that process with traceability, warehouse control, and audit-friendly status transitions.

---

## What The Product Covers

Based on the current UX direction in `ux-mockups/`, BatchSphere is not only a warehouse or QC tool. It is intended to cover a broader operational platform for pharma teams.

The current product scope includes:

- command center / dashboard
- GRN and inbound receipt
- warehouse management
- inventory visibility and stock status control
- QC sampling
- LIMS-oriented lab workflow entry points
- QMS / CAPA tracking
- specifications and methods of analysis
- material master
- vendor management
- document management
- HRMS
- centralized master data

The immediate implementation focus is still on the inbound quality-controlled material flow, but the product vision is clearly wider than that.

---

## Core Product Areas

### 1. WMS / Inventory

This is the physical stock control layer.

It manages:

- warehouse, room, rack, shelf, and pallet structure
- storage-condition compatibility
- quarantine, sampling, under-test, released, rejected, and blocked stock states
- inventory transactions and stock traceability
- physical placement and segregation rules

### 2. GRN / Inbound

This is the receipt entry point for incoming material.

It manages:

- GRN header and line items
- accepted quantity receipt
- batch association
- container generation
- in-house material labels
- triggering inventory creation
- triggering sampling request creation

### 3. Sampling

This is the operational bridge between warehouse stock and QC.

It manages:

- sampling request creation from GRN
- sampling plan definition
- container selection
- sampled quantity traceability
- start / complete / handoff workflow
- sample record creation

### 4. QC

This is the quality decision layer.

It currently includes:

- QC disposition as a first-class entity
- approval / rejection recording
- warehouse status impact through audited inventory transitions

It is still being expanded toward:

- QC receipt
- QC review states
- parameter-level result entry
- OOS investigation
- resample / retest workflows

### 5. Specifications and Methods of Analysis

This is the rule layer that tells QC what to test and how.

Target design includes:

- Specification: what tests are required and what criteria are acceptable
- Method of Analysis (MOA): how each test is executed
- SpecParameter: the link between the required test and the analytical method
- market-aware compendial and regulatory support

This area is partially started in code and is the next major foundation for deeper QC workflows.

---

## Product Scope From The UX Mockups

The mockups indicate how the product is expected to come together operationally:

### Command Center

The dashboard acts as the operational summary layer across modules, surfacing warehouse, quality, procurement, and compliance signals in one place.

### Inbound and Warehouse Execution

`02-grn`, `02b-grn-create`, `04-wms`, and `09-inventory` show that BatchSphere is expected to manage:

- receipt creation
- inbound acceptance
- physical storage mapping
- quarantine and released stock views
- stock search and location-level control

### Quality Execution

`06-sampling`, `08-lims`, `03-qms`, and `11-spec-moa` show that the quality domain is expected to include:

- sampling queue and sample execution
- lab testing workflow entry
- specification-driven testing
- method governance
- quality events, CAPA, and investigation support

### Master and Support Functions

`08-materials`, `10-masterdata`, `07-vms`, `05-documents`, and `06-hrms` show that the platform also intends to centralize:

- regulated material setup
- common master data
- supplier / vendor records
- controlled documents
- people and role context

This is useful context because it clarifies that WMS, Sampling, QC, and Spec/MoA are not isolated modules. They are meant to operate inside a larger ERP-style operational system.

---

## Key Architecture Principle

BatchSphere is now being designed around this rule:

`WMS owns stock state and movement rules. Sampling and QC own events that request WMS state changes.`

This matters because sampling and QC are tightly coupled to warehouse usability, but they should not bypass WMS controls.

So:

- WMS is the source of truth for physical stock status
- Sampling records the operational sampling lifecycle
- QC records the quality decision lifecycle
- all status-changing stock events should pass through audited inventory transitions

---

## Current End-to-End Flow

The implemented direction is:

1. GRN is created
2. GRN is received
3. inventory is created in `QUARANTINE`
4. sampling request is auto-created
5. sampling plan is defined
6. sampling starts
7. inventory moves to `SAMPLING`
8. sampling completes
9. sample is handed to QC
10. inventory moves to `UNDER_TEST`
11. QC records final disposition
12. inventory moves to `RELEASED` or `REJECTED`

Current sampling workflow state for new records:

`PLAN_DEFINED -> IN_PROGRESS -> SAMPLED -> HANDED_TO_QC -> COMPLETED`

Current inventory status model:

`QUARANTINE -> SAMPLING -> UNDER_TEST -> RELEASED / REJECTED / BLOCKED`

---

## Important Current Design Direction

The codebase started as WMS-led implementation, but it became clear that WMS, Sampling, and QC are operationally inseparable.

That led to the current phased approach:

- Phase 0: consolidate audited inventory transitions
- Phase 1: separate sampling events clearly
- Phase 2: introduce first-class `Sample` and `QcDisposition`
- Next: build spec/MOA-driven QC execution and review depth

This avoids building warehouse behavior on weak or temporary assumptions.

---

## Current Build Focus

Even though the product scope is broad, the current engineering focus is intentionally narrower:

1. inbound receipt and GRN integrity
2. warehouse and inventory control
3. sampling workflow correctness
4. QC disposition traceability
5. specification and method foundation for deeper QC execution

That sequencing is deliberate. It prioritizes the stock-control backbone first, because later modules depend on trustworthy inventory and quality status behavior.

---

## What Is Already Implemented

- warehouse hierarchy and storage-condition validation
- GRN receipt with container generation
- inventory creation and inventory transactions
- sampling request and sampling plan flow
- explicit sampling start / complete / handoff actions
- first-class `Sample`
- sample-to-container traceability
- first-class `QcDisposition`
- historical data backfill for the new sampling/QC model

---

## What Is Not Fully Implemented Yet

- spec lifecycle and full regulatory fields
- MOA lifecycle and validation controls
- `SpecParameter`
- material-to-spec linkage
- QC receipt and QC review states
- per-test result entry against specification criteria
- OOS investigation workflow
- retest / resample authorization flow
- outbound inventory issue and full downstream stock consumption lifecycle

---

## How To Use This Document

This file is intended to be the quickest project-context document for:

- new developers joining the codebase
- product and QA discussions
- architecture alignment before new implementation work
- explaining to stakeholders why WMS, Sampling, QC, and Spec/MoA are being designed together

If someone needs technical module details, use this together with:

- [ARCHITECTURE.md](/Users/induraghav/gitrepo/batchsphere/core/docs/ARCHITECTURE.md)
- [QC_SAMPLING_IMPLEMENTATION_PLAN.md](/Users/induraghav/gitrepo/batchsphere/core/docs/QC_SAMPLING_IMPLEMENTATION_PLAN.md)
- [SPEC_MOA_DESIGN.md](/Users/induraghav/gitrepo/batchsphere/core/docs/SPEC_MOA_DESIGN.md)

---

## Why This Matters

In pharma operations, warehouse stock is not just quantity in a location. It is quality-governed inventory whose usability depends on:

- storage compliance
- traceable receipt
- controlled sampling
- approved testing logic
- defensible QC disposition

BatchSphere is being built to support that full model incrementally, with WMS as the physical backbone and Sampling/QC as the governed decision layers on top.

---

## Related Documents

- [README.md](/Users/induraghav/gitrepo/batchsphere/core/README.md)
- [ARCHITECTURE.md](/Users/induraghav/gitrepo/batchsphere/core/docs/ARCHITECTURE.md)
- [QC_SAMPLING_IMPLEMENTATION_PLAN.md](/Users/induraghav/gitrepo/batchsphere/core/docs/QC_SAMPLING_IMPLEMENTATION_PLAN.md)
- [QC_SAMPLING_PHASE_STATUS.md](/Users/induraghav/gitrepo/batchsphere/core/docs/QC_SAMPLING_PHASE_STATUS.md)
- [SPEC_MOA_DESIGN.md](/Users/induraghav/gitrepo/batchsphere/core/docs/SPEC_MOA_DESIGN.md)
- [WMS_ENHANCEMENT_CHECKLIST.md](/Users/induraghav/gitrepo/batchsphere/core/docs/WMS_ENHANCEMENT_CHECKLIST.md)

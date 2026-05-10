# Inventory Issue And Adjustment Development Plan

Last updated: 2026-04-30
Scope: outbound inventory issue flow, stock adjustment flow, admin user management UI, role testability cleanup, and dashboard KPI wiring

## Purpose

This document is the working implementation plan for the next development cycle.

It exists to lock the business rules, implementation order, and verification scope before coding starts.

This plan reflects the decisions already confirmed for this cycle and should be used as the reference point while implementing.

## Locked Decisions

### 1. Outbound issue reference types

Use:

- `PRODUCTION`
- `DISPENSING`
- `SAMPLE_REQUEST`
- `OTHER`

Do not include `RETURN` in this cycle.

Reason:

- a proper return flow is not yet defined
- adding it now would create a misleading transaction type without downstream handling rules

### 2. Stock adjustment style

Use delta-only adjustment:

- positive delta = increase stock
- negative delta = decrease stock

Rules:

- reason is mandatory
- remarks should be supported
- no direct "set final quantity" mode in this cycle

Reason:

- delta is easier to audit
- it avoids ambiguous overwrite behavior
- it keeps the transaction model aligned with stock movement history

### 3. Zero-balance inventory rows

Keep zero-balance inventory rows in the database.

Rules:

- do not delete inventory rows when stock reaches `0`
- filter zero-balance rows from active operational views by default

Reason:

- preserves audit/history
- avoids destroying stock lineage
- keeps inventory transaction references stable

## Delivery Order

Implementation order for this cycle:

1. outbound inventory issue flow
2. stock adjustment flow
3. admin user management frontend
4. seed users and role cleanup
5. dashboard KPI wiring

This order is intentional.

The first two items close missing core inventory operations.
The third and fourth improve actual usability and role testing.
The dashboard should come after the underlying operational data flows are usable.

## Phase 1: Outbound Inventory Issue Flow

### Goal

Allow released stock to be issued out of inventory in a controlled, auditable way.

### Business Rules

Only inventory in `RELEASED` status can be issued.

Required inputs:

- source inventory record
- issued quantity
- issue reference type
- issue reference number
- remarks
- actor

Validation rules:

- issued quantity must be greater than `0`
- issued quantity must not exceed `quantityOnHand`
- inventory status must be `RELEASED`
- zero-balance rows must not be issue-eligible

Expected behavior:

- reduce `quantityOnHand`
- preserve the inventory row even if resulting quantity becomes `0`
- write a new `InventoryTransaction`

### Backend Scope

Add:

- issue reference type enum
- request DTO for issue transaction
- response model if needed
- controller endpoint under inventory API
- service logic for issue processing

Expected transaction data:

- transaction type
- issue reference type
- issue reference number
- before quantity
- issued quantity
- after quantity
- actor
- remarks
- timestamp

Areas to review before coding:

- `InventoryServiceImpl`
- `InventoryController`
- `InventoryTransaction` model and enum usage
- existing repository queries for active inventory lists and summaries

### Frontend Scope

Add an `Issue Stock` action in Inventory UI.

Recommended form fields:

- material
- batch
- pallet / warehouse location
- available quantity
- issue quantity
- issue reference type
- issue reference number
- remarks

UI rules:

- inventory record must be selected from eligible rows
- available quantity must be visible and read-only
- resulting zero quantity is allowed
- zero-balance rows should disappear from standard active list after issue

### Verification

Backend tests:

- issue released stock successfully
- reject issue from non-released stock
- reject issue above available quantity
- allow issue down to zero
- preserve zero-balance row
- write inventory transaction correctly

Frontend verification:

- action visible only where valid
- modal validation works
- successful issue updates visible inventory list

## Phase 2: Stock Adjustment Flow

### Goal

Allow controlled quantity correction when physical stock and system stock differ.

### Business Rules

Adjustment is delta-only.

Required inputs:

- selected inventory record
- signed quantity delta
- mandatory reason
- optional remarks
- actor

Validation rules:

- delta cannot be `0`
- resulting quantity must not be negative
- reason is mandatory

Expected behavior:

- apply signed delta to `quantityOnHand`
- preserve the row if resulting quantity becomes `0`
- write an `InventoryTransaction`

### Backend Scope

Add:

- adjustment request DTO
- adjustment endpoint
- service method for signed delta application

Expected audit content:

- before quantity
- delta
- after quantity
- reason
- remarks
- actor
- timestamp

### Frontend Scope

Add an `Adjust Stock` action in Inventory UI.

Recommended form fields:

- available quantity
- signed delta
- calculated resulting quantity
- reason
- remarks

UI rules:

- show live before/after quantity calculation
- block submission if result would be negative

### Verification

Backend tests:

- positive adjustment
- negative adjustment
- adjustment to zero
- reject negative resulting balance
- transaction history written

Frontend verification:

- before/after calculation visible
- invalid negative result blocked

## Phase 3: Admin User Management Frontend

### Goal

Make existing backend user-management APIs usable from the app without Postman.

### Scope

Build a `SUPER_ADMIN` only screen for:

- list users
- create user
- update role
- activate/deactivate user
- password reset or password update flow

### UI Expectations

Recommended table fields:

- username
- email
- role
- active status
- created at
- updated at

Recommended actions:

- create user
- edit role
- toggle active status
- reset/update password

### Navigation

Add admin navigation entry in app shell.

Must be hidden from non-admin users.

### Verification

- admin can create and update users
- non-admin users cannot access the page
- UI uses existing auth APIs without backend changes unless a gap is found

## Phase 4: Seed Users And Role Cleanup

### Goal

Make role-based testing possible without using `SUPER_ADMIN` for every workflow.

### Scope

Seed the following users:

- `warehouse.op`
- `procurement.user`

Review and verify:

- warehouse role access to warehouse and inventory operations
- procurement read access to materials and specs
- procurement vendor access remains intact

### Verification

- login works for each seeded user
- role-specific pages and APIs behave as expected

## Phase 5: Dashboard KPI Wiring

### Goal

Replace static dashboard placeholders with live operational data from existing APIs.

### Recommended KPI Set

Start with:

- released stock count
- quarantined stock count
- pending sampling requests
- under investigation requests
- open QC workload
- overdue vendor audits if current APIs support it

### Rules

- zero-balance inventory should not be included in active operational stock KPIs
- KPI cards should degrade cleanly on load/error
- do not introduce fake derived numbers that are not backed by real API data

### Verification

- dashboard loads real counts
- counts match active list screens
- empty/error states are handled

## Cross-Cutting Technical Rules

These apply to the whole cycle:

### Zero-balance filtering

Operational views should default to active stock only:

- `quantityOnHand > 0`

This must be reflected in:

- inventory list endpoints or service filtering
- inventory summary calculations
- UI selectors used for issue/adjust workflows

Historical rows must remain queryable later if a dedicated audit/history screen is added.

### Audit expectations

Both issue and adjustment flows must create transaction history with enough detail to answer:

- what changed
- by how much
- why
- by whom
- when
- against which inventory/batch/pallet/location

### Scope boundaries for this cycle

Do not add in this cycle:

- return flow
- production order integration
- FEFO allocation engine
- warehouse capacity engine
- e-sign implementation
- full audit timeline UI

Those remain separate follow-up work.

## Suggested Verification Strategy

### Backend

Run focused integration coverage for:

- inventory issue
- inventory adjustment
- role access where modified
- seed user auth verification if tests exist around auth bootstrapping

### Frontend

Run:

- TypeScript typecheck
- targeted manual workflow validation on Inventory and admin user screens

### Minimum acceptance for merge

Do not consider this cycle complete unless:

1. released stock can be issued
2. stock can be adjusted with signed delta and reason
3. zero-balance inventory rows stay in DB but disappear from active views
4. admin can manage users from UI
5. seeded warehouse/procurement users can log in and test their role boundaries

## Expected Deliverables

By the end of this cycle, BatchSphere should have:

- a usable outbound inventory issue workflow
- a usable stock adjustment workflow
- admin user management in the UI
- role seed coverage for warehouse and procurement
- dashboard KPIs wired to live data

That will close the biggest operational gap after QC release: released stock can finally move through a controlled downstream inventory lifecycle.

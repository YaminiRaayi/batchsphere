# WMS And Material Flow Status

Last updated: 2026-04-24

## What Is Done

### 1. WMS Ownership Model

The warehouse structure now follows:

`Business Unit -> Warehouse -> Room -> Rack -> Shelf -> Pallet`

Implemented:
- internal `Business Unit` master added in backend
- warehouse now stores `businessUnitId`
- WMS tree and summary responses now include business unit details
- WMS `Create New Location` UI now starts with `Business Unit`
- user can:
  - select an existing business unit
  - or create a new business unit inline

### 2. WMS Create Location Flow

The `+ New Location` flow now creates:
- business unit
- warehouse
- rooms
- zone rules
- racks
- shelves
- pallets

Per room, the UI now captures:
- room code / room name
- storage condition
- temperature range
- humidity range
- max capacity
- allowed categories
- restricted / quarantine / rejected flags
- rack count
- shelves per rack
- pallets per shelf

The hierarchy below the room is auto-generated.

### 3. Material Creation -> WMS Mapping

Material creation is now connected to WMS through `default storage assignment`.

Implemented in material create/edit:
- default warehouse
- default room
- optional default rack
- quarantine warehouse
- quarantine room
- location notes

These options are filtered by the material `storageCondition`.

Saved behavior:
- material master is saved first
- then `material location rule` is created/updated

### 4. GRN -> Inventory -> Sampling Integration

The GRN receive flow is now connected to warehouse inventory and sampling creation.

Implemented:
- `create GRN` saves draft only
- `receive GRN` generates in-house batches
- `receive GRN` creates inventory automatically
- `receive GRN` creates sampling requests automatically
- inbound inventory transactions are recorded

Validated in live testing on `2026-04-24`:
- GRN `GRNSUN-001` moved to `RECEIVED`
- two inventory lots were created automatically
- two sampling requests were created automatically

### 5. WMS Stock Status Visibility

The warehouse map now shows live pallet stock state more clearly.

Implemented:
- pallet detail panel shows actual status labels
- `QUARANTINE` displays as `Quarantine`
- `SAMPLING` displays as `Sampling`
- `UNDER_TEST` displays as `Under Test`
- `REJECTED` / `BLOCKED` show distinct labels
- top summary and legend use warehouse status terminology

Validated in live testing:
- received GRN stock appeared in `Map View`
- quarantine stock was visible on the actual pallets

### 6. Movement And Segregation Controls

Warehouse movement logic now applies status-aware room restrictions.

Implemented:
- quarantine / sampling / under-test stock can only move into permitted quarantine areas
- rejected / blocked stock can only move into rejected-only areas
- released stock is blocked from quarantine-only and rejected-only rooms
- room rules also respect material compatibility when configured

### 7. FEFO Guidance And Enforcement

WMS now supports both FEFO visibility and FEFO enforcement.

Implemented in UI:
- FEFO priority list in `Material -> Location`
- pallet-level expiry display
- FEFO rank in pallet detail
- preferred putaway / quarantine guidance from material location rules

Implemented in backend:
- reducing a later-expiry `RELEASED` lot is blocked if an earlier-expiry released lot still has stock

Validated in live testing:
- two released lots for the same material were ranked with earlier expiry first
- reducing the earlier-expiry lot succeeded
- reducing the later-expiry lot was blocked after backend restart

## Important Clarification

### Pallet Is Not Saved In Material Master

This is intentional.

Reason:
- pallet is transactional / physical current placement
- one material can exist on many pallets
- pallet changes during GRN, putaway, movement, quarantine, rejection

So:
- material master stores default location rules
- actual pallet is assigned later during GRN / inventory operations

### Why Quarantine Location Exists

This is also intentional.

Reason:
- incoming stock may wait for QC decision
- pending-QC stock often goes to quarantine
- rejected / blocked stock may require segregated zones

So the model is:
- default location = normal approved storage
- quarantine location = pending-QC / controlled holding area

## Current Expected Flow

### Warehouse Setup

1. Create or select business unit
2. Create warehouse under that business unit
3. Add rooms
4. Auto-generate racks, shelves, pallets

### Material Setup

1. Create material
2. Select storage condition
3. Assign default warehouse / room / rack
4. Assign quarantine warehouse / room if needed

### Operational Placement

1. GRN received
2. Inventory gets placed into actual pallet/location
3. QC / sampling / movement updates actual stock position later
4. Released lots follow FEFO during stock reduction

## What To Validate In Manual Testing

### WMS
- create business unit from WMS modal
- create warehouse under selected business unit
- verify room/rack/shelf/pallet hierarchy appears in tree/map

### Material
- create material with storage condition
- confirm only matching warehouse/room options appear
- save default storage assignment
- edit material and verify mapping loads back correctly

### End-To-End
- create WMS structure
- create material with default location
- receive GRN for that material
- verify actual pallet placement happens at transaction level
- verify sampling requests are auto-created on GRN receive
- move lots through warehouse status flow
- verify FEFO ranks earlier expiry first
- verify later-expiry released lot cannot be reduced before earlier-expiry lot

## Remaining Clarification Items

These are not blockers, but should be validated during full flow testing:
- whether quarantine should later support `quarantine rack` as well
- whether default location should also support `default shelf`
- whether material code should be auto-generated with enforced format
- whether GRN putaway should auto-suggest the material default location

## Current Phase 1 Status

As of `2026-04-24`, the practical Phase 1 WMS baseline is mostly working.

Working and validated:
- warehouse hierarchy
- material location rules
- GRN receive to inventory creation
- GRN receive to sampling request creation
- WMS quarantine visibility
- status transitions in WMS
- movement history visibility
- segregation-aware movement control
- FEFO ranking in UI
- FEFO enforcement during inventory reduction

Still to harden next:
- tighter `sampling/QC -> inventory status` automation
- stronger dedicated issue/picking flow instead of relying on generic adjustment
- warehouse edit UI and smaller traceability improvements

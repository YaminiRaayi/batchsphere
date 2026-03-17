# BatchSphere Architecture

## Module View

```mermaid
flowchart TD
    Client[REST Client / UI]
    Controllers[Controllers]
    Services[Service Layer]
    Repos[Repositories]
    DB[(PostgreSQL)]

    Client --> Controllers
    Controllers --> Services
    Services --> Repos
    Repos --> DB
```

## Warehouse Hierarchy

```text
Warehouse
  -> Room
      -> Rack
          -> Shelf
              -> Pallet
```

## Storage Condition Ownership

- `Material` defines the required storage condition.
- `Room` defines the actual storage condition of the storage area.
- `Rack`, `Shelf`, and `Pallet` inherit the room condition.
- GRN validates `material.storageCondition` against the selected pallet's room.

## Domain Flow

```mermaid
flowchart LR
    Supplier[Supplier]
    Vendor[Vendor]
    VBU[Vendor Business Unit]
    Material[Material]
    Warehouse[Warehouse]
    Room[Room]
    Rack[Rack]
    Shelf[Shelf]
    Pallet[Pallet]
    Batch[Batch]
    GRN[GRN]
    GRNItem[GRN Item]
    GRNContainer[GRN Container]
    MaterialLabel[Material Label]
    SamplingRequest[Sampling Request]
    SamplingPlan[Sampling Plan]
    Inventory[Inventory]
    InvTxn[Inventory Transaction]

    Supplier --> GRN
    Vendor --> VBU
    Vendor --> GRN
    VBU --> GRN
    Material --> Batch
    Material --> GRNItem
    Batch --> GRNItem
    GRN --> GRNItem
    Warehouse --> Room
    Room --> Rack
    Rack --> Shelf
    Shelf --> Pallet
    Pallet --> GRNItem
    GRNItem --> GRNContainer
    GRNContainer --> MaterialLabel
    GRNItem --> SamplingRequest
    SamplingRequest --> SamplingPlan
    GRNItem --> Inventory
    Inventory --> InvTxn
    GRN --> InvTxn
```

## Runtime Receipt Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant GC as GRN Controller
    participant GS as GRN Service
    participant IS as Inventory Service
    participant SS as Sampling Service
    participant DB as Database

    C->>GC: POST /api/grns
    GC->>GS: createGrn(request)
    GS->>DB: save grn + grn_item
    DB-->>GS: persisted ids
    GS-->>GC: grn response
    GC-->>C: DRAFT GRN

    C->>GC: POST /api/grns/{id}/receive
    GC->>GS: receiveGrn(id, updatedBy)
    GS->>DB: load active grn items
    GS->>DB: create grn_container rows
    GS->>DB: create in-house material labels
    GS->>IS: recordGrnReceipt(grnId, items, actor)
    IS->>DB: upsert inventory
    IS->>DB: insert inventory_transaction
    GS->>SS: createSamplingRequestsForGrn(grnId, items, actor)
    SS->>DB: save sampling_request
    GS->>DB: update grn status = RECEIVED
    GS-->>GC: received grn response
    GC-->>C: RECEIVED GRN
```

## Pharma Process Flow

```mermaid
flowchart TD
    A[Material Delivery] --> B[GRN Created]
    B --> C[GRN Received]
    C --> D[Container Records Generated]
    C --> E[In-house Labels Generated]
    C --> F[Inventory Status = QUARANTINE]
    C --> G[Sampling Request Auto-created]

    G --> H{Sampling Required?}
    H -->|Yes| I[QC Defines Sampling Plan]
    I --> J[Inventory Status = SAMPLING]

    H -->|No and CoA Allowed| K[QC CoA Review]
    K --> L[Inventory Status = RELEASED]
```

## Current Status Model

```text
QUARANTINE
SAMPLING
UNDER_TEST
RELEASED
REJECTED
BLOCKED
```

## Implemented Status Transitions

- `GRN receive -> QUARANTINE`
- `Sampling plan with physical sampling -> SAMPLING`
- `Sampling plan with COA_BASED_RELEASE -> RELEASED`

## Container and Label Flow

```text
GRN Item
  -> numberOfContainers
  -> quantityPerContainer
  -> containerType
  -> vendorBatch
  -> manufactureDate
  -> expiryDate
  -> retestDate
  -> palletId

On GRN receive
  -> one grn_container row per physical container
  -> internal lot generated
  -> in-house warehouse label generated
  -> container inventory status starts as QUARANTINE

On QC sampling label
  -> sampled container marked
  -> sampled quantity captured
  -> sampling location captured
  -> QC sampling label saved in label history
```

## Package Layout

```text
com.batchsphere.core
├── batch
├── config
├── exception
├── masterdata
│   ├── material
│   ├── warehouselocation
│   ├── supplier
│   ├── vendor
│   └── vendorbusinessunit
└── transcations
    ├── grn
    └── inventory
```

## Data Ownership

- `masterdata/*`: reference entities used across transactions
- `masterdata/warehouselocation`: warehouse hierarchy and room storage conditions
- `batch`: batch identity and lifecycle
- `transcations/grn`: receipt header, receipt lines, containers, and label history
- `transcations/inventory`: stock state and stock movement history
- `transcations/sampling`: sampling requests and sampling plans

## Current Inventory Integration Rule

- Only `acceptedQuantity` from a received GRN enters inventory.
- `qcStatus = PENDING` cannot be received into inventory.
- If accepted quantity is greater than zero, a `batchId` is required.
- Inventory is grouped by `materialId + batchId + palletId`.
- Selected `palletId` must belong to a room whose storage condition matches the material.

## Current Gaps

- No outbound inventory issue flow yet
- No stock adjustment API yet
- No `SAMPLING -> UNDER_TEST -> RELEASED/REJECTED/BLOCKED` action flow yet
- No sampled quantity reconciliation against GRN/container balances yet
- No auth enforcement yet

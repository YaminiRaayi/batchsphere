# BatchSphere — Playwright E2E Test Requirements

**Browser:** Chromium only  
**Base URLs:** Frontend `http://localhost:5173` | Backend `http://localhost:8080`  
**Fresh-data strategy:** Every run uses a readable timestamp label (`MAT-E2E-20260508-154210`) instead of UUIDs or raw epoch milliseconds. Run `npm run db:e2e:reset` before a fresh E2E cycle when you want to start from a clean domain-data slate.

---

## 0. Bootstrap Required

Playwright is **not yet installed** in this project. Before any spec can run:

```bash
cd core/ui

# 1. Install Playwright
npm install -D @playwright/test
npx playwright install chromium

# 2. Add test scripts to package.json (see Section 9)

# 3. Create infrastructure files (see Section 7)
#    playwright.config.ts, e2e/global-setup.ts,
#    e2e/fixtures/api.ts, e2e/fixtures/auth.fixture.ts

# 4. Add data-testid attributes to React components (see Section 8)
```

Only `e2e/E2E_REQUIREMENTS.md` exists currently — no config, no specs, no page objects.

---

## 1. Scope Summary

| # | Module | Spec File | Primary Role(s) | Test Cases |
|---|--------|-----------|-----------------|------------|
| 1 | Authentication & RBAC | `01-auth.spec.ts` | all roles | 8 |
| 2 | User Management | `02-user-management.spec.ts` | SUPER_ADMIN | 4 |
| 3 | Material Management | `03-material.spec.ts` | SUPER_ADMIN, WAREHOUSE_OP, QC_MANAGER, PROCUREMENT | 7 |
| 4 | Spec & MoA | `04-spec-moa.spec.ts` | QC_ANALYST, QC_MANAGER | 10 |
| 5 | Vendor Management (VMS) | `05-vms.spec.ts` | PROCUREMENT, SUPER_ADMIN | 8 |
| 6 | Warehouse Management (WMS) | `06-wms.spec.ts` | SUPER_ADMIN, WAREHOUSE_OP | 7 |
| 7 | Goods Receipt Note (GRN) | `07-grn.spec.ts` | WAREHOUSE_OP | 6 |
| 8 | Inventory | `08-inventory.spec.ts` | WAREHOUSE_OP | 5 |
| 9 | QC Sampling | `09-sampling.spec.ts` | QC_ANALYST, QC_MANAGER | 10 |
| 10 | Full Pharma Flow (E2E) | `10-full-pharma-flow.spec.ts` | multi-role | 10 |
| **Total** | | | | **75** |

---

## 2. Seeded Test Users (fixed credentials, always available)

| Username | Password | Role |
|---|---|---|
| admin | Admin@123 | SUPER_ADMIN |
| qc.analyst | Admin@123 | QC_ANALYST |
| qc.manager | Admin@123 | QC_MANAGER |
| warehouse.op | Admin@123 | WAREHOUSE_OP |
| procurement.user | Admin@123 | PROCUREMENT |

---

## 3. Test Data Strategy

### Per-run isolation
- A readable `RUN_ID` such as `E2E-20260508-154210` is generated once in `global-setup.ts` and written to `e2e/.auth/run-id.json`
- Spec files prefix that value with a domain label such as `MAT-`, `GRN-`, `VMS-`, or `FLOW-`
- Manual cleanup is available through `npm run db:e2e:reset`; teardown does not silently wipe data after a run

### API-assisted setup (not UI setup)
- Prerequisites (master data) created via REST API calls in `beforeAll` blocks using the stored admin JWT
- UI tests start from the actual feature being tested, not from scratch
- Example: `07-grn.spec.ts` calls `api.createVmsChain()`, `api.createMaterial()`, `api.createWarehouseHierarchy()` in `beforeAll`, then the UI test creates the GRN

### Auth state caching
- `global-setup.ts` logs in once per role, saves `storageState` to `e2e/.auth/{role}.json`
- Each spec uses the appropriate saved auth state — no login UI interaction per test

---

## 4. Project File Structure

```
core/ui/
  playwright.config.ts                  ← Chromium, baseURL, retries, auth states
  e2e/
    E2E_REQUIREMENTS.md                 ← this file
    global-setup.ts                     ← login all 5 roles, save auth states + RUN_ID
    global-teardown.ts                  ← no automatic DB wipe; use npm run db:e2e:reset manually
    .auth/                              ← gitignored — generated auth states per role
      admin.json
      qc-analyst.json
      qc-manager.json
      warehouse-op.json
      procurement.json
      run-id.json
    fixtures/
      api.ts                            ← typed API helpers using admin JWT
      auth.fixture.ts                   ← exports test extended with pre-authed page fixtures
    pages/                              ← Page Object Model
      LoginPage.ts
      DashboardPage.ts
      MaterialPage.ts
      SpecMoaPage.ts
      VmsPage.ts
      WmsPage.ts
      GrnPage.ts
      InventoryPage.ts
      SamplingPage.ts
      UserManagementPage.ts
    specs/
      01-auth.spec.ts
      02-user-management.spec.ts
      03-material.spec.ts
      04-spec-moa.spec.ts
      05-vms.spec.ts
      06-wms.spec.ts
      07-grn.spec.ts
      08-inventory.spec.ts
      09-sampling.spec.ts
      10-full-pharma-flow.spec.ts
```

---

## 5. Detailed Test Cases

### 01 — Authentication & RBAC (`01-auth.spec.ts`)

| TC ID | Test Name | Role | Steps | Expected Result |
|-------|-----------|------|-------|-----------------|
| AUTH-01 | Valid login redirects to dashboard | SUPER_ADMIN | Enter `admin` / `Admin@123` → click Login | Redirected to `/`, Command Center visible |
| AUTH-02 | Invalid credentials shows error | — | Enter `admin` / `wrongpass` → click Login | Error message element is visible; page does **not** redirect away from `/login` |
| AUTH-03 | Logout clears session | SUPER_ADMIN | Login → click Logout | Redirected to `/login`, token gone from storage |
| AUTH-04 | WAREHOUSE_OP blocked from User Management | WAREHOUSE_OP | Navigate to `/admin/users` | Redirected to `/forbidden` |
| AUTH-05 | QC_ANALYST blocked from GRN | QC_ANALYST | Navigate to `/inbound/grn` | Redirected to `/forbidden` |
| AUTH-06 | PROCUREMENT blocked from Sampling | PROCUREMENT | Navigate to `/qc/sampling` | Redirected to `/forbidden` |
| AUTH-07 | WAREHOUSE_OP blocked from Partners | WAREHOUSE_OP | Navigate to `/master-data/partners/suppliers` | Redirected to `/forbidden` |
| AUTH-08 | All roles can reach dashboard | QC_MANAGER | Login → check page | Command Center tiles visible |

> **AUTH-02 note:** The login page renders the raw backend error message, which is not standardized. Assert that the error container is visible and that URL is still `/login` — do not assert a specific error string.

---

### 02 — User Management (`02-user-management.spec.ts`)

**Pre-condition:** logged in as `admin` (SUPER_ADMIN)

| TC ID | Test Name | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| USR-01 | Create a new user | Navigate to Admin → User Management → New User → fill username, email, role=QC_ANALYST, password → submit | User appears in table with QC_ANALYST badge |
| USR-02 | Edit user role | Click edit on new user → change role to QC_MANAGER → save | Role badge updates to QC_MANAGER |
| USR-03 | Deactivate / reactivate user | Toggle active status off → verify badge → toggle back on | Status badge reflects change |
| USR-04 | User Management hidden for non-admin | Log in as `warehouse.op` → check sidebar | "User Management" nav item absent |

---

### 03 — Material Management (`03-material.spec.ts`)

| TC ID | Test Name | Role | Steps | Expected Result |
|-------|-----------|------|-------|-----------------|
| MAT-01 | Create material | SUPER_ADMIN | Master Data → Materials → New Material → fill: name `Material-{RUN_ID}`, code, category=API, UoM=kg, storage condition → save | Material appears in list |
| MAT-02 | View materials list | WAREHOUSE_OP | Navigate to `/master-data/materials/materials` | Table loads with at least one row |
| MAT-03 | Edit material | SUPER_ADMIN | Click Edit icon on material row → navigates to material form pre-filled → update description field → save | Updated description visible in the materials list |
| MAT-04 | Link approved spec to material via edit form | QC_MANAGER | Open material edit form → "Specification & Testing" section → "Link Existing Spec" dropdown → select an approved spec → save | Spec code/name visible on reopening the material form |
| MAT-05 | Clear spec from material | QC_MANAGER | Open same material edit form → clear spec dropdown (select blank) → save | Spec field is blank on reopening |
| MAT-06 | PROCUREMENT sees list, no Create button | PROCUREMENT | Navigate to `/master-data/materials/materials` | "New Material" button absent from UI |
| MAT-07 | PROCUREMENT cannot access new material route | PROCUREMENT | Navigate to `/master-data/materials/new` directly | Redirected to `/forbidden` |

---

### 04 — Spec & MoA (`04-spec-moa.spec.ts`)

**Pre-condition (API):** one material created via `api.createMaterial(RUN_ID)` in `beforeAll`

| TC ID | Test Name | Role | Steps | Expected Result |
|-------|-----------|------|-------|-----------------|
| SPEC-01 | Create Spec in Draft | QC_ANALYST | Master Data → QC Refs → Specs → New Spec → fill: name `Spec-{RUN_ID}`, version=1.0, link material → save | Spec in list, status=DRAFT |
| SPEC-02 | Add test parameter to Spec | QC_ANALYST | Open spec → Add Parameter → fill: name, type=NUMERIC, min=98, max=102, unit=% → save | Parameter visible in spec detail |
| SPEC-03 | Submit Spec for review | QC_ANALYST | Spec → Submit for Review button → confirm | Status badge changes to UNDER_REVIEW |
| SPEC-04 | Approve Spec | QC_MANAGER | Review queue (or spec detail) → Approve → confirm | Status=APPROVED, Approve button gone |
| SPEC-05 | Reject Spec with remarks | QC_MANAGER | Create second spec → submit → Reject with remark text | Status returns to DRAFT, remark stored |
| SPEC-06 | Obsolete an approved Spec | QC_MANAGER | Approved spec → Obsolete → confirm | Status=OBSOLETE |
| MOA-01 | Create MoA in Draft | QC_ANALYST | QC Refs → MoA → New MoA → fill: name `MoA-{RUN_ID}`, version, linked spec | MoA in list, status=DRAFT |
| MOA-02 | Submit MoA for review | QC_ANALYST | MoA → Submit for Review | Status=UNDER_REVIEW |
| MOA-03 | Approve MoA | QC_MANAGER | Review queue → Approve MoA | Status=APPROVED |
| MOA-04 | Reject MoA | QC_MANAGER | Submit fresh MoA → Reject with remarks | Status back to DRAFT |

---

### 05 — Vendor Management System (`05-vms.spec.ts`)

| TC ID | Test Name | Role | Steps | Expected Result |
|-------|-----------|------|-------|-----------------|
| VMS-01 | Create Supplier | PROCUREMENT | Partners → Suppliers → New Supplier → fill: name `Supplier-{RUN_ID}`, code, country, contact email → save | Supplier appears in list |
| VMS-02 | Create Vendor | SUPER_ADMIN | Partners → Vendors → New Vendor → fill: name `Vendor-{RUN_ID}`, code, link to supplier → save | Vendor in list |
| VMS-03 | Create Vendor Business Unit | SUPER_ADMIN | Vendor detail → Add BU → fill: name `BU-{RUN_ID}`, site address, pharma fields → save | BU visible under vendor |
| VMS-04 | Upload document to Vendor BU | PROCUREMENT | VendorBU → Documents tab → Upload → select PDF file | Document name appears in list |
| VMS-05 | Add audit record | PROCUREMENT | VendorBU → Audits tab → Add Audit → fill date, auditor, findings → save | Audit row appears |
| VMS-06 | Edit audit record | PROCUREMENT | Audit row → Edit → change finding text → save | Updated text visible |
| VMS-07 | Qualify Vendor BU | SUPER_ADMIN | VendorBU → Qualify button → confirm | Qualification status badge=QUALIFIED |
| VMS-08 | WAREHOUSE_OP cannot see Partners in nav | WAREHOUSE_OP | Check sidebar | Partners section absent |

---

### 06 — Warehouse Management System (`06-wms.spec.ts`)

> **Hierarchy note:** The actual WMS hierarchy is 5 levels — **Warehouse → Room → Rack → Shelf → Pallet**. There is no "Zone" node in the hierarchy. `zoneName` is a descriptive text field on a Room. Zone Rules are a **separate entity** managed under the "Zone Assignments" tab (POST `/api/wms/zone-rules`), not part of the hierarchy tree.

| TC ID | Test Name | Role | Steps | Expected Result |
|-------|-----------|------|-------|-----------------|
| WMS-01 | Create Warehouse | SUPER_ADMIN | Master Data → Locations → Warehouse → New Warehouse → fill: name `WH-{RUN_ID}`, code, capacity → save | Warehouse appears in hierarchy view |
| WMS-02 | Create Room under Warehouse | WAREHOUSE_OP | Expand warehouse → Add Room → fill: roomCode, roomName, zoneName (label only, not a hierarchy node) → save | Room nested under warehouse |
| WMS-03 | Create Rack under Room | WAREHOUSE_OP | Room → Add Rack → fill: rack code/name → save | Rack nested under room |
| WMS-04 | Create Shelf under Rack → Pallet under Shelf | WAREHOUSE_OP | Rack → Add Shelf; Shelf → Add Pallet | Full 5-level hierarchy visible and expandable |
| WMS-05 | Set Zone Rule | SUPER_ADMIN | Navigate to Zone Assignments tab → Add Zone Rule → select room, enter zone name, select allowedStorageCondition → save | Zone Rule row appears in Zone Assignments table |
| WMS-06 | Set Material Location Rule | SUPER_ADMIN | WMS → Material Location Rules tab → Add → select material + default room/rack → save | Rule in list |
| WMS-07 | WMS tree is read-accessible to WAREHOUSE_OP | WAREHOUSE_OP | Navigate to `/master-data/locations/warehouse` | Warehouse → Room → Rack → Shelf → Pallet tree renders correctly |

> **WMS-05 note:** The Zone Rule form fields are `roomId` (room selector), `zoneName` (free text), `allowedMaterialType` (optional), `allowedStorageCondition` (enum), `restrictedAccess` (bool), `quarantineOnly` (bool), `rejectedOnly` (bool), `notes` (optional). There are no separate temperature min/max fields on the Zone Rule — temperature range is a descriptive field on the Room itself.

---

### 07 — Goods Receipt Note (`07-grn.spec.ts`)

**Pre-condition (API):** `beforeAll` creates:
- Supplier → Vendor → VendorBU (via `api.createVmsChain(RUN_ID)`)
- Material (via `api.createMaterial(RUN_ID)`)
- Warehouse → Room → Rack → Shelf → Pallet (via `api.createWarehouseHierarchy(RUN_ID)`)

> **Container note:** Containers are **not added as a separate step** — they are specified inline as fields on each GRN line item during GRN creation (`containerType`, `numberOfContainers`, `quantityPerContainer`, `vendorBatch`). After GRN creation/receipt, containers are readable via `GET /api/grns/items/{grnItemId}/containers`.

| TC ID | Test Name | Role | Steps | Expected Result |
|-------|-----------|------|-------|-----------------|
| GRN-01 | Create GRN with line item | WAREHOUSE_OP | Inbound → GRN → New GRN → select supplier, vendor → add line item: material=`Material-{RUN_ID}`, receivedQty=100, containerType=BAG, numberOfContainers=5, quantityPerContainer=20, vendorBatch=`BATCH-{RUN_ID}` → save | GRN in list, status=DRAFT, 5 containers shown |
| GRN-02 | Verify generated containers | WAREHOUSE_OP | Open saved GRN → Containers section | 5 container rows visible with batch `BATCH-{RUN_ID}` |
| GRN-03 | Receive GRN | WAREHOUSE_OP | GRN → Mark as Received → confirm | Status changes to RECEIVED |
| GRN-04 | Print container labels | WAREHOUSE_OP | GRN → Containers section → Print Labels | Label data renders / download triggered |
| GRN-05 | Upload document (CoA) | WAREHOUSE_OP | GRN → Documents tab → Upload → select PDF | Document name appears in list |
| GRN-06 | Cancel a DRAFT GRN | WAREHOUSE_OP | Create second GRN → leave as DRAFT → Cancel → confirm | Status=CANCELLED, row greyed out |

---

### 08 — Inventory (`08-inventory.spec.ts`)

**Pre-condition (API):** `beforeAll` creates GRN and receives it via `api.createAndReceiveGrn(RUN_ID)` so inventory baseline exists.

> **UI notes:**
> - Inventory actions (Adjust, Issue) are **header-level buttons** — user selects a lot via radio button in the table, then clicks the action button at the top of the page. There are no per-row action buttons.
> - Transaction history is displayed in a **global "Recent Stock Movements" section** at the bottom of the page — not a per-row tab or button.
> - GRN-received lots start as **QUARANTINE** (pending QC). Issue requires a **RELEASED** lot — an API call to change status is needed before INV-04.
> - Transaction type labels in the UI: `ADJUSTMENT`→"Adjustment", `OUTBOUND`→"Issue", `TRANSFER`→"Transfer". `INBOUND` has no mapped label and renders as raw "INBOUND". Assert movement existence and quantity — do not assert specific label text for INBOUND until a label is standardized.

| TC ID | Test Name | Role | Steps | Expected Result |
|-------|-----------|------|-------|-----------------|
| INV-01 | View inventory list | WAREHOUSE_OP | Navigate to `/inventory` | Table loads, at least one lot row visible |
| INV-02 | GRN receipt reflected in inventory | WAREHOUSE_OP | Scroll to find batch `BATCH-{RUN_ID}` in inventory table | Row visible with qty > 0, status=QUARANTINE |
| INV-03 | Adjust inventory (positive) | WAREHOUSE_OP | Select lot via radio button → click Adjust header button → mode=Increase Stock → qty=10 → reason text → Confirm Adjustment | Quantity for selected lot increases by 10 |
| INV-04 | Issue inventory (requires RELEASED lot) | WAREHOUSE_OP | API: change lot status to RELEASED → select lot via radio → click Issue header button → referenceType=PRODUCTION, qty=5, referenceNumber=`PROD-{RUN_ID}`, reason → Confirm Issue | Quantity reduces by 5; movement appears |
| INV-05 | View stock movements | WAREHOUSE_OP | Scroll to "Recent Stock Movements" section | At least one movement for `BATCH-{RUN_ID}` visible with qty and date |

---

### 09 — QC Sampling (`09-sampling.spec.ts`)

**Pre-condition (API):** `beforeAll` creates:
- Full VMS chain, Material with approved Spec **and approved MoA**, Sampling Tool
- GRN received (`api.createAndReceiveGrn(RUN_ID)`)

> **Sampling request status progression (actual backend enum values):**
> `REQUESTED` → `PLAN_DEFINED` → `IN_PROGRESS` → `SAMPLED` → `HANDED_TO_QC` → `RECEIVED` → `UNDER_REVIEW` → `APPROVED` / `REJECTED` / `UNDER_INVESTIGATION`

| TC ID | Test Name | Role | Steps | Expected Result |
|-------|-----------|------|-------|-----------------|
| SAM-01 | Create sampling request | QC_ANALYST | QC → Sampling → New Request → select GRN/material, sampling tool, container refs → submit | Request in list, status=**REQUESTED** |
| SAM-02 | Create sampling plan | QC_ANALYST | Request → Create Plan → sample count=3, method=RANDOM → save | Plan attached, request status=**PLAN_DEFINED** |
| SAM-03 | Start sampling | QC_ANALYST | Plan → Start Sampling → confirm | Request status=**IN_PROGRESS** |
| SAM-04 | Complete sampling | QC_ANALYST | Complete Sampling → confirm | Request status=**SAMPLED** |
| SAM-05 | Handoff samples to QC lab | QC_ANALYST | Handoff to QC → confirm | Request status=**HANDED_TO_QC** |
| SAM-06 | QC receipt | QC_ANALYST | QC Receipt → confirm | Request status=**RECEIVED** |
| SAM-07 | Start review and fill test worksheet | QC_ANALYST | Start Review → status=UNDER_REVIEW → open Worksheet → enter values within spec limits for each parameter → save | All test result rows show status=**PASS** |
| SAM-08 | QC Manager approves disposition | QC_MANAGER | Review worksheet → QC Decision: APPROVED → confirm | Request status=**APPROVED**, disposition status=APPROVED |
| SAM-09 | Failing test triggers investigation | QC_MANAGER | Create second request → fill worksheet with out-of-spec value → Initiate Investigation | Request status=**UNDER_INVESTIGATION**, QcInvestigation status=**PHASE_I** |
| SAM-10 | Resolve investigation | QC_MANAGER | Investigation → Resolve → select closure category → add remarks → confirm | Investigation status is one of **CLOSED_CONFIRMED / CLOSED_INVALID / CLOSED_RESAMPLE / CLOSED_RETEST** |

---

### 10 — Full Pharma Flow (Integrated E2E) (`10-full-pharma-flow.spec.ts`)

Single sequential spec that walks the complete material intake journey across three roles. All master data created via API in `beforeAll`.

> **Hierarchy note:** WMS hierarchy created via API is Warehouse → Room → Rack → Shelf → Pallet (5 levels, no Zone node in hierarchy — Zone Rules are separate).

| Step | Actor | Method | Action | Assertion |
|------|-------|--------|--------|-----------|
| F-01 | SUPER_ADMIN | API | Create Supplier → Vendor → VendorBU | IDs returned, no error |
| F-02 | SUPER_ADMIN | API | Create Material with sampling flag=true | Material ID returned |
| F-03 | SUPER_ADMIN | API | Create Spec → add parameter → submit → approve | Spec status=APPROVED |
| F-04 | SUPER_ADMIN | API | Create MoA → submit → approve | MoA status=APPROVED |
| F-05 | SUPER_ADMIN | API | Link approved Spec to Material (via material update with specId) | Material shows specId |
| F-06 | SUPER_ADMIN | API | Create Warehouse → Room → Rack → Shelf → Pallet (5 levels) | Hierarchy IDs returned |
| F-07 | WAREHOUSE_OP | UI | Login → navigate to GRN → create GRN with line item (containerType, numberOfContainers, quantityPerContainer, vendorBatch) → receive | GRN status=RECEIVED, success toast shown |
| F-08 | WAREHOUSE_OP | UI | Navigate to Inventory → scroll to lot for `BATCH-{RUN_ID}` | Row visible with qty > 0, status=QUARANTINE |
| F-09 | QC_ANALYST | UI | Login → QC Sampling → new request for GRN above → create plan → start → complete → handoff | Request status=**HANDED_TO_QC** |
| F-10 | QC_MANAGER | UI | Login → QC Receipt → Start Review → fill all worksheet parameters with passing values → save → QC Decision: APPROVED → confirm | Request status=APPROVED, disposition=APPROVED visible |

---

## 6. Playwright Configuration (`playwright.config.ts`)

```ts
{
  testDir: './e2e/specs',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
  retries: 1,
  timeout: 30_000,
  fullyParallel: false,   // specs share RUN_ID-namespaced data, safer to run sequentially
}
```

---

## 7. Infrastructure File Responsibilities

### `global-setup.ts`
- Verifies backend is reachable before test bootstrapping. Do **not** require `200 OK` from unauthenticated `GET /api/auth/me`, because that endpoint is protected and may legitimately return `401/403` when the backend is healthy.
- Recommended reachability check: either
  - treat **any HTTP response** from `http://localhost:8080/api/auth/me` as "backend reachable", or
  - perform a real `POST /api/auth/login` using a seeded test user and require a successful auth response
- Logs in once per role via `POST /api/auth/login`
- Saves each role's `storageState` to `e2e/.auth/{role}.json`
- Generates a readable `RUN_ID` and writes to `e2e/.auth/run-id.json`

### `fixtures/api.ts` — API helper functions (all use admin JWT)

All API paths verified against `core/ui/src/lib/api.ts`.

> **`createdBy` field:** Every create DTO in this codebase has a `@NotBlank createdBy` field used for audit trail. All POST payloads in `fixtures/api.ts` must include `createdBy: 'admin'` or the API will return `400 Bad Request`. The table below shows only the domain-specific fields for brevity.
>
> **Helper design rule:** `fixtures/api.ts` must inject `createdBy: 'admin'`, `updatedBy: 'admin'`, and similar audit fields centrally inside helper functions where required. Spec files should pass only business data, not audit boilerplate.

| Function | Method + Path | Payload / Notes | Returns |
|----------|---------------|-----------------|---------|
| `createSupplier(suffix)` | POST `/api/suppliers` | `{ supplierName, supplierCode, country, contactEmail }` | `{ id, supplierName }` |
| `createVendor(supplierId, suffix)` | POST `/api/vendors` | `{ vendorName, vendorCode, supplierId }` | `{ id, vendorName }` |
| `createVendorBU(vendorId, suffix)` | POST `/api/vendors/{vendorId}/business-units` | `{ buName, ... }` | `{ id, buName }` |
| `createVmsChain(suffix)` | chains Supplier → Vendor → VendorBU | — | `{ supplierId, vendorId, buId }` |
| `createMaterial(suffix)` | POST `/api/materials` | `{ materialName, materialCode, category, uom, ... }` | `{ id, materialName }` |
| `createSpec(materialId, suffix)` | POST `/api/specs` → add param → submit → approve | multi-step chain | `{ id, status: 'APPROVED' }` |
| `createApprovedMoa(specId, suffix)` | POST `/api/moas` → submit → approve | multi-step chain linked to approved Spec | `{ id, status: 'APPROVED' }` |
| `createWarehouse(suffix)` | POST `/api/warehouses` | `{ warehouseName, warehouseCode }` | `{ id }` |
| `createRoom(warehouseId, suffix)` | POST `/api/warehouses/{warehouseId}/rooms` | `{ roomCode, roomName, zoneName?, storageCondition? }` | `{ id }` |
| `createRack(roomId, suffix)` | POST `/api/rooms/{roomId}/racks` | `{ rackCode, rackName }` | `{ id }` |
| `createShelf(rackId, suffix)` | POST `/api/racks/{rackId}/shelves` | `{ shelfCode, shelfName }` | `{ id }` |
| `createPallet(shelfId, suffix)` | POST `/api/shelves/{shelfId}/pallets` | `{ palletCode, palletName }` | `{ id }` |
| `createWarehouseHierarchy(suffix)` | chains Warehouse → Room → Rack → Shelf → Pallet | — | `{ warehouseId, roomId, rackId, shelfId, palletId }` |
| `createZoneRule(roomId, suffix)` | POST `/api/wms/zone-rules` | `{ roomId, zoneName, allowedStorageCondition? }` | `{ id }` |
| `createGrn(supplierId, vendorId, materialId, palletId, suffix)` | POST `/api/grns` | includes `items[{ materialId, receivedQuantity, containerType, numberOfContainers, quantityPerContainer, vendorBatch }]` | `{ id, grnNumber }` |
| `receiveGrn(grnId)` | **POST** `/api/grns/{id}/receive` | `{ updatedBy: 'admin' }` | `{ status: 'RECEIVED' }` |
| `createAndReceiveGrn(supplierId, vendorId, materialId, palletId, suffix)` | chains createGrn + receiveGrn | containers embedded in GRN item payload | `{ grnId, grnNumber }` |
| `updateInventoryStatus(inventoryId, status, remarks?)` | PUT `/api/inventory/{id}/status` | status transition helper for E2E preconditions, especially QUARANTINE → RELEASED before issue-flow tests | updated inventory record |
| `createSamplingTool(suffix)` | POST `/api/sampling-tools` | `{ toolName, toolCode }` | `{ id }` |

> **No `addGrnContainers` helper.** Containers are embedded fields in the GRN item at creation time (`numberOfContainers`, `quantityPerContainer`, `containerType`, `vendorBatch`). After creation, containers are read-only via `GET /api/grns/items/{grnItemId}/containers`.

### `fixtures/auth.fixture.ts`
```ts
// Extended test fixture with pre-authed pages per role
export const test = base.extend<{
  adminPage: Page;
  warehousePage: Page;
  qcAnalystPage: Page;
  qcManagerPage: Page;
  procurementPage: Page;
}>({ ... })
```

### `pages/` — Page Object Model (one class per feature area)
Each class encapsulates:
- Selectors (by `data-testid` preferred, fallback to `role` + `name`)
- Actions (`fillForm()`, `clickSave()`, `clickSubmitForReview()`)
- Assertions (`expectVisible()`, `expectStatus()`)

---

## 8. data-testid Conventions

`data-testid` attributes must be added to React components before spec implementation. The table below is the full required set. Start with the Login group to unblock `01-auth.spec.ts`.

### Auth / Shell
| Element | `data-testid` |
|---------|--------------|
| Login username input | `login-username` |
| Login password input | `login-password` |
| Login submit button | `login-submit` |
| Login error message container | `login-error` |
| Logout button | `btn-logout` |
| Sidebar nav item (repeated, keyed by path) | `nav-item-{path-slug}` e.g. `nav-item-admin-users` |

### Dashboard
| Element | `data-testid` |
|---------|--------------|
| Dashboard KPI card (repeated) | `kpi-card-{label-slug}` |
| Command Center heading | `dashboard-heading` |

### Material Management
| Element | `data-testid` |
|---------|--------------|
| New Material button | `btn-new-material` |
| Material row (repeated) | `material-row-{id}` |
| Material edit icon per row | `btn-edit-material-{id}` |
| Material name input (form) | `material-name` |
| Material code input | `material-code` |
| Spec selector dropdown | `material-spec-select` |
| Material form save button | `btn-save-material` |

### Spec / MoA
| Element | `data-testid` |
|---------|--------------|
| New Spec button | `btn-new-spec` |
| Spec row (repeated) | `spec-row-{id}` |
| Review queue row (repeated) | `review-row-{id}` |
| Status badge (reused across modules) | `status-badge` |
| Submit for Review button | `btn-submit-review` |
| Approve button | `btn-approve` |
| Reject button | `btn-reject` |
| Obsolete button | `btn-obsolete` |
| Parameter row (repeated) | `param-row-{id}` |

### GRN
| Element | `data-testid` |
|---------|--------------|
| New GRN button | `btn-new-grn` |
| GRN row (repeated) | `grn-row-{id}` |
| GRN line item — material select | `grn-item-material` |
| GRN line item — received quantity | `grn-item-qty` |
| GRN line item — container type | `grn-item-container-type` |
| GRN line item — number of containers | `grn-item-container-count` |
| GRN line item — quantity per container | `grn-item-qty-per-container` |
| GRN line item — vendor batch | `grn-item-vendor-batch` |
| Container row (repeated) | `container-row-{id}` |
| GRN receive button | `btn-receive-grn` |
| GRN cancel button | `btn-cancel-grn` |
| GRN documents tab | `tab-grn-documents` |
| GRN document upload input | `grn-document-upload` |
| GRN document row (repeated) | `grn-document-row-{id}` |

### Inventory
| Element | `data-testid` |
|---------|--------------|
| Inventory lot row (repeated, selectable via radio) | `inventory-row-{id}` |
| Inventory lot radio button | `inventory-radio-{id}` |
| Adjust button (header) | `btn-adjust-inventory` |
| Issue button (header) | `btn-issue-inventory` |
| Adjust mode — Increase | `btn-adjust-increase` |
| Adjust mode — Decrease | `btn-adjust-decrease` |
| Adjust quantity input | `adjust-quantity` |
| Adjust reason textarea | `adjust-reason` |
| Confirm Adjustment button | `btn-confirm-adjustment` |
| Issue reference type select | `issue-reference-type` |
| Issue quantity input | `issue-quantity` |
| Issue reference number input | `issue-reference-number` |
| Issue reason textarea | `issue-reason` |
| Confirm Issue button | `btn-confirm-issue` |
| Recent Stock Movements section | `stock-movements-section` |
| Movement row (repeated) | `movement-row-{id}` |

### Sampling
| Element | `data-testid` |
|---------|--------------|
| New Sampling Request button | `btn-new-sampling-request` |
| Sampling request row (repeated) | `sampling-row-{id}` |
| Create Plan button | `btn-create-plan` |
| Start Sampling button | `btn-start-sampling` |
| Complete Sampling button | `btn-complete-sampling` |
| Handoff to QC button | `btn-handoff-qc` |
| QC Receipt button | `btn-qc-receipt` |
| Start Review button | `btn-start-review` |
| QC decision modal | `qc-decision-modal` |
| QC decision remarks input | `qc-decision-remarks` |
| QC decision confirmation input | `qc-decision-confirmation` |
| Worksheet parameter row (repeated) | `worksheet-param-{id}` |
| Worksheet result input per param | `worksheet-result-{id}` |
| QC Decision Approve button | `btn-qc-approve` |
| QC Decision Reject button | `btn-qc-reject` |
| Initiate Investigation button | `btn-initiate-investigation` |
| Investigation resolve button | `btn-resolve-investigation` |

### Vendor / VendorBU
| Element | `data-testid` |
|---------|--------------|
| New Supplier button | `btn-new-supplier` |
| New Vendor button | `btn-new-vendor` |
| New Vendor BU button | `btn-new-vendor-bu` |
| Vendor BU Documents tab | `tab-bu-documents` |
| Vendor BU Audits tab | `tab-bu-audits` |
| Add Audit button | `btn-add-audit` |
| Audit row (repeated) | `audit-row-{id}` |
| Qualify button | `btn-qualify-bu` |

### WMS
| Element | `data-testid` |
|---------|--------------|
| New Warehouse button | `btn-new-warehouse` |
| Add Room button | `btn-add-room` |
| Add Rack button | `btn-add-rack` |
| Add Shelf button | `btn-add-shelf` |
| Add Pallet button | `btn-add-pallet` |
| Zone Assignments tab | `tab-zone-assignments` |
| Add Zone Rule button | `btn-add-zone-rule` |
| Material Location Rules tab | `tab-material-location-rules` |

### Toast
| Element | `data-testid` |
|---------|--------------|
| Toast container (Sonner) | `toast-container` |

---

## 9. Execution

```bash
# Prerequisites: backend running on :8080, frontend on :5173

cd core/ui

# Install Playwright (first time only)
npm install -D @playwright/test
npx playwright install chromium

# Run all specs
npx playwright test

# Run with browser visible
npx playwright test --headed

# Run a single spec
npx playwright test e2e/specs/01-auth.spec.ts

# Interactive UI mode
npx playwright test --ui

# View HTML report after run
npx playwright show-report
```

Add to `package.json` scripts:
```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:report": "playwright show-report"
```

---

## 10. Out of Scope (Coming Soon modules)

The following are listed as `soon: true` in the nav and have zero backend code — excluded from this test plan:

- **HRMS** (`/hrms`) — employee master, training records
- **LIMS** (`/lims`) — lab instrument tracking, advanced CoA
- **QMS** (`/qms`) — deviations, CAPA, change control

---

## 11. Implementation Order

Recommended implementation sequence to unblock testing incrementally:

1. `playwright.config.ts` + `global-setup.ts` + `fixtures/api.ts`
2. Add `data-testid` attributes to React components (Login group first)
3. `01-auth.spec.ts` — validates infra works end-to-end
4. `03-material.spec.ts` — first real feature test
5. `07-grn.spec.ts` + `08-inventory.spec.ts` — core warehouse flow
6. `09-sampling.spec.ts` — QC flow
7. `04-spec-moa.spec.ts` + `05-vms.spec.ts` + `06-wms.spec.ts` — master data
8. `02-user-management.spec.ts` — admin flow
9. `10-full-pharma-flow.spec.ts` — full integration

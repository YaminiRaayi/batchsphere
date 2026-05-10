# BatchSphere — Claude Context

## What this project is

BatchSphere is a Pharma ERP product (Spring Boot + React). The project lead is Yamini Raayi (QC Manager). The goal is a high-fidelity, pharma-realistic demo system covering material management, QC sampling, warehouse, vendor management, Spec/MoA document management, LIMS, HRMS, and QMS.

All active code lives under `core/`. The root also has `bkp/` (old backup) and `.docx` roadmap docs.

---

## Tech stack

| Layer | Tech |
|---|---|
| Backend | Spring Boot 4.0.2, Java 17, Maven |
| DB | PostgreSQL 15, Flyway migrations (V1–V55) |
| ORM | Spring Data JPA + Hibernate, Lombok |
| Auth | Spring Security + JWT (access 1h, refresh 7d) |
| Frontend | React 18, TypeScript, Vite 5 |
| UI | TailwindCSS 3, no component library |
| Server state | TanStack React Query 5 |
| Client state | Zustand |
| Routing | React Router 6 (lazy-loaded pages) |
| Toasts | Sonner |

---

## Running the project

```bash
# Backend (port 8080)
cd core
./mvnw spring-boot:run

# Frontend (port 5173)
cd core/ui
npm install
npm run dev
```

DB: `jdbc:postgresql://localhost:5432/batchsphere_db` — user `batchsphere_user` / `StrongPassword123`

---

## Backend package map

Root: `com.batchsphere.core`

```
auth/               JWT auth, Spring Security, user CRUD
  config/           AuthDataInitializer, AuthSeedProperties
  controller/       AuthController, UserManagementController
  entity/           User, UserRole (enum)
  security/         JWT filter, CustomUserDetailsService

config/             SecurityConfig, CORS config
exception/          Global @ControllerAdvice
storage/            Local file storage for documents

batch/              Batch/lot master

masterdata/
  material/         Material master (UoM, storage conditions, sampling flags, spec link)
  supplier/         Supplier master
  vendor/           Vendor master (with audit, performance, corporate docs)
  vendorbusinessunit/ Vendor BU (pharma fields, documents)
  businessunit/     Internal business unit
  warehouselocation/ Warehouse hierarchy: Warehouse > Zone > Room > Rack > Shelf > Pallet
  spec/             Specification (lifecycle: Draft→Review→Approved, revision chain, parameters)
  moa/              Method of Analysis
  samplingtool/     Sampling tools master
  quality/          Shared quality enums/DTOs

transactions/
  grn/              Goods Receipt Note (containers, labels, QR codes, documents)
  inventory/        Inventory transactions and adjustments
  sampling/         QC sampling workflow (requests, samples, test results, disposition, investigation)
```

Each domain follows: `controller/ → service/ServiceImpl → repository/ → entity/ → dto/`

---

## Frontend page map

```
core/ui/src/
  features/
    auth/           LoginPage, AccessDeniedPage
    dashboard/      DashboardPage (Command Center)
    grn/            GrnPage
    inventory/      InventoryPage
    sampling/       SamplingPage (QC sampling + disposition + investigation)
    warehouse/      WarehousePage
    master-data/
      materials/    MaterialsPage, MaterialCreatePage
      partners/     SuppliersPage, VendorsPage, VendorBUsPage, VendorFormDrawer, VendorBUFormDrawer
      locations/    WarehousePage
      qc-refs/      SpecsPage, MoaPage, SamplingToolsPage, SpecMoaPage
    admin/          UserManagementPage
  components/       AuthBootstrap, Breadcrumbs, ProtectedRoute, PageSkeleton, PageErrorBoundary, SectionHeader
  lib/              api.ts (all fetch calls), authz.ts (role guards), queryClient.ts
  stores/           authStore.ts, appShellStore.ts
  types/            One file per domain (material, grn, inventory, sampling, spec, moa, vendor, etc.)
  shell/            AppShell.tsx (nav layout)
  router.tsx        All routes with role guards
```

Routes are lazy-loaded. `ProtectedRoute` wraps role-gated sections inline in the router.

---

## Roles and seeded users

| Username | Password | Role |
|---|---|---|
| admin | Admin@123 | SUPER_ADMIN |
| qc.analyst | Admin@123 | QC_ANALYST |
| qc.manager | Admin@123 | QC_MANAGER |
| warehouse.op | Admin@123 | WAREHOUSE_OP |
| procurement.user | Admin@123 | PROCUREMENT |

Role access:
- `WAREHOUSE_OP`: GRN, Inventory, Warehouse, Materials, Locations
- `QC_ANALYST / QC_MANAGER`: Sampling, Materials, Specs, MoA, Sampling Tools
- `PROCUREMENT`: Partners (Supplier/Vendor/VendorBU), QC Refs, Materials
- `SUPER_ADMIN`: everything including User Management

---

## DB migrations

55 Flyway migrations in `core/src/main/resources/db/migration/V1__...sql` through `V55__...sql`.
Flyway is set to `out-of-order: true`, `baseline-on-migrate: true`, `validate-on-migrate: false`.
New migrations go in this folder with next version number.

---

## Key conventions

- **Lombok** everywhere: `@Data`, `@Builder`, `@NoArgsConstructor` on entities and DTOs
- **Service pattern**: always `XxxService` interface + `XxxServiceImpl` class
- **No `ddl-auto: create`** — schema is always managed by Flyway only
- **Frontend API calls**: all in `core/ui/src/lib/api.ts` as plain fetch functions, consumed via React Query hooks inline in pages
- **No component library** — all UI is hand-rolled with TailwindCSS
- **Auth header**: `Authorization: Bearer <token>` sent by `api.ts` using token from Zustand `authStore`
- **CORS**: backend allows `http://localhost:5173` only

---

## What's built vs what's planned

### Built and integrated (backend + frontend)
- Auth (JWT login, refresh, role-based access)
- Material master
- Supplier / Vendor / VendorBU (with documents, audits)
- Warehouse hierarchy (Warehouse → Zone → Room → Rack → Shelf → Pallet)
- Warehouse zone rules and material location rules
- Specs (with parameters, lifecycle, revision chain, material linking)
- MoA (Method of Analysis)
- Sampling Tools master
- GRN (with containers, label printing, QR codes, documents)
- Inventory (transactions, adjustments, pallet references)
- QC Sampling (sampling requests, samples, test results, QC disposition, investigation workflow)
- User Management (SUPER_ADMIN only)

### Planned / not yet started
- HRMS
- LIMS (beyond sampling)
- QMS (deviations, CAPAs)
- Full batch manufacturing module

---

## Testing

- Integration tests: `core/src/test/java/com/batchsphere/core/`
  - `auth/controller/AuthControllerIntegrationTest`
  - `auth/controller/AuthorizationIntegrationTest`
  - `transactions/inventory/controller/InventoryControllerIntegrationTest`
- Test config: `core/src/test/resources/application-test.yaml`
- No Playwright/E2E tests exist yet

---

## Storage

File uploads (GRN docs, vendor docs) saved to `core/storage/` (local disk). Max upload 20MB.
QR code generation uses `com.google.zxing`.

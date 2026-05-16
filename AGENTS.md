# BatchSphere Agent Guide

## Scope
- Active application code lives in `core/`.
- Root-level `.docx` files are roadmap/reference material.
- `bkp/` is backup/old material; do not edit it unless asked.
- Existing project memory also exists in `CLAUDE.md`; keep this file consistent with it.

## Project Summary
- BatchSphere is a pharma ERP demo system.
- Backend: Spring Boot, Java 17, Maven, PostgreSQL, Flyway, Spring Security JWT.
- Frontend: React 18, TypeScript, Vite, TailwindCSS, TanStack React Query, Zustand.
- Main domains: auth, master data, vendor management, warehouse, GRN, inventory, QC sampling, specs, MoA, user management.

## Working Rules
- Avoid sending entire repositories or full files unless truly needed.
- Inspect relevant code before editing.
- Make minimal, focused changes that follow existing patterns.
- Do not refactor unrelated code.
- Do not revert user changes or unrelated dirty worktree changes.
- Ask before destructive git, database, or filesystem operations.
- Prefer repo-local conventions over new abstractions.
- Keep communication concise and include file paths when useful.

## Backend Conventions
- Backend root package: `com.batchsphere.core`.
- Domains generally follow `controller -> service/ServiceImpl -> repository -> entity -> dto`.
- Use existing Lombok style for entities and DTOs.
- Keep schema changes in Flyway migrations under `core/src/main/resources/db/migration/`.
- Do not use Hibernate `ddl-auto: create`; schema is Flyway-managed.
- Add the next migration version when changing persistent schema.
- Preserve JWT and role-based access patterns in existing controllers/config.

## Frontend Conventions
- Frontend code lives in `core/ui/src/`.
- API calls belong in `core/ui/src/lib/api.ts`.
- Types belong in domain files under `core/ui/src/types/`.
- Pages generally consume API functions through React Query hooks.
- Use TailwindCSS and existing handmade UI patterns; there is no component library.
- Keep routes lazy-loaded and role-gated consistently with `router.tsx`.

## Running Locally
```bash
# Backend, port 8080
cd core
./mvnw spring-boot:run

# Frontend, port 5173
cd core/ui
npm install
npm run dev
```

Default local DB:
- URL: `jdbc:postgresql://localhost:5432/batchsphere_db`
- User: `batchsphere_user`
- Password: `StrongPassword123`

## Seed Users
- `admin` / `Admin@123` / `SUPER_ADMIN`
- `qc.analyst` / `Admin@123` / `QC_ANALYST`
- `qc.manager` / `Admin@123` / `QC_MANAGER`
- `warehouse.op` / `Admin@123` / `WAREHOUSE_OP`
- `procurement.user` / `Admin@123` / `PROCUREMENT`

## Testing
- Prefer focused tests for touched areas.
- Backend integration tests live under `core/src/test/java/com/batchsphere/core/`.
- Test config lives at `core/src/test/resources/application-test.yaml`.
- No Playwright/E2E suite is established unless added later.
- If tests cannot run locally, explain why and name the risk.

## Useful Commands
```bash
# Backend tests
cd core
./mvnw test

# Frontend checks, if scripts exist
cd core/ui
npm run build
```

## Delivery Expectations
- Summarize what changed and why.
- Mention verification run, including failures or skipped checks.
- Reference changed files with paths.
- Keep final answers short unless the task needs detail.

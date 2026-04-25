# Vendor Management System — Implementation Plan

**Module:** Master Data → Partners → Vendors  
**Route:** `/master-data/partners/vendors`  
**Theme:** Orange (`border-orange-*`, `bg-orange-50`)  
**Mockup Reference:** `core/ux-mockups/07-vms.html`  
**Date:** April 2026

---

## Decisions Locked

| # | Question | Decision | Rationale |
|---|---|---|---|
| 1 | Add/Edit Vendor form style | **Right slide-over drawer** | Vendor list stays visible for context while form is open |
| 2 | Vendor category design | **Fixed enum on `Vendor` entity** | GMP categories (API/Excipient/Solvent/Packaging) are stable and standard — no dynamic management needed |
| 3 | Vendor document file storage | **Local filesystem** | `MultipartFile` → local disk path; can migrate to S3 later |

---

## Current State

| Layer | Status | Notes |
|---|---|---|
| Backend `Vendor` entity | Done | Basic fields only |
| CRUD APIs (`/api/vendors`) | Done | GET (paginated), GET by ID, POST, PUT, DELETE |
| `VendorsPage.tsx` redesigned | Done | Matches 07-vms.html layout |
| Vendor list (search, tabs, status pills, stars) | Done | Real API data |
| KPI cards + amber alert | Done | Live counts from fetched vendors |
| Qualification workflow (4 steps) | Done | Static/presentational |
| Detail panel — header card | Done | `vendorCode`, `vendorName`, `email`, `isApproved`, `isActive` are live |
| Detail panel — info grid (8 cells) | Partial | Audit dates, QA rating, scores are hardcoded placeholders |
| Vendor Documents card | Partial | Completely static — 4 hardcoded entries |
| Recent Transactions table | Partial | Completely static — 4 hardcoded GRN rows |
| Add Vendor button | Not done | Non-functional |
| Edit button | Not done | Non-functional |
| Schedule Audit button | Not done | Non-functional |

---

## Phase 1 — Add / Edit Vendor Modal

> **Scope:** UI only — no backend changes required.  
> **Effort:** ~1 day

### Goal
Make the **Add Vendor** and **Edit** buttons functional using existing APIs.

### Backend APIs Used (Already Exist)
- `POST /api/vendors` → create vendor
- `PUT /api/vendors/{id}` → update vendor
- `DELETE /api/vendors/{id}` → deactivate / suspend vendor

### Frontend Tasks

| Task | File | Details |
|---|---|---|
| Add modal open state | `VendorsPage.tsx` | `showAddModal: boolean`, `editTarget: Vendor \| null` |
| Build `<VendorFormModal>` | `VendorFormModal.tsx` (new) | Right slide-over drawer (fixed decision) |
| Form fields | `VendorFormModal.tsx` | `vendorCode`, `vendorName`, `contactPerson`, `email`, `phone` |
| Wire POST on submit | `VendorsPage.tsx` | Refresh list, auto-select new vendor |
| Wire PUT on edit submit | `VendorsPage.tsx` | Patch vendor in local list state |
| Suspend/Deactivate action | `VendorsPage.tsx` | Add "Suspend" button in detail header, wire DELETE |
| Add `createVendor` / `updateVendor` to `api.ts` | `lib/api.ts` | Use existing `CreateVendorRequest` type |

### Form Fields Reference

| Field | Required | Type | Notes |
|---|---|---|---|
| `vendorCode` | Yes | text | Unique, uppercase, e.g. VEN-0042 |
| `vendorName` | Yes | text | |
| `contactPerson` | No | text | |
| `email` | No | email | |
| `phone` | No | text | |

---

## Phase 2 — Vendor Category Field

> **Scope:** Backend schema change + frontend filter/form update.  
> **Effort:** ~0.5 day

### Goal
Enable **All / API / Excipient / Solvent / Packaging** filter tabs in the vendor list panel.

### Backend Changes

| File | Change |
|---|---|
| `Vendor.java` | Add `@Column String category` (VARCHAR 50) |
| `VendorRequest.java` | Add optional `String category` field |
| Flyway migration | `ALTER TABLE vendor ADD COLUMN category VARCHAR(50)` |

### Enum Values (Fixed — no reference table)
```java
public enum VendorCategory {
    API_SUPPLIER,
    EXCIPIENT_SUPPLIER,
    SOLVENT_SUPPLIER,
    PACKAGING_SUPPLIER
}
```
> Defined as a Java `enum` and stored as `VARCHAR(50)` via `@Enumerated(EnumType.STRING)`.

### Frontend Changes

| Task | File | Details |
|---|---|---|
| Extend `Vendor` type | `types/vendor.ts` | Add `category: string` |
| Extend `CreateVendorRequest` | `types/vendor.ts` | Add `category?: string` |
| Update tab filter | `VendorsPage.tsx` | Switch from `ALL/APPROVED/REVIEW` to `ALL/API_SUPPLIER/EXCIPIENT_SUPPLIER/...` |
| Update detail info grid | `VendorsPage.tsx` | Replace static "API Supplier" cell with `selected.category` |
| Add category dropdown to form | `VendorFormModal.tsx` | Dropdown with 4 enum values |

---

## Phase 3 — Vendor Detail: Audit & Performance Data

> **Scope:** Backend schema + API + frontend wiring.  
> **Effort:** ~1 day

### Goal
Replace static info grid cells (Last Audit, Next Audit Due, QA Rating, Delivery Score, Rejection Rate, Open CAPAs) with real persisted data.

### Approach: Add Fields Directly to Vendor Entity

This is the simpler approach. A separate `VendorAudit` history entity is addressed in Phase 6.

### Backend Changes

**Add to `Vendor.java`:**
```java
@Column(name = "approved_since")      private LocalDate approvedSince;
@Column(name = "last_audit_date")     private LocalDate lastAuditDate;
@Column(name = "next_audit_due")      private LocalDate nextAuditDue;
@Column(name = "qa_rating")           private BigDecimal qaRating;         // 0.0–5.0
@Column(name = "delivery_score")      private BigDecimal deliveryScore;    // 0.0–100.0 (%)
@Column(name = "rejection_rate")      private BigDecimal rejectionRate;    // 0.0–100.0 (%)
@Column(name = "open_capa_count")     private Integer openCapaCount;
```

**Add to `VendorRequest.java`:**
- All 7 fields as optional (`LocalDate`, `BigDecimal`, `Integer`)

**Flyway migration:**
```sql
ALTER TABLE vendor
  ADD COLUMN approved_since     DATE,
  ADD COLUMN last_audit_date    DATE,
  ADD COLUMN next_audit_due     DATE,
  ADD COLUMN qa_rating          NUMERIC(3,1),
  ADD COLUMN delivery_score     NUMERIC(5,2),
  ADD COLUMN rejection_rate     NUMERIC(5,2),
  ADD COLUMN open_capa_count    INTEGER DEFAULT 0;
```

### Frontend Changes

| Task | File | Details |
|---|---|---|
| Extend `Vendor` type | `types/vendor.ts` | Add 7 new optional fields |
| Wire detail grid cells | `VendorsPage.tsx` | Replace hardcoded strings with `selected.lastAuditDate`, etc. |
| Format dates | `VendorsPage.tsx` | `new Date(d).toLocaleDateString("en-IN", {month:"short", year:"numeric"})` |
| Conditional color on `nextAuditDue` | `VendorsPage.tsx` | Red if overdue, green if >60 days away |
| Wire QA Rating cell | `VendorsPage.tsx` | Show `<StarRating>` using `selected.qaRating` |
| "Audits Due" KPI | `VendorsPage.tsx` | Count vendors where `nextAuditDue` ≤ today + 60 days |

---

## Phase 4 — Recent GRNs per Vendor

> **Scope:** Backend query + new API endpoint + frontend state.  
> **Effort:** ~0.5 day

### Goal
Replace the static "Recent Transactions" table with real GRN records linked to the selected vendor.

### Backend Changes

**Option A — Add query param to existing GRN endpoint (recommended):**
```
GET /api/grns?vendorId={id}&size=5&sort=createdAt,desc
```

**Option B — Dedicated endpoint:**
```
GET /api/vendors/{id}/grns?size=5
```

Add to `GrnController.java` or `VendorController.java` accordingly.

### Frontend Changes

| Task | File | Details |
|---|---|---|
| Add `fetchVendorGrns(vendorId)` | `lib/api.ts` | Calls chosen endpoint |
| Add `vendorGrns` state | `VendorsPage.tsx` | `useState<Grn[]>([])` |
| `useEffect` on `selectedId` | `VendorsPage.tsx` | Fetch GRNs when selected vendor changes |
| Replace `RECENT_GRNS` constant | `VendorsPage.tsx` | Remove static const, render from state |
| GRN result badge | `VendorsPage.tsx` | Map GRN `qcStatus`/`status` to Passed/Pending/Failed |

---

## Phase 5 — Vendor Documents

> **Scope:** New backend entity + file storage + frontend upload UI.  
> **Effort:** ~2 days

### Goal
Allow uploading, listing, and viewing compliance documents per vendor (GMP certificates, MSDS, qualification reports).

### Backend Changes

**New entity `VendorDocument`:**
```java
@Entity @Table(name = "vendor_document")
public class VendorDocument {
    @Id UUID id;
    @Column UUID vendorId;
    @Column String documentType;   // GMP_CERTIFICATE, MSDS, QUALIFICATION_REPORT, AVL_AGREEMENT
    @Column String fileName;
    @Column String storagePath;    // S3 key or local path
    @Column LocalDate uploadedAt;
    @Column LocalDate expiryDate;
    @Column String status;         // VALID, EXPIRING_SOON, EXPIRED
    @Column String uploadedBy;
}
```

**New APIs:**
```
POST /api/vendors/{id}/documents    → upload (multipart/form-data)
GET  /api/vendors/{id}/documents    → list documents for vendor
DELETE /api/vendors/{id}/documents/{docId}
```

### Frontend Changes

| Task | File | Details |
|---|---|---|
| `fetchVendorDocuments(vendorId)` | `lib/api.ts` | |
| `uploadVendorDocument(vendorId, formData)` | `lib/api.ts` | |
| Add `vendorDocs` state | `VendorsPage.tsx` | Fetch on vendor select |
| Replace static `VENDOR_DOCS` | `VendorsPage.tsx` | Render from state |
| "Upload Document" button | `VendorsPage.tsx` | Opens file picker, calls upload API |
| Expiry status badge | `VendorsPage.tsx` | Green = Valid, Amber = Expiring soon, Red = Expired |

> **Storage:** Local filesystem. Spring `MultipartFile` → write to a configured `uploads/vendor-docs/` directory. Serve files via `GET /api/vendors/{id}/documents/{docId}/file`. Can migrate to S3 by swapping the storage service implementation later.

---

## Phase 6 — Audit Scheduling & History

> **Scope:** New backend entity + APIs + frontend modal + workflow dates.  
> **Effort:** ~1.5 days

### Goal
Make the **Schedule Audit** button functional and track audit history per vendor. Wire qualification workflow step dates from real audit records.

### Backend Changes

**New entity `VendorAudit`:**
```java
@Entity @Table(name = "vendor_audit")
public class VendorAudit {
    @Id UUID id;
    @Column UUID vendorId;
    @Column LocalDate scheduledDate;
    @Column String auditType;       // INITIAL, PERIODIC, FOR_CAUSE, POST_CAPA
    @Column String status;          // SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
    @Column String outcome;         // APPROVED, APPROVED_WITH_OBSERVATIONS, REJECTED
    @Column String auditedBy;
    @Column String notes;
    @Column LocalDateTime createdAt;
}
```

**New APIs:**
```
POST /api/vendors/{id}/audits          → schedule new audit
GET  /api/vendors/{id}/audits          → list audit history
PUT  /api/vendors/{id}/audits/{auditId} → update audit outcome
```

**Auto-update on audit completion:**
- Update `Vendor.lastAuditDate` and `Vendor.nextAuditDue` (+2 years from completion date)

### Frontend Changes

| Task | File | Details |
|---|---|---|
| "Schedule Audit" modal | `ScheduleAuditModal.tsx` (new) | Date picker, audit type dropdown, notes |
| Wire to `POST /api/vendors/{id}/audits` | `VendorsPage.tsx` | |
| Qualification workflow dates | `VendorsPage.tsx` | Pull step dates from first audit records instead of hardcoded subs |
| "Audits Due" KPI | `VendorsPage.tsx` | Count from `vendors` where `nextAuditDue` within 60 days |

---

## Implementation Priority

```
Phase 1          Phase 2          Phase 3          Phase 4          Phase 5          Phase 6
Add/Edit         Category         Audit +          Live GRNs        Vendor           Audit
Vendor Form      Field            Performance      per Vendor       Documents        Scheduling
─────────        ─────────        ─────────        ─────────        ─────────        ─────────
UI only          DB + UI          DB + UI          DB + API + UI    DB + Storage     DB + UI
~1 day           ~0.5 day         ~1 day           ~0.5 day         ~2 days          ~1.5 days
```

**Total estimated effort: ~6.5 days**

---

## Open Questions

| # | Question | Status | Decision |
|---|---|---|---|
| 1 | Should Add/Edit Vendor use a slide-over drawer or centered modal? | ✅ Resolved | Right slide-over drawer |
| 2 | Is Vendor `category` a free-text field or fixed enum? Reference table? | ✅ Resolved | Fixed enum on `Vendor` entity |
| 3 | File storage for vendor documents? | ✅ Resolved | Local filesystem (Spring `MultipartFile` → disk) |
| 4 | Should vendor GRNs filter by `vendorId` on GRN table or via `Vendor → VendorBU → GRN`? | ⏳ Open | Needs GRN schema check |
| 5 | Is CAPA tracking in scope? (referenced in mockup as "Open CAPAs") | ⏳ Open | Defer — `openCapaCount` as a plain integer for now |

---

## Files Affected Summary

### Frontend
```
core/ui/src/
├── features/master-data/partners/
│   ├── VendorsPage.tsx              (Phase 1–6 changes)
│   ├── VendorFormModal.tsx          (Phase 1 — new)
│   └── ScheduleAuditModal.tsx       (Phase 6 — new)
├── lib/api.ts                       (Phase 1, 4, 5, 6)
└── types/vendor.ts                  (Phase 2, 3)
```

### Backend
```
core/src/main/java/com/batchsphere/core/masterdata/vendor/
├── entity/
│   ├── Vendor.java                  (Phase 2, 3)
│   ├── VendorDocument.java          (Phase 5 — new)
│   └── VendorAudit.java             (Phase 6 — new)
├── dto/
│   ├── VendorRequest.java           (Phase 2, 3)
│   ├── VendorDocumentRequest.java   (Phase 5 — new)
│   └── VendorAuditRequest.java      (Phase 6 — new)
├── controller/
│   └── VendorController.java        (Phase 4, 5, 6 — new endpoints)
├── service/
│   ├── VendorService.java           (Phase 3, 5, 6)
│   └── VendorServiceImpl.java       (Phase 3, 5, 6)
└── repository/
    ├── VendorRepository.java        (Phase 3)
    ├── VendorDocumentRepository.java (Phase 5 — new)
    └── VendorAuditRepository.java   (Phase 6 — new)

core/src/main/resources/db/migration/
├── V{n}__add_vendor_category.sql    (Phase 2)
├── V{n}__add_vendor_audit_fields.sql (Phase 3)
├── V{n}__create_vendor_document.sql  (Phase 5)
└── V{n}__create_vendor_audit.sql     (Phase 6)
```

---

## Actual Status Update

Date updated: 2026-04-23

This section reflects the real implementation status in the codebase and should be treated as the latest checkpoint.

### What We Have Done

#### VMS / Vendor Management

- Enabled `Vendor Management` in the main left sidebar and routed it to the live VMS screen.
- Implemented vendor CRUD on the active vendor flow.
- Implemented vendor category support.
- Implemented vendor audit/performance summary fields on vendor master.
- Implemented live GRN retrieval for vendors instead of hardcoded recent transactions.
- Implemented real vendor approval action at vendor level.
- Replaced the old mocked vendor qualification ticks with a real vendor/VBU qualification summary.
- Implemented vendor-level corporate document management:
  - upload
  - list
  - delete
  - file download

#### Pharma Site-Level Model Alignment

- Switched documents and audits from vendor level to `VendorBusinessUnit` level to match `VMS_PHARMA_DATA_MODEL.md`.
- Implemented `VendorBusinessUnit` document management:
  - upload
  - list
  - delete
  - file download
- Implemented `VendorBusinessUnit` audit management:
  - create
  - update
  - list
- Updated VBU qualification fields and audit-driven qualification updates.
- Reworked the `Vendor Business Units` page to be a real operational page.
- Changed the left hierarchy to show vendor-grouped site hierarchy.
- Added pagination to the vendor hierarchy panel instead of long scrolling.

#### GRN / Material / Warehouse Alignment

- Moved vendor and manufacturing site selection into GRN.
- Removed misleading vendor-linking expectations from Material.
- Clarified Material as warehouse/storage-rule driven.
- Updated Material labels for warehouse assignment and quarantine routing.

#### Material Master

- Clarified material reference fields:
  - HSN Code
  - CAS Number
  - Pharmacopoeial Reference
- Made `Specification & Testing` required in Material creation.
- Added real `specId` linkage from Material to Spec.
- Added backend validation so selected spec must exist.
- Implemented server-side material code generation:
  - `CRITICAL` → `RM-00001`
  - `NON_CRITICAL` → `PM-00001`
  - `FINISHED_GOODS` → `FG-00001`
  - `IN_PROCESS` → `IP-00001`
- Updated Material create flow so:
  - `Material Type` comes first
  - `Material Name` comes next
  - material code is shown as system-generated after save
- Added CoA-based behavior in Material:
  - when `Vendor CoA Release` is enabled, spec selection is constrained to CoA-based specs

#### Sampling / QC

- Reviewed the Sampling/QC flow and identified the main process gap: spec override at sampling stage.
- Fixed that gap:
  - Sampling/QC now automatically uses the spec linked in Material Master
  - Sampling UI shows specification as read-only
  - backend rejects sampling plans that try to use a different spec

#### Test Environment Cleanup

- Cleaned the development database by dropping and recreating the `public` schema in `batchsphere_db`.
- Cleared local `storage/` files for a clean end-to-end test environment.
- Removed active Warehouse page mock-data fallback so live testing uses backend data only.

### What We Are Planning To Do Next

#### Sampling / QC

- Add `Quarantine` as an intermediate QC disposition instead of leaving only approve/reject.
- Rename and clarify current `MoA` usage toward `Method of Analysis` when we implement it properly.
- Later, build controlled document management around:
  - specifications
  - method of analysis references
  - revision/effective-date control
  - material-to-spec / method mapping

#### VMS Cleanup

- Remove or repurpose any leftover vendor-level placeholder actions that still imply site audit execution from the parent vendor screen.

#### Data / Process Hardening

- Add more backend and integration coverage for:
  - vendor approval and corporate documents
  - material-spec enforcement
  - VBU audits/documents
  - GRN to sampling/QC transitions

### Current Working Rule Set

- Material owns the specification.
- Sampling/QC must use the material-linked specification automatically.
- Vendor/site selection belongs in GRN, not in Material Master.
- Vendor approval is tracked at `Vendor` level.
- Corporate/legal documents can exist at `Vendor` level.
- Site qualification, site audits, and site compliance documents are tracked at `VendorBusinessUnit` level.
- Vendor-level documents must not auto-qualify vendor business units.
- `VendorBusinessUnit` remains optional for GRN for now.
